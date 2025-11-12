#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
定价参数边界分析
目标：找出可能导致最终报价为负或过低的参数组合，并给出合理的参数下限
"""

import math
from typing import Dict
from dataclasses import dataclass

# 系统配置映射表
GS_POWER_MAPPING = [
    {"min": 0, "max": 5, "nominal_battery_capacity_kwh": 22.44, "usable_battery_capacity_kwh": 20.2, "inverter_kw": 8},
    {"min": 5, "max": 7.5, "nominal_battery_capacity_kwh": 22.22, "usable_battery_capacity_kwh": 20, "inverter_kw": 9.6},
    {"min": 7.5, "max": 12, "nominal_battery_capacity_kwh": 29.33, "usable_battery_capacity_kwh": 26.4, "inverter_kw": 9.99},
    {"min": 12, "max": 20, "nominal_battery_capacity_kwh": 28.04, "usable_battery_capacity_kwh": 25.24, "inverter_kw": 9.3},
    {"min": 20, "max": 100, "nominal_battery_capacity_kwh": 50.32, "usable_battery_capacity_kwh": 45.29, "inverter_kw": 19.50}
]

@dataclass
class SystemConfig:
    panel_count: int
    solar_kw: float
    inverter_kw: float
    usable_battery_kwh: float
    nominal_battery_kwh: float

def lookup_power_mapping(solar_kw: float) -> Dict:
    for row in GS_POWER_MAPPING:
        if row["min"] < solar_kw <= row["max"]:
            return row
    return GS_POWER_MAPPING[-1]

def calculate_system_config(roof_max_panels: int, capacity_factor: float = 0.9, panel_power_kw: float = 0.44) -> SystemConfig:
    panel_count = math.floor(roof_max_panels * capacity_factor)
    solar_kw = panel_count * panel_power_kw
    mapping = lookup_power_mapping(solar_kw)
    return SystemConfig(
        panel_count=panel_count,
        solar_kw=solar_kw,
        inverter_kw=mapping["inverter_kw"],
        usable_battery_kwh=mapping["usable_battery_capacity_kwh"],
        nominal_battery_kwh=mapping["nominal_battery_capacity_kwh"]
    )

def calculate_subsidies(config: SystemConfig, region: str = 'NSW') -> Dict[str, float]:
    """计算补贴"""
    # PV STC
    pv_stc_qty = config.solar_kw * 1.382 * 6
    pv_stc_rebate = pv_stc_qty * 39
    
    # Battery STC
    battery_stc_qty = math.floor(config.usable_battery_kwh * 9.3)
    battery_stc_rebate = battery_stc_qty * 39
    
    # NSW VPP Rebate
    nsw_rebate = 0
    if region == 'NSW' and 2 <= config.usable_battery_kwh <= 28:
        demand_response = config.usable_battery_kwh * 0.0734
        peak_response = demand_response * 0.8
        peak_reduction = peak_response * 6 * 6
        prc_qty = math.floor(peak_reduction * 1.05 * 10)
        nsw_rebate = prc_qty * 1.65
    
    # VIC Rebate
    vic_rebate = 1400 if region == 'VIC' else 0
    vic_loan = 1400 if region == 'VIC' else 0
    
    total_subsidy = pv_stc_rebate + battery_stc_rebate + nsw_rebate + vic_rebate + vic_loan
    
    return {
        'pv_stc': pv_stc_rebate,
        'battery_stc': battery_stc_rebate,
        'nsw_vpp': nsw_rebate,
        'vic_rebate': vic_rebate,
        'vic_loan': vic_loan,
        'total': total_subsidy
    }

def calculate_price_with_params(config: SystemConfig, panel_price: float, inverter_price: float, 
                                battery_price: float, region: str = 'NSW') -> Dict:
    """
    使用简化的定价模型（类似489/254/782参数）
    这里的价格是每单位的售价（含利润）
    """
    # Key Products
    panel_total = config.solar_kw * panel_price
    inverter_total = config.inverter_kw * inverter_price
    battery_total = config.nominal_battery_kwh * battery_price
    key_products_total = panel_total + inverter_total + battery_total
    
    # 税前总价
    pre_tax_total = key_products_total
    
    # GST
    gst = pre_tax_total * 0.1
    
    # 含税总价
    total_with_tax = pre_tax_total + gst
    
    # 补贴
    subsidies = calculate_subsidies(config, region)
    
    # 最终报价
    final_price = total_with_tax - subsidies['total']
    
    return {
        'panel_total': panel_total,
        'inverter_total': inverter_total,
        'battery_total': battery_total,
        'pre_tax_total': pre_tax_total,
        'gst': gst,
        'total_with_tax': total_with_tax,
        'subsidies': subsidies,
        'final_price': final_price
    }

def test_pricing_boundaries():
    """测试定价边界，找出可能导致负值或过低报价的情况"""
    
    print("="*120)
    print("定价参数边界分析")
    print("="*120)
    print("\n目标：找出可能导致最终报价为负或过低的参数组合\n")
    
    # 测试不同的屋顶面板数量（从1到100）
    test_panel_counts = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    
    # 测试不同的参数组合
    test_scenarios = [
        {'name': '极低参数', 'panel': 50, 'inverter': 50, 'battery': 50},
        {'name': '很低参数', 'panel': 100, 'inverter': 100, 'battery': 100},
        {'name': '低参数', 'panel': 200, 'inverter': 150, 'battery': 200},
        {'name': '中低参数', 'panel': 300, 'inverter': 200, 'battery': 400},
        {'name': '推荐参数', 'panel': 489, 'inverter': 254, 'battery': 782},
    ]
    
    # 测试不同地区（补贴不同）
    test_regions = ['NSW', 'VIC', 'QLD']
    
    print("【测试场景】")
    print(f"  屋顶面板数量：{test_panel_counts}")
    print(f"  地区：{test_regions}")
    print(f"  参数方案：{len(test_scenarios)}种\n")
    
    # 存储问题案例
    negative_cases = []
    low_price_cases = []  # 最终报价 < $5000
    very_low_price_cases = []  # 最终报价 < $2000
    
    for region in test_regions:
        print(f"\n{'='*120}")
        print(f"地区：{region}")
        print(f"{'='*120}")
        
        for scenario in test_scenarios:
            print(f"\n{'-'*120}")
            print(f"参数方案：{scenario['name']} - 面板${scenario['panel']}/kW，逆变器${scenario['inverter']}/kW，电池${scenario['battery']}/kWh")
            print(f"{'-'*120}")
            
            for panel_count in test_panel_counts:
                config = calculate_system_config(panel_count)
                result = calculate_price_with_params(
                    config, 
                    scenario['panel'], 
                    scenario['inverter'], 
                    scenario['battery'],
                    region
                )
                
                status = ""
                if result['final_price'] < 0:
                    status = "❌ 负值"
                    negative_cases.append({
                        'region': region,
                        'scenario': scenario['name'],
                        'panel_count': panel_count,
                        'solar_kw': config.solar_kw,
                        'final_price': result['final_price'],
                        'subsidy': result['subsidies']['total'],
                        'total_with_tax': result['total_with_tax']
                    })
                elif result['final_price'] < 2000:
                    status = "⚠️ 极低（<$2000）"
                    very_low_price_cases.append({
                        'region': region,
                        'scenario': scenario['name'],
                        'panel_count': panel_count,
                        'solar_kw': config.solar_kw,
                        'final_price': result['final_price']
                    })
                elif result['final_price'] < 5000:
                    status = "⚠️ 很低（<$5000）"
                    low_price_cases.append({
                        'region': region,
                        'scenario': scenario['name'],
                        'panel_count': panel_count,
                        'solar_kw': config.solar_kw,
                        'final_price': result['final_price']
                    })
                else:
                    status = "✅ 正常"
                
                print(f"  {panel_count:3d}块面板（{config.solar_kw:5.2f}kW）：税前${result['pre_tax_total']:8,.0f} | 补贴${result['subsidies']['total']:8,.0f} | 最终${result['final_price']:8,.0f} | {status}")
    
    # 汇总分析
    print(f"\n\n{'='*120}")
    print("【问题案例汇总】")
    print(f"{'='*120}")
    
    print(f"\n❌ 负值案例数量：{len(negative_cases)}")
    if negative_cases:
        print("\n详细列表：")
        for case in negative_cases[:10]:  # 只显示前10个
            print(f"  {case['region']} | {case['scenario']:15s} | {case['panel_count']:3d}块（{case['solar_kw']:.2f}kW）| 税前${case['total_with_tax']:,.0f} - 补贴${case['subsidy']:,.0f} = ${case['final_price']:,.0f}")
    
    print(f"\n⚠️ 极低价格案例（<$2000）：{len(very_low_price_cases)}")
    if very_low_price_cases:
        print("\n详细列表：")
        for case in very_low_price_cases[:10]:
            print(f"  {case['region']} | {case['scenario']:15s} | {case['panel_count']:3d}块（{case['solar_kw']:.2f}kW）| 最终${case['final_price']:,.0f}")
    
    print(f"\n⚠️ 很低价格案例（<$5000）：{len(low_price_cases)}")
    
    # 分析并给出建议
    print(f"\n\n{'='*120}")
    print("【参数下限建议】")
    print(f"{'='*120}")
    
    # 找出最小的不产生负值的参数
    print("\n基于补贴结构分析：")
    
    # 计算不同系统规模的补贴
    print("\n典型系统的补贴金额：")
    for panel_count in [5, 10, 20, 30, 50, 80]:
        config = calculate_system_config(panel_count)
        nsw_subsidy = calculate_subsidies(config, 'NSW')
        vic_subsidy = calculate_subsidies(config, 'VIC')
        print(f"  {panel_count:3d}块面板（{config.solar_kw:5.2f}kW + {config.nominal_battery_kwh:5.2f}kWh电池）：")
        print(f"    NSW补贴：${nsw_subsidy['total']:8,.0f}（PV STC:${nsw_subsidy['pv_stc']:,.0f} + 电池STC:${nsw_subsidy['battery_stc']:,.0f} + NSW VPP:${nsw_subsidy['nsw_vpp']:,.0f}）")
        print(f"    VIC补贴：${vic_subsidy['total']:8,.0f}（PV STC:${vic_subsidy['pv_stc']:,.0f} + 电池STC:${vic_subsidy['battery_stc']:,.0f} + VIC:${vic_subsidy['vic_rebate']+vic_subsidy['vic_loan']:,.0f}）")
    
    # 计算安全的参数下限
    print("\n\n推荐参数下限（确保最终报价≥$5000）：")
    
    # 对于小型系统（5块面板）
    small_config = calculate_system_config(5)
    small_subsidy_nsw = calculate_subsidies(small_config, 'NSW')['total']
    small_subsidy_vic = calculate_subsidies(small_config, 'VIC')['total']
    max_subsidy_small = max(small_subsidy_nsw, small_subsidy_vic)
    
    # 需要的税前价格 = (最终报价 + 补贴) / 1.1
    target_final_price = 5000
    required_pre_tax_small = (target_final_price + max_subsidy_small) / 1.1
    
    # 分配到各组件（按489/254/782的比例）
    total_capacity_small = small_config.solar_kw + small_config.inverter_kw + small_config.nominal_battery_kwh
    panel_ratio = small_config.solar_kw / total_capacity_small
    inverter_ratio = small_config.inverter_kw / total_capacity_small
    battery_ratio = small_config.nominal_battery_kwh / total_capacity_small
    
    # 按原参数的相对比例分配
    # 489/254/782 的比例约为 1.93 : 1.00 : 3.08
    panel_weight = 489 * panel_ratio
    inverter_weight = 254 * inverter_ratio
    battery_weight = 782 * battery_ratio
    total_weight = panel_weight + inverter_weight + battery_weight
    
    min_panel = (required_pre_tax_small * panel_weight / total_weight) / small_config.solar_kw
    min_inverter = (required_pre_tax_small * inverter_weight / total_weight) / small_config.inverter_kw
    min_battery = (required_pre_tax_small * battery_weight / total_weight) / small_config.nominal_battery_kwh
    
    print(f"\n小型系统（{small_config.panel_count}块面板，{small_config.solar_kw:.2f}kW）：")
    print(f"  最大补贴：${max_subsidy_small:,.0f}")
    print(f"  需要税前价格：${required_pre_tax_small:,.0f}")
    print(f"  建议参数下限：")
    print(f"    面板：≥ ${min_panel:.0f}/kW")
    print(f"    逆变器：≥ ${min_inverter:.0f}/kW")
    print(f"    电池：≥ ${min_battery:.0f}/kWh")
    
    # 对于中型系统（30块面板）
    medium_config = calculate_system_config(30)
    medium_subsidy_nsw = calculate_subsidies(medium_config, 'NSW')['total']
    medium_subsidy_vic = calculate_subsidies(medium_config, 'VIC')['total']
    max_subsidy_medium = max(medium_subsidy_nsw, medium_subsidy_vic)
    
    required_pre_tax_medium = (target_final_price + max_subsidy_medium) / 1.1
    
    total_capacity_medium = medium_config.solar_kw + medium_config.inverter_kw + medium_config.nominal_battery_kwh
    panel_ratio_m = medium_config.solar_kw / total_capacity_medium
    inverter_ratio_m = medium_config.inverter_kw / total_capacity_medium
    battery_ratio_m = medium_config.nominal_battery_kwh / total_capacity_medium
    
    panel_weight_m = 489 * panel_ratio_m
    inverter_weight_m = 254 * inverter_ratio_m
    battery_weight_m = 782 * battery_ratio_m
    total_weight_m = panel_weight_m + inverter_weight_m + battery_weight_m
    
    min_panel_m = (required_pre_tax_medium * panel_weight_m / total_weight_m) / medium_config.solar_kw
    min_inverter_m = (required_pre_tax_medium * inverter_weight_m / total_weight_m) / medium_config.inverter_kw
    min_battery_m = (required_pre_tax_medium * battery_weight_m / total_weight_m) / medium_config.nominal_battery_kwh
    
    print(f"\n中型系统（{medium_config.panel_count}块面板，{medium_config.solar_kw:.2f}kW）：")
    print(f"  最大补贴：${max_subsidy_medium:,.0f}")
    print(f"  需要税前价格：${required_pre_tax_medium:,.0f}")
    print(f"  建议参数下限：")
    print(f"    面板：≥ ${min_panel_m:.0f}/kW")
    print(f"    逆变器：≥ ${min_inverter_m:.0f}/kW")
    print(f"    电池：≥ ${min_battery_m:.0f}/kWh")
    
    # 综合建议
    print(f"\n\n{'='*120}")
    print("【最终建议的参数下限】")
    print(f"{'='*120}")
    
    # 取较大值作为安全下限
    safe_panel_min = max(min_panel, min_panel_m)
    safe_inverter_min = max(min_inverter, min_inverter_m)
    safe_battery_min = max(min_battery, min_battery_m)
    
    # 向上取整到10的倍数
    safe_panel_min = math.ceil(safe_panel_min / 10) * 10
    safe_inverter_min = math.ceil(safe_inverter_min / 10) * 10
    safe_battery_min = math.ceil(safe_battery_min / 10) * 10
    
    print(f"\n✅ 推荐的参数下限（确保所有系统最终报价≥$5000）：")
    print(f"  面板：≥ ${safe_panel_min}/kW")
    print(f"  逆变器：≥ ${safe_inverter_min}/kW")
    print(f"  电池：≥ ${safe_battery_min}/kWh")
    
    print(f"\n说明：")
    print(f"  1. 这些下限基于VIC州的高补贴场景（补贴最高）")
    print(f"  2. 确保即使在最小系统（5块面板）+ 最高补贴的情况下，最终报价也≥$5000")
    print(f"  3. 实际使用时建议留有10-20%的安全余量")
    
    print(f"\n⚠️ 保守建议（含20%安全余量）：")
    conservative_panel = math.ceil(safe_panel_min * 1.2 / 10) * 10
    conservative_inverter = math.ceil(safe_inverter_min * 1.2 / 10) * 10
    conservative_battery = math.ceil(safe_battery_min * 1.2 / 10) * 10
    print(f"  面板：≥ ${conservative_panel}/kW")
    print(f"  逆变器：≥ ${conservative_inverter}/kW")
    print(f"  电池：≥ ${conservative_battery}/kWh")
    
    # 验证推荐参数
    print(f"\n\n{'='*120}")
    print("【验证推荐参数】")
    print(f"{'='*120}")
    
    print(f"\n使用推荐下限参数（{safe_panel_min}/{safe_inverter_min}/{safe_battery_min}）测试：")
    for panel_count in [5, 10, 20, 30]:
        config = calculate_system_config(panel_count)
        result_nsw = calculate_price_with_params(config, safe_panel_min, safe_inverter_min, safe_battery_min, 'NSW')
        result_vic = calculate_price_with_params(config, safe_panel_min, safe_inverter_min, safe_battery_min, 'VIC')
        print(f"  {panel_count:3d}块面板（{config.solar_kw:5.2f}kW）：NSW最终${result_nsw['final_price']:8,.0f} | VIC最终${result_vic['final_price']:8,.0f}")
    
    print("\n" + "="*120 + "\n")

if __name__ == "__main__":
    test_pricing_boundaries()
