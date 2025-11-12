#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
新规则定价边界分析
新规则：直接使用每kW/kWh的整体报价，不再区分Key Products和BOS
税前整体报价 = 面板系统容量 * 每kW面板报价 + 逆变器功率 * 每kW逆变器报价 + 电池标称容量 * 每kWh电池报价
"""

import math
import csv
from typing import Dict, List
from dataclasses import dataclass

# GS功率映射表
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

@dataclass
class NewPricingParams:
    """新规则的定价参数 - 直接使用每kW/kWh的整体报价"""
    panel_price_per_kw: float = 540  # AUD/kW
    inverter_price_per_kw: float = 280  # AUD/kW
    battery_price_per_kwh: float = 865  # AUD/kWh（标称容量）
    
    # 补贴参数
    zone_rating: float = 1.382
    deeming_period: int = 6
    pv_stc_price: float = 39
    battery_stc_factor: float = 9.3
    battery_stc_price: float = 39
    vic_rebate: float = 1400
    vic_loan: float = 1400
    nsw_prc_price: float = 1.65
    network_loss_factor: float = 1.05
    
    # 其他
    gst_rate: float = 0.1
    panel_power_kw: float = 0.44

def lookup_power_mapping(solar_kw: float) -> Dict:
    """查询GS功率映射表"""
    for row in GS_POWER_MAPPING:
        if row["min"] < solar_kw <= row["max"]:
            return row
    return GS_POWER_MAPPING[-1]

def calculate_system_config(roof_max_panels: int, capacity_factor: float, params: NewPricingParams) -> SystemConfig:
    """计算系统配置"""
    panel_count = math.floor(roof_max_panels * capacity_factor)
    solar_kw = panel_count * params.panel_power_kw
    mapping = lookup_power_mapping(solar_kw)
    
    return SystemConfig(
        panel_count=panel_count,
        solar_kw=solar_kw,
        inverter_kw=mapping["inverter_kw"],
        usable_battery_kwh=mapping["usable_battery_capacity_kwh"],
        nominal_battery_kwh=mapping["nominal_battery_capacity_kwh"]
    )

def calculate_subsidies_new(config: SystemConfig, region: str, is_new_system: bool, params: NewPricingParams) -> Dict:
    """
    计算补贴（参考Quote/calculator.js的逻辑）
    """
    subsidies = {
        'pv_stc': 0,
        'battery_stc': 0,
        'vic_rebate': 0,
        'vic_loan': 0,
        'nsw_vpp': 0,
        'total': 0
    }
    
    # STC PV Rebate（仅新建系统）
    if is_new_system:
        pv_stc_qty = config.solar_kw * params.zone_rating * params.deeming_period
        pv_stc_rebate = pv_stc_qty * params.pv_stc_price
        subsidies['pv_stc'] = pv_stc_rebate
    
    # STC Battery Rebate（新建和扩容都有）
    battery_stc_qty = math.floor(config.usable_battery_kwh * params.battery_stc_factor)
    battery_stc_rebate = battery_stc_qty * params.battery_stc_price
    subsidies['battery_stc'] = battery_stc_rebate
    
    # VIC州补贴（仅新建系统）
    if region == 'VIC' and is_new_system:
        subsidies['vic_rebate'] = params.vic_rebate
        subsidies['vic_loan'] = params.vic_loan
    
    # NSW VPP Rebate（新建和扩容都有，但有容量限制）
    if region == 'NSW' and 2 <= config.usable_battery_kwh <= 28:
        demand_response = config.usable_battery_kwh * 0.0734
        peak_response = demand_response * 0.8
        peak_reduction = peak_response * 6 * 6
        prc_qty = math.floor(peak_reduction * params.network_loss_factor * 10)
        nsw_rebate = prc_qty * params.nsw_prc_price
        subsidies['nsw_vpp'] = nsw_rebate
    
    subsidies['total'] = sum([subsidies['pv_stc'], subsidies['battery_stc'], 
                             subsidies['vic_rebate'], subsidies['vic_loan'], 
                             subsidies['nsw_vpp']])
    
    return subsidies

def calculate_price_new_rule(config: SystemConfig, region: str, is_new_system: bool, params: NewPricingParams) -> Dict:
    """
    新规则：税前整体报价 = 面板系统容量 * 每kW面板报价 + 逆变器功率 * 每kW逆变器报价 + 电池标称容量 * 每kWh电池报价
    """
    # 新建系统考虑面板和逆变器，储能扩容不考虑
    if is_new_system:
        panel_cost = config.solar_kw * params.panel_price_per_kw
        inverter_cost = config.inverter_kw * params.inverter_price_per_kw
    else:
        panel_cost = 0
        inverter_cost = 0
    
    battery_cost = config.nominal_battery_kwh * params.battery_price_per_kwh
    
    # 税前总价
    pre_tax_total = panel_cost + inverter_cost + battery_cost
    
    # GST
    gst = pre_tax_total * params.gst_rate
    
    # 含税总价
    total_with_tax = pre_tax_total + gst
    
    # 补贴
    subsidies = calculate_subsidies_new(config, region, is_new_system, params)
    
    # 最终报价
    final_price = total_with_tax - subsidies['total']
    
    return {
        'config': config,
        'panel_cost': panel_cost,
        'inverter_cost': inverter_cost,
        'battery_cost': battery_cost,
        'pre_tax_total': pre_tax_total,
        'gst': gst,
        'total_with_tax': total_with_tax,
        'subsidies': subsidies,
        'final_price': final_price
    }

def test_all_scenarios():
    """测试所有场景"""
    
    # 测试参数组合
    test_scenarios = [
        {'name': '极低参数', 'panel': 50, 'inverter': 50, 'battery': 100},
        {'name': '很低参数', 'panel': 100, 'inverter': 100, 'battery': 200},
        {'name': '低参数', 'panel': 200, 'inverter': 150, 'battery': 400},
        {'name': '中低参数', 'panel': 300, 'inverter': 200, 'battery': 600},
        {'name': '推荐参数', 'panel': 540, 'inverter': 280, 'battery': 865},
    ]
    
    # 测试所有屋顶面板数量（1-100）
    test_panel_counts = list(range(1, 101))
    
    # 测试所有地区
    test_regions = ['NSW', 'VIC', 'QLD', 'SA', 'WA']
    
    # 测试两种项目类型
    test_project_types = [
        {'name': '新建系统', 'is_new': True, 'capacity_factor': 0.9},
        {'name': '电池扩容', 'is_new': False, 'capacity_factor': 0.7}
    ]
    
    all_results = []
    
    for scenario in test_scenarios:
        print(f"\n{'='*120}")
        print(f"测试场景：{scenario['name']}")
        print(f"参数：面板${scenario['panel']}/kW，逆变器${scenario['inverter']}/kW，电池${scenario['battery']}/kWh")
        print(f"{'='*120}")
        
        params = NewPricingParams(
            panel_price_per_kw=scenario['panel'],
            inverter_price_per_kw=scenario['inverter'],
            battery_price_per_kwh=scenario['battery']
        )
        
        negative_cases = []
        low_price_cases = []
        
        for project_type in test_project_types:
            for region in test_regions:
                for panel_count in test_panel_counts:
                    config = calculate_system_config(
                        panel_count, 
                        project_type['capacity_factor'], 
                        params
                    )
                    
                    result = calculate_price_new_rule(
                        config, 
                        region, 
                        project_type['is_new'], 
                        params
                    )
                    
                    case = {
                        'scenario': scenario['name'],
                        'param_panel': scenario['panel'],
                        'param_inverter': scenario['inverter'],
                        'param_battery': scenario['battery'],
                        'project_type': project_type['name'],
                        'region': region,
                        'panel_count': panel_count,
                        'solar_kw': config.solar_kw,
                        'inverter_kw': config.inverter_kw,
                        'battery_kwh': config.nominal_battery_kwh,
                        'pre_tax_total': result['pre_tax_total'],
                        'total_with_tax': result['total_with_tax'],
                        'subsidy': result['subsidies']['total'],
                        'final_price': result['final_price']
                    }
                    
                    all_results.append(case)
                    
                    if result['final_price'] < 0:
                        negative_cases.append(case)
                    elif result['final_price'] < 2000:
                        low_price_cases.append(case)
        
        print(f"\n总测试案例数：{len([r for r in all_results if r['scenario'] == scenario['name']])}")
        print(f"❌ 负值案例：{len(negative_cases)}")
        if negative_cases:
            print("\n前10个负值案例：")
            for case in negative_cases[:10]:
                print(f"  {case['project_type']:8s} | {case['region']:3s} | {case['panel_count']:3d}块 | "
                      f"税前${case['total_with_tax']:8,.0f} - 补贴${case['subsidy']:8,.0f} = ${case['final_price']:8,.0f}")
        
        print(f"\n⚠️ 极低价格案例（<$2000）：{len(low_price_cases)}")
        if low_price_cases:
            print("\n前10个极低价格案例：")
            for case in low_price_cases[:10]:
                print(f"  {case['project_type']:8s} | {case['region']:3s} | {case['panel_count']:3d}块 | "
                      f"最终${case['final_price']:8,.0f}")
    
    # 保存结果
    csv_filename = '新规则定价边界分析结果.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['scenario', 'param_panel', 'param_inverter', 'param_battery',
                     'project_type', 'region', 'panel_count', 'solar_kw', 'inverter_kw', 'battery_kwh',
                     'pre_tax_total', 'total_with_tax', 'subsidy', 'final_price']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_results)
    
    print(f"\n\n{'='*120}")
    print(f"完整结果已保存到：{csv_filename}")
    print(f"总记录数：{len(all_results)}")
    print(f"{'='*120}")
    
    return all_results

def analyze_results(all_results):
    """分析结果并给出建议"""
    
    print(f"\n\n{'='*120}")
    print("【分析结果】")
    print(f"{'='*120}")
    
    # 找出所有负值案例
    negative_cases = [r for r in all_results if r['final_price'] < 0]
    print(f"\n总负值案例数：{len(negative_cases)} / {len(all_results)}")
    
    if negative_cases:
        print(f"\n负值案例按场景统计：")
        scenarios = set([r['scenario'] for r in negative_cases])
        for scenario in sorted(scenarios):
            scenario_negative = [r for r in negative_cases if r['scenario'] == scenario]
            print(f"  {scenario:15s}: {len(scenario_negative)}个负值案例")
        
        # 找出最严重的负值
        min_price = min([r['final_price'] for r in negative_cases])
        worst_case = [r for r in negative_cases if r['final_price'] == min_price][0]
        print(f"\n最严重的负值案例：")
        print(f"  场景：{worst_case['scenario']}")
        print(f"  项目类型：{worst_case['project_type']}")
        print(f"  地区：{worst_case['region']}")
        print(f"  面板数：{worst_case['panel_count']}块")
        print(f"  税前总价：${worst_case['total_with_tax']:,.2f}")
        print(f"  补贴：${worst_case['subsidy']:,.2f}")
        print(f"  最终报价：${worst_case['final_price']:,.2f}")
    
    # 找出最小的正值
    positive_cases = [r for r in all_results if r['final_price'] >= 0]
    if positive_cases:
        min_positive = min([r['final_price'] for r in positive_cases])
        min_case = [r for r in positive_cases if r['final_price'] == min_positive][0]
        print(f"\n最小的正值案例：")
        print(f"  场景：{min_case['scenario']}")
        print(f"  项目类型：{min_case['project_type']}")
        print(f"  地区：{min_case['region']}")
        print(f"  面板数：{min_case['panel_count']}块")
        print(f"  最终报价：${min_case['final_price']:,.2f}")
    
    # 统计各场景的价格范围
    print(f"\n各场景的价格范围：")
    scenarios = set([r['scenario'] for r in all_results])
    for scenario in sorted(scenarios):
        scenario_data = [r for r in all_results if r['scenario'] == scenario]
        min_val = min([r['final_price'] for r in scenario_data])
        max_val = max([r['final_price'] for r in scenario_data])
        negative_count = len([r for r in scenario_data if r['final_price'] < 0])
        print(f"  {scenario:15s}: 最小${min_val:8,.2f} | 最大${max_val:8,.2f} | 负值{negative_count}个")
    
    # 给出建议
    print(f"\n\n{'='*120}")
    print("【参数下限建议】")
    print(f"{'='*120}")
    
    # 测试不同参数找到安全下限
    print(f"\n正在寻找最小安全参数...")
    safe_params = find_safe_params()
    
    print(f"\n✅ 推荐的参数下限（确保所有场景最终报价≥$0）：")
    print(f"  面板：≥ ${safe_params['panel']}/kW")
    print(f"  逆变器：≥ ${safe_params['inverter']}/kW")
    print(f"  电池：≥ ${safe_params['battery']}/kWh")
    
    print(f"\n⚠️ 保守建议（确保所有场景最终报价≥$2000）：")
    conservative = find_safe_params(min_price=2000)
    print(f"  面板：≥ ${conservative['panel']}/kW")
    print(f"  逆变器：≥ ${conservative['inverter']}/kW")
    print(f"  电池：≥ ${conservative['battery']}/kWh")
    
    print("\n" + "="*120 + "\n")

def find_safe_params(min_price=0):
    """找到最小的安全参数"""
    
    test_params = [
        (50, 50, 100),
        (100, 80, 200),
        (150, 100, 300),
        (200, 120, 400),
        (250, 150, 500),
        (300, 180, 600),
        (350, 200, 700),
        (400, 220, 800),
        (450, 250, 850),
        (500, 260, 850),
        (540, 280, 865),
    ]
    
    for panel, inverter, battery in test_params:
        params = NewPricingParams(
            panel_price_per_kw=panel,
            inverter_price_per_kw=inverter,
            battery_price_per_kwh=battery
        )
        
        # 测试所有场景
        has_issue = False
        for panel_count in range(1, 101):
            for region in ['NSW', 'VIC', 'QLD', 'SA', 'WA']:
                for is_new, cf in [(True, 0.9), (False, 0.7)]:
                    config = calculate_system_config(panel_count, cf, params)
                    result = calculate_price_new_rule(config, region, is_new, params)
                    if result['final_price'] < min_price:
                        has_issue = True
                        break
                if has_issue:
                    break
            if has_issue:
                break
        
        if not has_issue:
            return {'panel': panel, 'inverter': inverter, 'battery': battery}
    
    return {'panel': 540, 'inverter': 280, 'battery': 865}

if __name__ == "__main__":
    print("="*120)
    print("新规则定价边界分析")
    print("新规则：税前整体报价 = 面板容量*每kW面板报价 + 逆变器功率*每kW逆变器报价 + 电池容量*每kWh电池报价")
    print("="*120)
    
    all_results = test_all_scenarios()
    analyze_results(all_results)
