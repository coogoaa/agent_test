#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
迭代分析：从1块面板到100块面板的新旧规则对比
重点分析税前费用和含税费用的变化趋势
"""

import math
import csv
from typing import Dict, Tuple
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
    """系统配置"""
    panel_count: int
    solar_kw: float
    inverter_kw: float
    usable_battery_kwh: float
    nominal_battery_kwh: float


def lookup_power_mapping(solar_kw: float) -> Dict:
    """查询GS功率映射表"""
    for row in GS_POWER_MAPPING:
        if row["min"] < solar_kw <= row["max"]:
            return row
    return GS_POWER_MAPPING[-1]


def calculate_system_config(
    roof_max_panels: int,
    capacity_factor: float = 0.9,
    panel_power_kw: float = 0.44
) -> SystemConfig:
    """计算系统配置（使用GS映射表）"""
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


def calculate_old_rule_price(config: SystemConfig) -> Dict[str, float]:
    """计算旧规则价格"""
    # 核心硬件成本
    panel_cost = config.panel_count * 80 * 1.3
    inverter_cost = config.inverter_kw * 200 * 1.3
    battery_cost = config.nominal_battery_kwh * 320 * 1.3
    key_products_total = panel_cost + inverter_cost + battery_cost
    
    # BOS成本
    pv_base_install = 1000 * 1.3
    pv_per_kw_install = config.solar_kw * 150 * 1.3
    battery_base_install = 1000 * 1.3
    battery_per_kwh_install = config.nominal_battery_kwh * 250 * 1.3
    bos_total = pv_base_install + pv_per_kw_install + battery_base_install + battery_per_kwh_install
    
    # 税前和含税
    pre_tax_total = key_products_total + bos_total
    gst = pre_tax_total * 0.1
    total_with_tax = pre_tax_total + gst
    
    return {
        'pre_tax': pre_tax_total,
        'gst': gst,
        'with_tax': total_with_tax,
        'key_products': key_products_total,
        'bos': bos_total
    }


def calculate_new_rule_price(config: SystemConfig) -> Dict[str, float]:
    """计算新规则价格"""
    panel_price = config.solar_kw * 500
    inverter_price = config.inverter_kw * 260
    battery_price = config.nominal_battery_kwh * 800
    
    pre_tax_total = panel_price + inverter_price + battery_price
    gst = pre_tax_total * 0.1
    total_with_tax = pre_tax_total + gst
    
    return {
        'pre_tax': pre_tax_total,
        'gst': gst,
        'with_tax': total_with_tax,
        'panel': panel_price,
        'inverter': inverter_price,
        'battery': battery_price
    }


def calculate_subsidies(config: SystemConfig) -> float:
    """计算补贴（简化版，仅NSW）"""
    # STC PV补贴
    pv_stc_qty = config.solar_kw * 1.382 * 6
    pv_stc_rebate = pv_stc_qty * 39
    
    # STC电池补贴
    battery_stc_qty = math.floor(config.usable_battery_kwh * 9.3)
    battery_stc_rebate = battery_stc_qty * 39
    
    # NSW VPP补贴
    nsw_rebate = 0
    if 2 <= config.usable_battery_kwh <= 28:
        demand_response = config.usable_battery_kwh * 0.0734
        peak_response = demand_response * 0.8
        peak_reduction = peak_response * 6 * 6
        prc_qty = math.floor(peak_reduction * 1.05 * 10)
        nsw_rebate = prc_qty * 1.65
    
    return pv_stc_rebate + battery_stc_rebate + nsw_rebate


def analyze_price_ratio(old_price: float, new_price: float) -> Dict[str, float]:
    """分析价格比例关系"""
    diff = new_price - old_price
    diff_rate = (diff / old_price * 100) if old_price > 0 else 0
    ratio = new_price / old_price if old_price > 0 else 0
    
    return {
        'diff': diff,
        'diff_rate': diff_rate,
        'ratio': ratio
    }


def main():
    """主函数：迭代分析1-100块面板"""
    print("="*120)
    print("新老规则迭代分析：从1块面板到100块面板")
    print("="*120)
    
    results = []
    
    # 迭代计算
    for roof_panels in range(1, 101):
        config = calculate_system_config(roof_panels)
        
        # 跳过面板数为0的情况
        if config.panel_count == 0:
            continue
        
        old_prices = calculate_old_rule_price(config)
        new_prices = calculate_new_rule_price(config)
        subsidy = calculate_subsidies(config)
        
        # 分析税前价格差异
        pre_tax_analysis = analyze_price_ratio(old_prices['pre_tax'], new_prices['pre_tax'])
        
        # 分析含税价格差异
        with_tax_analysis = analyze_price_ratio(old_prices['with_tax'], new_prices['with_tax'])
        
        # 最终价格（扣除补贴）
        old_final = old_prices['with_tax'] - subsidy
        new_final = new_prices['with_tax'] - subsidy
        final_analysis = analyze_price_ratio(old_final, new_final)
        
        result = {
            'roof_panels': roof_panels,
            'panel_count': config.panel_count,
            'solar_kw': config.solar_kw,
            'inverter_kw': config.inverter_kw,
            'battery_kwh': config.nominal_battery_kwh,
            'old_pre_tax': old_prices['pre_tax'],
            'new_pre_tax': new_prices['pre_tax'],
            'pre_tax_diff': pre_tax_analysis['diff'],
            'pre_tax_diff_rate': pre_tax_analysis['diff_rate'],
            'old_with_tax': old_prices['with_tax'],
            'new_with_tax': new_prices['with_tax'],
            'with_tax_diff': with_tax_analysis['diff'],
            'with_tax_diff_rate': with_tax_analysis['diff_rate'],
            'subsidy': subsidy,
            'old_final': old_final,
            'new_final': new_final,
            'final_diff': final_analysis['diff'],
            'final_diff_rate': final_analysis['diff_rate']
        }
        
        results.append(result)
    
    # 输出CSV文件
    csv_filename = '迭代分析结果.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'roof_panels', 'panel_count', 'solar_kw', 'inverter_kw', 'battery_kwh',
            'old_pre_tax', 'new_pre_tax', 'pre_tax_diff', 'pre_tax_diff_rate',
            'old_with_tax', 'new_with_tax', 'with_tax_diff', 'with_tax_diff_rate',
            'subsidy', 'old_final', 'new_final', 'final_diff', 'final_diff_rate'
        ])
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\n✅ 已生成CSV文件: {csv_filename}")
    
    # 控制台输出摘要（每10块面板显示一次）
    print(f"\n{'='*120}")
    print("摘要报告（每10块面板显示）")
    print(f"{'='*120}")
    print(f"{'屋顶':<6} {'面板':<6} {'光伏':<8} {'逆变器':<8} {'电池':<8} {'旧税前':<12} {'新税前':<12} {'差异':<10} {'差异率':<8}")
    print(f"{'面板':<6} {'数量':<6} {'容量':<8} {'功率':<8} {'容量':<8} {'(AUD)':<12} {'(AUD)':<12} {'(AUD)':<10} {'(%)':<8}")
    print("-"*120)
    
    for r in results[::10]:  # 每10个显示一次
        print(f"{r['roof_panels']:<6} {r['panel_count']:<6} {r['solar_kw']:<8.2f} "
              f"{r['inverter_kw']:<8.1f} {r['battery_kwh']:<8.2f} "
              f"{r['old_pre_tax']:<12.2f} {r['new_pre_tax']:<12.2f} "
              f"{r['pre_tax_diff']:<+10.2f} {r['pre_tax_diff_rate']:<+8.2f}")
    
    # 统计分析
    print(f"\n{'='*120}")
    print("统计分析")
    print(f"{'='*120}")
    
    # 税前价格差异统计
    pre_tax_diffs = [r['pre_tax_diff_rate'] for r in results]
    avg_pre_tax_diff = sum(pre_tax_diffs) / len(pre_tax_diffs)
    min_pre_tax_diff = min(pre_tax_diffs)
    max_pre_tax_diff = max(pre_tax_diffs)
    
    print(f"\n【税前价格差异率】")
    print(f"  平均值: {avg_pre_tax_diff:+.2f}%")
    print(f"  最小值: {min_pre_tax_diff:+.2f}%")
    print(f"  最大值: {max_pre_tax_diff:+.2f}%")
    print(f"  标准差: {(sum((x - avg_pre_tax_diff)**2 for x in pre_tax_diffs) / len(pre_tax_diffs))**0.5:.2f}%")
    
    # 含税价格差异统计
    with_tax_diffs = [r['with_tax_diff_rate'] for r in results]
    avg_with_tax_diff = sum(with_tax_diffs) / len(with_tax_diffs)
    
    print(f"\n【含税价格差异率】")
    print(f"  平均值: {avg_with_tax_diff:+.2f}%")
    print(f"  最小值: {min(with_tax_diffs):+.2f}%")
    print(f"  最大值: {max(with_tax_diffs):+.2f}%")
    
    # 最终价格差异统计
    final_diffs = [r['final_diff_rate'] for r in results]
    avg_final_diff = sum(final_diffs) / len(final_diffs)
    
    print(f"\n【补贴后最终价格差异率】")
    print(f"  平均值: {avg_final_diff:+.2f}%")
    print(f"  最小值: {min(final_diffs):+.2f}%")
    print(f"  最大值: {max(final_diffs):+.2f}%")
    
    # 分析不同规模的表现
    print(f"\n{'='*120}")
    print("不同规模系统的表现")
    print(f"{'='*120}")
    
    small_systems = [r for r in results if r['solar_kw'] < 5]
    medium_systems = [r for r in results if 5 <= r['solar_kw'] < 15]
    large_systems = [r for r in results if r['solar_kw'] >= 15]
    
    def calc_avg_diff(systems):
        if not systems:
            return 0
        return sum(s['pre_tax_diff_rate'] for s in systems) / len(systems)
    
    print(f"\n小型系统（< 5kW）：")
    print(f"  样本数: {len(small_systems)}")
    print(f"  平均税前差异率: {calc_avg_diff(small_systems):+.2f}%")
    
    print(f"\n中型系统（5-15kW）：")
    print(f"  样本数: {len(medium_systems)}")
    print(f"  平均税前差异率: {calc_avg_diff(medium_systems):+.2f}%")
    
    print(f"\n大型系统（≥ 15kW）：")
    print(f"  样本数: {len(large_systems)}")
    print(f"  平均税前差异率: {calc_avg_diff(large_systems):+.2f}%")
    
    # 新参数合理性评估
    print(f"\n{'='*120}")
    print("新参数合理性评估")
    print(f"{'='*120}")
    
    # 计算在不同规模下，新旧规则的价格比例
    within_5_percent = sum(1 for r in results if abs(r['pre_tax_diff_rate']) <= 5)
    within_3_percent = sum(1 for r in results if abs(r['pre_tax_diff_rate']) <= 3)
    within_1_percent = sum(1 for r in results if abs(r['pre_tax_diff_rate']) <= 1)
    
    print(f"\n税前价格差异在 ±1% 以内的样本: {within_1_percent}/{len(results)} ({within_1_percent/len(results)*100:.1f}%)")
    print(f"税前价格差异在 ±3% 以内的样本: {within_3_percent}/{len(results)} ({within_3_percent/len(results)*100:.1f}%)")
    print(f"税前价格差异在 ±5% 以内的样本: {within_5_percent}/{len(results)} ({within_5_percent/len(results)*100:.1f}%)")
    
    # 结论
    print(f"\n{'='*120}")
    print("结论")
    print(f"{'='*120}")
    
    if abs(avg_pre_tax_diff) <= 1:
        print(f"\n✅ 新参数设置非常合理")
        print(f"   平均税前价格差异仅为 {avg_pre_tax_diff:+.2f}%，与旧规则基本持平")
    elif abs(avg_pre_tax_diff) <= 3:
        print(f"\n✅ 新参数设置较为合理")
        print(f"   平均税前价格差异为 {avg_pre_tax_diff:+.2f}%，在可接受范围内")
    elif abs(avg_pre_tax_diff) <= 5:
        print(f"\n⚠️  新参数设置基本合理，但有优化空间")
        print(f"   平均税前价格差异为 {avg_pre_tax_diff:+.2f}%，建议微调参数")
    else:
        print(f"\n❌ 新参数设置需要调整")
        print(f"   平均税前价格差异为 {avg_pre_tax_diff:+.2f}%，偏离较大")
    
    # 参数调整建议
    if avg_pre_tax_diff > 1:
        print(f"\n💡 参数调整建议（使税前价格更接近）：")
        
        # 分析各组件的贡献
        sample = results[len(results)//2]  # 取中间样本
        old_config = calculate_system_config(sample['roof_panels'])
        old_p = calculate_old_rule_price(old_config)
        new_p = calculate_new_rule_price(old_config)
        
        # 计算理想单价
        ideal_panel_price = (old_p['key_products'] + old_p['bos']) / (old_config.solar_kw + old_config.inverter_kw * 0.52 + old_config.nominal_battery_kwh * 1.6)
        
        panel_adjustment = (old_p['pre_tax'] / new_p['pre_tax'] - 1) * 100
        
        print(f"   - 如果希望完全持平，可以将所有单价统一调整 {panel_adjustment:+.2f}%")
        print(f"   - 或者单独调整面板单价至约 {500 * (1 + panel_adjustment/100):.0f} AUD/kW")
        print(f"   - 或者单独调整电池单价至约 {800 * (1 + panel_adjustment/100):.0f} AUD/kWh")
    
    print(f"\n{'='*120}")
    print(f"详细数据已保存到: {csv_filename}")
    print(f"{'='*120}\n")


if __name__ == "__main__":
    main()
