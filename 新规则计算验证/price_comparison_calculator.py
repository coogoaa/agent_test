#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
新老计算规则对比验证工具
基于 Quote/index.html 的计算逻辑实现
"""

import math
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

# GD功率映射表
GD_POWER_MAPPING = [
    {"min": 0, "max": 5, "nominal_battery_capacity_kwh": 15.00, "usable_battery_capacity_kwh": 13.50, "inverter_kw": 5.00},
    {"min": 5, "max": 7.5, "nominal_battery_capacity_kwh": 14.82, "usable_battery_capacity_kwh": 13.34, "inverter_kw": 5.00},
    {"min": 7.5, "max": 12, "nominal_battery_capacity_kwh": 17.33, "usable_battery_capacity_kwh": 15.60, "inverter_kw": 7.22},
    {"min": 12, "max": 20, "nominal_battery_capacity_kwh": 22.22, "usable_battery_capacity_kwh": 20.00, "inverter_kw": 10.00},
    {"min": 20, "max": 100, "nominal_battery_capacity_kwh": 41.93, "usable_battery_capacity_kwh": 37.74, "inverter_kw": 15.00}
]


@dataclass
class SystemConfig:
    """系统配置"""
    panel_count: int
    solar_kw: float
    inverter_kw: float
    usable_battery_kwh: float
    nominal_battery_kwh: float


@dataclass
class OldRuleParams:
    """旧规则参数"""
    panel_unit_cost: float = 80.0  # 面板单价 AUD/块
    panel_profit_margin: float = 0.3  # 面板利润率
    inverter_unit_cost: float = 200.0  # 逆变器单价 AUD/kW
    inverter_profit_margin: float = 0.3  # 逆变器利润率
    battery_unit_cost: float = 320.0  # 电池单价 AUD/kWh
    battery_profit_margin: float = 0.3  # 电池利润率
    install_base_cost: float = 1000.0  # 光伏基础安装费 AUD
    install_profit_margin: float = 0.3  # 光伏安装利润率
    install_cost_per_kw: float = 150.0  # 光伏每kW安装费 AUD/kW
    battery_install_base_cost: float = 1000.0  # 电池基础安装费 AUD
    battery_install_profit_margin: float = 0.3  # 电池安装利润率
    battery_install_cost_per_kwh: float = 250.0  # 电池每kWh安装费 AUD/kWh
    gst_rate: float = 0.1  # GST税率


@dataclass
class NewRuleParams:
    """新规则参数"""
    panel_unit_price_per_kw: float = 500.0  # 每kW面板报价 AUD/kW
    inverter_unit_price_per_kw: float = 260.0  # 每kW逆变器报价 AUD/kW
    battery_unit_price_per_kwh: float = 800.0  # 电池每kWh报价 AUD/kWh
    gst_rate: float = 0.1  # GST税率


def lookup_power_mapping(solar_kw: float, battery_brand: str) -> Dict:
    """查询功率映射表"""
    mapping = GS_POWER_MAPPING if battery_brand == 'GS' else GD_POWER_MAPPING
    for row in mapping:
        if row["min"] < solar_kw <= row["max"]:
            return row
    return mapping[-1]  # 默认返回最后一行


def ceiling_to_01(value: float) -> float:
    """向上取整到0.1"""
    return math.ceil(value * 10) / 10


def calculate_system_config_plan_ab(
    roof_max_panels: int,
    capacity_factor: float,
    panel_power_kw: float,
    battery_brand: str
) -> SystemConfig:
    """计算方案A/B的系统配置（查表方式）"""
    panel_count = math.floor(roof_max_panels * capacity_factor)
    solar_kw = panel_count * panel_power_kw
    
    mapping = lookup_power_mapping(solar_kw, battery_brand)
    
    return SystemConfig(
        panel_count=panel_count,
        solar_kw=solar_kw,
        inverter_kw=mapping["inverter_kw"],
        usable_battery_kwh=mapping["usable_battery_capacity_kwh"],
        nominal_battery_kwh=mapping["nominal_battery_capacity_kwh"]
    )


def calculate_system_config_plan_c(
    roof_max_panels: int,
    capacity_factor: float,
    panel_power_kw: float,
    dc_ac_ratio: float,
    yield_per_kw_per_year: float,
    target_sc_rate: float,
    baseline_sc_rate: float,
    battery_dod: float,
    battery_rte: float
) -> SystemConfig:
    """计算方案C的系统配置（公式计算方式）"""
    panel_count = math.floor(roof_max_panels * capacity_factor)
    solar_kw = panel_count * panel_power_kw
    inverter_kw = ceiling_to_01(solar_kw / dc_ac_ratio)
    
    # 电池容量计算
    annual_generation_kwh = solar_kw * yield_per_kw_per_year
    daily_energy_to_shift_kwh = (annual_generation_kwh / 365) * (target_sc_rate - baseline_sc_rate)
    usable_battery_kwh = min(daily_energy_to_shift_kwh / battery_rte, 50)
    nominal_battery_kwh = usable_battery_kwh / battery_dod
    
    return SystemConfig(
        panel_count=panel_count,
        solar_kw=solar_kw,
        inverter_kw=inverter_kw,
        usable_battery_kwh=usable_battery_kwh,
        nominal_battery_kwh=nominal_battery_kwh
    )


def calculate_old_rule_price(
    config: SystemConfig,
    params: OldRuleParams,
    is_new_system: bool = True
) -> Tuple[float, Dict]:
    """计算旧规则价格（税前）"""
    details = {}
    
    # 核心硬件成本
    panel_cost = config.panel_count * params.panel_unit_cost * (1 + params.panel_profit_margin) if is_new_system else 0
    inverter_cost = config.inverter_kw * params.inverter_unit_cost * (1 + params.inverter_profit_margin) if is_new_system else 0
    battery_cost = config.nominal_battery_kwh * params.battery_unit_cost * (1 + params.battery_profit_margin)
    key_products_total = panel_cost + inverter_cost + battery_cost
    
    details['panel_cost'] = panel_cost
    details['inverter_cost'] = inverter_cost
    details['battery_cost'] = battery_cost
    details['key_products_total'] = key_products_total
    
    # BOS成本
    pv_base_install = params.install_base_cost * (1 + params.install_profit_margin) if is_new_system else 0
    pv_per_kw_install = config.solar_kw * params.install_cost_per_kw * (1 + params.install_profit_margin) if is_new_system else 0
    battery_base_install = params.battery_install_base_cost * (1 + params.battery_install_profit_margin)
    battery_per_kwh_install = config.nominal_battery_kwh * params.battery_install_cost_per_kwh * (1 + params.battery_install_profit_margin)
    bos_total = pv_base_install + pv_per_kw_install + battery_base_install + battery_per_kwh_install
    
    details['pv_base_install'] = pv_base_install
    details['pv_per_kw_install'] = pv_per_kw_install
    details['battery_base_install'] = battery_base_install
    details['battery_per_kwh_install'] = battery_per_kwh_install
    details['bos_total'] = bos_total
    
    # 税前总价
    pre_tax_total = key_products_total + bos_total
    gst = pre_tax_total * params.gst_rate
    total_with_tax = pre_tax_total + gst
    
    details['pre_tax_total'] = pre_tax_total
    details['gst'] = gst
    details['total_with_tax'] = total_with_tax
    
    return total_with_tax, details


def calculate_new_rule_price(
    config: SystemConfig,
    params: NewRuleParams
) -> Tuple[float, Dict]:
    """计算新规则价格（税前）"""
    details = {}
    
    # 直接按单价计算
    panel_price = config.solar_kw * params.panel_unit_price_per_kw
    inverter_price = config.inverter_kw * params.inverter_unit_price_per_kw
    battery_price = config.nominal_battery_kwh * params.battery_unit_price_per_kwh
    
    details['panel_price'] = panel_price
    details['inverter_price'] = inverter_price
    details['battery_price'] = battery_price
    
    pre_tax_total = panel_price + inverter_price + battery_price
    gst = pre_tax_total * params.gst_rate
    total_with_tax = pre_tax_total + gst
    
    details['pre_tax_total'] = pre_tax_total
    details['gst'] = gst
    details['total_with_tax'] = total_with_tax
    
    return total_with_tax, details


def calculate_subsidies(
    config: SystemConfig,
    is_new_system: bool,
    region: str,
    zone_rating: float = 1.382,
    deeming_period: int = 6,
    pv_stc_price: float = 39.0,
    battery_stc_factor: float = 9.3,
    battery_stc_price: float = 39.0,
    vic_rebate: float = 1400.0,
    vic_loan: float = 1400.0,
    nsw_prc_price: float = 1.65,
    network_loss_factor: float = 1.05
) -> Tuple[float, Dict]:
    """计算补贴"""
    details = {}
    total_subsidy = 0
    
    # STC PV补贴
    if is_new_system:
        pv_stc_qty = config.solar_kw * zone_rating * deeming_period
        pv_stc_rebate = pv_stc_qty * pv_stc_price
        details['pv_stc_rebate'] = pv_stc_rebate
        total_subsidy += pv_stc_rebate
    
    # STC电池补贴
    battery_stc_qty = math.floor(config.usable_battery_kwh * battery_stc_factor)
    battery_stc_rebate = battery_stc_qty * battery_stc_price
    details['battery_stc_rebate'] = battery_stc_rebate
    total_subsidy += battery_stc_rebate
    
    # VIC州补贴
    if region == 'VIC' and is_new_system:
        details['vic_rebate'] = vic_rebate
        details['vic_loan'] = vic_loan
        total_subsidy += vic_rebate + vic_loan
    
    # NSW VPP补贴
    if region == 'NSW' and 2 <= config.usable_battery_kwh <= 28:
        demand_response = config.usable_battery_kwh * 0.0734
        peak_response = demand_response * 0.8
        peak_reduction = peak_response * 6 * 6
        prc_qty = math.floor(peak_reduction * network_loss_factor * 10)
        nsw_rebate = prc_qty * nsw_prc_price
        details['nsw_vpp_rebate'] = nsw_rebate
        total_subsidy += nsw_rebate
    
    details['total_subsidy'] = total_subsidy
    return total_subsidy, details


def print_comparison_report(plan_name: str, config: SystemConfig, 
                           old_price: float, old_details: Dict,
                           new_price: float, new_details: Dict,
                           subsidy: float, subsidy_details: Dict):
    """打印对比报告"""
    print(f"\n{'='*80}")
    print(f"方案{plan_name}对比报告")
    print(f"{'='*80}")
    
    print(f"\n【系统配置】")
    print(f"  面板数量: {config.panel_count} 块")
    print(f"  光伏容量: {config.solar_kw:.2f} kW")
    print(f"  逆变器功率: {config.inverter_kw} kW")
    print(f"  电池可用容量: {config.usable_battery_kwh:.2f} kWh")
    print(f"  电池标称容量: {config.nominal_battery_kwh:.2f} kWh")
    
    print(f"\n【旧规则计算】")
    print(f"  核心硬件成本:")
    print(f"    - 面板: {old_details['panel_cost']:.2f} AUD")
    print(f"    - 逆变器: {old_details['inverter_cost']:.2f} AUD")
    print(f"    - 电池: {old_details['battery_cost']:.2f} AUD")
    print(f"    - 小计: {old_details['key_products_total']:.2f} AUD")
    print(f"  BOS成本:")
    print(f"    - 光伏基础安装费: {old_details['pv_base_install']:.2f} AUD")
    print(f"    - 光伏每kW安装费: {old_details['pv_per_kw_install']:.2f} AUD")
    print(f"    - 电池基础安装费: {old_details['battery_base_install']:.2f} AUD")
    print(f"    - 电池每kWh安装费: {old_details['battery_per_kwh_install']:.2f} AUD")
    print(f"    - 小计: {old_details['bos_total']:.2f} AUD")
    print(f"  税前总价: {old_details['pre_tax_total']:.2f} AUD")
    print(f"  GST: {old_details['gst']:.2f} AUD")
    print(f"  含税总价: {old_details['total_with_tax']:.2f} AUD")
    
    print(f"\n【新规则计算】")
    print(f"  面板报价: {new_details['panel_price']:.2f} AUD")
    print(f"  逆变器报价: {new_details['inverter_price']:.2f} AUD")
    print(f"  电池报价: {new_details['battery_price']:.2f} AUD")
    print(f"  税前总价: {new_details['pre_tax_total']:.2f} AUD")
    print(f"  GST: {new_details['gst']:.2f} AUD")
    print(f"  含税总价: {new_details['total_with_tax']:.2f} AUD")
    
    print(f"\n【补贴计算】")
    for key, value in subsidy_details.items():
        if key != 'total_subsidy':
            print(f"  {key}: {value:.2f} AUD")
    print(f"  总补贴: {subsidy:.2f} AUD")
    
    old_final = old_price - subsidy
    new_final = new_price - subsidy
    diff = new_final - old_final
    diff_rate = (diff / old_final * 100) if old_final != 0 else 0
    
    print(f"\n【最终报价】")
    print(f"  旧规则最终报价: {old_final:.2f} AUD")
    print(f"  新规则最终报价: {new_final:.2f} AUD")
    print(f"  差异: {diff:+.2f} AUD ({diff_rate:+.2f}%)")
    
    if diff > 0:
        print(f"  结论: 新规则比旧规则高 {diff:.2f} AUD")
    elif diff < 0:
        print(f"  结论: 新规则比旧规则低 {abs(diff):.2f} AUD，更优惠")
    else:
        print(f"  结论: 新旧规则报价一致")


def main():
    """主函数：运行三个方案的对比验证"""
    print("="*80)
    print("新老计算规则迭代验证工具")
    print("="*80)
    
    # 基础参数
    roof_max_panels = 37
    capacity_factor = 0.9
    panel_power_kw = 0.44
    dc_ac_ratio = 1.5
    yield_per_kw_per_year = 1526
    target_sc_rate = 0.5
    baseline_sc_rate = 0.3
    battery_dod = 0.9
    battery_rte = 0.95
    region = 'NSW'
    is_new_system = True
    
    # 初始化参数
    old_params = OldRuleParams()
    new_params = NewRuleParams()
    
    # 方案A：GS电池方案
    print("\n\n处理方案A（GS电池方案）...")
    config_a = calculate_system_config_plan_ab(
        roof_max_panels, capacity_factor, panel_power_kw, 'GS'
    )
    old_price_a, old_details_a = calculate_old_rule_price(config_a, old_params, is_new_system)
    new_price_a, new_details_a = calculate_new_rule_price(config_a, new_params)
    subsidy_a, subsidy_details_a = calculate_subsidies(config_a, is_new_system, region)
    print_comparison_report('A', config_a, old_price_a, old_details_a, 
                           new_price_a, new_details_a, subsidy_a, subsidy_details_a)
    
    # 方案B：GD电池方案
    print("\n\n处理方案B（GD电池方案）...")
    config_b = calculate_system_config_plan_ab(
        roof_max_panels, capacity_factor, panel_power_kw, 'GD'
    )
    old_price_b, old_details_b = calculate_old_rule_price(config_b, old_params, is_new_system)
    new_price_b, new_details_b = calculate_new_rule_price(config_b, new_params)
    subsidy_b, subsidy_details_b = calculate_subsidies(config_b, is_new_system, region)
    print_comparison_report('B', config_b, old_price_b, old_details_b, 
                           new_price_b, new_details_b, subsidy_b, subsidy_details_b)
    
    # 方案C：公式计算方案
    print("\n\n处理方案C（公式计算方案）...")
    config_c = calculate_system_config_plan_c(
        roof_max_panels, capacity_factor, panel_power_kw, dc_ac_ratio,
        yield_per_kw_per_year, target_sc_rate, baseline_sc_rate,
        battery_dod, battery_rte
    )
    old_price_c, old_details_c = calculate_old_rule_price(config_c, old_params, is_new_system)
    new_price_c, new_details_c = calculate_new_rule_price(config_c, new_params)
    subsidy_c, subsidy_details_c = calculate_subsidies(config_c, is_new_system, region)
    print_comparison_report('C', config_c, old_price_c, old_details_c, 
                           new_price_c, new_details_c, subsidy_c, subsidy_details_c)
    
    # 综合对比
    print(f"\n\n{'='*80}")
    print("综合对比汇总")
    print(f"{'='*80}")
    
    results = []
    for plan, config, old_price, new_price, subsidy in [
        ('A', config_a, old_price_a, new_price_a, subsidy_a),
        ('B', config_b, old_price_b, new_price_b, subsidy_b),
        ('C', config_c, old_price_c, new_price_c, subsidy_c)
    ]:
        old_final = old_price - subsidy
        new_final = new_price - subsidy
        diff = new_final - old_final
        diff_rate = (diff / old_final * 100) if old_final != 0 else 0
        results.append({
            'plan': plan,
            'config': f"{config.solar_kw:.2f}kW + {config.inverter_kw}kW逆变器 + {config.nominal_battery_kwh:.2f}kWh电池",
            'old_final': old_final,
            'new_final': new_final,
            'diff': diff,
            'diff_rate': diff_rate
        })
    
    print(f"\n{'方案':<6} {'系统配置':<40} {'旧规则':<12} {'新规则':<12} {'差异':<12} {'差异率':<10}")
    print("-" * 100)
    for r in results:
        print(f"{r['plan']:<6} {r['config']:<40} {r['old_final']:>10.2f} {r['new_final']:>10.2f} {r['diff']:>+10.2f} {r['diff_rate']:>+8.2f}%")
    
    avg_diff_rate = sum(r['diff_rate'] for r in results) / len(results)
    print(f"\n平均差异率: {avg_diff_rate:+.2f}%")
    
    if avg_diff_rate > 0:
        print(f"结论: 新规则整体比旧规则高 {avg_diff_rate:.2f}%")
    elif avg_diff_rate < 0:
        print(f"结论: 新规则整体比旧规则低 {abs(avg_diff_rate):.2f}%，更有竞争力")
    else:
        print(f"结论: 新旧规则整体持平")
    
    print("\n" + "="*80)


if __name__ == "__main__":
    main()
