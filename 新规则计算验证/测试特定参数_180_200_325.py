#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试特定参数：面板$180/kW，逆变器$200/kW，电池$325/kWh
分别测试两种补贴场景：
1. 只考虑 PV STC 和 Battery STC
2. 考虑 PV STC、Battery STC 和州补贴
"""

import math
import csv
from 新规则定价边界分析 import (
    NewPricingParams, calculate_system_config, 
    GS_POWER_MAPPING
)

def calculate_price_with_subsidy_options(config, region, is_new_system, params, include_state_subsidy=True):
    """计算价格，可选择是否包含州补贴"""
    
    # 税前整体报价
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
    
    # 补贴计算
    subsidies = {
        'pv_stc': 0,
        'battery_stc': 0,
        'vic_rebate': 0,
        'vic_loan': 0,
        'nsw_vpp': 0,
        'total': 0
    }
    
    # PV STC（仅新建系统）
    if is_new_system:
        pv_stc_qty = config.solar_kw * params.zone_rating * params.deeming_period
        subsidies['pv_stc'] = pv_stc_qty * params.pv_stc_price
    
    # Battery STC
    battery_stc_qty = math.floor(config.usable_battery_kwh * params.battery_stc_factor)
    subsidies['battery_stc'] = battery_stc_qty * params.battery_stc_price
    
    # 州补贴（仅当include_state_subsidy=True时计算）
    if include_state_subsidy:
        # VIC州补贴（仅新建系统）
        if region == 'VIC' and is_new_system:
            subsidies['vic_rebate'] = params.vic_rebate
            subsidies['vic_loan'] = params.vic_loan
        
        # NSW VPP补贴
        if region == 'NSW' and 2 <= config.usable_battery_kwh <= 28:
            demand_response = config.usable_battery_kwh * 0.0734
            peak_response = demand_response * 0.8
            peak_reduction = peak_response * 6 * 6
            prc_qty = math.floor(peak_reduction * params.network_loss_factor * 10)
            subsidies['nsw_vpp'] = prc_qty * params.nsw_prc_price
    
    subsidies['total'] = sum(subsidies.values())
    final_price = total_with_tax - subsidies['total']
    
    return {
        'panel_cost': panel_cost,
        'inverter_cost': inverter_cost,
        'battery_cost': battery_cost,
        'pre_tax_total': pre_tax_total,
        'gst': gst,
        'total_with_tax': total_with_tax,
        'subsidies': subsidies,
        'final_price': final_price
    }

def test_specific_params():
    """测试特定参数 180/200/325"""
    
    params = NewPricingParams(
        panel_price_per_kw=180,
        inverter_price_per_kw=200,
        battery_price_per_kwh=325
    )
    
    print("="*120)
    print("测试参数：面板$180/kW，逆变器$200/kW，电池$325/kWh")
    print("="*120)
    
    # 测试所有场景
    test_regions = ['NSW', 'VIC', 'QLD', 'SA', 'WA']
    test_project_types = [
        {'name': '新建系统', 'is_new': True, 'capacity_factor': 0.9},
        {'name': '电池扩容', 'is_new': False, 'capacity_factor': 0.7}
    ]
    
    results_scenario1 = []  # 只考虑STC
    results_scenario2 = []  # 考虑STC+州补贴
    
    negative_scenario1 = []
    negative_scenario2 = []
    low_scenario1 = []
    low_scenario2 = []
    
    for project_type in test_project_types:
        for region in test_regions:
            for panel_count in range(1, 101):
                config = calculate_system_config(
                    panel_count, 
                    project_type['capacity_factor'], 
                    params
                )
                
                # 场景1：只考虑STC
                result1 = calculate_price_with_subsidy_options(
                    config, region, project_type['is_new'], params, 
                    include_state_subsidy=False
                )
                
                case1 = {
                    'project_type': project_type['name'],
                    'region': region,
                    'panel_count': panel_count,
                    'solar_kw': config.solar_kw,
                    'inverter_kw': config.inverter_kw,
                    'battery_kwh': config.nominal_battery_kwh,
                    'total_with_tax': result1['total_with_tax'],
                    'pv_stc': result1['subsidies']['pv_stc'],
                    'battery_stc': result1['subsidies']['battery_stc'],
                    'state_subsidy': 0,
                    'total_subsidy': result1['subsidies']['total'],
                    'final_price': result1['final_price']
                }
                results_scenario1.append(case1)
                
                if result1['final_price'] < 0:
                    negative_scenario1.append(case1)
                elif result1['final_price'] < 1000:
                    low_scenario1.append(case1)
                
                # 场景2：考虑STC+州补贴
                result2 = calculate_price_with_subsidy_options(
                    config, region, project_type['is_new'], params, 
                    include_state_subsidy=True
                )
                
                state_subsidy = result2['subsidies']['vic_rebate'] + result2['subsidies']['vic_loan'] + result2['subsidies']['nsw_vpp']
                
                case2 = {
                    'project_type': project_type['name'],
                    'region': region,
                    'panel_count': panel_count,
                    'solar_kw': config.solar_kw,
                    'inverter_kw': config.inverter_kw,
                    'battery_kwh': config.nominal_battery_kwh,
                    'total_with_tax': result2['total_with_tax'],
                    'pv_stc': result2['subsidies']['pv_stc'],
                    'battery_stc': result2['subsidies']['battery_stc'],
                    'state_subsidy': state_subsidy,
                    'total_subsidy': result2['subsidies']['total'],
                    'final_price': result2['final_price']
                }
                results_scenario2.append(case2)
                
                if result2['final_price'] < 0:
                    negative_scenario2.append(case2)
                elif result2['final_price'] < 1000:
                    low_scenario2.append(case2)
    
    # 输出场景1结果
    print(f"\n{'='*120}")
    print("【场景1：只考虑 PV STC 和 Battery STC】")
    print(f"{'='*120}")
    print(f"\n总测试案例：{len(results_scenario1)}")
    print(f"❌ 负值案例：{len(negative_scenario1)}")
    print(f"⚠️ 极低价格案例（<$1000）：{len(low_scenario1)}")
    
    if negative_scenario1:
        print(f"\n前10个负值案例：")
        for case in negative_scenario1[:10]:
            print(f"  {case['project_type']:8s} | {case['region']:3s} | {case['panel_count']:3d}块 | "
                  f"税前${case['total_with_tax']:8,.0f} - 补贴${case['total_subsidy']:8,.0f} = ${case['final_price']:8,.0f}")
    
    if low_scenario1:
        print(f"\n前10个极低价格案例：")
        for case in low_scenario1[:10]:
            print(f"  {case['project_type']:8s} | {case['region']:3s} | {case['panel_count']:3d}块 | "
                  f"最终${case['final_price']:8,.0f}")
    
    # 找出最小值
    min_price1 = min([r['final_price'] for r in results_scenario1])
    min_case1 = [r for r in results_scenario1 if r['final_price'] == min_price1][0]
    print(f"\n最小最终报价：${min_price1:,.2f}")
    print(f"  {min_case1['project_type']} | {min_case1['region']} | {min_case1['panel_count']}块")
    
    # 输出场景2结果
    print(f"\n\n{'='*120}")
    print("【场景2：考虑 PV STC、Battery STC 和州补贴】")
    print(f"{'='*120}")
    print(f"\n总测试案例：{len(results_scenario2)}")
    print(f"❌ 负值案例：{len(negative_scenario2)}")
    print(f"⚠️ 极低价格案例（<$1000）：{len(low_scenario2)}")
    
    if negative_scenario2:
        print(f"\n前10个负值案例：")
        for case in negative_scenario2[:10]:
            print(f"  {case['project_type']:8s} | {case['region']:3s} | {case['panel_count']:3d}块 | "
                  f"税前${case['total_with_tax']:8,.0f} - 补贴${case['total_subsidy']:8,.0f} = ${case['final_price']:8,.0f}")
    
    if low_scenario2:
        print(f"\n前10个极低价格案例：")
        for case in low_scenario2[:10]:
            print(f"  {case['project_type']:8s} | {case['region']:3s} | {case['panel_count']:3d}块 | "
                  f"最终${case['final_price']:8,.0f}")
    
    # 找出最小值
    min_price2 = min([r['final_price'] for r in results_scenario2])
    min_case2 = [r for r in results_scenario2 if r['final_price'] == min_price2][0]
    print(f"\n最小最终报价：${min_price2:,.2f}")
    print(f"  {min_case2['project_type']} | {min_case2['region']} | {min_case2['panel_count']}块")
    
    # 详细分析最小值案例
    print(f"\n\n{'='*120}")
    print("【详细案例分析】")
    print(f"{'='*120}")
    
    # 分析场景1的最小值案例
    print(f"\n场景1最小值案例详细计算：")
    analyze_case(min_case1, params, include_state_subsidy=False)
    
    # 分析场景2的最小值案例
    print(f"\n场景2最小值案例详细计算：")
    analyze_case(min_case2, params, include_state_subsidy=True)
    
    # 保存结果
    save_results(results_scenario1, results_scenario2)
    
    # 总结
    print(f"\n\n{'='*120}")
    print("【总结】")
    print(f"{'='*120}")
    
    print(f"\n参数：面板$180/kW，逆变器$200/kW，电池$325/kWh")
    print(f"\n场景1（只考虑STC）：")
    print(f"  负值案例：{len(negative_scenario1)}")
    print(f"  极低价格案例（<$1000）：{len(low_scenario1)}")
    print(f"  最小报价：${min_price1:,.2f}")
    if len(negative_scenario1) == 0 and len(low_scenario1) == 0:
        print(f"  ✅ 通过测试（无负值，无极低价格）")
    else:
        print(f"  ⚠️ 存在风险")
    
    print(f"\n场景2（考虑STC+州补贴）：")
    print(f"  负值案例：{len(negative_scenario2)}")
    print(f"  极低价格案例（<$1000）：{len(low_scenario2)}")
    print(f"  最小报价：${min_price2:,.2f}")
    if len(negative_scenario2) == 0 and len(low_scenario2) == 0:
        print(f"  ✅ 通过测试（无负值，无极低价格）")
    else:
        print(f"  ⚠️ 存在风险")
    
    print("\n" + "="*120 + "\n")

def analyze_case(case, params, include_state_subsidy):
    """详细分析一个案例"""
    
    print(f"\n  项目类型：{case['project_type']}")
    print(f"  地区：{case['region']}")
    print(f"  面板数：{case['panel_count']}块")
    print(f"  光伏容量：{case['solar_kw']:.2f} kW")
    print(f"  逆变器功率：{case['inverter_kw']} kW")
    print(f"  电池标称容量：{case['battery_kwh']:.2f} kWh")
    
    is_new = case['project_type'] == '新建系统'
    
    print(f"\n  税前整体报价计算：")
    if is_new:
        panel_cost = case['solar_kw'] * params.panel_price_per_kw
        inverter_cost = case['inverter_kw'] * params.inverter_price_per_kw
        print(f"    面板成本 = {case['solar_kw']:.2f} kW × ${params.panel_price_per_kw}/kW = ${panel_cost:,.2f}")
        print(f"    逆变器成本 = {case['inverter_kw']} kW × ${params.inverter_price_per_kw}/kW = ${inverter_cost:,.2f}")
    else:
        print(f"    面板成本 = $0（电池扩容）")
        print(f"    逆变器成本 = $0（电池扩容）")
    
    battery_cost = case['battery_kwh'] * params.battery_price_per_kwh
    print(f"    电池成本 = {case['battery_kwh']:.2f} kWh × ${params.battery_price_per_kwh}/kWh = ${battery_cost:,.2f}")
    print(f"    含税总价 = ${case['total_with_tax']:,.2f}")
    
    print(f"\n  补贴计算：")
    print(f"    PV STC = ${case['pv_stc']:,.2f}")
    print(f"    Battery STC = ${case['battery_stc']:,.2f}")
    if include_state_subsidy:
        print(f"    州补贴 = ${case['state_subsidy']:,.2f}")
    print(f"    补贴总计 = ${case['total_subsidy']:,.2f}")
    
    print(f"\n  最终报价 = ${case['total_with_tax']:,.2f} - ${case['total_subsidy']:,.2f} = ${case['final_price']:,.2f}")

def save_results(results1, results2):
    """保存结果到CSV"""
    
    # 保存场景1
    with open('测试180_200_325_场景1_只STC.csv', 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['project_type', 'region', 'panel_count', 'solar_kw', 'inverter_kw', 'battery_kwh',
                     'total_with_tax', 'pv_stc', 'battery_stc', 'state_subsidy', 'total_subsidy', 'final_price']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results1)
    
    # 保存场景2
    with open('测试180_200_325_场景2_含州补贴.csv', 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['project_type', 'region', 'panel_count', 'solar_kw', 'inverter_kw', 'battery_kwh',
                     'total_with_tax', 'pv_stc', 'battery_stc', 'state_subsidy', 'total_subsidy', 'final_price']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results2)
    
    print(f"\n结果已保存到：")
    print(f"  - 测试180_200_325_场景1_只STC.csv")
    print(f"  - 测试180_200_325_场景2_含州补贴.csv")

if __name__ == "__main__":
    test_specific_params()
