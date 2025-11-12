#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化参数经济效益分析
使用优化参数（489/254/782）计算回本周期、年度节省、IRR
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

def calculate_system_config(roof_max_panels: int, capacity_factor: float = 0.9, panel_power_kw: float = 0.44) -> SystemConfig:
    panel_count = math.floor(roof_max_panels * capacity_factor)
    solar_kw = panel_count * panel_power_kw
    mapping = lookup_power_mapping(solar_kw)
    return SystemConfig(panel_count=panel_count, solar_kw=solar_kw, inverter_kw=mapping["inverter_kw"], 
                       usable_battery_kwh=mapping["usable_battery_capacity_kwh"], nominal_battery_kwh=mapping["nominal_battery_capacity_kwh"])

def calculate_optimized_price(config: SystemConfig) -> Dict[str, float]:
    """优化参数价格（489/254/782）"""
    panel_price = config.solar_kw * 489
    inverter_price = config.inverter_kw * 254
    battery_price = config.nominal_battery_kwh * 782
    pre_tax_total = panel_price + inverter_price + battery_price
    gst = pre_tax_total * 0.1
    total_with_tax = pre_tax_total + gst
    return {'pre_tax': pre_tax_total, 'gst': gst, 'with_tax': total_with_tax}

def calculate_subsidies(config: SystemConfig) -> float:
    """计算补贴（NSW）"""
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
            'total_self_consumption': total_annual_self_consumption, 'to_grid': total_annual_generation - total_annual_self_consumption, 
            'from_grid': roi_config.annual_consumption - total_annual_self_consumption, 
            'self_consumption_rate': total_annual_self_consumption / total_annual_generation}

def calculate_20_year_roi(roi_config: ROIConfig) -> Dict:
    base_energy = calculate_base_energy_flow(roi_config)
    monthly_projection = []
    cash_flows = [-roi_config.investment_cost]
    cumulative_savings = 0
    payback_period_months = None
    cumulative_discounted_savings = 0
    discounted_payback_period_months = None
    monthly_price_inflation_factor = (1 + roi_config.price_inflation / 100) ** (1/12)
    monthly_degradation_factor = (1 - roi_config.panel_degradation / 100) ** (1/12)
    monthly_discount_factor = (1 + roi_config.discount_rate / 100) ** (1/12)
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
        monthly_to_grid = base_energy['to_grid'] * monthly_generation_pct * current_degradation
        monthly_from_grid = base_energy['from_grid'] * monthly_generation_pct * current_degradation
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
        discounted_monthly_savings = monthly_savings / (monthly_discount_factor ** month)
        prev_discounted_cumulative = cumulative_discounted_savings
        cumulative_discounted_savings += discounted_monthly_savings
        if discounted_payback_period_months is None and cumulative_discounted_savings >= roi_config.investment_cost:
            remaining_discounted_cost = roi_config.investment_cost - prev_discounted_cumulative
            if discounted_monthly_savings > 0:
                discounted_payback_period_months = (month - 1) + (remaining_discounted_cost / discounted_monthly_savings)
        monthly_projection.append({'month': month, 'year': year, 'monthly_savings': monthly_savings, 'cumulative_savings': cumulative_savings})
    yearly_projection = []
    for year in range(1, 21):
        year_months = [m for m in monthly_projection if m['year'] == year]
        net_savings = sum(m['monthly_savings'] for m in year_months)
        cash_flows.append(net_savings)
        yearly_projection.append({'year': year, 'net_savings': net_savings, 'cumulative_savings': year_months[-1]['cumulative_savings']})
    irr = calculate_irr(cash_flows)
    avg_annual_savings_10y = sum(y['net_savings'] for y in yearly_projection[:10]) / 10
    return {'payback_period_years': payback_period_months / 12 if payback_period_months else None, 'payback_period_months': payback_period_months, 
            'discounted_payback_period_years': discounted_payback_period_months / 12 if discounted_payback_period_months else None, 
            'discounted_payback_period_months': discounted_payback_period_months, 'irr': irr, 'avg_annual_savings_10y': avg_annual_savings_10y, 
            'total_20y_savings': yearly_projection[-1]['cumulative_savings'], 'yearly_projection': yearly_projection}

def main():
    print("=" * 150)
    print("优化参数（489/254/782）经济效益分析")
    print("=" * 150)
    print("\n计算：回本周期、年度节省、IRR\n")
    
    results = []
    
    for roof_panels in range(1, 101):
        config = calculate_system_config(roof_panels)
        if config.panel_count == 0:
            continue
        
        prices = calculate_optimized_price(config)
        subsidy = calculate_subsidies(config)
        final_cost = prices['with_tax'] - subsidy
        
        annual_consumption = 5662
        annual_generation_factor = 1526
        annual_generation = config.solar_kw * annual_generation_factor
        
        roi_config = ROIConfig(investment_cost=final_cost, annual_consumption=annual_consumption, annual_generation=annual_generation, 
                               battery_capacity=config.usable_battery_kwh, electricity_price=0.3, feed_in_tariff=0.07, price_inflation=3.97, 
                               panel_degradation=0.4, daily_fixed_cost=0.35, battery_replacement_cost=5000, discount_rate=1.36)
        
        roi = calculate_20_year_roi(roi_config)
        
        result = {
            'roof_panels': roof_panels,
            'panel_count': config.panel_count,
            'solar_kw': config.solar_kw,
            'inverter_kw': config.inverter_kw,
            'battery_kwh': config.nominal_battery_kwh,
            'usable_battery_kwh': config.usable_battery_kwh,
            'annual_generation': annual_generation,
            'pre_tax_cost': prices['pre_tax'],
            'with_tax_cost': prices['with_tax'],
            'subsidy': subsidy,
            'final_cost': final_cost,
            'payback_years': roi['payback_period_years'],
            'payback_months': roi['payback_period_months'],
            'discounted_payback_years': roi['discounted_payback_period_years'],
            'discounted_payback_months': roi['discounted_payback_period_months'],
            'avg_annual_savings_10y': roi['avg_annual_savings_10y'],
            'irr': roi['irr'] * 100 if roi['irr'] else None,
            'total_20y_savings': roi['total_20y_savings']
        }
        
        results.append(result)
        
        if roof_panels % 10 == 0:
            print(f"✓ 已完成 {roof_panels} 块面板的分析")
    
    csv_filename = '优化参数经济效益结果.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['roof_panels', 'panel_count', 'solar_kw', 'inverter_kw', 'battery_kwh', 'usable_battery_kwh', 'annual_generation',
                     'pre_tax_cost', 'with_tax_cost', 'subsidy', 'final_cost', 
                     'payback_years', 'payback_months', 'discounted_payback_years', 'discounted_payback_months',
                     'avg_annual_savings_10y', 'irr', 'total_20y_savings']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\n✅ 已生成CSV文件: {csv_filename}\n")
    
    print("=" * 150)
    print("统计分析")
    print("=" * 150)
    
    payback_years = [r['payback_years'] for r in results if r['payback_years']]
    discounted_payback_years = [r['discounted_payback_years'] for r in results if r['discounted_payback_years']]
    irrs = [r['irr'] for r in results if r['irr']]
    avg_annual_savings = [r['avg_annual_savings_10y'] for r in results]
    
    print(f"\n【简单回本周期】")
    print(f"  平均: {sum(payback_years)/len(payback_years):.2f} 年")
    print(f"  最短: {min(payback_years):.2f} 年")
    print(f"  最长: {max(payback_years):.2f} 年")
    
    print(f"\n【贴现回本周期】")
    print(f"  平均: {sum(discounted_payback_years)/len(discounted_payback_years):.2f} 年")
    print(f"  最短: {min(discounted_payback_years):.2f} 年")
    print(f"  最长: {max(discounted_payback_years):.2f} 年")
    
    print(f"\n【IRR（内部收益率）】")
    print(f"  平均: {sum(irrs)/len(irrs):.2f}%")
    print(f"  最低: {min(irrs):.2f}%")
    print(f"  最高: {max(irrs):.2f}%")
    
    print(f"\n【平均年度节省（前10年）】")
    print(f"  平均: ${sum(avg_annual_savings)/len(avg_annual_savings):.2f}")
    print(f"  最低: ${min(avg_annual_savings):.2f}")
    print(f"  最高: ${max(avg_annual_savings):.2f}")
    
    small_systems = [r for r in results if r['solar_kw'] < 5]
    medium_systems = [r for r in results if 5 <= r['solar_kw'] < 15]
    large_systems = [r for r in results if r['solar_kw'] >= 15]
    
    print(f"\n{'=' * 150}")
    print("不同规模系统的经济效益")
    print(f"{'=' * 150}")
    
    def print_system_stats(systems, label):
        if not systems:
            return
        paybacks = [s['payback_years'] for s in systems if s['payback_years']]
        irrs = [s['irr'] for s in systems if s['irr']]
        savings = [s['avg_annual_savings_10y'] for s in systems]
        print(f"\n{label}（样本数: {len(systems)}）：")
        print(f"  平均回本周期: {sum(paybacks)/len(paybacks):.2f} 年")
        print(f"  平均IRR: {sum(irrs)/len(irrs):.2f}%")
        print(f"  平均年度节省: ${sum(savings)/len(savings):.2f}")
    
    print_system_stats(small_systems, "小型系统（< 5kW）")
    print_system_stats(medium_systems, "中型系统（5-15kW）")
    print_system_stats(large_systems, "大型系统（≥ 15kW）")
    
    print(f"\n{'=' * 150}")
    print("结论")
    print(f"{'=' * 150}")
    
    avg_irr = sum(irrs)/len(irrs)
    avg_payback = sum(payback_years)/len(payback_years)
    
    print(f"\n✅ 优化参数（489/254/782）经济效益：")
    print(f"   - 平均回本周期: {avg_payback:.2f} 年")
    print(f"   - 平均IRR: {avg_irr:.2f}%（远高于银行存款利率2-3%）")
    print(f"   - 投资吸引力: {'非常高' if avg_irr > 12 else '较高' if avg_irr > 8 else '一般'}")
    
    print(f"\n{'=' * 150}")
    print(f"详细数据已保存到: {csv_filename}")
    print(f"{'=' * 150}\n")

if __name__ == "__main__":
    main()
