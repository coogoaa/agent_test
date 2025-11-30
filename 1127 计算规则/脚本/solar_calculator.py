#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
光伏系统计算验证脚本
基于 1127 计算规则/page 的完整逻辑
"""

import json
import math
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import os


class SolarCalculator:
    """光伏系统计算器"""
    
    def __init__(self, config_path: str = "config.json"):
        """初始化计算器，加载配置"""
        with open(config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        
        self.pv_watt = self.config['pv']['pmax']
        self.target_ratio = self.config['inverter']['targetRatio'] / 100
        self.max_ratio = self.config['inverter']['maxRatio'] / 100
    
    def calculate_slope_score(self, aspect: float) -> float:
        """
        计算屋顶坡面评分
        南半球规则：正北(0°)最优
        """
        deviation = abs(aspect - 0)
        if deviation > 180:
            deviation = 360 - deviation
        
        # 分段评分
        if deviation <= 45:
            return 90 + (45 - deviation) / 4.5
        elif deviation <= 135:
            return 70 + (135 - deviation) / 4.5
        else:
            return max(40, 60 - (deviation - 135) / 2)
    
    def get_direction_label(self, aspect: float) -> str:
        """获取方位标签"""
        if aspect >= 337.5 or aspect < 22.5:
            return '北 (N)'
        elif aspect >= 22.5 and aspect < 67.5:
            return '东北 (NE)'
        elif aspect >= 67.5 and aspect < 112.5:
            return '东 (E)'
        elif aspect >= 112.5 and aspect < 157.5:
            return '东南 (SE)'
        elif aspect >= 157.5 and aspect < 202.5:
            return '南 (S)'
        elif aspect >= 202.5 and aspect < 247.5:
            return '西南 (SW)'
        elif aspect >= 247.5 and aspect < 292.5:
            return '西 (W)'
        elif aspect >= 292.5 and aspect < 337.5:
            return '西北 (NW)'
        return '?'
    
    def calculate_battery_capacity(self, pv_kw: float, state: str, method: str) -> Dict:
        """
        计算储能容量
        method: 'economy', 'balanced', 'premium'
        """
        annual_consumption = self.config['consumption'][state]
        daily_consumption = annual_consumption / 365
        
        # 计算傍晚高峰用电 (17:00-21:00, 索引 16-20)
        hourly_profile = self.config['hourlyProfile'][state]
        evening_peak_ratio = sum(hourly_profile[16:21]) / 100
        evening_peak_consumption = daily_consumption * evening_peak_ratio
        
        capacity = 0
        method_desc = ''
        
        if method == 'economy':
            method1 = daily_consumption * self.config['battery']['economy']['daily']
            method2 = evening_peak_consumption * self.config['battery']['economy']['evening']
            method3 = pv_kw * self.config['battery']['economy']['pv']
            capacity = max(method1, method2, method3)
            method_desc = f"max(日用电×20%={method1:.1f}, 傍晚峰×1.0={method2:.1f}, PV×0.8={method3:.1f})"
        elif method == 'balanced':
            method1 = daily_consumption * self.config['battery']['balanced']['daily']
            method2 = evening_peak_consumption * self.config['battery']['balanced']['evening']
            method3 = pv_kw * self.config['battery']['balanced']['pv']
            capacity = max(method1, method2, method3)
            method_desc = f"max(日用电×30%={method1:.1f}, 傍晚峰×1.5={method2:.1f}, PV×1.0={method3:.1f})"
        elif method == 'premium':
            method1 = daily_consumption * self.config['battery']['premium']['daily']
            method2 = evening_peak_consumption * self.config['battery']['premium']['evening']
            method3 = pv_kw * self.config['battery']['premium']['pv']
            capacity = max(method1, method2, method3)
            method_desc = f"max(日用电×50%={method1:.1f}, 傍晚峰×2.0={method2:.1f}, PV×1.5={method3:.1f})"
        
        # 标准化到常见电池规格
        final_capacity = capacity
        if self.config['battery']['useStandards']:
            standards = self.config['battery']['standards']
            final_capacity = next((s for s in standards if s >= capacity), capacity)
        
        return {
            'calculated': round(capacity, 2),
            'standard': final_capacity,
            'methodDesc': method_desc,
            'dailyConsumption': round(daily_consumption, 2),
            'eveningPeak': round(evening_peak_consumption, 2)
        }
    
    def select_inverter(self, plan_key: str, phase_type: str, pv_kw: float) -> Tuple[float, Dict]:
        """
        选择逆变器
        plan_key: 'a', 'b', 'c'
        phase_type: 'single', 'three'
        """
        # 获取可用规格
        if phase_type == 'single':
            options = self.config['inverter']['single'][plan_key]
            phase_max = self.config['inverter']['singleMaxKw']
        else:
            options = self.config['inverter']['three'][plan_key]
            phase_max = self.config['inverter']['threeMaxKw']
        
        # 计算目标逆变器功率 (基于180%容配比)
        target_inv = pv_kw / self.target_ratio
        
        # 选择最接近的规格
        selected = next((opt for opt in options if opt >= target_inv), options[-1])
        selected = min(selected, phase_max)
        
        # 计算实际容配比
        actual_ratio = (pv_kw / selected) * 100
        
        meta = {
            'targetKw': round(target_inv, 2),
            'selectedKw': selected,
            'actualRatio': round(actual_ratio, 1),
            'phaseMax': phase_max,
            'phaseLabel': '单相' if phase_type == 'single' else '三相'
        }
        
        return selected, meta
    
    def fill_roof_greedy(self, roof_planes: List[Dict], target_kw: float) -> Dict:
        """
        贪心算法填充屋顶
        优先使用高分坡面
        """
        # 按评分降序排序
        sorted_planes = sorted(roof_planes, key=lambda x: x['score'], reverse=True)
        
        target_panels = math.ceil(target_kw * 1000 / self.pv_watt)
        current_panels = 0
        used_planes = []
        
        for plane in sorted_planes:
            if plane['max'] == 0:
                continue
            
            remaining_need = target_panels - current_panels
            if remaining_need <= 0:
                break
            
            take = min(plane['max'], remaining_need)
            current_panels += take
            used_planes.append({
                'id': plane['id'],
                'aspect': plane['aspect'],
                'direction': plane['direction'],
                'score': plane['score'],
                'used': take,
                'max': plane['max']
            })
        
        total_kw = round(current_panels * self.pv_watt / 1000, 2)
        
        return {
            'count': current_panels,
            'totalKw': total_kw,
            'usedPlanes': used_planes
        }
    
    def adjust_for_ratio_compliance(self, result: Dict, inverter_kw: float, 
                                   phase_type: str, plan_key: str) -> Dict:
        """
        调整以符合容配比要求
        """
        actual_ratio = result['totalKw'] / inverter_kw
        
        if actual_ratio > self.max_ratio:
            # 超过200%，需要调整
            if phase_type == 'single':
                phase_max = self.config['inverter']['singleMaxKw']
                options = self.config['inverter']['single'][plan_key]
            else:
                phase_max = self.config['inverter']['threeMaxKw']
                options = self.config['inverter']['three'][plan_key]
            
            # 尝试增大逆变器
            min_inv = math.ceil(result['totalKw'] / self.max_ratio)
            compliant_inv = next((opt for opt in options if opt >= min_inv), None)
            
            if compliant_inv and compliant_inv > inverter_kw and compliant_inv <= phase_max:
                # 可以通过增大逆变器解决
                return {
                    'adjusted': True,
                    'method': 'inverter_upgrade',
                    'newInverterKw': compliant_inv,
                    'newRatio': round((result['totalKw'] / compliant_inv) * 100, 1)
                }
            else:
                # 需要减少面板
                max_allowed_kw = inverter_kw * self.max_ratio
                excess_kw = result['totalKw'] - max_allowed_kw
                panels_to_remove = math.ceil(excess_kw * 1000 / self.pv_watt)
                
                # 从低分坡面开始减
                sorted_by_score = sorted(result['usedPlanes'], key=lambda x: x['score'])
                removed_count = 0
                
                for plane in sorted_by_score:
                    if removed_count >= panels_to_remove:
                        break
                    can_remove = min(plane['used'], panels_to_remove - removed_count)
                    plane['used'] -= can_remove
                    removed_count += can_remove
                
                new_total_panels = result['count'] - removed_count
                new_total_kw = round(new_total_panels * self.pv_watt / 1000, 2)
                
                return {
                    'adjusted': True,
                    'method': 'panel_reduction',
                    'removedPanels': removed_count,
                    'newCount': new_total_panels,
                    'newTotalKw': new_total_kw,
                    'newRatio': round((new_total_kw / inverter_kw) * 100, 1)
                }
        
        return {'adjusted': False}
    
    def calculate_cost(self, pv_kw: float, inverter_kw: float, battery_kwh: float) -> Dict:
        """计算成本"""
        pv_cost = pv_kw * self.config['cost']['pvPerKw']
        inverter_cost = inverter_kw * self.config['cost']['inverterPerKw']
        battery_cost = battery_kwh * self.config['cost']['batteryPerKwh']
        
        pre_tax_total = pv_cost + inverter_cost + battery_cost
        tax_total = pre_tax_total * (1 + self.config['cost']['gstRate'])
        
        return {
            'pvCost': round(pv_cost, 2),
            'inverterCost': round(inverter_cost, 2),
            'batteryCost': round(battery_cost, 2),
            'preTaxTotal': round(pre_tax_total, 2),
            'taxTotal': round(tax_total, 2)
        }
    
    def calculate_subsidy(self, pv_kw: float, battery_kwh: float, state: str) -> Dict:
        """计算补贴"""
        deeming_period = (self.config['subsidy']['deemingEndYear'] - 
                         self.config['subsidy']['installYear'] + 1)
        zone_rating = self.config['subsidy']['zoneRating'][state]
        
        # PV STC
        pv_stc = math.floor(pv_kw * zone_rating * deeming_period)
        
        # Battery STC - 使用可用容量
        usable_capacity = battery_kwh * self.config['battery']['dod']
        capped_capacity = min(usable_capacity, self.config['subsidy']['batteryCapacityCap'])
        battery_stc = math.floor(capped_capacity * self.config['subsidy']['batteryStcFactor'])
        
        # 总补贴
        total_stc = pv_stc + battery_stc
        subsidy_amount = total_stc * self.config['subsidy']['stcPrice']
        
        return {
            'deemingPeriod': deeming_period,
            'zoneRating': zone_rating,
            'pvStc': pv_stc,
            'batteryStc': battery_stc,
            'totalStc': total_stc,
            'subsidyAmount': round(subsidy_amount, 2),
            'usableCapacity': round(usable_capacity, 2)
        }
    
    def generate_proposals(self, house_data: List[Dict], state: str, 
                          phase_type: str) -> Dict:
        """
        生成三套方案
        house_data: 屋顶坡面数据列表
        state: 州代码
        phase_type: 'single' or 'three'
        """
        # Step 1: 评分
        for plane in house_data:
            plane['score'] = self.calculate_slope_score(plane['aspect'])
            plane['direction'] = self.get_direction_label(plane['aspect'])
        
        # Step 2: 计算屋顶物理极限
        total_max_panels = sum(p['max'] for p in house_data)
        total_max_kw = round(total_max_panels * self.pv_watt / 1000, 2)
        
        results = {
            'roofAnalysis': {
                'totalMaxPanels': total_max_panels,
                'totalMaxKw': total_max_kw,
                'planes': house_data
            },
            'state': state,
            'phaseType': phase_type,
            'proposals': {}
        }
        
        # 方案 A: 高端型 (满铺)
        plan_a = self.fill_roof_greedy(house_data, 999)
        inv_a, inv_meta_a = self.select_inverter('a', phase_type, plan_a['totalKw'])
        adjustment_a = self.adjust_for_ratio_compliance(plan_a, inv_a, phase_type, 'a')
        
        if adjustment_a['adjusted']:
            if adjustment_a['method'] == 'inverter_upgrade':
                inv_a = adjustment_a['newInverterKw']
            else:
                plan_a['count'] = adjustment_a['newCount']
                plan_a['totalKw'] = adjustment_a['newTotalKw']
        
        battery_a = self.calculate_battery_capacity(plan_a['totalKw'], state, 'premium')
        cost_a = self.calculate_cost(plan_a['totalKw'], inv_a, battery_a['standard'])
        subsidy_a = self.calculate_subsidy(plan_a['totalKw'], battery_a['standard'], state)
        final_price_a = cost_a['taxTotal'] - subsidy_a['subsidyAmount']
        
        results['proposals']['A'] = {
            'name': '方案 A: 高端型',
            'strategy': '物理极限满铺',
            'panels': plan_a['count'],
            'pvKw': plan_a['totalKw'],
            'inverterKw': inv_a,
            'ratio': round((plan_a['totalKw'] / inv_a) * 100, 1),
            'battery': battery_a,
            'cost': cost_a,
            'subsidy': subsidy_a,
            'finalPrice': round(final_price_a, 2),
            'layout': plan_a['usedPlanes'],
            'adjustment': adjustment_a
        }
        
        # 方案 B: 平衡型 (10-13kW)
        target_b = 13.2 if total_max_kw > 15 else 10.0
        plan_b = self.fill_roof_greedy(house_data, target_b)
        inv_b, inv_meta_b = self.select_inverter('b', phase_type, plan_b['totalKw'])
        adjustment_b = self.adjust_for_ratio_compliance(plan_b, inv_b, phase_type, 'b')
        
        if adjustment_b['adjusted']:
            if adjustment_b['method'] == 'inverter_upgrade':
                inv_b = adjustment_b['newInverterKw']
            else:
                plan_b['count'] = adjustment_b['newCount']
                plan_b['totalKw'] = adjustment_b['newTotalKw']
        
        battery_b = self.calculate_battery_capacity(plan_b['totalKw'], state, 'balanced')
        cost_b = self.calculate_cost(plan_b['totalKw'], inv_b, battery_b['standard'])
        subsidy_b = self.calculate_subsidy(plan_b['totalKw'], battery_b['standard'], state)
        final_price_b = cost_b['taxTotal'] - subsidy_b['subsidyAmount']
        
        results['proposals']['B'] = {
            'name': '方案 B: 平衡型',
            'strategy': f'目标{target_b}kW',
            'panels': plan_b['count'],
            'pvKw': plan_b['totalKw'],
            'inverterKw': inv_b,
            'ratio': round((plan_b['totalKw'] / inv_b) * 100, 1),
            'battery': battery_b,
            'cost': cost_b,
            'subsidy': subsidy_b,
            'finalPrice': round(final_price_b, 2),
            'layout': plan_b['usedPlanes'],
            'adjustment': adjustment_b
        }
        
        # 方案 C: 经济型 (6.6kW)
        plan_c = self.fill_roof_greedy(house_data, 6.6)
        inv_c, inv_meta_c = self.select_inverter('c', phase_type, plan_c['totalKw'])
        adjustment_c = self.adjust_for_ratio_compliance(plan_c, inv_c, phase_type, 'c')
        
        if adjustment_c['adjusted']:
            if adjustment_c['method'] == 'inverter_upgrade':
                inv_c = adjustment_c['newInverterKw']
            else:
                plan_c['count'] = adjustment_c['newCount']
                plan_c['totalKw'] = adjustment_c['newTotalKw']
        
        battery_c = self.calculate_battery_capacity(plan_c['totalKw'], state, 'economy')
        cost_c = self.calculate_cost(plan_c['totalKw'], inv_c, battery_c['standard'])
        subsidy_c = self.calculate_subsidy(plan_c['totalKw'], battery_c['standard'], state)
        final_price_c = cost_c['taxTotal'] - subsidy_c['subsidyAmount']
        
        results['proposals']['C'] = {
            'name': '方案 C: 经济型',
            'strategy': '目标6.6kW',
            'panels': plan_c['count'],
            'pvKw': plan_c['totalKw'],
            'inverterKw': inv_c,
            'ratio': round((plan_c['totalKw'] / inv_c) * 100, 1),
            'battery': battery_c,
            'cost': cost_c,
            'subsidy': subsidy_c,
            'finalPrice': round(final_price_c, 2),
            'layout': plan_c['usedPlanes'],
            'adjustment': adjustment_c
        }
        
        return results


def format_output(results: Dict) -> str:
    """格式化输出结果"""
    lines = []
    lines.append("=" * 80)
    lines.append("光伏系统计算结果")
    lines.append("=" * 80)
    lines.append(f"州: {results['state']}")
    lines.append(f"电网类型: {results['phaseType']}")
    lines.append("")
    
    # 屋顶分析
    roof = results['roofAnalysis']
    lines.append("【屋顶分析】")
    lines.append(f"  总坡面数: {len(roof['planes'])}")
    lines.append(f"  最大面板数: {roof['totalMaxPanels']} 片")
    lines.append(f"  最大容量: {roof['totalMaxKw']} kW")
    lines.append("")
    
    lines.append("  坡面详情:")
    for plane in roof['planes']:
        lines.append(f"    {plane['id']}: 方位角{plane['aspect']:.1f}° ({plane['direction']}), "
                    f"评分{plane['score']:.1f}, 最大{plane['max']}片")
    lines.append("")
    
    # 三套方案
    for key in ['A', 'B', 'C']:
        prop = results['proposals'][key]
        lines.append("=" * 80)
        lines.append(f"{prop['name']} - {prop['strategy']}")
        lines.append("=" * 80)
        lines.append(f"光伏组件: {prop['panels']} 片 × 440W = {prop['pvKw']} kW")
        lines.append(f"逆变器: {prop['inverterKw']} kW Hybrid")
        lines.append(f"容配比: {prop['ratio']}%")
        
        if prop['adjustment']['adjusted']:
            adj = prop['adjustment']
            if adj['method'] == 'inverter_upgrade':
                lines.append(f"  ⚠️ 容配比调整: 逆变器升级至 {adj['newInverterKw']}kW")
            else:
                lines.append(f"  ⚠️ 容配比调整: 减少 {adj['removedPanels']} 片面板")
        
        lines.append("")
        lines.append("储能配置:")
        battery = prop['battery']
        lines.append(f"  计算容量: {battery['calculated']} kWh")
        lines.append(f"  标准容量: {battery['standard']} kWh")
        lines.append(f"  计算公式: {battery['methodDesc']}")
        lines.append("")
        
        lines.append("成本明细:")
        cost = prop['cost']
        lines.append(f"  光伏成本: ${cost['pvCost']:,.2f}")
        lines.append(f"  逆变器成本: ${cost['inverterCost']:,.2f}")
        lines.append(f"  储能成本: ${cost['batteryCost']:,.2f}")
        lines.append(f"  税前总计: ${cost['preTaxTotal']:,.2f}")
        lines.append(f"  含税总计: ${cost['taxTotal']:,.2f}")
        lines.append("")
        
        lines.append("补贴计算:")
        subsidy = prop['subsidy']
        lines.append(f"  PV STC: {subsidy['pvStc']} 个")
        lines.append(f"  Battery STC: {subsidy['batteryStc']} 个")
        lines.append(f"  总 STC: {subsidy['totalStc']} 个")
        lines.append(f"  补贴金额: ${subsidy['subsidyAmount']:,.2f}")
        lines.append("")
        
        lines.append(f"【最终报价】: ${prop['finalPrice']:,.2f} AUD")
        lines.append("")
        
        lines.append("面板布局:")
        for layout in prop['layout']:
            if layout['used'] > 0:
                lines.append(f"  {layout['id']} ({layout['direction']}): "
                           f"{layout['used']}/{layout['max']} 片, 评分{layout['score']:.1f}")
        lines.append("")
    
    return "\n".join(lines)


def main():
    """主函数"""
    # 创建输出目录
    output_dir = "../out"
    os.makedirs(output_dir, exist_ok=True)
    
    # 初始化计算器
    calculator = SolarCalculator("config.json")
    
    # 测试数据
    test_cases = [
        {
            'name': '测试案例1: 小屋顶',
            'house_data': [
                {'id': 'slope 1', 'aspect': 359.8, 'max': 1},
                {'id': 'slope 2', 'aspect': 269.8, 'max': 0},
                {'id': 'slope 3', 'aspect': 179.8, 'max': 1}
            ],
            'state': 'TAS',
            'phase_type': 'single'
        },
        {
            'name': '测试案例2: 中等屋顶',
            'house_data': [
                {'id': 'slope 1', 'aspect': 0, 'max': 20},
                {'id': 'slope 2', 'aspect': 90, 'max': 4},
                {'id': 'slope 3', 'aspect': 180, 'max': 3}
            ],
            'state': 'NSW',
            'phase_type': 'single'
        },
        {
            'name': '测试案例3: 大屋顶三相',
            'house_data': [
                {'id': 'slope 1', 'aspect': 359.8, 'max': 30},
                {'id': 'slope 2', 'aspect': 269.8, 'max': 16}
            ],
            'state': 'VIC',
            'phase_type': 'three'
        }
    ]
    
    # 生成时间戳
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 处理每个测试案例
    all_results = []
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n处理 {test_case['name']}...")
        
        results = calculator.generate_proposals(
            test_case['house_data'],
            test_case['state'],
            test_case['phase_type']
        )
        
        # 格式化输出
        output_text = format_output(results)
        
        # 保存到文件
        output_file = os.path.join(output_dir, f"result_{i}_{timestamp}.txt")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"{test_case['name']}\n")
            f.write(output_text)
        
        print(f"✅ 结果已保存到: {output_file}")
        
        # 保存JSON格式
        json_file = os.path.join(output_dir, f"result_{i}_{timestamp}.json")
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        print(f"✅ JSON已保存到: {json_file}")
        
        all_results.append({
            'test_case': test_case['name'],
            'results': results
        })
    
    # 生成汇总报告
    summary_file = os.path.join(output_dir, f"summary_{timestamp}.txt")
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("批量计算汇总报告\n")
        f.write("=" * 80 + "\n")
        f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"测试案例数: {len(test_cases)}\n\n")
        
        for i, result in enumerate(all_results, 1):
            f.write(f"\n{result['test_case']}\n")
            f.write("-" * 80 + "\n")
            for key in ['A', 'B', 'C']:
                prop = result['results']['proposals'][key]
                f.write(f"{prop['name']}: {prop['pvKw']}kW + {prop['inverterKw']}kW + "
                       f"{prop['battery']['standard']}kWh = ${prop['finalPrice']:,.2f}\n")
    
    print(f"\n✅ 汇总报告已保存到: {summary_file}")
    print(f"\n🎉 所有计算完成! 输出目录: {output_dir}")


if __name__ == "__main__":
    main()
