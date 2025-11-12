#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化参数成本对比分析
对比：旧规则 vs 新规则（500/260/800）vs 优化参数（489/254/782）
重点：税前总价和含税总价（不含补贴）
"""

import math
import csv
from typing import Dict
from dataclasses import dataclass

# 系统配置
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
    return SystemConfig(panel_count=panel_count, solar_kw=solar_kw, inverter_kw=mapping["inverter_kw"], 
                       usable_battery_kwh=mapping["usable_battery_capacity_kwh"], nominal_battery_kwh=mapping["nominal_battery_capacity_kwh"])

def calculate_old_rule_price(config: SystemConfig) -> Dict[str, float]:
    """旧规则价格"""
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

def calculate_new_rule_price(config: SystemConfig, panel_price: float = 500, inverter_price: float = 260, battery_price: float = 800) -> Dict[str, float]:
    """新规则价格（可自定义参数）"""
    panel_total = config.solar_kw * panel_price
    inverter_total = config.inverter_kw * inverter_price
    battery_total = config.nominal_battery_kwh * battery_price
    pre_tax_total = panel_total + inverter_total + battery_total
    gst = pre_tax_total * 0.1
    total_with_tax = pre_tax_total + gst
    return {'pre_tax': pre_tax_total, 'gst': gst, 'with_tax': total_with_tax, 
            'panel': panel_total, 'inverter': inverter_total, 'battery': battery_total}

def main():
    print("=" * 160)
    print("优化参数成本对比分析：旧规则 vs 新规则（500/260/800）vs 优化参数（489/254/782）")
    print("=" * 160)
    print("\n重点：税前总价和含税总价（不含补贴）\n")
    
    results = []
    
    # 迭代计算
    for roof_panels in range(1, 101):
        config = calculate_system_config(roof_panels)
        if config.panel_count == 0:
            continue
        
        # 旧规则
        old_prices = calculate_old_rule_price(config)
        
        # 新规则（原始参数）
        new_prices = calculate_new_rule_price(config, 500, 260, 800)
        
        # 优化参数
        opt_prices = calculate_new_rule_price(config, 489, 254, 782)
        
        # 计算差异
        new_vs_old_pre_tax_diff = (new_prices['pre_tax'] - old_prices['pre_tax']) / old_prices['pre_tax'] * 100
        new_vs_old_with_tax_diff = (new_prices['with_tax'] - old_prices['with_tax']) / old_prices['with_tax'] * 100
        
        opt_vs_old_pre_tax_diff = (opt_prices['pre_tax'] - old_prices['pre_tax']) / old_prices['pre_tax'] * 100
        opt_vs_old_with_tax_diff = (opt_prices['with_tax'] - old_prices['with_tax']) / old_prices['with_tax'] * 100
        
        opt_vs_new_pre_tax_diff = (opt_prices['pre_tax'] - new_prices['pre_tax']) / new_prices['pre_tax'] * 100
        opt_vs_new_with_tax_diff = (opt_prices['with_tax'] - new_prices['with_tax']) / new_prices['with_tax'] * 100
        
        result = {
            'roof_panels': roof_panels,
            'panel_count': config.panel_count,
            'solar_kw': config.solar_kw,
            'inverter_kw': config.inverter_kw,
            'battery_kwh': config.nominal_battery_kwh,
            
            # 旧规则
            'old_pre_tax': old_prices['pre_tax'],
            'old_with_tax': old_prices['with_tax'],
            
            # 新规则（500/260/800）
            'new_pre_tax': new_prices['pre_tax'],
            'new_with_tax': new_prices['with_tax'],
            'new_vs_old_pre_tax_diff': new_vs_old_pre_tax_diff,
            'new_vs_old_with_tax_diff': new_vs_old_with_tax_diff,
            
            # 优化参数（489/254/782）
            'opt_pre_tax': opt_prices['pre_tax'],
            'opt_with_tax': opt_prices['with_tax'],
            'opt_vs_old_pre_tax_diff': opt_vs_old_pre_tax_diff,
            'opt_vs_old_with_tax_diff': opt_vs_old_with_tax_diff,
            
            # 优化参数 vs 新规则
            'opt_vs_new_pre_tax_diff': opt_vs_new_pre_tax_diff,
            'opt_vs_new_with_tax_diff': opt_vs_new_with_tax_diff
        }
        
        results.append(result)
    
    # 输出CSV
    csv_filename = '优化参数成本对比结果.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
        fieldnames = ['roof_panels', 'panel_count', 'solar_kw', 'inverter_kw', 'battery_kwh',
                     'old_pre_tax', 'old_with_tax', 
                     'new_pre_tax', 'new_with_tax', 'new_vs_old_pre_tax_diff', 'new_vs_old_with_tax_diff',
                     'opt_pre_tax', 'opt_with_tax', 'opt_vs_old_pre_tax_diff', 'opt_vs_old_with_tax_diff',
                     'opt_vs_new_pre_tax_diff', 'opt_vs_new_with_tax_diff']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"✅ 已生成CSV文件: {csv_filename}\n")
    
    # 控制台输出摘要
    print("=" * 160)
    print("摘要报告（每10块面板显示）")
    print("=" * 160)
    print(f"{'屋顶':<6} {'面板':<6} {'光伏':<8} {'旧规则':<12} {'新规则':<12} {'优化参数':<12} {'新vs旧':<10} {'优化vs旧':<10} {'优化vs新':<10}")
    print(f"{'面板':<6} {'数量':<6} {'容量':<8} {'税前(AUD)':<12} {'税前(AUD)':<12} {'税前(AUD)':<12} {'差异(%)':<10} {'差异(%)':<10} {'差异(%)':<10}")
    print("-" * 160)
    
    for r in results[::10]:
        print(f"{r['roof_panels']:<6} {r['panel_count']:<6} {r['solar_kw']:<8.2f} "
              f"{r['old_pre_tax']:<12.2f} {r['new_pre_tax']:<12.2f} {r['opt_pre_tax']:<12.2f} "
              f"{r['new_vs_old_pre_tax_diff']:<+10.2f} {r['opt_vs_old_pre_tax_diff']:<+10.2f} {r['opt_vs_new_pre_tax_diff']:<+10.2f}")
    
    # 统计分析
    print(f"\n{'=' * 160}")
    print("统计分析")
    print(f"{'=' * 160}")
    
    # 新规则 vs 旧规则
    new_vs_old_pre_tax_diffs = [r['new_vs_old_pre_tax_diff'] for r in results]
    avg_new_vs_old_pre_tax = sum(new_vs_old_pre_tax_diffs) / len(new_vs_old_pre_tax_diffs)
    
    print(f"\n【新规则（500/260/800）vs 旧规则】")
    print(f"  税前价格平均差异: {avg_new_vs_old_pre_tax:+.2f}%")
    print(f"  税前价格最小差异: {min(new_vs_old_pre_tax_diffs):+.2f}%")
    print(f"  税前价格最大差异: {max(new_vs_old_pre_tax_diffs):+.2f}%")
    
    # 优化参数 vs 旧规则
    opt_vs_old_pre_tax_diffs = [r['opt_vs_old_pre_tax_diff'] for r in results]
    avg_opt_vs_old_pre_tax = sum(opt_vs_old_pre_tax_diffs) / len(opt_vs_old_pre_tax_diffs)
    
    print(f"\n【优化参数（489/254/782）vs 旧规则】")
    print(f"  税前价格平均差异: {avg_opt_vs_old_pre_tax:+.2f}%")
    print(f"  税前价格最小差异: {min(opt_vs_old_pre_tax_diffs):+.2f}%")
    print(f"  税前价格最大差异: {max(opt_vs_old_pre_tax_diffs):+.2f}%")
    
    # 优化参数 vs 新规则
    opt_vs_new_pre_tax_diffs = [r['opt_vs_new_pre_tax_diff'] for r in results]
    avg_opt_vs_new_pre_tax = sum(opt_vs_new_pre_tax_diffs) / len(opt_vs_new_pre_tax_diffs)
    
    print(f"\n【优化参数（489/254/782）vs 新规则（500/260/800）】")
    print(f"  税前价格平均差异: {avg_opt_vs_new_pre_tax:+.2f}%")
    print(f"  税前价格最小差异: {min(opt_vs_new_pre_tax_diffs):+.2f}%")
    print(f"  税前价格最大差异: {max(opt_vs_new_pre_tax_diffs):+.2f}%")
    
    # 不同规模系统的表现
    print(f"\n{'=' * 160}")
    print("不同规模系统的表现")
    print(f"{'=' * 160}")
    
    small_systems = [r for r in results if r['solar_kw'] < 5]
    medium_systems = [r for r in results if 5 <= r['solar_kw'] < 15]
    large_systems = [r for r in results if r['solar_kw'] >= 15]
    
    def calc_avg_diff(systems, field):
        if not systems:
            return 0
        return sum(s[field] for s in systems) / len(systems)
    
    print(f"\n小型系统（< 5kW）：")
    print(f"  样本数: {len(small_systems)}")
    print(f"  新规则 vs 旧规则（税前）: {calc_avg_diff(small_systems, 'new_vs_old_pre_tax_diff'):+.2f}%")
    print(f"  优化参数 vs 旧规则（税前）: {calc_avg_diff(small_systems, 'opt_vs_old_pre_tax_diff'):+.2f}%")
    print(f"  优化参数 vs 新规则（税前）: {calc_avg_diff(small_systems, 'opt_vs_new_pre_tax_diff'):+.2f}%")
    
    print(f"\n中型系统（5-15kW）：")
    print(f"  样本数: {len(medium_systems)}")
    print(f"  新规则 vs 旧规则（税前）: {calc_avg_diff(medium_systems, 'new_vs_old_pre_tax_diff'):+.2f}%")
    print(f"  优化参数 vs 旧规则（税前）: {calc_avg_diff(medium_systems, 'opt_vs_old_pre_tax_diff'):+.2f}%")
    print(f"  优化参数 vs 新规则（税前）: {calc_avg_diff(medium_systems, 'opt_vs_new_pre_tax_diff'):+.2f}%")
    
    print(f"\n大型系统（≥ 15kW）：")
    print(f"  样本数: {len(large_systems)}")
    print(f"  新规则 vs 旧规则（税前）: {calc_avg_diff(large_systems, 'new_vs_old_pre_tax_diff'):+.2f}%")
    print(f"  优化参数 vs 旧规则（税前）: {calc_avg_diff(large_systems, 'opt_vs_old_pre_tax_diff'):+.2f}%")
    print(f"  优化参数 vs 新规则（税前）: {calc_avg_diff(large_systems, 'opt_vs_new_pre_tax_diff'):+.2f}%")
    
    # 结论
    print(f"\n{'=' * 160}")
    print("结论")
    print(f"{'=' * 160}")
    
    print(f"\n✅ 优化参数效果：")
    print(f"   - 相比新规则（500/260/800）：税前价格降低 {abs(avg_opt_vs_new_pre_tax):.2f}%")
    print(f"   - 相比旧规则：税前价格差异从 {avg_new_vs_old_pre_tax:+.2f}% 优化至 {avg_opt_vs_old_pre_tax:+.2f}%")
    
    if abs(avg_opt_vs_old_pre_tax) <= 1:
        print(f"\n✅ 优化参数与旧规则基本持平（差异 {avg_opt_vs_old_pre_tax:+.2f}%），非常合理！")
    elif abs(avg_opt_vs_old_pre_tax) <= 2:
        print(f"\n✅ 优化参数与旧规则接近（差异 {avg_opt_vs_old_pre_tax:+.2f}%），较为合理！")
    else:
        print(f"\n⚠️  优化参数与旧规则仍有差异（{avg_opt_vs_old_pre_tax:+.2f}%），可能需要进一步调整")
    
    print(f"\n{'=' * 160}")
    print(f"详细数据已保存到: {csv_filename}")
    print(f"{'=' * 160}\n")

if __name__ == "__main__":
    main()
