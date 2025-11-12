#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
参数180/200/325完整迭代报告
从1块面板开始，逐一展示每个案例的详细计算
"""

import math
from 新规则定价边界分析 import NewPricingParams, calculate_system_config, GS_POWER_MAPPING

def detailed_iteration_report():
    """生成完整的迭代报告"""
    
    params = NewPricingParams(
        panel_price_per_kw=180,
        inverter_price_per_kw=200,
        battery_price_per_kwh=325
    )
    
    print("="*150)
    print("参数180/200/325完整迭代计算报告")
    print("从屋顶理论面板数量1块开始，完整展示每个案例的计算过程")
    print("="*150)
    
    # 重点测试的地区和项目类型
    test_scenarios = [
        {'region': 'NSW', 'project_type': '新建系统', 'is_new': True, 'cf': 0.9},
        {'region': 'VIC', 'project_type': '新建系统', 'is_new': True, 'cf': 0.9},
    ]
    
    for scenario in test_scenarios:
        region = scenario['region']
        project_type = scenario['project_type']
        is_new = scenario['is_new']
        cf = scenario['cf']
        
        print(f"\n\n{'='*150}")
        print(f"【{region}州 - {project_type}】")
        print(f"{'='*150}")
        
        print(f"\n{'屋顶':>4s} | {'实际':>4s} | {'光伏':>6s} | {'逆变器':>6s} | {'电池':>6s} | {'含税':>10s} | {'PV_STC':>10s} | {'Bat_STC':>10s} | {'州补贴':>10s} | {'补贴合计':>10s} | {'最终报价':>10s} | 状态")
        print(f"{'面板':>4s} | {'面板':>4s} | {'(kW)':>6s} | {'(kW)':>6s} | {'(kWh)':>6s} | {'总价($)':>10s} | {'($)':>10s} | {'($)':>10s} | {'($)':>10s} | {'($)':>10s} | {'($)':>10s} |")
        print("-" * 150)
        
        for panel_count in range(1, 101):
            config = calculate_system_config(panel_count, cf, params)
            
            # 计算价格
            if is_new:
                panel_cost = config.solar_kw * params.panel_price_per_kw
                inverter_cost = config.inverter_kw * params.inverter_price_per_kw
            else:
                panel_cost = 0
                inverter_cost = 0
            
            battery_cost = config.nominal_battery_kwh * params.battery_price_per_kwh
            pre_tax = panel_cost + inverter_cost + battery_cost
            gst = pre_tax * params.gst_rate
            total_with_tax = pre_tax + gst
            
            # 计算补贴
            # PV STC
            if is_new:
                pv_stc_qty = config.solar_kw * params.zone_rating * params.deeming_period
                pv_stc = pv_stc_qty * params.pv_stc_price
            else:
                pv_stc = 0
            
            # Battery STC
            battery_stc_qty = math.floor(config.usable_battery_kwh * params.battery_stc_factor)
            battery_stc = battery_stc_qty * params.battery_stc_price
            
            # 州补贴
            state_subsidy = 0
            if region == 'VIC' and is_new:
                state_subsidy = params.vic_rebate + params.vic_loan
            elif region == 'NSW' and 2 <= config.usable_battery_kwh <= 28:
                demand_response = config.usable_battery_kwh * 0.0734
                peak_response = demand_response * 0.8
                peak_reduction = peak_response * 6 * 6
                prc_qty = math.floor(peak_reduction * params.network_loss_factor * 10)
                state_subsidy = prc_qty * params.nsw_prc_price
            
            total_subsidy = pv_stc + battery_stc + state_subsidy
            final_price = total_with_tax - total_subsidy
            
            # 状态标记
            if final_price < 0:
                status = "❌负值"
            elif final_price < 1000:
                status = "⚠️极低"
            elif final_price < 2000:
                status = "⚠️偏低"
            else:
                status = "✅正常"
            
            # 输出行
            print(f"{panel_count:4d} | {config.panel_count:4d} | {config.solar_kw:6.2f} | {config.inverter_kw:6.1f} | {config.nominal_battery_kwh:6.2f} | "
                  f"{total_with_tax:10,.0f} | {pv_stc:10,.0f} | {battery_stc:10,.0f} | {state_subsidy:10,.0f} | "
                  f"{total_subsidy:10,.0f} | {final_price:10,.0f} | {status}")
    
    # 生成统计摘要
    print(f"\n\n{'='*150}")
    print("【统计摘要】")
    print(f"{'='*150}")
    
    generate_summary(params)

def generate_summary(params):
    """生成统计摘要"""
    
    regions = ['NSW', 'VIC']
    
    for region in regions:
        print(f"\n{region}州统计：")
        
        negative_count = 0
        low_count = 0
        very_low_count = 0
        min_price = float('inf')
        min_panel = 0
        
        for panel_count in range(1, 101):
            config = calculate_system_config(panel_count, 0.9, params)
            
            # 计算价格
            panel_cost = config.solar_kw * params.panel_price_per_kw
            inverter_cost = config.inverter_kw * params.inverter_price_per_kw
            battery_cost = config.nominal_battery_kwh * params.battery_price_per_kwh
            pre_tax = panel_cost + inverter_cost + battery_cost
            total_with_tax = pre_tax * 1.1
            
            # 计算补贴
            pv_stc_qty = config.solar_kw * params.zone_rating * params.deeming_period
            pv_stc = pv_stc_qty * params.pv_stc_price
            
            battery_stc_qty = math.floor(config.usable_battery_kwh * params.battery_stc_factor)
            battery_stc = battery_stc_qty * params.battery_stc_price
            
            state_subsidy = 0
            if region == 'VIC':
                state_subsidy = params.vic_rebate + params.vic_loan
            elif region == 'NSW' and 2 <= config.usable_battery_kwh <= 28:
                demand_response = config.usable_battery_kwh * 0.0734
                peak_response = demand_response * 0.8
                peak_reduction = peak_response * 6 * 6
                prc_qty = math.floor(peak_reduction * params.network_loss_factor * 10)
                state_subsidy = prc_qty * params.nsw_prc_price
            
            total_subsidy = pv_stc + battery_stc + state_subsidy
            final_price = total_with_tax - total_subsidy
            
            if final_price < 0:
                negative_count += 1
            if final_price < 1000:
                very_low_count += 1
            if final_price < 2000:
                low_count += 1
            
            if final_price < min_price:
                min_price = final_price
                min_panel = panel_count
        
        print(f"  负值案例数：{negative_count}/100")
        print(f"  极低价格案例（<$1000）：{very_low_count}/100")
        print(f"  偏低价格案例（<$2000）：{low_count}/100")
        print(f"  最小报价：${min_price:,.2f}（{min_panel}块面板）")

def generate_markdown_report():
    """生成Markdown格式的报告"""
    
    params = NewPricingParams(
        panel_price_per_kw=180,
        inverter_price_per_kw=200,
        battery_price_per_kwh=325
    )
    
    with open('参数180_200_325完整迭代报告.md', 'w', encoding='utf-8') as f:
        f.write("# 参数180/200/325完整迭代计算报告\n\n")
        f.write("## 测试参数\n\n")
        f.write("- **面板单价**：$180/kW\n")
        f.write("- **逆变器单价**：$200/kW\n")
        f.write("- **电池单价**：$325/kWh\n\n")
        f.write("---\n\n")
        
        regions = ['NSW', 'VIC']
        
        for region in regions:
            f.write(f"## {region}州 - 新建系统完整迭代\n\n")
            f.write("| 屋顶面板 | 实际面板 | 光伏(kW) | 逆变器(kW) | 电池(kWh) | 含税总价 | PV STC | Battery STC | 州补贴 | 补贴合计 | 最终报价 | 状态 |\n")
            f.write("|---------|---------|---------|-----------|----------|---------|--------|------------|--------|---------|---------|------|\n")
            
            for panel_count in range(1, 101):
                config = calculate_system_config(panel_count, 0.9, params)
                
                # 计算价格
                panel_cost = config.solar_kw * params.panel_price_per_kw
                inverter_cost = config.inverter_kw * params.inverter_price_per_kw
                battery_cost = config.nominal_battery_kwh * params.battery_price_per_kwh
                pre_tax = panel_cost + inverter_cost + battery_cost
                total_with_tax = pre_tax * 1.1
                
                # 计算补贴
                pv_stc_qty = config.solar_kw * params.zone_rating * params.deeming_period
                pv_stc = pv_stc_qty * params.pv_stc_price
                
                battery_stc_qty = math.floor(config.usable_battery_kwh * params.battery_stc_factor)
                battery_stc = battery_stc_qty * params.battery_stc_price
                
                state_subsidy = 0
                if region == 'VIC':
                    state_subsidy = params.vic_rebate + params.vic_loan
                elif region == 'NSW' and 2 <= config.usable_battery_kwh <= 28:
                    demand_response = config.usable_battery_kwh * 0.0734
                    peak_response = demand_response * 0.8
                    peak_reduction = peak_response * 6 * 6
                    prc_qty = math.floor(peak_reduction * params.network_loss_factor * 10)
                    state_subsidy = prc_qty * params.nsw_prc_price
                
                total_subsidy = pv_stc + battery_stc + state_subsidy
                final_price = total_with_tax - total_subsidy
                
                # 状态标记
                if final_price < 0:
                    status = "❌负值"
                elif final_price < 1000:
                    status = "⚠️极低"
                elif final_price < 2000:
                    status = "⚠️偏低"
                else:
                    status = "✅正常"
                
                f.write(f"| {panel_count} | {config.panel_count} | {config.solar_kw:.2f} | {config.inverter_kw:.1f} | {config.nominal_battery_kwh:.2f} | "
                       f"${total_with_tax:,.0f} | ${pv_stc:,.0f} | ${battery_stc:,.0f} | ${state_subsidy:,.0f} | "
                       f"${total_subsidy:,.0f} | ${final_price:,.0f} | {status} |\n")
            
            f.write("\n---\n\n")
    
    print(f"\nMarkdown报告已生成：参数180_200_325完整迭代报告.md")

if __name__ == "__main__":
    detailed_iteration_report()
    print("\n\n正在生成Markdown报告...")
    generate_markdown_report()
