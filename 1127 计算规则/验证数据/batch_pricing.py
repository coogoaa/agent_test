#!/usr/bin/env python3
"""
批量定价计算脚本
读取坡面信息CSV，遍历不同州/领地，计算四套定价方案
"""

import csv
import math
from datetime import datetime

# 配置参数
CONFIG = {
    # 方案 A: 线性定价
    'schemeA': {
        'pvPerKw': 540,
        'inverterPerKw': 280,
        'batteryPerKwh': 865
    },
    # 方案 B: 基准+增量定价
    'schemeB': {
        'baseKw': 6.6,
        'basePrice': 4500,
        'adderPricePerKw': 500,
        'batteryInstallFee': 1500,
        'batteryPerKwh': 700
    },
    # 方案 C: $/kW 简化定价
    'schemeC': {
        'solarOnly': {'exGstExStc': 750, 'incGstIncStc': 600},
        'hybridPv': {'exGstExStc': 800, 'incGstIncStc': 650},
        'battery': {'exGstExStc': 700, 'incGstIncStc': 450}
    },
    # 方案 D: 分离式定价
    'schemeD': {
        'solarOnly': {'exGstExStc': 750, 'incGstIncStc': 600},
        'hybridPv': {'exGstExStc': 650, 'incGstIncStc': 520},
        'batteryInstallFee': {'exGstExStc': 1800, 'incGstIncStc': 1500},
        'batteryPerKwh': {'exGstExStc': 550, 'incGstIncStc': 450}
    },
    # 补贴参数
    'subsidy': {
        'stcPrice': 39,
        'deemingPeriod': 6,
        'zoneRating': {
            'TAS': 1.382, 'NT': 1.622, 'ACT': 1.382,
            'SA': 1.536, 'NSW': 1.382, 'QLD': 1.536,
            'VIC': 1.382, 'WA': 1.536
        },
        'batteryStcFactor': 9.3
    },
    'gstRate': 0.1,
    # PV 面板参数
    'pvPanel': {
        'pmax': 0.44,  # kW per panel
    },
    # 电池配置
    'batteryKwh': 10.0  # 默认电池容量
}

STATES = ['TAS', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'NT', 'ACT']

def calculate_subsidy(pv_kw, battery_kwh, state):
    """计算STC补贴"""
    zone_rating = CONFIG['subsidy']['zoneRating'].get(state, 1.382)
    deeming = CONFIG['subsidy']['deemingPeriod']
    stc_price = CONFIG['subsidy']['stcPrice']
    
    pv_stc = math.floor(pv_kw * zone_rating * deeming)
    battery_stc = math.floor(battery_kwh * CONFIG['subsidy']['batteryStcFactor'])
    total_stc = pv_stc + battery_stc
    subsidy = total_stc * stc_price
    
    return {'pv_stc': pv_stc, 'battery_stc': battery_stc, 'total_stc': total_stc, 'subsidy': subsidy}

def calculate_scheme_a(pv_kw, battery_kwh, state):
    """方案 A: 线性定价"""
    params = CONFIG['schemeA']
    inverter_kw = pv_kw * 0.8
    
    pv_cost = pv_kw * params['pvPerKw']
    inverter_cost = inverter_kw * params['inverterPerKw']
    battery_cost = battery_kwh * params['batteryPerKwh']
    
    pre_tax = pv_cost + inverter_cost + battery_cost
    with_tax = pre_tax * (1 + CONFIG['gstRate'])
    
    sub = calculate_subsidy(pv_kw, battery_kwh, state)
    final = with_tax - sub['subsidy']
    
    return {'pre_tax': pre_tax, 'with_tax': with_tax, 'subsidy': sub['subsidy'], 'final': final}

def calculate_scheme_b(pv_kw, battery_kwh, state):
    """方案 B: 基准+增量定价"""
    params = CONFIG['schemeB']
    
    if pv_kw <= params['baseKw']:
        system_cost = (pv_kw / params['baseKw']) * params['basePrice']
    else:
        extra_kw = pv_kw - params['baseKw']
        system_cost = params['basePrice'] + (extra_kw * params['adderPricePerKw'])
    
    if battery_kwh > 0:
        battery_cost = params['batteryInstallFee'] + (battery_kwh * params['batteryPerKwh'])
    else:
        battery_cost = 0
    
    pre_tax = system_cost + battery_cost
    with_tax = pre_tax * (1 + CONFIG['gstRate'])
    
    sub = calculate_subsidy(pv_kw, battery_kwh, state)
    final = with_tax - sub['subsidy']
    
    return {'pre_tax': pre_tax, 'with_tax': with_tax, 'subsidy': sub['subsidy'], 'final': final}

def calculate_scheme_c(pv_kw, battery_kwh, state):
    """方案 C: $/kW 简化定价"""
    params = CONFIG['schemeC']
    is_hybrid = battery_kwh > 0
    pv_params = params['hybridPv'] if is_hybrid else params['solarOnly']
    
    pv_ex = pv_kw * pv_params['exGstExStc']
    bat_ex = battery_kwh * params['battery']['exGstExStc']
    total_ex = pv_ex + bat_ex
    
    pv_inc = pv_kw * pv_params['incGstIncStc']
    bat_inc = battery_kwh * params['battery']['incGstIncStc']
    total_inc = pv_inc + bat_inc
    
    return {
        'ex_gst_ex_stc': {'pv': pv_ex, 'battery': bat_ex, 'total': total_ex, 'per_kw': total_ex / pv_kw if pv_kw > 0 else 0},
        'inc_gst_inc_stc': {'pv': pv_inc, 'battery': bat_inc, 'total': total_inc, 'per_kw': total_inc / pv_kw if pv_kw > 0 else 0}
    }

def calculate_scheme_d(pv_kw, battery_kwh, state):
    """方案 D: 分离式定价"""
    params = CONFIG['schemeD']
    is_hybrid = battery_kwh > 0
    pv_params = params['hybridPv'] if is_hybrid else params['solarOnly']
    
    pv_ex = pv_kw * pv_params['exGstExStc']
    bat_install_ex = params['batteryInstallFee']['exGstExStc'] if is_hybrid else 0
    bat_capacity_ex = battery_kwh * params['batteryPerKwh']['exGstExStc'] if is_hybrid else 0
    bat_ex = bat_install_ex + bat_capacity_ex
    total_ex = pv_ex + bat_ex
    
    pv_inc = pv_kw * pv_params['incGstIncStc']
    bat_install_inc = params['batteryInstallFee']['incGstIncStc'] if is_hybrid else 0
    bat_capacity_inc = battery_kwh * params['batteryPerKwh']['incGstIncStc'] if is_hybrid else 0
    bat_inc = bat_install_inc + bat_capacity_inc
    total_inc = pv_inc + bat_inc
    
    return {
        'ex_gst_ex_stc': {'pv': pv_ex, 'battery_install': bat_install_ex, 'battery_capacity': bat_capacity_ex, 'battery': bat_ex, 'total': total_ex, 'per_kw': total_ex / pv_kw if pv_kw > 0 else 0},
        'inc_gst_inc_stc': {'pv': pv_inc, 'battery_install': bat_install_inc, 'battery_capacity': bat_capacity_inc, 'battery': bat_inc, 'total': total_inc, 'per_kw': total_inc / pv_kw if pv_kw > 0 else 0}
    }

def process_csv(input_file):
    """处理CSV文件，按id_0分组计算面板数量"""
    projects = {}
    
    with open(input_file, 'r', encoding='utf-8-sig') as f:  # utf-8-sig 处理 BOM
        reader = csv.DictReader(f)
        for row in reader:
            id_0 = row['id_0']
            nums = int(row['nums']) if row['nums'] and row['nums'].strip() else 0
            
            if id_0 not in projects:
                projects[id_0] = {'total_panels': 0, 'slopes': []}
            
            projects[id_0]['total_panels'] += nums
            if nums > 0:
                projects[id_0]['slopes'].append({
                    'slope': row['slope'],
                    'aspect': float(row['aspect']) if row['aspect'] else 0,
                    'nums': nums
                })
    
    return projects

def run_batch(input_file, output_file, battery_kwh=10.0):
    """批量运行定价计算"""
    projects = process_csv(input_file)
    
    results = []
    
    for id_0, data in projects.items():
        total_panels = data['total_panels']
        if total_panels == 0:
            continue
        
        pv_kw = total_panels * CONFIG['pvPanel']['pmax']
        
        for state in STATES:
            a = calculate_scheme_a(pv_kw, battery_kwh, state)
            b = calculate_scheme_b(pv_kw, battery_kwh, state)
            c = calculate_scheme_c(pv_kw, battery_kwh, state)
            d = calculate_scheme_d(pv_kw, battery_kwh, state)
            
            results.append({
                'id': id_0,
                'panels': total_panels,
                'pv_kw': round(pv_kw, 2),
                'battery_kwh': battery_kwh,
                'state': state,
                'schemeA_final': round(a['final'], 0),
                'schemeA_per_kw': round(a['final'] / pv_kw, 0) if pv_kw > 0 else 0,
                'schemeB_final': round(b['final'], 0),
                'schemeB_per_kw': round(b['final'] / pv_kw, 0) if pv_kw > 0 else 0,
                'schemeC_ex': round(c['ex_gst_ex_stc']['total'], 0),
                'schemeC_inc': round(c['inc_gst_inc_stc']['total'], 0),
                'schemeC_per_kw': round(c['inc_gst_inc_stc']['per_kw'], 0),
                'schemeD_ex': round(d['ex_gst_ex_stc']['total'], 0),
                'schemeD_inc': round(d['inc_gst_inc_stc']['total'], 0),
                'schemeD_per_kw': round(d['inc_gst_inc_stc']['per_kw'], 0),
            })
    
    # 写入CSV
    if results:
        fieldnames = list(results[0].keys())
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(results)
        
        print(f"已处理 {len(projects)} 个项目，{len(STATES)} 个州/领地")
        print(f"共生成 {len(results)} 条记录")
        print(f"输出文件: {output_file}")
    
    return results

def print_summary(results):
    """打印汇总统计"""
    if not results:
        return
    
    print("\n" + "=" * 60)
    print("汇总统计 (含税含补贴价格)")
    print("=" * 60)
    
    # 按州统计平均价格
    state_stats = {}
    for r in results:
        state = r['state']
        if state not in state_stats:
            state_stats[state] = {'A': [], 'B': [], 'C': [], 'D': []}
        state_stats[state]['A'].append(r['schemeA_final'])
        state_stats[state]['B'].append(r['schemeB_final'])
        state_stats[state]['C'].append(r['schemeC_inc'])
        state_stats[state]['D'].append(r['schemeD_inc'])
    
    print(f"\n{'州':<6} {'方案A平均':>12} {'方案B平均':>12} {'方案C平均':>12} {'方案D平均':>12}")
    print("-" * 60)
    for state in STATES:
        if state in state_stats:
            avg_a = sum(state_stats[state]['A']) / len(state_stats[state]['A'])
            avg_b = sum(state_stats[state]['B']) / len(state_stats[state]['B'])
            avg_c = sum(state_stats[state]['C']) / len(state_stats[state]['C'])
            avg_d = sum(state_stats[state]['D']) / len(state_stats[state]['D'])
            print(f"{state:<6} ${avg_a:>10,.0f} ${avg_b:>10,.0f} ${avg_c:>10,.0f} ${avg_d:>10,.0f}")
    
    # 总体统计
    all_a = [r['schemeA_final'] for r in results]
    all_b = [r['schemeB_final'] for r in results]
    all_c = [r['schemeC_inc'] for r in results]
    all_d = [r['schemeD_inc'] for r in results]
    
    print("-" * 60)
    print(f"{'总平均':<6} ${sum(all_a)/len(all_a):>10,.0f} ${sum(all_b)/len(all_b):>10,.0f} ${sum(all_c)/len(all_c):>10,.0f} ${sum(all_d)/len(all_d):>10,.0f}")
    print(f"{'最小值':<6} ${min(all_a):>10,.0f} ${min(all_b):>10,.0f} ${min(all_c):>10,.0f} ${min(all_d):>10,.0f}")
    print(f"{'最大值':<6} ${max(all_a):>10,.0f} ${max(all_b):>10,.0f} ${max(all_c):>10,.0f} ${max(all_d):>10,.0f}")

if __name__ == '__main__':
    import os
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, 'agent_sample_data - 坡面信息.csv')
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = os.path.join(script_dir, f'batch_pricing_results_{timestamp}.csv')
    
    print("=" * 60)
    print("批量定价计算脚本")
    print("=" * 60)
    print(f"输入文件: {input_file}")
    print(f"电池容量: {CONFIG['batteryKwh']} kWh")
    print(f"州/领地: {', '.join(STATES)}")
    print("=" * 60)
    
    results = run_batch(input_file, output_file, CONFIG['batteryKwh'])
    print_summary(results)
