#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ROI对比分析：新旧成本参数对回本周期、年度节省、IRR的影响
结合新规则计算验证和solar-calculator-static的逻辑
"""

import math
import csv
from typing import Dict, List
from dataclasses import dataclass

# 导入已有的计算逻辑
import sys
sys.path.append('.')

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

def calculate_old_rule_price(config: SystemConfig) -> Dict[str, float]:
    panel_cost = config.panel_count * 80 * 1.3
    inverter_cost = config.inverter_kw * 200 * 1.3
    battery_cost = config.nominal_battery_kwh * 320 * 1.3
    key_products_total = panel_cost + inverter_cost + battery_cost
    pv_base_install = 1000 * 1.3
    pv_per_kw_install = config.solar_kw * 150 * 1.3
    battery_base_install = 1000 * 1.3
    battery_per_kwh_install = config.nominal_battery_kwh * 250 * 1.3
    bos_total = pv_base_install + pv_per_kw_install + battery_base_install + battery_per_kwh_install
    pre_tax_total = key_products_total + bos_total
    gst = pre_tax_total * 0.1
    total_with_tax = pre_tax_total + gst
    return {'pre_tax': pre_tax_total, 'gst': gst, 'with_tax': total_with_tax}

def calculate_new_rule_price(config: SystemConfig) -> Dict[str, float]:
    panel_price = config.solar_kw * 500
    inverter_price = config.inverter_kw * 260
    battery_price = config.nominal_battery_kwh * 800
    pre_tax_total = panel_price + inverter_price + battery_price
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

def analyze_roi_comparison(roof_max_panels: int) -> Dict:
    config = calculate_system_config(roof_max_panels)
    if config.panel_count == 0:
        return None
    old_prices = calculate_old_rule_price(config)
    new_prices = calculate_new_rule_price(config)
    subsidy = calculate_subsidies(config)
    old_final_cost = old_prices['with_tax'] - subsidy
    new_final_cost = new_prices['with_tax'] - subsidy
    annual_consumption = 5662
    annual_generation_factor = 1526
    annual_generation = config.solar_kw * annual_generation_factor
    old_roi_config = ROIConfig(investment_cost=old_final_cost, annual_consumption=annual_consumption, annual_generation=annual_generation, 
                               battery_capacity=config.usable_battery_kwh, electricity_price=0.3, feed_in_tariff=0.07, price_inflation=3.97, 
                               panel_degradation=0.4, daily_fixed_cost=0.35, battery_replacement_cost=5000, discount_rate=1.36)
    old_roi = calculate_20_year_roi(old_roi_config)
    new_roi_config = ROIConfig(investment_cost=new_final_cost, annual_consumption=annual_consumption, annual_generation=annual_generation, 
                               battery_capacity=config.usable_battery_kwh, electricity_price=0.3, feed_in_tariff=0.07, price_inflation=3.97, 
                               panel_degradation=0.4, daily_fixed_cost=0.35, battery_replacement_cost=5000, discount_rate=1.36)
    new_roi = calculate_20_year_roi(new_roi_config)
    return {'roof_panels': roof_max_panels, 'panel_count': config.panel_count, 'solar_kw': config.solar_kw, 'inverter_kw': config.inverter_kw, 
            'battery_kwh': config.nominal_battery_kwh, 'usable_battery_kwh': config.usable_battery_kwh, 'annual_generation': annual_generation, 
            'old_final_cost': old_final_cost, 'new_final_cost': new_final_cost, 'cost_diff': new_final_cost - old_final_cost, 
            'cost_diff_rate': (new_final_cost - old_final_cost) / old_final_cost * 100, 'old_payback_years': old_roi['payback_period_years'], 
            'new_payback_years': new_roi['payback_period_years'], 
            'payback_diff_years': (new_roi['payback_period_years'] - old_roi['payback_period_years']) if (old_roi['payback_period_years'] and new_roi['payback_period_years']) else None, 
            'old_discounted_payback_years': old_roi['discounted_payback_period_years'], 'new_discounted_payback_years': new_roi['discounted_payback_period_years'], 
            'discounted_payback_diff_years': (new_roi['discounted_payback_period_years'] - old_roi['discounted_payback_period_years']) if (old_roi['discounted_payback_period_years'] and new_roi['discounted_payback_period_years']) else None, 
            'old_avg_annual_savings': old_roi['avg_annual_savings_10y'], 'new_avg_annual_savings': new_roi['avg_annual_savings_10y'], 
            'annual_savings_diff': new_roi['avg_annual_savings_10y'] - old_roi['avg_annual_savings_10y'], 
            'old_irr': old_roi['irr'] * 100 if old_roi['irr'] else None, 'new_irr': new_roi['irr'] * 100 if new_roi['irr'] else None, 
            'irr_diff': (new_roi['irr'] - old_roi['irr']) * 100 if (old_roi['irr'] and new_roi['irr']) else None, 
            'old_total_20y_savings': old_roi['total_20y_savings'], 'new_total_20y_savings': new_roi['total_20y_savings'], 
            'total_savings_diff': new_roi['total_20y_savings'] - old_roi['total_20y_savings']}

def main():
    print("=" * 150)
    print("ROI对比分析：新旧成本参数对回本周期、年度节省、IRR的影响")
    print("=" * 150)
    results = []
    for roof_panels in range(1, 101):
        result = analyze_roi_comparison(roof_panels)
        if result:
            results.append(result)
            if roof_panels % 10 == 0:
                print(f"✓ 已完成 {roof_panels} 块面板的分析")
    csv_filename = 'ROI对比分析结果.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['roof_panels', 'panel_count', 'solar_kw', 'inverter_kw', 'battery_kwh', 'usable_battery_kwh', 'annual_generation', 
                     'old_final_cost', 'new_final_cost', 'cost_diff', 'cost_diff_rate', 'old_payback_years', 'new_payback_years', 'payback_diff_years', 
                     'old_discounted_payback_years', 'new_discounted_payback_years', 'discounted_payback_diff_years', 'old_avg_annual_savings', 
                     'new_avg_annual_savings', 'annual_savings_diff', 'old_irr', 'new_irr', 'irr_diff', 'old_total_20y_savings', 'new_total_20y_savings', 'total_savings_diff']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    print(f"\n✅ 已生成CSV文件: {csv_filename}")
    print(f"\n{'=' * 150}")
    print("统计分析摘要")
    print(f"{'=' * 150}")
    cost_diffs = [r['cost_diff_rate'] for r in results]
    avg_cost_diff = sum(cost_diffs) / len(cost_diffs)
    print(f"\n【成本差异】")
    print(f"  平均最终成本差异率: {avg_cost_diff:+.2f}%")
    print(f"  最小差异: {min(cost_diffs):+.2f}%")
    print(f"  最大差异: {max(cost_diffs):+.2f}%")
    payback_diffs = [r['payback_diff_years'] for r in results if r['payback_diff_years'] is not None]
    if payback_diffs:
        avg_payback_diff = sum(payback_diffs) / len(payback_diffs)
        print(f"\n【简单回本周期差异】")
        print(f"  平均差异: {avg_payback_diff:+.2f} 年")
        print(f"  最小差异: {min(payback_diffs):+.2f} 年")
        print(f"  最大差异: {max(payback_diffs):+.2f} 年")
    disc_payback_diffs = [r['discounted_payback_diff_years'] for r in results if r['discounted_payback_diff_years'] is not None]
    if disc_payback_diffs:
        avg_disc_payback_diff = sum(disc_payback_diffs) / len(disc_payback_diffs)
        print(f"\n【贴现回本周期差异】")
        print(f"  平均差异: {avg_disc_payback_diff:+.2f} 年")
        print(f"  最小差异: {min(disc_payback_diffs):+.2f} 年")
        print(f"  最大差异: {max(disc_payback_diffs):+.2f} 年")
    annual_savings_diffs = [r['annual_savings_diff'] for r in results]
    avg_annual_savings_diff = sum(annual_savings_diffs) / len(annual_savings_diffs)
    print(f"\n【平均年度节省差异（前10年）】")
    print(f"  平均差异: ${avg_annual_savings_diff:+.2f}")
    print(f"  最小差异: ${min(annual_savings_diffs):+.2f}")
    print(f"  最大差异: ${max(annual_savings_diffs):+.2f}")
    irr_diffs = [r['irr_diff'] for r in results if r['irr_diff'] is not None]
    if irr_diffs:
        avg_irr_diff = sum(irr_diffs) / len(irr_diffs)
        print(f"\n【IRR差异】")
        print(f"  平均差异: {avg_irr_diff:+.2f}%")
        print(f"  最小差异: {min(irr_diffs):+.2f}%")
        print(f"  最大差异: {max(irr_diffs):+.2f}%")
    total_savings_diffs = [r['total_savings_diff'] for r in results]
    avg_total_savings_diff = sum(total_savings_diffs) / len(total_savings_diffs)
    print(f"\n【20年总节省差异】")
    print(f"  平均差异: ${avg_total_savings_diff:+.2f}")
    print(f"  最小差异: ${min(total_savings_diffs):+.2f}")
    print(f"  最大差异: ${max(total_savings_diffs):+.2f}")
    print(f"\n{'=' * 150}")
    print("不同规模系统的ROI表现")
    print(f"{'=' * 150}")
    small_systems = [r for r in results if r['solar_kw'] < 5]
    medium_systems = [r for r in results if 5 <= r['solar_kw'] < 15]
    large_systems = [r for r in results if r['solar_kw'] >= 15]
    def print_system_stats(systems, label):
        if not systems:
            return
        avg_cost_diff = sum(s['cost_diff_rate'] for s in systems) / len(systems)
        payback_diffs = [s['payback_diff_years'] for s in systems if s['payback_diff_years'] is not None]
        avg_payback_diff = sum(payback_diffs) / len(payback_diffs) if payback_diffs else 0
        avg_annual_savings_diff = sum(s['annual_savings_diff'] for s in systems) / len(systems)
        irr_diffs = [s['irr_diff'] for s in systems if s['irr_diff'] is not None]
        avg_irr_diff = sum(irr_diffs) / len(irr_diffs) if irr_diffs else 0
        print(f"\n{label}（样本数: {len(systems)}）：")
        print(f"  平均成本差异率: {avg_cost_diff:+.2f}%")
        print(f"  平均回本周期差异: {avg_payback_diff:+.2f} 年")
        print(f"  平均年度节省差异: ${avg_annual_savings_diff:+.2f}")
        print(f"  平均IRR差异: {avg_irr_diff:+.2f}%")
    print_system_stats(small_systems, "小型系统（< 5kW）")
    print_system_stats(medium_systems, "中型系统（5-15kW）")
    print_system_stats(large_systems, "大型系统（≥ 15kW）")
    print(f"\n{'=' * 150}")
    print("结论")
    print(f"{'=' * 150}")
    if avg_cost_diff > 0:
        print(f"\n新规则平均成本高 {avg_cost_diff:.2f}%，导致：")
        print(f"  - 回本周期平均延长 {avg_payback_diff if payback_diffs else 0:.2f} 年")
        print(f"  - IRR平均降低 {avg_irr_diff if irr_diffs else 0:.2f}%")
        print(f"  - 年度节省平均减少 ${avg_annual_savings_diff:.2f}")
    else:
        print(f"\n新规则平均成本低 {abs(avg_cost_diff):.2f}%，导致：")
        print(f"  - 回本周期平均缩短 {abs(avg_payback_diff) if payback_diffs else 0:.2f} 年")
        print(f"  - IRR平均提高 {abs(avg_irr_diff) if irr_diffs else 0:.2f}%")
        print(f"  - 年度节省平均增加 ${abs(avg_annual_savings_diff):.2f}")
    print(f"\n详细数据已保存到: {csv_filename}")
    print(f"{'=' * 150}\n")

if __name__ == "__main__":
    main()
