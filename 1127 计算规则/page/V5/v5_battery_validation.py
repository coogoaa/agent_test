#!/usr/bin/env python3
"""
V5 电池推荐逻辑验证脚本

V5 版本电池推荐规则：
- 方案C (经济型): 覆盖晚高峰（17:00–21:00）的用电需求
- 方案B (平衡型): 覆盖整晚满足（17:00–07:00）的用电需求
- 方案A (高端型): max(全天用电量, 光伏剩余容量 × 0.8)

用电量取的全年日均
光伏剩余容量 = 日均 PV 发电量 - 日均 Load
电池容量上限: 50 kWh
"""

import csv
import os
from collections import defaultdict

# ==================== 参数配置 ====================

# 各州全年用电量 (kWh)
STATE_CONSUMPTION = {
    'TAS': 10148,
    'NT': 10008,
    'ACT': 8632,
    'SA': 7129,
    'NSW': 7778,
    'QLD': 7270,
    'WA': 7634,
    'VIC': 6778
}

# 各州年发电系数 (kWh/kW)
STATE_PV_FACTOR = {
    'TAS': 1278,
    'VIC': 1314,
    'NSW': 1460,
    'SA': 1533,
    'QLD': 1533,
    'ACT': 1570,
    'NT': 1606,
    'WA': 1606
}

# 各州各时段用电比例 (%) - 索引 0-23 对应 0:00-23:00
STATE_HOURLY_PROFILE = {
    'NSW': [4.427, 3.912, 3.176, 2.706, 2.583, 2.805, 3.427, 3.939, 4.089, 4.050, 3.986, 3.936, 3.948, 3.908, 3.920, 4.105, 4.569, 5.328, 5.846, 5.634, 5.329, 4.947, 4.804, 4.63],
    'VIC': [3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 3.941, 3.941],
    'QLD': [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679],
    'SA': [4.850, 5.185, 3.814, 2.956, 2.568, 2.654, 3.142, 3.655, 3.563, 3.624, 4.103, 4.366, 4.188, 3.980, 3.997, 4.111, 4.525, 5.442, 5.990, 5.715, 5.315, 4.739, 3.905, 3.607],
    'WA': [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679],
    'TAS': [3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 3.941, 3.941],
    'ACT': [3.400, 3.031, 2.876, 2.867, 3.055, 3.643, 4.493, 4.904, 4.317, 3.792, 3.615, 3.118, 3.053, 2.937, 3.003, 3.369, 4.434, 5.901, 6.693, 6.550, 6.142, 5.416, 5.178, 4.208],
    'NT': [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679]
}

# PV 组件功率 (W)
PV_WATT = 440

# 标准电池规格 (kWh)
BATTERY_STANDARDS = [0, 5, 6.5, 9.6, 10, 13.5, 16, 20, 26, 30, 40, 50]

# 电池容量上限 (kWh)
BATTERY_MAX_CAPACITY = 50

# 方案A 电池容量与 PV 容量的最大比例
PREMIUM_PV_RATIO = 2.5


# ==================== 核心计算函数 ====================

def get_daily_consumption(state):
    """获取日均用电量 (kWh)"""
    return STATE_CONSUMPTION[state] / 365

def get_daily_pv_generation(pv_kw, state):
    """获取日均 PV 发电量 (kWh)"""
    return pv_kw * STATE_PV_FACTOR[state] / 365

def get_evening_peak_consumption(state):
    """
    获取晚高峰用电量 (17:00-21:00)
    索引 16, 17, 18, 19 对应 17:00-21:00 (4小时)
    """
    profile = STATE_HOURLY_PROFILE[state]
    evening_ratio = sum(profile[16:20]) / 100
    daily = get_daily_consumption(state)
    return daily * evening_ratio

def get_overnight_consumption(state):
    """
    获取整晚用电量 (17:00-07:00)
    索引 16-23 (17:00-24:00) + 索引 0-6 (00:00-07:00)
    共 14 小时
    """
    profile = STATE_HOURLY_PROFILE[state]
    overnight_ratio = (sum(profile[16:24]) + sum(profile[0:7])) / 100
    daily = get_daily_consumption(state)
    return daily * overnight_ratio

def get_pv_surplus(pv_kw, state):
    """
    获取光伏剩余容量 = 日均 PV 发电量 - 日均 Load
    """
    daily_pv = get_daily_pv_generation(pv_kw, state)
    daily_load = get_daily_consumption(state)
    return max(0, daily_pv - daily_load)

def standardize_battery(capacity):
    """将电池容量标准化到常见规格，并限制最大值"""
    # 先限制最大容量
    capacity = min(capacity, BATTERY_MAX_CAPACITY)
    
    for std in BATTERY_STANDARDS:
        if std >= capacity:
            return min(std, BATTERY_MAX_CAPACITY)
    return BATTERY_MAX_CAPACITY

def calculate_battery_v5(pv_kw, state, plan='balanced'):
    """
    V5 版本电池推荐逻辑
    
    Args:
        pv_kw: 光伏系统容量 (kW)
        state: 用户所在州
        plan: 方案类型 ('economy', 'balanced', 'premium')
    
    Returns:
        dict: 包含计算结果和详细信息
    """
    daily_consumption = get_daily_consumption(state)
    daily_pv = get_daily_pv_generation(pv_kw, state)
    evening_peak = get_evening_peak_consumption(state)
    overnight = get_overnight_consumption(state)
    pv_surplus = get_pv_surplus(pv_kw, state)
    
    if plan == 'economy':
        # 方案C: 覆盖晚高峰（17:00–21:00）的用电需求
        capacity = evening_peak
        method_desc = f"晚高峰用电 (17:00-21:00) = {evening_peak:.2f} kWh"
    
    elif plan == 'balanced':
        # 方案B: 覆盖整晚满足（17:00–07:00）的用电需求
        capacity = overnight
        method_desc = f"整晚用电 (17:00-07:00) = {overnight:.2f} kWh"
    
    elif plan == 'premium':
        # 方案A: max(max(全天用电量, 光伏剩余×0.8, PV容量×2.5), 方案B×1.2)，上限50
        pv_surplus_factor = pv_surplus * 0.8
        pv_capacity_factor = pv_kw * PREMIUM_PV_RATIO
        balanced_min = overnight * 1.2  # 方案B的1.2倍作为硬性下限
        
        # 先计算基础容量（不考虑方案B约束）
        base_capacity = max(daily_consumption, pv_surplus_factor, pv_capacity_factor)
        
        # 确保至少是方案B的1.2倍
        capacity = max(base_capacity, balanced_min)
        
        # 构建详细的计算说明
        if capacity == balanced_min and base_capacity < balanced_min:
            method_desc = f"max(max(全天用电={daily_consumption:.2f}, 光伏剩余×0.8={pv_surplus_factor:.2f}, PV×{PREMIUM_PV_RATIO}={pv_capacity_factor:.2f})={base_capacity:.2f}, 方案B×1.2={balanced_min:.2f}) = {capacity:.2f} kWh"
        else:
            method_desc = f"max(全天用电={daily_consumption:.2f}, 光伏剩余×0.8={pv_surplus_factor:.2f}, PV×{PREMIUM_PV_RATIO}={pv_capacity_factor:.2f}) = {capacity:.2f} kWh"
    
    else:
        capacity = 0
        method_desc = "未知方案"
    
    # 限制最大容量
    if capacity > BATTERY_MAX_CAPACITY:
        capacity = BATTERY_MAX_CAPACITY
        method_desc += f" → 受上限限制为 {BATTERY_MAX_CAPACITY} kWh"
    
    standard_capacity = standardize_battery(capacity)
    
    return {
        'plan': plan,
        'calculated': round(capacity, 2),
        'standard': standard_capacity,
        'method_desc': method_desc,
        'details': {
            'daily_consumption': round(daily_consumption, 2),
            'daily_pv': round(daily_pv, 2),
            'evening_peak': round(evening_peak, 2),
            'overnight': round(overnight, 2),
            'pv_surplus': round(pv_surplus, 2)
        }
    }


# ==================== 数据加载 ====================

def load_house_data(csv_path):
    """从 CSV 加载房屋数据"""
    houses = defaultdict(list)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # 跳过表头
        
        for row in reader:
            if len(row) >= 4:
                house_id = row[0].strip()
                slope = row[1].strip()
                aspect = float(row[2]) if row[2] else 0
                nums = int(row[3]) if row[3] else 0
                
                houses[house_id].append({
                    'slope': slope,
                    'aspect': aspect,
                    'nums': nums
                })
    
    return houses


def get_house_total_panels(house_data):
    """获取房屋总组件数"""
    return sum(slope['nums'] for slope in house_data)


def get_house_pv_kw(house_data):
    """获取房屋 PV 容量 (kW)"""
    total_panels = get_house_total_panels(house_data)
    return total_panels * PV_WATT / 1000


# ==================== 验证测试 ====================

def find_boundary_houses(houses):
    """
    查找各种边界情况的房屋
    - 极小型: ≤4片 (≤1.76kW)
    - 小型: <6.6kW
    - 中小型: 6.6-10kW
    - 中型: 10-14kW
    - 大型: 14-20kW
    - 超大型: >20kW
    """
    categories = {
        '极小型 (≤4片)': [],
        '小型 (<6.6kW)': [],
        '中小型 (6.6-10kW)': [],
        '中型 (10-14kW)': [],
        '大型 (14-20kW)': [],
        '超大型 (>20kW)': []
    }
    
    for house_id, slopes in houses.items():
        total_panels = get_house_total_panels(slopes)
        pv_kw = get_house_pv_kw(slopes)
        
        if total_panels <= 0:
            continue
        
        if total_panels <= 4:
            categories['极小型 (≤4片)'].append((house_id, pv_kw, total_panels, slopes))
        elif pv_kw < 6.6:
            categories['小型 (<6.6kW)'].append((house_id, pv_kw, total_panels, slopes))
        elif pv_kw < 10:
            categories['中小型 (6.6-10kW)'].append((house_id, pv_kw, total_panels, slopes))
        elif pv_kw < 14:
            categories['中型 (10-14kW)'].append((house_id, pv_kw, total_panels, slopes))
        elif pv_kw < 20:
            categories['大型 (14-20kW)'].append((house_id, pv_kw, total_panels, slopes))
        else:
            categories['超大型 (>20kW)'].append((house_id, pv_kw, total_panels, slopes))
    
    return categories


def run_validation():
    """运行验证测试"""
    print("=" * 80)
    print("V5 电池推荐逻辑验证 (边界测试版)")
    print("=" * 80)
    
    # 加载房屋数据
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, '..', '..', '验证数据', 'agent_sample_data - 坡面信息.csv')
    
    try:
        houses = load_house_data(csv_path)
        print(f"\n✅ 成功加载 {len(houses)} 个房屋数据")
    except FileNotFoundError:
        print(f"\n❌ 找不到文件: {csv_path}")
        print("使用模拟数据进行验证...")
        houses = None
    
    # 查找边界房屋
    test_cases = []
    
    if houses:
        categories = find_boundary_houses(houses)
        
        print("\n📊 房屋分布统计:")
        print("-" * 60)
        for cat_name, cat_houses in categories.items():
            print(f"   {cat_name}: {len(cat_houses)} 个房屋")
        
        # 从每个类别选择一个代表性房屋
        for cat_name, cat_houses in categories.items():
            if cat_houses:
                # 选择该类别中间的房屋
                cat_houses.sort(key=lambda x: x[1])
                mid_idx = len(cat_houses) // 2
                house_id, pv_kw, panels, slopes = cat_houses[mid_idx]
                test_cases.append((cat_name, (house_id, pv_kw, slopes, panels)))
    
    # 如果没有足够的房屋数据，使用模拟数据
    if not test_cases:
        test_cases = [
            ('极小型 (≤4片)', ('模拟-极小', 1.76, None, 4)),
            ('小型 (<6.6kW)', ('模拟-小', 4.4, None, 10)),
            ('中小型 (6.6-10kW)', ('模拟-中小', 8.0, None, 18)),
            ('中型 (10-14kW)', ('模拟-中', 12.0, None, 27)),
            ('大型 (14-20kW)', ('模拟-大', 17.0, None, 39)),
            ('超大型 (>20kW)', ('模拟-超大', 25.0, None, 57)),
        ]
    
    # 测试各州
    test_states = ['NSW', 'VIC', 'QLD', 'SA']
    
    print("\n" + "=" * 80)
    print("V5 电池推荐规则说明 (修订版):")
    print("-" * 80)
    print("方案C (经济型): 覆盖晚高峰（17:00–21:00）的用电需求")
    print("方案B (平衡型): 覆盖整晚满足（17:00–07:00）的用电需求")
    print(f"方案A (高端型): min(max(全天用电量, 光伏剩余×0.8, 方案B×1.2), PV容量×{PREMIUM_PV_RATIO})")
    print(f"电池容量上限: {BATTERY_MAX_CAPACITY} kWh")
    print("=" * 80)
    
    for category, house_info in test_cases:
        if len(house_info) == 4:
            house_id, pv_kw, slopes, panels = house_info
        else:
            house_id, pv_kw, slopes = house_info
            panels = get_house_total_panels(slopes) if slopes else 0
        
        print(f"\n{'='*80}")
        print(f"🏠 房屋 ID: {house_id} ({category})")
        print(f"   PV 容量: {pv_kw:.2f} kW")
        print(f"   组件数量: {panels} 片")
        print("-" * 80)
        
        for state in test_states:
            print(f"\n📍 州: {state}")
            print(f"   年用电量: {STATE_CONSUMPTION[state]} kWh")
            print(f"   年发电系数: {STATE_PV_FACTOR[state]} kWh/kW")
            
            # 计算基础数据
            daily_consumption = get_daily_consumption(state)
            daily_pv = get_daily_pv_generation(pv_kw, state)
            evening_peak = get_evening_peak_consumption(state)
            overnight = get_overnight_consumption(state)
            pv_surplus = get_pv_surplus(pv_kw, state)
            
            print(f"\n   基础数据:")
            print(f"   - 日均用电: {daily_consumption:.2f} kWh")
            print(f"   - 日均发电: {daily_pv:.2f} kWh")
            print(f"   - 晚高峰用电 (17-21h): {evening_peak:.2f} kWh")
            print(f"   - 整晚用电 (17-07h): {overnight:.2f} kWh")
            print(f"   - 光伏剩余: {pv_surplus:.2f} kWh")
            
            print(f"\n   V5 电池推荐:")
            for plan, plan_name in [('economy', '方案C-经济型'), ('balanced', '方案B-平衡型'), ('premium', '方案A-高端型')]:
                result = calculate_battery_v5(pv_kw, state, plan)
                print(f"   - {plan_name}: {result['calculated']:.2f} kWh → 标准化: {result['standard']} kWh")
                print(f"     计算: {result['method_desc']}")
    
    print("\n" + "=" * 80)
    print("验证完成")
    print("=" * 80)
    
    # 输出对比表格
    print("\n\n" + "=" * 110)
    print("V5 电池推荐汇总表 (标准化后容量 kWh)")
    print("=" * 110)
    print(f"{'类别':<20} {'房屋ID':<10} {'组件':<6} {'PV(kW)':<10} {'州':<6} {'方案C':<10} {'方案B':<10} {'方案A':<10}")
    print("-" * 110)
    
    for category, house_info in test_cases:
        if len(house_info) == 4:
            house_id, pv_kw, slopes, panels = house_info
        else:
            house_id, pv_kw, slopes = house_info
            panels = get_house_total_panels(slopes) if slopes else 0
        
        for state in test_states:
            c_result = calculate_battery_v5(pv_kw, state, 'economy')
            b_result = calculate_battery_v5(pv_kw, state, 'balanced')
            a_result = calculate_battery_v5(pv_kw, state, 'premium')
            
            print(f"{category:<20} {house_id:<10} {panels:<6} {pv_kw:<10.2f} {state:<6} {c_result['standard']:<10} {b_result['standard']:<10} {a_result['standard']:<10}")
    
    # 输出对外说辞建议
    print("\n\n" + "=" * 100)
    print("📢 对外说辞建议")
    print("=" * 100)
    print("""
【方案C - 经济型】
  ✅ 覆盖傍晚用电高峰 (17:00-21:00)
  ✅ 最经济实惠的入门选择
  ✅ 适合预算有限、白天在家用电较多的用户
  💡 说辞: "满足傍晚回家后的用电高峰，让您在电价最贵的时段使用免费的太阳能"

【方案B - 平衡型】⭐ 推荐
  ✅ 覆盖整晚用电需求 (17:00-07:00)
  ✅ 白天光伏发电，晚上电池供电，实现日夜能源自给
  ✅ 适合大多数家庭的标准配置
  💡 说辞: "从傍晚到第二天早晨，14小时的用电全部由电池供应，真正实现夜间零电费"

【方案A - 高端型】
  ✅ 覆盖全天用电需求，或充分吸收光伏剩余发电
  ✅ 支持电网充电，可利用低谷电价进一步节省
  ✅ 适合追求能源独立、大型光伏系统的用户
  💡 说辞: "大容量储能，不仅能存储白天的太阳能，还能在电价低谷时从电网充电，
           实现全天候能源优化，最大化您的投资回报"

【关于电网充电功能】
  ✅ 所有方案的电池都支持电网充电
  ✅ 可设置在电价低谷时段 (如凌晨) 自动充电
  ✅ 即使阴雨天光伏发电不足，也能保证电池有电可用
  💡 说辞: "我们的电池不仅能存储太阳能，还能智能识别电价低谷，
           自动从电网充电，确保您随时都有储备电力"
""")


if __name__ == '__main__':
    run_validation()
