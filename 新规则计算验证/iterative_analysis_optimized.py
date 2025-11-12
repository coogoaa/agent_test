#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化参数迭代分析：使用调整后的单价（494/257/790）
对比旧规则和澳洲市场价格
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
        'with_tax': total_with_tax
    }


def calculate_new_rule_price(config: SystemConfig, 
                             panel_price: float = 494,
                             inverter_price: float = 257,
                             battery_price: float = 790) -> Dict[str, float]:
    """计算新规则价格（优化后参数）"""
    panel_cost = config.solar_kw * panel_price
    inverter_cost = config.inverter_kw * inverter_price
    battery_cost = config.nominal_battery_kwh * battery_price
    
    pre_tax_total = panel_cost + inverter_cost + battery_cost
    gst = pre_tax_total * 0.1
    total_with_tax = pre_tax_total + gst
    
    return {
        'pre_tax': pre_tax_total,
        'gst': gst,
        'with_tax': total_with_tax
    }


def calculate_market_price(config: SystemConfig) -> Dict[str, float]:
    """
    计算澳洲市场普世价格
    参考2024-2025年澳洲家庭光伏市场价格
    """
    # 澳洲市场价格参考（含安装，税前）
    # 光伏系统：800-1200 AUD/kW（取中位数1000）
    # 电池系统：800-1200 AUD/kWh（取中位数1000）
    
    # 光伏部分（面板+逆变器+安装）
    pv_cost = config.solar_kw * 1000  # 1000 AUD/kW 市场中位价
    
    # 电池部分
    battery_cost = config.nominal_battery_kwh * 1000  # 1000 AUD/kWh 市场中位价
    
    pre_tax_total = pv_cost + battery_cost
    gst = pre_tax_total * 0.1
    total_with_tax = pre_tax_total + gst
    
    return {
        'pre_tax': pre_tax_total,
        'gst': gst,
        'with_tax': total_with_tax,
        'pv_cost': pv_cost,
        'battery_cost': battery_cost
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
    
    return {
        'diff': diff,
        'diff_rate': diff_rate
    }


def main():
    """主函数：迭代分析1-100块面板"""
    print("="*120)
    print("优化参数迭代分析：494/257/790 vs 旧规则 vs 澳洲市场价")
    print("="*120)
    
    results = []
    
    # 迭代计算
    for roof_panels in range(1, 101):
        config = calculate_system_config(roof_panels)
        
        # 跳过面板数为0的情况
        if config.panel_count == 0:
            continue
        
        old_prices = calculate_old_rule_price(config)
        new_prices = calculate_new_rule_price(config)  # 使用优化参数
        market_prices = calculate_market_price(config)
        subsidy = calculate_subsidies(config)
        
        # 分析税前价格差异
        old_vs_new = analyze_price_ratio(old_prices['pre_tax'], new_prices['pre_tax'])
        old_vs_market = analyze_price_ratio(old_prices['pre_tax'], market_prices['pre_tax'])
        new_vs_market = analyze_price_ratio(new_prices['pre_tax'], market_prices['pre_tax'])
        
        # 最终价格（扣除补贴）
        old_final = old_prices['with_tax'] - subsidy
        new_final = new_prices['with_tax'] - subsidy
        market_final = market_prices['with_tax'] - subsidy
        
        result = {
            'roof_panels': roof_panels,
            'panel_count': config.panel_count,
            'solar_kw': config.solar_kw,
            'inverter_kw': config.inverter_kw,
            'battery_kwh': config.nominal_battery_kwh,
            'old_pre_tax': old_prices['pre_tax'],
            'new_pre_tax': new_prices['pre_tax'],
            'market_pre_tax': market_prices['pre_tax'],
            'old_vs_new_diff': old_vs_new['diff'],
            'old_vs_new_rate': old_vs_new['diff_rate'],
            'new_vs_market_diff': new_vs_market['diff'],
            'new_vs_market_rate': new_vs_market['diff_rate'],
            'subsidy': subsidy,
            'old_final': old_final,
            'new_final': new_final,
            'market_final': market_final
        }
        
        results.append(result)
    
    # 输出CSV文件
    csv_filename = '优化参数迭代分析结果.csv'
    with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'roof_panels', 'panel_count', 'solar_kw', 'inverter_kw', 'battery_kwh',
            'old_pre_tax', 'new_pre_tax', 'market_pre_tax',
            'old_vs_new_diff', 'old_vs_new_rate',
            'new_vs_market_diff', 'new_vs_market_rate',
            'subsidy', 'old_final', 'new_final', 'market_final'
        ])
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\n✅ 已生成CSV文件: {csv_filename}")
    
    # 控制台输出摘要
    print(f"\n{'='*120}")
    print("摘要报告（每10块面板显示）")
    print(f"{'='*120}")
    print(f"{'屋顶':<6} {'面板':<6} {'光伏':<8} {'旧规则':<12} {'新规则':<12} {'市场价':<12} {'新vs旧':<10} {'新vs市场':<10}")
    print(f"{'面板':<6} {'数量':<6} {'容量':<8} {'税前':<12} {'税前':<12} {'税前':<12} {'差异率':<10} {'差异率':<10}")
    print("-"*120)
    
    for r in results[::10]:
        print(f"{r['roof_panels']:<6} {r['panel_count']:<6} {r['solar_kw']:<8.2f} "
              f"{r['old_pre_tax']:<12.2f} {r['new_pre_tax']:<12.2f} {r['market_pre_tax']:<12.2f} "
              f"{r['old_vs_new_rate']:<+10.2f} {r['new_vs_market_rate']:<+10.2f}")
    
    # 统计分析
    print(f"\n{'='*120}")
    print("统计分析")
    print(f"{'='*120}")
    
    # 新规则 vs 旧规则
    old_vs_new_rates = [r['old_vs_new_rate'] for r in results]
    avg_old_vs_new = sum(old_vs_new_rates) / len(old_vs_new_rates)
    
    print(f"\n【优化参数（494/257/790）vs 旧规则】")
    print(f"  平均差异率: {avg_old_vs_new:+.2f}%")
    print(f"  最小差异率: {min(old_vs_new_rates):+.2f}%")
    print(f"  最大差异率: {max(old_vs_new_rates):+.2f}%")
    print(f"  标准差: {(sum((x - avg_old_vs_new)**2 for x in old_vs_new_rates) / len(old_vs_new_rates))**0.5:.2f}%")
    
    # 新规则 vs 市场价
    new_vs_market_rates = [r['new_vs_market_rate'] for r in results]
    avg_new_vs_market = sum(new_vs_market_rates) / len(new_vs_market_rates)
    
    print(f"\n【优化参数（494/257/790）vs 澳洲市场价】")
    print(f"  平均差异率: {avg_new_vs_market:+.2f}%")
    print(f"  最小差异率: {min(new_vs_market_rates):+.2f}%")
    print(f"  最大差异率: {max(new_vs_market_rates):+.2f}%")
    print(f"  标准差: {(sum((x - avg_new_vs_market)**2 for x in new_vs_market_rates) / len(new_vs_market_rates))**0.5:.2f}%")
    
    # 分析不同规模的表现
    print(f"\n{'='*120}")
    print("不同规模系统的表现")
    print(f"{'='*120}")
    
    small_systems = [r for r in results if r['solar_kw'] < 5]
    medium_systems = [r for r in results if 5 <= r['solar_kw'] < 15]
    large_systems = [r for r in results if r['solar_kw'] >= 15]
    
    def calc_avg(systems, key):
        if not systems:
            return 0
        return sum(s[key] for s in systems) / len(systems)
    
    print(f"\n小型系统（< 5kW）：")
    print(f"  样本数: {len(small_systems)}")
    print(f"  vs旧规则: {calc_avg(small_systems, 'old_vs_new_rate'):+.2f}%")
    print(f"  vs市场价: {calc_avg(small_systems, 'new_vs_market_rate'):+.2f}%")
    
    print(f"\n中型系统（5-15kW）：")
    print(f"  样本数: {len(medium_systems)}")
    print(f"  vs旧规则: {calc_avg(medium_systems, 'old_vs_new_rate'):+.2f}%")
    print(f"  vs市场价: {calc_avg(medium_systems, 'new_vs_market_rate'):+.2f}%")
    
    print(f"\n大型系统（≥ 15kW）：")
    print(f"  样本数: {len(large_systems)}")
    print(f"  vs旧规则: {calc_avg(large_systems, 'old_vs_new_rate'):+.2f}%")
    print(f"  vs市场价: {calc_avg(large_systems, 'new_vs_market_rate'):+.2f}%")
    
    # 优化效果评估
    print(f"\n{'='*120}")
    print("优化效果评估")
    print(f"{'='*120}")
    
    within_1_percent = sum(1 for r in results if abs(r['old_vs_new_rate']) <= 1)
    within_3_percent = sum(1 for r in results if abs(r['old_vs_new_rate']) <= 3)
    
    print(f"\n与旧规则差异在 ±1% 以内: {within_1_percent}/{len(results)} ({within_1_percent/len(results)*100:.1f}%)")
    print(f"与旧规则差异在 ±3% 以内: {within_3_percent}/{len(results)} ({within_3_percent/len(results)*100:.1f}%)")
    
    # 市场竞争力评估
    competitive = sum(1 for r in results if r['new_vs_market_rate'] <= 0)
    print(f"\n低于或等于市场价的样本: {competitive}/{len(results)} ({competitive/len(results)*100:.1f}%)")
    
    # 结论
    print(f"\n{'='*120}")
    print("结论")
    print(f"{'='*120}")
    
    print(f"\n【优化参数（494/257/790）评估】")
    if abs(avg_old_vs_new) <= 0.5:
        print(f"✅ 与旧规则完美持平（平均差异{avg_old_vs_new:+.2f}%）")
    elif abs(avg_old_vs_new) <= 1:
        print(f"✅ 与旧规则基本持平（平均差异{avg_old_vs_new:+.2f}%）")
    else:
        print(f"⚠️  与旧规则有偏差（平均差异{avg_old_vs_new:+.2f}%）")
    
    print(f"\n【市场竞争力评估】")
    if avg_new_vs_market <= -10:
        print(f"✅ 显著低于市场价（平均低{abs(avg_new_vs_market):.2f}%），极具竞争力")
    elif avg_new_vs_market <= -5:
        print(f"✅ 低于市场价（平均低{abs(avg_new_vs_market):.2f}%），有竞争力")
    elif avg_new_vs_market <= 0:
        print(f"✅ 接近或低于市场价（平均{avg_new_vs_market:+.2f}%），合理")
    elif avg_new_vs_market <= 5:
        print(f"⚠️  略高于市场价（平均高{avg_new_vs_market:.2f}%），需关注")
    else:
        print(f"❌ 显著高于市场价（平均高{avg_new_vs_market:.2f}%），缺乏竞争力")
    
    print(f"\n{'='*120}")
    print(f"详细数据已保存到: {csv_filename}")
    print(f"{'='*120}\n")


if __name__ == "__main__":
    main()
