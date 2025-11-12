#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
安装商利润优化分析
目标：
1. 提高安装商毛利（目标28-32%）
2. 保持客户回本周期和IRR有吸引力
3. 针对各州不同用电量
4. 重点分析6.6kW、10.6kW等热门容量
"""

import math
import csv
from typing import Dict, List
from dataclasses import dataclass

# 系统配置
GS_POWER_MAPPING = [
    {"min": 0, "max": 5, "nominal_battery_capacity_kwh": 22.44, "usable_battery_capacity_kwh": 20.2, "inverter_kw": 8},
    {"min": 5, "max": 7.5, "nominal_battery_capacity_kwh": 22.22, "usable_battery_capacity_kwh": 20, "inverter_kw": 9.6},
    {"min": 7.5, "max": 12, "nominal_battery_capacity_kwh": 29.33, "usable_battery_capacity_kwh": 26.4, "inverter_kw": 9.99},
    {"min": 12, "max": 20, "nominal_battery_capacity_kwh": 28.04, "usable_battery_capacity_kwh": 25.24, "inverter_kw": 9.3},
    {"min": 20, "max": 100, "nominal_battery_capacity_kwh": 50.32, "usable_battery_capacity_kwh": 45.29, "inverter_kw": 19.50}
]

# 各州平均用电量
STATE_CONSUMPTION = {
    'TAS': 10148,
    'NT': 10008,
    'ACT': 8632,
    'NSW': 7778,
    'WA': 7634,
    'QLD': 7270,
    'SA': 7129,
    'VIC': 6778
}

DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
MONTHLY_GENERATION_PERCENTAGES = [7.5, 7.0, 8.5, 9.0, 8.5, 7.5, 8.0, 9.0, 9.5, 10.0, 9.0, 6.5]
HOURLY_GENERATION_FACTORS = [0, 0, 0, 0, 0, 0.001, 0.015, 0.04, 0.07, 0.095, 0.11, 0.115, 0.115, 0.11, 0.095, 0.07, 0.04, 0.015, 0.001, 0, 0, 0, 0, 0]
HOURLY_CONSUMPTION_PERCENTAGES = [2.5, 2.0, 1.8, 1.7, 1.8, 2.2, 3.0, 4.2, 4.8, 4.5, 4.2, 4.0, 4.0, 4.0, 4.2, 4.5, 5.5, 6.8, 7.5, 7.0, 6.0, 5.0, 4.0, 3.2]

@dataclass
class SystemConfig:
    panel_count: int
    solar_kw: float
    inverter_kw: float
    usable_battery_kwh: float
    nominal_battery_kwh: float

@dataclass
class ROIConfig:
    investment_cost: float
    annual_consumption: float
    annual_generation: float
    battery_capacity: float
    electricity_price: float
    feed_in_tariff: float
    price_inflation: float
    panel_degradation: float
    daily_fixed_cost: float
    battery_replacement_cost: float
    discount_rate: float

def lookup_power_mapping(solar_kw: float) -> Dict:
    for row in GS_POWER_MAPPING:
        if row["min"] < solar_kw <= row["max"]:
            return row
    return GS_POWER_MAPPING[-1]

def calculate_system_config(solar_kw: float, capacity_factor: float = 0.9, panel_power_kw: float = 0.44) -> SystemConfig:
    panel_count = math.floor(solar_kw / panel_power_kw)
    actual_solar_kw = panel_count * panel_power_kw
    mapping = lookup_power_mapping(actual_solar_kw)
    return SystemConfig(panel_count=panel_count, solar_kw=actual_solar_kw, inverter_kw=mapping["inverter_kw"], 
                       usable_battery_kwh=mapping["usable_battery_capacity_kwh"], nominal_battery_kwh=mapping["nominal_battery_capacity_kwh"])

def calculate_installer_cost(config: SystemConfig) -> Dict:
    """安装商成本（拿货+安装）"""
    panel_cost = config.solar_kw * 180
    inverter_cost = config.inverter_kw * 200
    battery_cost = config.nominal_battery_kwh * 320
    product_cost = panel_cost + inverter_cost + battery_cost
    
    pv_bos = 500 + config.solar_kw * 100
    battery_bos = 800 + config.nominal_battery_kwh * 80
    labor = (1 + config.solar_kw / 10 + config.nominal_battery_kwh / 30) * 500
    permit = 300 + config.solar_kw * 20
    logistics = 200 + (config.solar_kw + config.nominal_battery_kwh) * 10
    insurance = config.solar_kw * 50 + config.nominal_battery_kwh * 80
    installation_cost = pv_bos + battery_bos + labor + permit + logistics + insurance
    
    total_cost = product_cost + installation_cost
    
    return {
        'product_cost': product_cost,
        'installation_cost': installation_cost,
        'total_cost': total_cost
    }

def calculate_price(config: SystemConfig, panel_price: float, inverter_price: float, battery_price: float) -> Dict[str, float]:
    panel_total = config.solar_kw * panel_price
    inverter_total = config.inverter_kw * inverter_price
    battery_total = config.nominal_battery_kwh * battery_price
    pre_tax_total = panel_total + inverter_total + battery_total
    gst = pre_tax_total * 0.1
    total_with_tax = pre_tax_total + gst
    return {'pre_tax': pre_tax_total, 'gst': gst, 'with_tax': total_with_tax}

def calculate_subsidies(config: SystemConfig) -> float:
    pv_stc_qty = config.solar_kw * 1.382 * 6
    pv_stc_rebate = pv_stc_qty * 39
    battery_stc_qty = math.floor(config.usable_battery_kwh * 9.3)
    battery_stc_rebate = battery_stc_qty * 39
    nsw_rebate = 0
    if 2 <= config.usable_battery_kwh <= 28:
        demand_response = config.usable_battery_kwh * 0.0734
        peak_response = demand_response * 0.8
        peak_reduction = peak_response * 6 * 6
        prc_qty = math.floor(peak_reduction * 1.05 * 10)
        nsw_rebate = prc_qty * 1.65
    return pv_stc_rebate + battery_stc_rebate + nsw_rebate

def calculate_npv(rate: float, cash_flows: List[float]) -> float:
    return sum(cf / (1 + rate) ** i for i, cf in enumerate(cash_flows))

def calculate_irr(cash_flows: List[float], max_iterations: int = 100, tolerance: float = 1e-6) -> float:
    if len(cash_flows) == 0 or cash_flows[0] >= 0:
        return None
    low, high = 0.0, 1.0
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

def calculate_base_energy_flow(roi_config: ROIConfig) -> Dict:
    hourly_consumption_factors = [p / 100 for p in HOURLY_CONSUMPTION_PERCENTAGES]
    total_annual_generation = roi_config.annual_generation
    total_annual_self_consumption = 0
    for month in range(12):
        monthly_generation = total_annual_generation * (MONTHLY_GENERATION_PERCENTAGES[month] / 100)
        monthly_consumption = roi_config.annual_consumption * (MONTHLY_GENERATION_PERCENTAGES[month] / 100)
        daily_generation = monthly_generation / DAYS_IN_MONTH[month]
        daily_consumption = monthly_consumption / DAYS_IN_MONTH[month]
        daily_direct_self_consumption = 0
        daily_to_battery_potential = 0
        for hour in range(24):
            gen = daily_generation * HOURLY_GENERATION_FACTORS[hour]
            con = daily_consumption * hourly_consumption_factors[hour]
            direct_self = min(gen, con)
            to_battery = max(gen - con, 0)
            daily_direct_self_consumption += direct_self
            daily_to_battery_potential += to_battery
        daily_non_generation_consumption = daily_consumption - daily_direct_self_consumption
        daily_effective_charge = min(daily_to_battery_potential, roi_config.battery_capacity, daily_non_generation_consumption)
        monthly_self_consumption = (daily_direct_self_consumption + daily_effective_charge) * DAYS_IN_MONTH[month]
        total_annual_self_consumption += monthly_self_consumption
    return {'total_generation': total_annual_generation, 'total_consumption': roi_config.annual_consumption, 
            'total_self_consumption': total_annual_self_consumption}

def calculate_20_year_roi(roi_config: ROIConfig) -> Dict:
    base_energy = calculate_base_energy_flow(roi_config)
    cash_flows = [-roi_config.investment_cost]
    cumulative_savings = 0
    payback_period_months = None
    monthly_price_inflation_factor = (1 + roi_config.price_inflation / 100) ** (1/12)
    monthly_degradation_factor = (1 - roi_config.panel_degradation / 100) ** (1/12)
    monthly_battery_amortization = roi_config.battery_replacement_cost / 120
    
    for month in range(1, 241):
        year = math.ceil(month / 12)
        month_in_year = (month - 1) % 12
        current_price_inflation = monthly_price_inflation_factor ** (month - 1)
        current_degradation = monthly_degradation_factor ** (month - 1)
        current_electricity_price = roi_config.electricity_price * current_price_inflation
        current_feed_in_tariff = roi_config.feed_in_tariff * current_price_inflation
        current_daily_fixed_cost = roi_config.daily_fixed_cost * current_price_inflation
        monthly_generation_pct = MONTHLY_GENERATION_PERCENTAGES[month_in_year] / 100
        days_in_month = DAYS_IN_MONTH[month_in_year]
        
        monthly_generation = base_energy['total_generation'] * monthly_generation_pct * current_degradation
        monthly_self_consumption = base_energy['total_self_consumption'] * monthly_generation_pct * current_degradation
        monthly_to_grid = (base_energy['total_generation'] - base_energy['total_self_consumption']) * monthly_generation_pct * current_degradation
        monthly_from_grid = (base_energy['total_consumption'] - base_energy['total_self_consumption']) * monthly_generation_pct * current_degradation
        monthly_consumption = roi_config.annual_consumption * monthly_generation_pct
        
        cost_without_solar = (monthly_consumption * current_electricity_price) + (days_in_month * current_daily_fixed_cost)
        cost_with_solar = (monthly_from_grid * current_electricity_price) + (days_in_month * current_daily_fixed_cost)
        revenue_from_grid = monthly_to_grid * current_feed_in_tariff
        monthly_savings = cost_without_solar - (cost_with_solar - revenue_from_grid)
        
        if month <= 120:
            monthly_savings -= monthly_battery_amortization
        
        prev_cumulative = cumulative_savings
        cumulative_savings += monthly_savings
        
        if payback_period_months is None and cumulative_savings >= roi_config.investment_cost:
            remaining_cost = roi_config.investment_cost - prev_cumulative
            if monthly_savings > 0:
                payback_period_months = (month - 1) + (remaining_cost / monthly_savings)
    
    yearly_projection = []
    for year in range(1, 21):
        year_start = (year - 1) * 12 + 1
        year_end = year * 12
        # 简化计算
        net_savings = cumulative_savings / 20  # 简化
        cash_flows.append(net_savings)
        yearly_projection.append({'year': year, 'net_savings': net_savings})
    
    irr = calculate_irr(cash_flows)
    
    return {
        'payback_period_years': payback_period_months / 12 if payback_period_months else None,
        'irr': irr
    }

def main():
    print("="*150)
    print("安装商利润优化分析")
    print("="*150)
    print("\n目标：")
    print("  1. 提高安装商毛利（目标28-32%）")
    print("  2. 保持客户回本周期有吸引力（< 8年）")
    print("  3. 保持客户IRR有吸引力（> 12%）")
    print("  4. 电价$0.35/kWh，各州不同用电量")
    print("  5. 重点分析热门容量：6.6kW、10.6kW等\n")
    
    # 定义测试系统（热门容量）
    test_systems = [
        {'name': '小型系统', 'solar_kw': 3.3, 'category': '小型'},
        {'name': '中小型系统', 'solar_kw': 6.6, 'category': '中小型'},
        {'name': '中型系统', 'solar_kw': 10.6, 'category': '中型'},
        {'name': '中大型系统', 'solar_kw': 13.2, 'category': '中大型'},
        {'name': '大型系统', 'solar_kw': 20.0, 'category': '大型'},
    ]
    
    # 测试不同参数方案
    param_scenarios = [
        {'name': '原参数', 'panel': 489, 'inverter': 254, 'battery': 782},
        {'name': '方案1（+5%）', 'panel': 515, 'inverter': 267, 'battery': 821},
        {'name': '方案2（+8%）', 'panel': 528, 'inverter': 274, 'battery': 844},
        {'name': '方案3（+10%）', 'panel': 538, 'inverter': 279, 'battery': 860},
        {'name': '方案4（+12%）', 'panel': 548, 'inverter': 285, 'battery': 876},
    ]
    
    # 选择代表性州
    representative_states = ['TAS', 'NSW', 'VIC']
    
    print("="*150)
    print("【各州、各容量、各参数方案的综合分析】")
    print("="*150)
    
    results = []
    
    for state in representative_states:
        consumption = STATE_CONSUMPTION[state]
        print(f"\n{'='*150}")
        print(f"州：{state}（年用电量：{consumption:,} kWh）")
        print(f"{'='*150}")
        
        for system in test_systems:
            config = calculate_system_config(system['solar_kw'])
            annual_generation = config.solar_kw * 1526
            
            print(f"\n{system['name']}（{config.solar_kw:.1f}kW光伏 + {config.inverter_kw:.1f}kW逆变器 + {config.nominal_battery_kwh:.1f}kWh电池）")
            print(f"{'-'*150}")
            
            installer_cost = calculate_installer_cost(config)
            
            for scenario in param_scenarios:
                prices = calculate_price(config, scenario['panel'], scenario['inverter'], scenario['battery'])
                subsidy = calculate_subsidies(config)
                final_cost = prices['with_tax'] - subsidy
                
                margin = (prices['pre_tax'] - installer_cost['total_cost']) / prices['pre_tax'] * 100
                profit = prices['pre_tax'] - installer_cost['total_cost']
                
                roi_config = ROIConfig(
                    investment_cost=final_cost, annual_consumption=consumption,
                    annual_generation=annual_generation, battery_capacity=config.usable_battery_kwh,
                    electricity_price=0.35, feed_in_tariff=0.07, price_inflation=3.97,
                    panel_degradation=0.4, daily_fixed_cost=0.35, battery_replacement_cost=5000, discount_rate=1.36
                )
                
                roi = calculate_20_year_roi(roi_config)
                
                # 评估是否符合目标
                margin_ok = 28 <= margin <= 32
                payback_ok = roi['payback_period_years'] and roi['payback_period_years'] < 8
                irr_ok = roi['irr'] and roi['irr'] * 100 > 12
                
                all_ok = margin_ok and payback_ok and irr_ok
                
                result = {
                    'state': state,
                    'consumption': consumption,
                    'system': system['name'],
                    'solar_kw': config.solar_kw,
                    'scenario': scenario['name'],
                    'panel': scenario['panel'],
                    'inverter': scenario['inverter'],
                    'battery': scenario['battery'],
                    'final_cost': final_cost,
                    'margin': margin,
                    'profit': profit,
                    'payback': roi['payback_period_years'],
                    'irr': roi['irr'] * 100 if roi['irr'] else None,
                    'all_ok': all_ok
                }
                
                results.append(result)
                
                status = "✅" if all_ok else "⚠️"
                print(f"  {status} {scenario['name']:15s} | 毛利率:{margin:5.1f}% | 回本:{roi['payback_period_years']:5.2f}年 | IRR:{roi['irr']*100:5.2f}% | 成本:${final_cost:,.0f}")
    
    # 综合推荐
    print(f"\n\n{'='*150}")
    print("【综合推荐分析】")
    print(f"{'='*150}")
    
    # 找出符合所有条件的方案
    qualified_results = [r for r in results if r['all_ok']]
    
    if qualified_results:
        print(f"\n✅ 符合所有条件的方案数量：{len(qualified_results)}/{len(results)}")
        
        # 按参数方案分组统计
        from collections import defaultdict
        scenario_stats = defaultdict(list)
        for r in qualified_results:
            key = f"{r['panel']}/{r['inverter']}/{r['battery']}"
            scenario_stats[key].append(r)
        
        print(f"\n各参数方案的适用情况：")
        for params, matches in sorted(scenario_stats.items(), key=lambda x: len(x[1]), reverse=True):
            print(f"\n  参数 {params}：")
            print(f"    适用场景数：{len(matches)}/{len(results)} ({len(matches)/len(results)*100:.1f}%)")
            
            avg_margin = sum(m['margin'] for m in matches) / len(matches)
            avg_payback = sum(m['payback'] for m in matches) / len(matches)
            avg_irr = sum(m['irr'] for m in matches) / len(matches)
            
            print(f"    平均毛利率：{avg_margin:.1f}%")
            print(f"    平均回本周期：{avg_payback:.2f}年")
            print(f"    平均IRR：{avg_irr:.2f}%")
            
            # 列出适用的州和系统
            states = set(m['state'] for m in matches)
            systems = set(m['system'] for m in matches)
            print(f"    适用州：{', '.join(sorted(states))}")
            print(f"    适用系统：{', '.join(sorted(systems))}")
    
    # 最终推荐
    print(f"\n\n{'='*150}")
    print("【最终推荐】")
    print(f"{'='*150}")
    
    # 计算最优参数（覆盖最多场景）
    best_scenario = max(scenario_stats.items(), key=lambda x: len(x[1]))
    best_params = best_scenario[0]
    best_matches = best_scenario[1]
    
    print(f"\n✅ 推荐参数：{best_params}")
    print(f"\n核心优势：")
    print(f"  1. 覆盖率：{len(best_matches)}/{len(results)}场景（{len(best_matches)/len(results)*100:.1f}%）")
    print(f"  2. 平均毛利率：{sum(m['margin'] for m in best_matches)/len(best_matches):.1f}%（目标28-32%）")
    print(f"  3. 平均回本周期：{sum(m['payback'] for m in best_matches)/len(best_matches):.2f}年（目标<8年）")
    print(f"  4. 平均IRR：{sum(m['irr'] for m in best_matches)/len(best_matches):.2f}%（目标>12%）")
    
    print(f"\n适用场景：")
    for state in representative_states:
        state_matches = [m for m in best_matches if m['state'] == state]
        if state_matches:
            systems = [m['system'] for m in state_matches]
            print(f"  ✅ {state}（{STATE_CONSUMPTION[state]:,} kWh/年）：{', '.join(systems)}")
    
    print(f"\n与原参数（489/254/782）对比：")
    panel_change = (int(best_params.split('/')[0]) - 489) / 489 * 100
    print(f"  面板：{best_params.split('/')[0]}/kW vs 489/kW（{panel_change:+.1f}%）")
    print(f"  逆变器：{best_params.split('/')[1]}/kW vs 254/kW（{(int(best_params.split('/')[1])-254)/254*100:+.1f}%）")
    print(f"  电池：{best_params.split('/')[2]}/kWh vs 782/kWh（{(int(best_params.split('/')[2])-782)/782*100:+.1f}%）")
    
    print("\n" + "="*150 + "\n")
    
    # 保存详细结果
    csv_filename = '安装商利润优化结果.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['state', 'consumption', 'system', 'solar_kw', 'scenario', 'panel', 'inverter', 'battery',
                     'final_cost', 'margin', 'profit', 'payback', 'irr', 'all_ok']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"✅ 详细结果已保存到：{csv_filename}\n")

if __name__ == "__main__":
    main()
