#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速查询工具 - 查看特定案例的详细数据
"""

import csv
import sys

def load_data(filename='完整分析结果.csv'):
    """加载数据"""
    results = []
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            results.append(row)
    return results

def query_by_state_and_type(data, state, project_type):
    """按州和项目类型查询"""
    filtered = [r for r in data if r['state'] == state and r['project_type'] == project_type]
    return filtered

def display_summary(data, state, project_type):
    """显示汇总信息"""
    filtered = query_by_state_and_type(data, state, project_type)
    
    if not filtered:
        print(f"未找到 {state} - {project_type} 的数据")
        return
    
    print(f"\n{'='*100}")
    print(f"{state} - {project_type} 汇总")
    print(f"{'='*100}")
    
    # 统计各评级数量
    excellent = len([r for r in filtered if '优秀' in r['status']])
    good = len([r for r in filtered if '良好' in r['status']])
    average = len([r for r in filtered if '一般' in r['status']])
    poor = len([r for r in filtered if '偏差' in r['status'] or '无法回本' in r['status']])
    
    print(f"\n评级分布：")
    print(f"  ✅ 优秀：{excellent}个")
    print(f"  ✅ 良好：{good}个")
    print(f"  ⚠️  一般：{average}个")
    print(f"  ❌ 偏差/无法回本：{poor}个")
    
    # 找出最佳案例
    valid_cases = [r for r in filtered if r['irr'] and float(r['irr']) > 0]
    
    if valid_cases:
        best_irr = max(valid_cases, key=lambda x: float(x['irr']))
        best_payback = min(valid_cases, key=lambda x: float(x['payback_years']))
        
        print(f"\n最佳IRR案例：")
        print(f"  面板数量：{best_irr['panel_count']}块")
        print(f"  系统规模：{best_irr['solar_kw']} kW + {best_irr['battery_kwh']} kWh")
        print(f"  投资成本：${float(best_irr['final_investment']):,.0f}")
        print(f"  回本周期：{float(best_irr['payback_years']):.1f}年")
        print(f"  IRR：{float(best_irr['irr']):.1f}%")
        print(f"  20年净利润：${float(best_irr['net_profit_20year']):,.0f}")
        
        print(f"\n最快回本案例：")
        print(f"  面板数量：{best_payback['panel_count']}块")
        print(f"  系统规模：{best_payback['solar_kw']} kW + {best_payback['battery_kwh']} kWh")
        print(f"  投资成本：${float(best_payback['final_investment']):,.0f}")
        print(f"  回本周期：{float(best_payback['payback_years']):.1f}年")
        print(f"  IRR：{float(best_payback['irr']):.1f}%")

def display_top_cases(data, state, project_type, top_n=10):
    """显示前N个最佳案例"""
    filtered = query_by_state_and_type(data, state, project_type)
    valid_cases = [r for r in filtered if r['irr'] and float(r['irr']) > 0]
    
    if not valid_cases:
        print(f"未找到有效案例")
        return
    
    # 按IRR排序
    sorted_cases = sorted(valid_cases, key=lambda x: float(x['irr']), reverse=True)[:top_n]
    
    print(f"\n{'='*100}")
    print(f"{state} - {project_type} TOP {top_n} 案例（按IRR排序）")
    print(f"{'='*100}")
    print(f"\n{'排名':<4} | {'面板':<6} | {'系统规模':<20} | {'投资':<12} | {'回本':<8} | {'IRR':<8} | {'20年净利':<12} | 评级")
    print(f"{'-'*100}")
    
    for i, case in enumerate(sorted_cases, 1):
        print(f"{i:<4} | {case['panel_count']:<6} | "
              f"{case['solar_kw']}kW+{case['battery_kwh']}kWh{' '*(20-len(case['solar_kw'])-len(case['battery_kwh'])-6)} | "
              f"${float(case['final_investment']):>10,.0f} | "
              f"{float(case['payback_years']):>6.1f}年 | "
              f"{float(case['irr']):>6.1f}% | "
              f"${float(case['net_profit_20year']):>10,.0f} | "
              f"{case['status']}")

def compare_states(data, project_type, panel_count):
    """对比不同州的表现"""
    print(f"\n{'='*120}")
    print(f"各州对比 - {project_type} - {panel_count}块面板")
    print(f"{'='*120}")
    print(f"\n{'州':<6} | {'系统规模':<20} | {'投资':<12} | {'回本':<8} | {'IRR':<8} | {'年发电':<10} | {'20年净利':<12} | 评级")
    print(f"{'-'*120}")
    
    states = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']
    
    for state in states:
        filtered = query_by_state_and_type(data, state, project_type)
        case = next((r for r in filtered if int(r['panel_count']) == panel_count), None)
        
        if case:
            payback = float(case['payback_years']) if case['payback_years'] else 999
            irr = float(case['irr']) if case['irr'] else 0
            
            print(f"{state:<6} | "
                  f"{case['solar_kw']}kW+{case['battery_kwh']}kWh{' '*(20-len(case['solar_kw'])-len(case['battery_kwh'])-6)} | "
                  f"${float(case['final_investment']):>10,.0f} | "
                  f"{payback:>6.1f}年 | "
                  f"{irr:>6.1f}% | "
                  f"{float(case['annual_generation']):>8,.0f} | "
                  f"${float(case['net_profit_20year']):>10,.0f} | "
                  f"{case['status']}")

def main():
    """主函数"""
    data = load_data()
    
    print("="*100)
    print("新定价规则投资回报分析 - 查询工具")
    print("="*100)
    
    # 示例查询
    print("\n【示例1：NSW州新建系统汇总】")
    display_summary(data, 'NSW', '新建系统')
    
    print("\n\n【示例2：SA州储能扩容TOP 10】")
    display_top_cases(data, 'SA', '储能扩容', 10)
    
    print("\n\n【示例3：各州对比 - 新建系统 - 11块面板】")
    compare_states(data, '新建系统', 11)
    
    print("\n\n【示例4：各州对比 - 储能扩容 - 11块面板】")
    compare_states(data, '储能扩容', 11)
    
    print("\n\n【示例5：各州对比 - 新建系统 - 50块面板】")
    compare_states(data, '新建系统', 50)
    
    print("\n\n" + "="*100)
    print("查询完成！")
    print("="*100)

if __name__ == "__main__":
    main()
