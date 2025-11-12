#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
新规则详细案例分析 - 展示完整的计算推演过程
"""

import math
from 新规则定价边界分析 import (
    NewPricingParams, calculate_system_config, 
    calculate_price_new_rule, calculate_subsidies_new
)

def detailed_analysis(panel_count, panel_price, inverter_price, battery_price, 
                     region='VIC', is_new_system=True):
    """详细分析一个案例，展示完整计算过程"""
    
    params = NewPricingParams(
        panel_price_per_kw=panel_price,
        inverter_price_per_kw=inverter_price,
        battery_price_per_kwh=battery_price
    )
    
    capacity_factor = 0.9 if is_new_system else 0.7
    config = calculate_system_config(panel_count, capacity_factor, params)
    result = calculate_price_new_rule(config, region, is_new_system, params)
    
    print(f"="*120)
    print(f"【案例分析】{panel_count}块面板 | {'新建系统' if is_new_system else '电池扩容'} | {region}州")
    print(f"参数：面板${panel_price}/kW，逆变器${inverter_price}/kW，电池${battery_price}/kWh")
    print(f"="*120)
    
    print(f"\n步骤1：系统配置计算")
    print(f"  屋顶理论最大面板数：{panel_count}块")
    print(f"  容量系数：{capacity_factor} ({'新建系统' if is_new_system else '电池扩容'})")
    print(f"  实际安装面板数 = floor({panel_count} × {capacity_factor}) = {config.panel_count}块")
    print(f"  光伏系统容量 = {config.panel_count}块 × {params.panel_power_kw}kW/块 = {config.solar_kw:.2f} kW")
    print(f"  查询GS功率映射表：光伏{config.solar_kw:.2f}kW对应")
    print(f"    → 逆变器功率：{config.inverter_kw} kW")
    print(f"    → 电池可用容量：{config.usable_battery_kwh:.2f} kWh")
    print(f"    → 电池标称容量：{config.nominal_battery_kwh:.2f} kWh")
    
    print(f"\n步骤2：税前整体报价计算（新规则）")
    if is_new_system:
        print(f"  面板成本 = {config.solar_kw:.2f} kW × ${panel_price}/kW = ${result['panel_cost']:,.2f}")
        print(f"  逆变器成本 = {config.inverter_kw} kW × ${inverter_price}/kW = ${result['inverter_cost']:,.2f}")
    else:
        print(f"  面板成本 = $0（电池扩容不计算面板）")
        print(f"  逆变器成本 = $0（电池扩容不计算逆变器）")
    
    print(f"  电池成本 = {config.nominal_battery_kwh:.2f} kWh × ${battery_price}/kWh = ${result['battery_cost']:,.2f}")
    print(f"  税前总价 = ${result['panel_cost']:,.2f} + ${result['inverter_cost']:,.2f} + ${result['battery_cost']:,.2f}")
    print(f"           = ${result['pre_tax_total']:,.2f}")
    
    print(f"\n步骤3：GST计算")
    print(f"  GST = ${result['pre_tax_total']:,.2f} × {params.gst_rate}")
    print(f"      = ${result['gst']:,.2f}")
    
    print(f"\n步骤4：含税总价")
    print(f"  含税总价 = 税前总价 + GST")
    print(f"           = ${result['pre_tax_total']:,.2f} + ${result['gst']:,.2f}")
    print(f"           = ${result['total_with_tax']:,.2f}")
    
    print(f"\n步骤5：补贴计算")
    subsidies = result['subsidies']
    
    if is_new_system:
        pv_stc_qty = config.solar_kw * params.zone_rating * params.deeming_period
        print(f"  (1) PV STC补贴（仅新建系统）：")
        print(f"      PV_STC数量 = {config.solar_kw:.2f} kW × {params.zone_rating} × {params.deeming_period}年 = {pv_stc_qty:.2f}")
        print(f"      PV STC补贴 = {pv_stc_qty:.2f} × ${params.pv_stc_price} = ${subsidies['pv_stc']:,.2f}")
    else:
        print(f"  (1) PV STC补贴 = $0（电池扩容不享受）")
    
    battery_stc_qty = math.floor(config.usable_battery_kwh * params.battery_stc_factor)
    print(f"  (2) 电池STC补贴：")
    print(f"      Battery STC数量 = floor({config.usable_battery_kwh:.2f} kWh × {params.battery_stc_factor}) = {battery_stc_qty}")
    print(f"      Battery STC补贴 = {battery_stc_qty} × ${params.battery_stc_price} = ${subsidies['battery_stc']:,.2f}")
    
    if region == 'VIC' and is_new_system:
        print(f"  (3) VIC州补贴（仅新建系统）：")
        print(f"      Solar VIC Rebate = ${subsidies['vic_rebate']:,.2f}")
        print(f"      Solar VIC Interest Free Loan = ${subsidies['vic_loan']:,.2f}")
    elif region == 'VIC':
        print(f"  (3) VIC州补贴 = $0（电池扩容不享受）")
    
    if region == 'NSW' and 2 <= config.usable_battery_kwh <= 28:
        demand_response = config.usable_battery_kwh * 0.0734
        peak_response = demand_response * 0.8
        peak_reduction = peak_response * 6 * 6
        prc_qty = math.floor(peak_reduction * params.network_loss_factor * 10)
        print(f"  (4) NSW VPP补贴（BESS2）：")
        print(f"      需求响应分量 = {config.usable_battery_kwh:.2f} kWh × 0.0734 = {demand_response:.4f} kW")
        print(f"      峰值需求响应能力 = {demand_response:.4f} × 0.8 = {peak_response:.4f} kW")
        print(f"      峰值减排容量 = {peak_response:.4f} × 6小时 × 6年 = {peak_reduction:.4f} kWh")
        print(f"      PRC数量 = floor({peak_reduction:.4f} × {params.network_loss_factor} × 10) = {prc_qty}")
        print(f"      NSW VPP补贴 = {prc_qty} × ${params.nsw_prc_price} = ${subsidies['nsw_vpp']:,.2f}")
    
    print(f"\n  补贴总计 = ${subsidies['total']:,.2f}")
    
    print(f"\n步骤6：最终报价")
    print(f"  最终报价 = 含税总价 - 补贴总计")
    print(f"           = ${result['total_with_tax']:,.2f} - ${subsidies['total']:,.2f}")
    print(f"           = ${result['final_price']:,.2f}")
    
    if result['final_price'] < 0:
        print(f"\n  ❌ 警告：最终报价为负值！补贴超过了售价。")
    elif result['final_price'] < 2000:
        print(f"\n  ⚠️ 警告：最终报价过低（<$2000）。")
    else:
        print(f"\n  ✅ 最终报价正常。")
    
    print(f"\n成本结构分析：")
    if result['total_with_tax'] > 0:
        print(f"  补贴占含税总价比例：${subsidies['total']:,.2f} / ${result['total_with_tax']:,.2f} = {subsidies['total']/result['total_with_tax']*100:.1f}%")
    
    print(f"\n" + "="*120 + "\n")
    
    return result

# 分析关键案例
print("【新规则完整计算推演】\n")

print("案例1：最严重的负值案例（极低参数）\n")
detailed_analysis(100, 50, 50, 100, 'VIC', True)

print("\n案例2：边界案例（低参数，刚好为负）\n")
detailed_analysis(50, 200, 150, 400, 'VIC', True)

print("\n案例3：最小正值案例（低参数）\n")
detailed_analysis(47, 200, 150, 400, 'VIC', True)

print("\n案例4：安全参数案例（中低参数）\n")
detailed_analysis(5, 300, 200, 600, 'VIC', True)

print("\n案例5：推荐参数案例\n")
detailed_analysis(50, 540, 280, 865, 'VIC', True)

print("\n案例6：电池扩容案例（极低参数）\n")
detailed_analysis(50, 50, 50, 100, 'VIC', False)

print("\n案例7：小系统案例（5块面板，极低参数）\n")
detailed_analysis(5, 50, 50, 100, 'VIC', True)

print("\n案例8：推荐下限参数验证\n")
detailed_analysis(50, 250, 150, 500, 'VIC', True)
