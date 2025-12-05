#!/usr/bin/env python3
"""
三套定价方案验证脚本
使用样例数据对比方案 A、B、C 的价格
"""

# 配置参数
CONFIG = {
    'pv_watt': 440,  # 每片面板功率
    'gst_rate': 0.1,
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
    # 方案 C: $/kW 简化定价 (调整后)
    'schemeC': {
        'solarOnly': {'exGstExStc': 750, 'incGstIncStc': 600},
        'hybridPv': {'exGstExStc': 800, 'incGstIncStc': 650},
        'battery': {'exGstExStc': 700, 'incGstIncStc': 450}
    },
    # 方案 D: 分离式定价 (PV + 电池安装费 + 电池容量)
    # 调整后参数，使价格接近方案 A/B
    'schemeD': {
        'solarOnly': {'exGstExStc': 750, 'incGstIncStc': 600},
        'hybridPv': {'exGstExStc': 650, 'incGstIncStc': 520},
        'batteryInstallFee': {'exGstExStc': 1800, 'incGstIncStc': 1500},
        'batteryPerKwh': {'exGstExStc': 550, 'incGstIncStc': 450}
    },
    # 补贴参数
    'subsidy': {
        'stcPrice': 39,
        'deemingPeriod': 6,  # 2025-2030
        'zoneRating': {
            'TAS': 1.382, 'NT': 1.622, 'ACT': 1.382,
            'SA': 1.536, 'NSW': 1.382, 'QLD': 1.536,
            'VIC': 1.382, 'WA': 1.536
        }
    }
}

def calculate_subsidy(pv_kw, battery_kwh, state):
    """计算补贴金额"""
    zone = CONFIG['subsidy']['zoneRating'].get(state, 1.382)
    deeming = CONFIG['subsidy']['deemingPeriod']
    stc_price = CONFIG['subsidy']['stcPrice']
    
    # PV STC
    pv_stc = pv_kw * zone * deeming
    # Battery STC (简化计算)
    battery_stc = min(battery_kwh, 50) * 9.3
    
    total_stc = pv_stc + battery_stc
    return total_stc * stc_price

def calculate_scheme_a(pv_kw, inverter_kw, battery_kwh, state):
    """方案 A: 线性定价"""
    params = CONFIG['schemeA']
    pv_cost = pv_kw * params['pvPerKw']
    inv_cost = inverter_kw * params['inverterPerKw']
    bat_cost = battery_kwh * params['batteryPerKwh']
    
    pre_tax = pv_cost + inv_cost + bat_cost
    with_tax = pre_tax * (1 + CONFIG['gst_rate'])
    subsidy = calculate_subsidy(pv_kw, battery_kwh, state)
    final = with_tax - subsidy
    
    return {
        'pv_cost': pv_cost,
        'inv_cost': inv_cost,
        'bat_cost': bat_cost,
        'pre_tax': pre_tax,
        'with_tax': with_tax,
        'subsidy': subsidy,
        'final': final
    }

def calculate_scheme_b(pv_kw, inverter_kw, battery_kwh, state):
    """方案 B: 基准+增量定价"""
    params = CONFIG['schemeB']
    
    if pv_kw <= params['baseKw']:
        system_cost = (pv_kw / params['baseKw']) * params['basePrice']
    else:
        extra_kw = pv_kw - params['baseKw']
        system_cost = params['basePrice'] + extra_kw * params['adderPricePerKw']
    
    if battery_kwh > 0:
        bat_cost = params['batteryInstallFee'] + battery_kwh * params['batteryPerKwh']
    else:
        bat_cost = 0
    
    pre_tax = system_cost + bat_cost
    with_tax = pre_tax * (1 + CONFIG['gst_rate'])
    subsidy = calculate_subsidy(pv_kw, battery_kwh, state)
    final = with_tax - subsidy
    
    return {
        'system_cost': system_cost,
        'bat_cost': bat_cost,
        'pre_tax': pre_tax,
        'with_tax': with_tax,
        'subsidy': subsidy,
        'final': final
    }

def calculate_scheme_c(pv_kw, battery_kwh, state):
    """方案 C: $/kW 简化定价"""
    params = CONFIG['schemeC']
    is_hybrid = battery_kwh > 0
    pv_params = params['hybridPv'] if is_hybrid else params['solarOnly']
    
    # 不含税不含补贴
    pv_ex = pv_kw * pv_params['exGstExStc']
    bat_ex = battery_kwh * params['battery']['exGstExStc']
    total_ex = pv_ex + bat_ex
    
    # 含税含补贴
    pv_inc = pv_kw * pv_params['incGstIncStc']
    bat_inc = battery_kwh * params['battery']['incGstIncStc']
    total_inc = pv_inc + bat_inc
    
    return {
        'is_hybrid': is_hybrid,
        'ex_gst_ex_stc': {
            'pv': pv_ex,
            'battery': bat_ex,
            'total': total_ex,
            'per_kw': total_ex / pv_kw if pv_kw > 0 else 0
        },
        'inc_gst_inc_stc': {
            'pv': pv_inc,
            'battery': bat_inc,
            'total': total_inc,
            'per_kw': total_inc / pv_kw if pv_kw > 0 else 0
        }
    }

def calculate_scheme_d(pv_kw, battery_kwh, state):
    """方案 D: 分离式定价 (PV + 电池安装费 + 电池容量)"""
    params = CONFIG['schemeD']
    is_hybrid = battery_kwh > 0
    pv_params = params['hybridPv'] if is_hybrid else params['solarOnly']
    
    # 不含税不含补贴
    pv_ex = pv_kw * pv_params['exGstExStc']
    bat_install_ex = params['batteryInstallFee']['exGstExStc'] if is_hybrid else 0
    bat_capacity_ex = battery_kwh * params['batteryPerKwh']['exGstExStc'] if is_hybrid else 0
    bat_ex = bat_install_ex + bat_capacity_ex
    total_ex = pv_ex + bat_ex
    
    # 含税含补贴
    pv_inc = pv_kw * pv_params['incGstIncStc']
    bat_install_inc = params['batteryInstallFee']['incGstIncStc'] if is_hybrid else 0
    bat_capacity_inc = battery_kwh * params['batteryPerKwh']['incGstIncStc'] if is_hybrid else 0
    bat_inc = bat_install_inc + bat_capacity_inc
    total_inc = pv_inc + bat_inc
    
    return {
        'is_hybrid': is_hybrid,
        'ex_gst_ex_stc': {
            'pv': pv_ex,
            'battery_install': bat_install_ex,
            'battery_capacity': bat_capacity_ex,
            'battery': bat_ex,
            'total': total_ex,
            'per_kw': total_ex / pv_kw if pv_kw > 0 else 0
        },
        'inc_gst_inc_stc': {
            'pv': pv_inc,
            'battery_install': bat_install_inc,
            'battery_capacity': bat_capacity_inc,
            'battery': bat_inc,
            'total': total_inc,
            'per_kw': total_inc / pv_kw if pv_kw > 0 else 0
        }
    }

def print_comparison(pv_kw, battery_kwh, state='TAS'):
    """打印四套方案对比"""
    inverter_kw = min(pv_kw * 0.8, 10)  # 简化逆变器选择
    
    print(f"\n{'='*70}")
    print(f"配置: {pv_kw:.2f} kW PV + {battery_kwh:.1f} kWh 电池 | 州: {state}")
    print(f"{'='*70}")
    
    # 方案 A
    a = calculate_scheme_a(pv_kw, inverter_kw, battery_kwh, state)
    print(f"\n【方案 A: 线性定价】")
    print(f"  PV成本: ${a['pv_cost']:,.0f} | 逆变器: ${a['inv_cost']:,.0f} | 电池: ${a['bat_cost']:,.0f}")
    print(f"  税前: ${a['pre_tax']:,.0f} | 含税: ${a['with_tax']:,.0f}")
    print(f"  补贴: ${a['subsidy']:,.0f}")
    print(f"  ★ 最终价格: ${a['final']:,.0f} ($/kW: ${a['final']/pv_kw:,.0f})")
    
    # 方案 B
    b = calculate_scheme_b(pv_kw, inverter_kw, battery_kwh, state)
    print(f"\n【方案 B: 基准+增量定价】")
    print(f"  系统成本: ${b['system_cost']:,.0f} | 电池: ${b['bat_cost']:,.0f}")
    print(f"  税前: ${b['pre_tax']:,.0f} | 含税: ${b['with_tax']:,.0f}")
    print(f"  补贴: ${b['subsidy']:,.0f}")
    print(f"  ★ 最终价格: ${b['final']:,.0f} ($/kW: ${b['final']/pv_kw:,.0f})")
    
    # 方案 C
    c = calculate_scheme_c(pv_kw, battery_kwh, state)
    print(f"\n【方案 C: $/kW 简化定价】")
    print(f"  类型: {'Hybrid' if c['is_hybrid'] else 'Solar Only'}")
    print(f"  不含税不含补贴: PV ${c['ex_gst_ex_stc']['pv']:,.0f} + 电池 ${c['ex_gst_ex_stc']['battery']:,.0f}")
    print(f"  ★ 总价(不含税补): ${c['ex_gst_ex_stc']['total']:,.0f} ($/kW: ${c['ex_gst_ex_stc']['per_kw']:,.0f})")
    print(f"  含税含补贴: PV ${c['inc_gst_inc_stc']['pv']:,.0f} + 电池 ${c['inc_gst_inc_stc']['battery']:,.0f}")
    print(f"  ★ 总价(含税补): ${c['inc_gst_inc_stc']['total']:,.0f} ($/kW: ${c['inc_gst_inc_stc']['per_kw']:,.0f})")
    
    # 方案 D
    d = calculate_scheme_d(pv_kw, battery_kwh, state)
    print(f"\n【方案 D: 分离式定价】")
    print(f"  类型: {'Hybrid' if d['is_hybrid'] else 'Solar Only'}")
    if d['is_hybrid']:
        print(f"  不含税不含补贴: PV ${d['ex_gst_ex_stc']['pv']:,.0f} + 安装费 ${d['ex_gst_ex_stc']['battery_install']:,.0f} + 电池 ${d['ex_gst_ex_stc']['battery_capacity']:,.0f}")
    else:
        print(f"  不含税不含补贴: PV ${d['ex_gst_ex_stc']['pv']:,.0f}")
    print(f"  ★ 总价(不含税补): ${d['ex_gst_ex_stc']['total']:,.0f} ($/kW: ${d['ex_gst_ex_stc']['per_kw']:,.0f})")
    if d['is_hybrid']:
        print(f"  含税含补贴: PV ${d['inc_gst_inc_stc']['pv']:,.0f} + 安装费 ${d['inc_gst_inc_stc']['battery_install']:,.0f} + 电池 ${d['inc_gst_inc_stc']['battery_capacity']:,.0f}")
    else:
        print(f"  含税含补贴: PV ${d['inc_gst_inc_stc']['pv']:,.0f}")
    print(f"  ★ 总价(含税补): ${d['inc_gst_inc_stc']['total']:,.0f} ($/kW: ${d['inc_gst_inc_stc']['per_kw']:,.0f})")
    
    # 对比
    print(f"\n【价格对比汇总】")
    print(f"  方案A最终(含税-补贴): ${a['final']:,.0f}")
    print(f"  方案B最终(含税-补贴): ${b['final']:,.0f}")
    print(f"  方案C(不含税补): ${c['ex_gst_ex_stc']['total']:,.0f} | (含税补): ${c['inc_gst_inc_stc']['total']:,.0f}")
    print(f"  方案D(不含税补): ${d['ex_gst_ex_stc']['total']:,.0f} | (含税补): ${d['inc_gst_inc_stc']['total']:,.0f}")

if __name__ == '__main__':
    # 测试案例
    test_cases = [
        (6.6, 10, 'TAS'),   # 标准配置
        (6.6, 6.5, 'TAS'),  # 小电池
        (10, 13.5, 'NSW'),  # 大系统
        (8.8, 10, 'VIC'),   # 中等系统
    ]
    
    for pv, bat, state in test_cases:
        print_comparison(pv, bat, state)
