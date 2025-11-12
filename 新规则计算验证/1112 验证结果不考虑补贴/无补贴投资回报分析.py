#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
新定价规则投资回报分析（不考虑补贴）
使用 solar-calculator-static/index-amortized-monthly.html 的 ROI 和 IRR 计算逻辑
"""

import math
import csv
from dataclasses import dataclass
from typing import Dict, List, Tuple

# GS_POWER_MAPPING 表（从 Quote/calculator.js）
GS_POWER_MAPPING = {
    2.64: (3.0, 5.0), 3.08: (3.0, 5.0), 3.52: (3.0, 5.0), 3.96: (3.0, 5.0),
    4.40: (5.0, 5.0), 4.84: (5.0, 10.0), 5.28: (5.0, 10.0), 5.72: (5.0, 20.0),
    6.16: (5.0, 20.0), 6.60: (5.0, 20.0), 7.04: (8.0, 20.0), 7.48: (8.0, 20.0),
    7.92: (8.0, 20.0), 8.36: (8.0, 26.4), 8.80: (8.0, 26.4), 9.24: (10.0, 26.4),
    9.68: (10.0, 26.4), 10.12: (10.0, 26.4), 10.56: (10.0, 26.4), 11.00: (10.0, 26.4),
    11.44: (10.0, 26.4), 11.88: (10.0, 26.4), 12.32: (10.0, 26.4), 12.76: (10.0, 26.4),
    13.20: (10.0, 26.4), 13.64: (15.0, 26.4), 14.08: (15.0, 26.4), 14.52: (15.0, 26.4),
    14.96: (15.0, 26.4), 15.40: (15.0, 26.4), 15.84: (15.0, 26.4), 16.28: (15.0, 26.4),
    16.72: (15.0, 26.4), 17.16: (15.0, 26.4), 17.60: (15.0, 26.4), 18.04: (15.0, 26.4),
    18.48: (15.0, 26.4), 18.92: (15.0, 26.4), 19.36: (15.0, 26.4), 19.80: (15.0, 25.24),
    20.24: (20.0, 25.24), 20.68: (20.0, 25.24), 21.12: (20.0, 25.24), 21.56: (20.0, 25.24),
    22.00: (20.0, 25.24)
}

# 各州年用电量数据（最新）
STATE_CONSUMPTION = {
    'TAS': 10148, 'NT': 10008, 'ACT': 8632, 'SA': 7129,
    'NSW': 7778, 'QLD': 7270, 'WA': 7634, 'VIC': 6778
}

# 各州电价（AUD/kWh）
STATE_ELECTRICITY_PRICE = {
    'NSW': 0.35, 'VIC': 0.35, 'QLD': 0.35, 'SA': 0.40,
    'WA': 0.35, 'TAS': 0.35, 'NT': 0.35, 'ACT': 0.35
}

# 上网电价（AUD/kWh）
FEED_IN_TARIFF = 0.08

@dataclass
class SystemConfig:
    """系统配置"""
    panel_count: int
    solar_kw: float
    inverter_kw: float
    nominal_battery_kwh: float
    usable_battery_kwh: float

@dataclass
class PricingParams:
    """新定价规则参数"""
    panel_price_per_kw: float = 540
    inverter_price_per_kw: float = 280
    battery_price_per_kwh: float = 865
    gst_rate: float = 0.1
    panel_power_kw: float = 0.44

def calculate_system_config(panel_count: int, capacity_factor: float, params: PricingParams) -> SystemConfig:
    """计算系统配置"""
    solar_kw = round(panel_count * params.panel_power_kw * capacity_factor, 2)
    
    inverter_kw = 0
    nominal_battery_kwh = 0
    for kw_key in sorted(GS_POWER_MAPPING.keys()):
        if solar_kw <= kw_key:
            inverter_kw, nominal_battery_kwh = GS_POWER_MAPPING[kw_key]
            break
    
    if inverter_kw == 0:
        max_kw = max(GS_POWER_MAPPING.keys())
        inverter_kw, nominal_battery_kwh = GS_POWER_MAPPING[max_kw]
    
    usable_battery_kwh = round(nominal_battery_kwh * 0.95, 2)
    
    return SystemConfig(
        panel_count=panel_count,
        solar_kw=solar_kw,
        inverter_kw=inverter_kw,
        nominal_battery_kwh=nominal_battery_kwh,
        usable_battery_kwh=usable_battery_kwh
    )

def calculate_investment_cost(config: SystemConfig, is_new_system: bool, params: PricingParams) -> Dict:
    """计算投资成本（不含补贴）"""
    if is_new_system:
        panel_cost = config.solar_kw * params.panel_price_per_kw
        inverter_cost = config.inverter_kw * params.inverter_price_per_kw
    else:
        panel_cost = 0
        inverter_cost = 0
    
    battery_cost = config.nominal_battery_kwh * params.battery_price_per_kwh
    
    pre_tax_total = panel_cost + inverter_cost + battery_cost
    gst = pre_tax_total * params.gst_rate
    total_with_tax = pre_tax_total + gst
    
    # 不考虑补贴，最终投资成本 = 含税总价
    final_investment = total_with_tax
    
    return {
        'panel_cost': panel_cost,
        'inverter_cost': inverter_cost,
        'battery_cost': battery_cost,
        'pre_tax_total': pre_tax_total,
        'gst': gst,
        'total_with_tax': total_with_tax,
        'final_investment': final_investment
    }

def calculate_npv(rate: float, cash_flows: List[float]) -> float:
    """计算NPV"""
    npv = 0
    for i, cf in enumerate(cash_flows):
        npv += cf / math.pow(1 + rate, i)
    return npv

def calculate_irr(cash_flows: List[float], max_iterations: int = 100, tolerance: float = 1e-6) -> float:
    """计算IRR（使用二分法）"""
    if len(cash_flows) == 0 or cash_flows[0] >= 0:
        return None
    
    low = 0.0
    high = 1.0
    
    for _ in range(max_iterations):
        mid = (low + high) / 2
        npv = calculate_npv(mid, cash_flows)
        
        if abs(npv) < tolerance:
            return mid
        elif calculate_npv(low, cash_flows) * npv < 0:
            high = mid
        else:
            low = mid
    
    return None

def calculate_roi_metrics(config: SystemConfig, investment_cost: float, state: str,
                         annual_generation_factor: float = 1526,
                         electricity_price: float = None,
                         feed_in_tariff: float = FEED_IN_TARIFF,
                         battery_replacement_cost: float = 5000,
                         discount_rate: float = 0.0136,
                         price_inflation_rate: float = 0.025,
                         degradation_rate: float = 0.005) -> Dict:
    """
    计算投资回报指标
    参考 calculator-amortized-monthly.js 的逻辑
    """
    
    if electricity_price is None:
        electricity_price = STATE_ELECTRICITY_PRICE.get(state, 0.35)
    
    annual_consumption = STATE_CONSUMPTION.get(state, 7778)
    annual_generation = config.solar_kw * annual_generation_factor
    
    # 自用比例估算（有电池约70%，无电池约30%）
    if config.usable_battery_kwh > 0:
        self_consumption_ratio = 0.70
    else:
        self_consumption_ratio = 0.30
    
    # 月度因子
    monthly_price_inflation_factor = math.pow(1 + price_inflation_rate, 1/12)
    monthly_degradation_factor = 1 - (degradation_rate / 12)
    monthly_discount_factor = math.pow(1 + discount_rate, 1/12)
    
    # 电池成本分摊（前120个月）
    monthly_battery_amortization = (config.nominal_battery_kwh * 865) / 120 if config.nominal_battery_kwh > 0 else 0
    
    # 月度投影
    monthly_projection = []
    cumulative_savings = 0
    cumulative_discounted_savings = 0
    payback_month = None
    discounted_payback_month = None
    
    # 年度现金流（用于IRR）
    cash_flows = [-investment_cost]  # 初始投资
    
    for month in range(1, 241):  # 20年 = 240个月
        year = math.ceil(month / 12)
        month_in_year = ((month - 1) % 12)
        
        # 当前月的价格和衰减
        current_price_inflation = math.pow(monthly_price_inflation_factor, month - 1)
        current_degradation = math.pow(monthly_degradation_factor, month - 1)
        
        current_electricity_price = electricity_price * current_price_inflation
        current_feed_in_tariff = feed_in_tariff * current_price_inflation
        
        # 月度发电量和自用量（简化计算，实际应按月度分布）
        monthly_generation = (annual_generation / 12) * current_degradation
        monthly_self_consumption = monthly_generation * self_consumption_ratio
        monthly_to_grid = monthly_generation - monthly_self_consumption
        monthly_from_grid = max(0, (annual_consumption / 12) - monthly_self_consumption)
        
        # 成本计算
        cost_without_solar = (annual_consumption / 12) * current_electricity_price
        cost_with_solar = monthly_from_grid * current_electricity_price
        revenue_from_grid = monthly_to_grid * current_feed_in_tariff
        
        # 月度节省
        monthly_savings = cost_without_solar - (cost_with_solar - revenue_from_grid)
        
        # 计提法：前120个月分摊电池成本
        if month <= 120:
            monthly_savings -= monthly_battery_amortization
        
        # 第10年电池更换
        if month == 120:
            monthly_savings -= battery_replacement_cost
        
        # 累计节省
        prev_cumulative = cumulative_savings
        cumulative_savings += monthly_savings
        
        # 回本周期
        if payback_month is None and cumulative_savings >= investment_cost:
            remaining_cost = investment_cost - prev_cumulative
            if monthly_savings > 0:
                payback_month = (month - 1) + (remaining_cost / monthly_savings)
        
        # 贴现节省
        discounted_monthly_savings = monthly_savings / math.pow(monthly_discount_factor, month)
        prev_discounted_cumulative = cumulative_discounted_savings
        cumulative_discounted_savings += discounted_monthly_savings
        
        # 贴现回本周期
        if discounted_payback_month is None and cumulative_discounted_savings >= investment_cost:
            remaining_discounted_cost = investment_cost - prev_discounted_cumulative
            if discounted_monthly_savings > 0:
                discounted_payback_month = (month - 1) + (remaining_discounted_cost / discounted_monthly_savings)
        
        monthly_projection.append({
            'month': month,
            'year': year,
            'monthly_savings': monthly_savings,
            'cumulative_savings': cumulative_savings
        })
    
    # 汇总年度数据（用于IRR）
    for year in range(1, 21):
        year_months = [m for m in monthly_projection if m['year'] == year]
        net_savings = sum(m['monthly_savings'] for m in year_months)
        cash_flows.append(net_savings)
    
    # 计算IRR
    irr = calculate_irr(cash_flows)
    
    # 20年总收益
    total_20year_savings = sum(m['monthly_savings'] for m in monthly_projection)
    
    return {
        'annual_generation': annual_generation,
        'annual_consumption': annual_consumption,
        'self_consumption_ratio': self_consumption_ratio,
        'payback_years': payback_month / 12 if payback_month else None,
        'discounted_payback_years': discounted_payback_month / 12 if discounted_payback_month else None,
        'irr': irr,
        'total_20year_savings': total_20year_savings,
        'net_profit_20year': total_20year_savings - investment_cost,
        'monthly_projection': monthly_projection
    }

def run_complete_analysis():
    """运行完整分析"""
    
    print("="*120)
    print("新定价规则投资回报分析（不考虑补贴）")
    print("="*120)
    print(f"\n定价参数：")
    print(f"  面板：$540/kW")
    print(f"  逆变器：$280/kW")
    print(f"  电池：$865/kWh")
    print(f"\n分析范围：")
    print(f"  面板数量：1-100块")
    print(f"  州/领地：NSW, VIC, QLD, SA, WA, TAS, NT, ACT")
    print(f"  项目类型：新建系统、储能扩容")
    print(f"\n注意：不考虑任何政府补贴")
    print("="*120)
    
    params = PricingParams()
    states = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
    project_types = [
        ('新建系统', True),
        ('储能扩容', False)
    ]
    
    all_results = []
    
    for state in states:
        for project_name, is_new_system in project_types:
            print(f"\n处理：{state} - {project_name}")
            
            for panel_count in range(1, 101):
                config = calculate_system_config(panel_count, 0.9, params)
                
                # 计算投资成本
                cost_data = calculate_investment_cost(config, is_new_system, params)
                
                # 计算ROI
                roi_data = calculate_roi_metrics(
                    config,
                    cost_data['final_investment'],
                    state
                )
                
                # 状态评估
                if roi_data['payback_years'] is None:
                    status = "无法回本"
                elif roi_data['payback_years'] <= 10 and roi_data['irr'] and roi_data['irr'] >= 0.08:
                    status = "✅优秀"
                elif roi_data['payback_years'] <= 15:
                    status = "✅良好"
                elif roi_data['payback_years'] <= 20:
                    status = "⚠️一般"
                else:
                    status = "❌偏差"
                
                result = {
                    'state': state,
                    'project_type': project_name,
                    'panel_count': panel_count,
                    'solar_kw': config.solar_kw,
                    'inverter_kw': config.inverter_kw,
                    'battery_kwh': config.usable_battery_kwh,
                    'panel_cost': cost_data['panel_cost'],
                    'inverter_cost': cost_data['inverter_cost'],
                    'battery_cost': cost_data['battery_cost'],
                    'pre_tax_total': cost_data['pre_tax_total'],
                    'gst': cost_data['gst'],
                    'final_investment': cost_data['final_investment'],
                    'annual_generation': roi_data['annual_generation'],
                    'annual_consumption': roi_data['annual_consumption'],
                    'self_consumption_ratio': roi_data['self_consumption_ratio'],
                    'payback_years': roi_data['payback_years'],
                    'discounted_payback_years': roi_data['discounted_payback_years'],
                    'irr': roi_data['irr'] * 100 if roi_data['irr'] else None,
                    'total_20year_savings': roi_data['total_20year_savings'],
                    'net_profit_20year': roi_data['net_profit_20year'],
                    'status': status
                }
                
                all_results.append(result)
    
    return all_results

def save_results(results: List[Dict], filename: str):
    """保存结果到CSV"""
    if not results:
        return
    
    fieldnames = [
        'state', 'project_type', 'panel_count', 'solar_kw', 'inverter_kw', 'battery_kwh',
        'panel_cost', 'inverter_cost', 'battery_cost', 'pre_tax_total', 'gst', 'final_investment',
        'annual_generation', 'annual_consumption', 'self_consumption_ratio',
        'payback_years', 'discounted_payback_years', 'irr', 
        'total_20year_savings', 'net_profit_20year', 'status'
    ]
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\n结果已保存到：{filename}")

def generate_summary_report(results: List[Dict]):
    """生成汇总报告"""
    
    print("\n\n" + "="*120)
    print("汇总报告")
    print("="*120)
    
    # 按州和项目类型分组统计
    for state in ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']:
        for project_type in ['新建系统', '储能扩容']:
            filtered = [r for r in results if r['state'] == state and r['project_type'] == project_type]
            
            if not filtered:
                continue
            
            print(f"\n【{state} - {project_type}】")
            
            # 找出最佳案例
            valid_cases = [r for r in filtered if r['payback_years'] is not None and r['payback_years'] <= 20]
            
            if valid_cases:
                best_irr = max(valid_cases, key=lambda x: x['irr'] if x['irr'] else 0)
                best_payback = min(valid_cases, key=lambda x: x['payback_years'])
                
                print(f"  最佳IRR案例：{best_irr['panel_count']}块面板")
                print(f"    - 投资：${best_irr['final_investment']:,.0f}")
                print(f"    - 回本：{best_irr['payback_years']:.1f}年")
                print(f"    - IRR：{best_irr['irr']:.1f}%")
                print(f"    - 20年净收益：${best_irr['net_profit_20year']:,.0f}")
                
                print(f"  最快回本案例：{best_payback['panel_count']}块面板")
                print(f"    - 投资：${best_payback['final_investment']:,.0f}")
                print(f"    - 回本：{best_payback['payback_years']:.1f}年")
                print(f"    - IRR：{best_payback['irr']:.1f}%")
                
                # 统计各评级数量
                excellent = len([r for r in filtered if '优秀' in r['status']])
                good = len([r for r in filtered if '良好' in r['status']])
                average = len([r for r in filtered if '一般' in r['status']])
                poor = len([r for r in filtered if '偏差' in r['status'] or '无法回本' in r['status']])
                
                print(f"  评级分布：优秀{excellent}个，良好{good}个，一般{average}个，偏差{poor}个")
            else:
                print(f"  ⚠️ 所有案例均无法在20年内回本")

if __name__ == "__main__":
    # 运行分析
    results = run_complete_analysis()
    
    # 保存结果
    save_results(results, "完整分析结果.csv")
    
    # 生成汇总报告
    generate_summary_report(results)
    
    print("\n\n" + "="*120)
    print("分析完成！")
    print("="*120)
