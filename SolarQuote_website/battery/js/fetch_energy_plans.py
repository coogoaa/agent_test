#!/usr/bin/env python3
"""
澳洲电力供应商费率数据采集脚本
安全采集 SolarQuotes API 数据，包含速率限制和随机延迟

配置说明：
- 全部8个州/领地
- 每州5个代表性邮编
- 动态获取每个邮编的全部零售商（不限于固定列表）
"""

import requests
import json
import time
import random
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional

# ============== 日志配置 ==============
LOG_DIR = "./output/logs"
os.makedirs(LOG_DIR, exist_ok=True)

# 创建带时间戳的日志文件
log_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
log_file = f"{LOG_DIR}/fetch_log_{log_timestamp}.log"

# 配置日志格式
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler()  # 同时输出到控制台
    ]
)
logger = logging.getLogger(__name__)

# ============== 配置 ==============
BASE_URL = "https://www.solarquotes.com.au/battery-storage/calculator"
OUTPUT_DIR = "./output/energy_plans"

# 速率限制配置 (安全设置)
MIN_DELAY = 3.0      # 最小延迟秒数
MAX_DELAY = 8.0      # 最大延迟秒数
BATCH_SIZE = 5       # 每批请求数量
BATCH_DELAY = 30.0   # 批次间延迟秒数
ERROR_DELAY = 60.0   # 错误后延迟秒数

# 请求头 (模拟浏览器)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-AU,en;q=0.9',
    'Content-Type': 'application/json',
    'Origin': 'https://www.solarquotes.com.au',
    'Referer': 'https://www.solarquotes.com.au/battery-storage/calculator/',
}

# 全部8个州/领地，每州5个代表性邮编
SAMPLE_POSTCODES = {
    # 维多利亚州 (VIC) - 3000-3999
    'VIC': [3000, 3121, 3150, 3350, 3550],  # Melbourne CBD, Richmond, Glen Waverley, Ballarat, Bendigo
    
    # 新南威尔士州 (NSW) - 2000-2999
    'NSW': [2000, 2150, 2500, 2770, 2800],  # Sydney CBD, Parramatta, Wollongong, Mount Druitt, Orange
    
    # 昆士兰州 (QLD) - 4000-4999
    'QLD': [4000, 4101, 4350, 4670, 4870],  # Brisbane CBD, South Brisbane, Toowoomba, Bundaberg, Cairns
    
    # 南澳大利亚州 (SA) - 5000-5999
    'SA':  [5000, 5042, 5108, 5290, 5600],  # Adelaide CBD, Woodville, Salisbury, Mount Gambier, Port Augusta
    
    # 西澳大利亚州 (WA) - 6000-6999
    'WA':  [6000, 6100, 6210, 6430, 6530],  # Perth CBD, Victoria Park, Mandurah, Kalgoorlie, Geraldton
    
    # 塔斯马尼亚州 (TAS) - 7000-7999
    'TAS': [7000, 7004, 7250, 7310, 7470],  # Hobart CBD, Battery Point, Launceston, Devonport, Queenstown
    
    # 北领地 (NT) - 0800-0899
    'NT':  [800, 810, 820, 830, 850],       # Darwin CBD, Casuarina, Palmerston, Katherine, Alice Springs
    
    # 澳大利亚首都领地 (ACT) - 2600-2620
    'ACT': [2600, 2601, 2602, 2606, 2615],  # Canberra CBD, Civic, Ainslie, Woden, Belconnen
}

# 计划类型
PLAN_TYPES = ['Single Rate', 'Time of Use']

# 用于记录所有发现的零售商
ALL_RETAILERS_FOUND = set()


def random_delay():
    """随机延迟，避免被检测"""
    delay = random.uniform(MIN_DELAY, MAX_DELAY)
    logger.debug(f"等待 {delay:.1f} 秒...")
    time.sleep(delay)


def batch_delay():
    """批次间延迟"""
    delay = BATCH_DELAY + random.uniform(0, 10)
    logger.info(f"批次完成，休息 {delay:.0f} 秒...")
    time.sleep(delay)


def get_retailers(postcode: int, retry_count: int = 0) -> List[str]:
    """
    获取指定邮编的零售商列表
    动态获取，不限于固定列表
    """
    url = f"{BASE_URL}/ajaxSearchRetailers/"
    
    # 使用 form data 格式
    form_headers = HEADERS.copy()
    form_headers['Content-Type'] = 'application/x-www-form-urlencoded'
    
    try:
        response = requests.post(
            url, 
            data=f'postcode={postcode}',
            headers=form_headers, 
            timeout=30
        )
        
        logger.debug(f"Retailers API - Postcode: {postcode}, Status: {response.status_code}, Length: {len(response.text)}")
        
        if response.status_code == 200:
            if not response.text.strip():
                logger.warning(f"Postcode {postcode}: 空响应")
                return []
            try:
                data = response.json()
                retailers = data.get('retailers', [])
                logger.info(f"Postcode {postcode}: 找到 {len(retailers)} 个零售商")
                # 记录发现的所有零售商
                for r in retailers:
                    ALL_RETAILERS_FOUND.add(r)
                return retailers
            except json.JSONDecodeError as e:
                logger.error(f"Postcode {postcode}: JSON解析失败 - {response.text[:200]}")
                return []
        elif response.status_code == 429:
            if retry_count < 3:
                logger.warning(f"Postcode {postcode}: 429 请求过于频繁，等待 {ERROR_DELAY} 秒后重试...")
                time.sleep(ERROR_DELAY)
                return get_retailers(postcode, retry_count + 1)
            else:
                logger.error(f"Postcode {postcode}: 429 重试次数过多")
        elif response.status_code == 403:
            logger.error(f"Postcode {postcode}: 403 Forbidden - 可能被封禁")
        else:
            logger.error(f"Postcode {postcode}: HTTP {response.status_code} - {response.text[:200]}")
    except requests.exceptions.SSLError as e:
        logger.error(f"Postcode {postcode}: SSL错误 - {str(e)}")
    except requests.exceptions.Timeout as e:
        logger.error(f"Postcode {postcode}: 请求超时 - {str(e)}")
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Postcode {postcode}: 连接错误 - {str(e)}")
    except Exception as e:
        logger.error(f"Postcode {postcode}: 未知错误 - {str(e)}")
    return []


def get_default_plan(postcode: int, state: str, retailer: str, plan_type: str, retry_count: int = 0) -> Optional[Dict]:
    """获取默认电价计划，带重试机制"""
    url = f"{BASE_URL}/ajaxSearchDefaultPlan/"
    payload = {
        'postcode': str(postcode),
        'state': state,
        'retailer': retailer,
        'planType': plan_type,
        'multipleTariffPeriods': False,
        'controlledLoad': False,
    }
    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            if retry_count < 3:
                logger.warning(f"{state}/{postcode}/{retailer}/{plan_type}: 429 请求过于频繁，等待重试...")
                time.sleep(ERROR_DELAY)
                return get_default_plan(postcode, state, retailer, plan_type, retry_count + 1)
            else:
                logger.error(f"{state}/{postcode}/{retailer}/{plan_type}: 429 重试次数过多，跳过")
                return None
        else:
            logger.error(f"{state}/{postcode}/{retailer}/{plan_type}: HTTP {response.status_code}")
    except requests.exceptions.SSLError as e:
        logger.error(f"{state}/{postcode}/{retailer}/{plan_type}: SSL错误 - {str(e)}")
    except requests.exceptions.Timeout as e:
        logger.error(f"{state}/{postcode}/{retailer}/{plan_type}: 请求超时 - {str(e)}")
    except requests.exceptions.ConnectionError as e:
        logger.error(f"{state}/{postcode}/{retailer}/{plan_type}: 连接错误 - {str(e)}")
    except Exception as e:
        logger.error(f"{state}/{postcode}/{retailer}/{plan_type}: 未知错误 - {str(e)}")
    return None


def extract_key_rates(plan_data: Dict) -> Dict:
    """提取关键费率信息"""
    if not plan_data or 'energyPlan' not in plan_data:
        return None
    
    ep = plan_data.get('energyPlan', {})
    rs = plan_data.get('ratesStructure', {})
    
    # 提取费率
    rates = []
    usage_charge = ep.get('usageCharge', {})
    if usage_charge.get('type') == 'timeOfUse':
        for period in usage_charge.get('data', []):
            for block in period.get('touBlock', []):
                for rate in block.get('blockRate', []):
                    rates.append({
                        'name': block.get('name'),
                        'unitPrice_cents': rate.get('unitPrice'),
                        'timeOfUse': block.get('timeOfUse', [])
                    })
    elif usage_charge.get('type') == 'singleRate':
        for period in usage_charge.get('periods', []):
            for rate in period.get('blockRate', []):
                rates.append({
                    'name': 'Single Rate',
                    'unitPrice_cents': rate.get('unitPrice'),
                })
    
    return {
        'offerId': ep.get('offerId'),
        'planName': ep.get('name'),
        'providerName': ep.get('providerName'),
        'pricingModel': ep.get('pricingModel'),
        'supplyCharge_cents_day': ep.get('supplyCharge'),
        'fit_cents_kwh': ep.get('fit'),
        'rates': rates,
        'distributorName': ep.get('distributorName', []),
        'lastUpdate': ep.get('last_update'),
    }


def fetch_all_plans(dry_run: bool = True):
    """
    采集所有计划数据
    
    Args:
        dry_run: 如果为True，只显示将要采集的数量，不实际请求
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    all_results = []
    error_count = 0
    success_count = 0
    request_count = 0
    
    logger.info("=" * 60)
    logger.info("澳洲电力供应商费率数据采集")
    logger.info("=" * 60)
    logger.info(f"日志文件: {log_file}")
    
    # 计算总请求数
    total_postcodes = sum(len(codes) for codes in SAMPLE_POSTCODES.values())
    estimated_requests = total_postcodes * len(PLAN_TYPES) * 27  # 约27个零售商
    
    logger.info(f"采集范围: 州/领地={len(SAMPLE_POSTCODES)}个, 邮编={total_postcodes}个, 计划类型={len(PLAN_TYPES)}种")
    logger.info(f"预估请求: ~{estimated_requests}次, 预估时间: ~{estimated_requests * 5 / 60:.0f}分钟")
    
    if dry_run:
        logger.info("预览模式 (dry_run=True)，不执行实际采集")
        return
    
    logger.info("开始采集...")
    start_time = datetime.now()
    
    for state, postcodes in SAMPLE_POSTCODES.items():
        logger.info(f"{'='*40}")
        logger.info(f"开始采集州: {state}")
        logger.info(f"{'='*40}")
        
        for postcode in postcodes:
            logger.info(f"处理邮编: {postcode}")
            
            # 获取零售商列表
            retailers = get_retailers(postcode)
            if not retailers:
                logger.warning(f"邮编 {postcode}: 无零售商数据")
                continue
            
            random_delay()
            
            for retailer in retailers:
                for plan_type in PLAN_TYPES:
                    request_count += 1
                    
                    # 批次控制
                    if request_count % BATCH_SIZE == 0:
                        batch_delay()
                    
                    plan_data = get_default_plan(postcode, state, retailer, plan_type)
                    
                    if plan_data and plan_data.get('energyPlan'):
                        key_rates = extract_key_rates(plan_data)
                        if key_rates:
                            result = {
                                'state': state,
                                'postcode': postcode,
                                'retailer': retailer,
                                'planType': plan_type,
                                'fetchTime': datetime.now().isoformat(),
                                **key_rates
                            }
                            all_results.append(result)
                            success_count += 1
                            logger.info(f"[{request_count}] ✅ {state}/{postcode}/{retailer}/{plan_type}")
                        else:
                            error_count += 1
                            logger.warning(f"[{request_count}] ⚠️ {state}/{postcode}/{retailer}/{plan_type}: 无费率数据")
                    else:
                        error_count += 1
                        logger.warning(f"[{request_count}] ❌ {state}/{postcode}/{retailer}/{plan_type}: 无计划")
                    
                    random_delay()
    
    # 计算耗时
    end_time = datetime.now()
    duration = end_time - start_time
    
    # 保存结果
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 保存完整JSON
    json_file = f"{OUTPUT_DIR}/energy_plans_{timestamp}.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    logger.info(f"JSON 已保存: {json_file}")
    
    # 保存CSV摘要
    csv_file = f"{OUTPUT_DIR}/energy_plans_summary_{timestamp}.csv"
    with open(csv_file, 'w', encoding='utf-8') as f:
        f.write("State,Postcode,Retailer,PlanType,PlanName,PricingModel,SupplyCharge_c/day,FiT_c/kWh,Distributor\n")
        for r in all_results:
            f.write(f"{r['state']},{r['postcode']},{r['retailer']},{r['planType']},")
            f.write(f"\"{r.get('planName', '')}\",{r.get('pricingModel', '')},")
            f.write(f"{r.get('supplyCharge_cents_day', '')},{r.get('fit_cents_kwh', '')},")
            f.write(f"\"{';'.join(r.get('distributorName', []))}\"\n")
    logger.info(f"CSV 已保存: {csv_file}")
    
    # 保存发现的所有零售商列表
    retailers_file = f"{OUTPUT_DIR}/all_retailers_{timestamp}.json"
    with open(retailers_file, 'w', encoding='utf-8') as f:
        json.dump({
            'total_count': len(ALL_RETAILERS_FOUND),
            'retailers': sorted(list(ALL_RETAILERS_FOUND))
        }, f, ensure_ascii=False, indent=2)
    logger.info(f"零售商列表已保存: {retailers_file}")
    
    # 最终统计
    logger.info("=" * 60)
    logger.info("采集完成统计")
    logger.info("=" * 60)
    logger.info(f"总请求数: {request_count}")
    logger.info(f"成功数: {success_count}")
    logger.info(f"失败数: {error_count}")
    logger.info(f"成功率: {success_count/(request_count or 1)*100:.1f}%")
    logger.info(f"发现零售商: {len(ALL_RETAILERS_FOUND)} 家")
    logger.info(f"总耗时: {duration}")
    logger.info(f"日志文件: {log_file}")
    
    return all_results


def fetch_single_state(state: str, dry_run: bool = True):
    """
    只采集单个州的数据（用于测试）
    """
    if state not in SAMPLE_POSTCODES:
        print(f"❌ 无效的州代码: {state}")
        print(f"   可用: {list(SAMPLE_POSTCODES.keys())}")
        return
    
    temp_postcodes = {state: SAMPLE_POSTCODES[state]}
    original = SAMPLE_POSTCODES.copy()
    SAMPLE_POSTCODES.clear()
    SAMPLE_POSTCODES.update(temp_postcodes)
    
    result = fetch_all_plans(dry_run=dry_run)
    
    SAMPLE_POSTCODES.clear()
    SAMPLE_POSTCODES.update(original)
    
    return result


if __name__ == "__main__":
    import sys
    
    print("=" * 60)
    print("澳洲电力供应商费率数据采集脚本")
    print("=" * 60)
    print("\n使用方法:")
    print("  python fetch_energy_plans.py              # 预览全部")
    print("  python fetch_energy_plans.py run          # 采集全部")
    print("  python fetch_energy_plans.py VIC          # 预览VIC州")
    print("  python fetch_energy_plans.py VIC run      # 采集VIC州")
    print()
    
    if len(sys.argv) == 1:
        # 预览模式
        fetch_all_plans(dry_run=True)
    elif len(sys.argv) == 2:
        if sys.argv[1] == 'run':
            fetch_all_plans(dry_run=False)
        elif sys.argv[1] in SAMPLE_POSTCODES:
            fetch_single_state(sys.argv[1], dry_run=True)
        else:
            print(f"❌ 未知参数: {sys.argv[1]}")
    elif len(sys.argv) == 3:
        state = sys.argv[1]
        if sys.argv[2] == 'run' and state in SAMPLE_POSTCODES:
            fetch_single_state(state, dry_run=False)
        else:
            print(f"❌ 无效参数组合")
