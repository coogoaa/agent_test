#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量处理脚本 - 支持新建系统和储能扩容两种模式
从CSV文件读取验证数据，输出CSV汇总结果
"""

import csv
import json
import math
from datetime import datetime
from typing import Dict, List, Tuple
import os
from solar_calculator import SolarCalculator


class BatchProcessor:
    """批量处理器 - 支持新建系统和储能扩容"""
    
    def __init__(self, config_path: str = "config.json"):
        """初始化处理器"""
        self.calculator = SolarCalculator(config_path)
        self.config = self.calculator.config
    
    def load_houses_from_csv(self, csv_path: str) -> Dict[str, List[Dict]]:
        """
        从CSV文件加载房屋数据
        返回: {house_id: [slope_data, ...]}
        """
        houses = {}
        
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # 跳过空行
                if not row.get('id_0') or not row.get('id_0').strip():
                    continue
                
                house_id = row['id_0'].strip()
                
                if house_id not in houses:
                    houses[house_id] = []
                
                houses[house_id].append({
                    'id': row['slope'].strip(),
                    'aspect': float(row['aspect']),
                    'max': int(row['nums'])
                })
        
        return houses
    
    def process_new_system(self, house_id: str, house_data: List[Dict], 
                          state: str, phase_type: str) -> Dict:
        """
        处理新建系统
        """
        return self.calculator.generate_proposals(house_data, state, phase_type)
    
    def process_storage_expansion(self, house_id: str, house_data: List[Dict],
                                  state: str, phase_type: str) -> Dict:
        """
        处理储能扩容
        应用屋顶容量系数（默认0.7）
        """
        # 应用容量系数
        roof_capacity_factor = self.config['expansion'].get('roofCapacityFactor', 0.7)
        
        # 复制数据并应用系数
        expansion_data = []
        for plane in house_data:
            expansion_data.append({
                'id': plane['id'],
                'aspect': plane['aspect'],
                'max': math.floor(plane['max'] * roof_capacity_factor)
            })
        
        # 使用相同的计算逻辑
        results = self.calculator.generate_proposals(expansion_data, state, phase_type)
        
        # 标记为扩容模式
        results['mode'] = 'expansion'
        results['roofCapacityFactor'] = roof_capacity_factor
        
        return results
    
    def batch_process_new_systems(self, houses: Dict[str, List[Dict]], 
                                 state: str = 'NSW', 
                                 phase_type: str = 'single') -> List[Dict]:
        """
        批量处理新建系统
        """
        results = []
        total = len(houses)
        
        print(f"\n{'='*80}")
        print(f"批量处理新建系统 - 共 {total} 个房屋")
        print(f"{'='*80}")
        
        for i, (house_id, house_data) in enumerate(houses.items(), 1):
            print(f"[{i}/{total}] 处理房屋 {house_id}...", end=' ')
            
            try:
                result = self.process_new_system(house_id, house_data, state, phase_type)
                result['house_id'] = house_id
                result['mode'] = 'new_system'
                results.append(result)
                print("✅")
            except Exception as e:
                print(f"❌ 错误: {e}")
                continue
        
        return results
    
    def batch_process_expansions(self, houses: Dict[str, List[Dict]],
                                state: str = 'NSW',
                                phase_type: str = 'single') -> List[Dict]:
        """
        批量处理储能扩容
        """
        results = []
        total = len(houses)
        
        print(f"\n{'='*80}")
        print(f"批量处理储能扩容 - 共 {total} 个房屋")
        print(f"{'='*80}")
        
        for i, (house_id, house_data) in enumerate(houses.items(), 1):
            print(f"[{i}/{total}] 处理房屋 {house_id}...", end=' ')
            
            try:
                result = self.process_storage_expansion(house_id, house_data, state, phase_type)
                result['house_id'] = house_id
                results.append(result)
                print("✅")
            except Exception as e:
                print(f"❌ 错误: {e}")
                continue
        
        return results
    
    def export_to_csv(self, results: List[Dict], output_path: str, mode: str):
        """
        导出结果到CSV
        mode: 'new_system' 或 'expansion'
        """
        if not results:
            print(f"⚠️ 没有数据可导出")
            return
        
        with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            
            # 写入表头
            header = [
                '房屋ID', '州', '电网类型', '屋顶总容量(kW)',
                '方案A-PV(kW)', '方案A-面板数', '方案A-逆变器(kW)', '方案A-容配比(%)', 
                '方案A-储能(kWh)', '方案A-成本($)', '方案A-补贴($)', '方案A-最终报价($)',
                '方案B-PV(kW)', '方案B-面板数', '方案B-逆变器(kW)', '方案B-容配比(%)',
                '方案B-储能(kWh)', '方案B-成本($)', '方案B-补贴($)', '方案B-最终报价($)',
                '方案C-PV(kW)', '方案C-面板数', '方案C-逆变器(kW)', '方案C-容配比(%)',
                '方案C-储能(kWh)', '方案C-成本($)', '方案C-补贴($)', '方案C-最终报价($)'
            ]
            
            if mode == 'expansion':
                header.insert(4, '容量系数')
                header.insert(5, '扩容可用容量(kW)')
            
            writer.writerow(header)
            
            # 写入数据
            for result in results:
                roof_capacity = result['roofAnalysis']['totalMaxKw']
                
                row = [
                    result.get('house_id', 'N/A'),
                    result['state'],
                    result['phaseType'],
                    roof_capacity
                ]
                
                if mode == 'expansion':
                    factor = result.get('roofCapacityFactor', 0.7)
                    expansion_capacity = roof_capacity * factor
                    row.append(f"{factor:.1%}")
                    row.append(f"{expansion_capacity:.2f}")
                
                # 添加三套方案数据
                for key in ['A', 'B', 'C']:
                    prop = result['proposals'][key]
                    row.extend([
                        f"{prop['pvKw']:.2f}",
                        prop['panels'],
                        prop['inverterKw'],
                        f"{prop['ratio']:.1f}",
                        prop['battery']['standard'],
                        f"{prop['cost']['taxTotal']:.2f}",
                        f"{prop['subsidy']['subsidyAmount']:.2f}",
                        f"{prop['finalPrice']:.2f}"
                    ])
                
                writer.writerow(row)
        
        print(f"✅ CSV已导出: {output_path}")
    
    def generate_summary_report(self, new_system_results: List[Dict],
                               expansion_results: List[Dict],
                               output_path: str):
        """生成汇总报告"""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("="*80 + "\n")
            f.write("批量处理汇总报告\n")
            f.write("="*80 + "\n")
            f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # 新建系统统计
            if new_system_results:
                f.write(f"【新建系统】\n")
                f.write(f"处理数量: {len(new_system_results)} 个房屋\n\n")
                
                # 统计数据
                total_a = sum(r['proposals']['A']['finalPrice'] for r in new_system_results)
                total_b = sum(r['proposals']['B']['finalPrice'] for r in new_system_results)
                total_c = sum(r['proposals']['C']['finalPrice'] for r in new_system_results)
                
                avg_a = total_a / len(new_system_results)
                avg_b = total_b / len(new_system_results)
                avg_c = total_c / len(new_system_results)
                
                f.write(f"方案A平均报价: ${avg_a:,.2f}\n")
                f.write(f"方案B平均报价: ${avg_b:,.2f}\n")
                f.write(f"方案C平均报价: ${avg_c:,.2f}\n\n")
            
            # 储能扩容统计
            if expansion_results:
                f.write(f"【储能扩容】\n")
                f.write(f"处理数量: {len(expansion_results)} 个房屋\n\n")
                
                # 统计数据
                total_a = sum(r['proposals']['A']['finalPrice'] for r in expansion_results)
                total_b = sum(r['proposals']['B']['finalPrice'] for r in expansion_results)
                total_c = sum(r['proposals']['C']['finalPrice'] for r in expansion_results)
                
                avg_a = total_a / len(expansion_results)
                avg_b = total_b / len(expansion_results)
                avg_c = total_c / len(expansion_results)
                
                f.write(f"方案A平均报价: ${avg_a:,.2f}\n")
                f.write(f"方案B平均报价: ${avg_b:,.2f}\n")
                f.write(f"方案C平均报价: ${avg_c:,.2f}\n\n")
            
            f.write("="*80 + "\n")
        
        print(f"✅ 汇总报告已生成: {output_path}")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='批量处理光伏系统计算')
    parser.add_argument('-i', '--input', required=True,
                       help='输入CSV文件路径')
    parser.add_argument('-s', '--state', default='NSW',
                       choices=['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'],
                       help='州代码 (默认: NSW)')
    parser.add_argument('-p', '--phase', default='single',
                       choices=['single', 'three'],
                       help='电网类型 (默认: single)')
    parser.add_argument('-m', '--mode', default='both',
                       choices=['new', 'expansion', 'both'],
                       help='处理模式: new(新建), expansion(扩容), both(两者) (默认: both)')
    parser.add_argument('-l', '--limit', type=int,
                       help='限制处理数量（用于测试）')
    parser.add_argument('-c', '--config', default='config.json',
                       help='配置文件路径 (默认: config.json)')
    
    args = parser.parse_args()
    
    # 创建输出目录
    output_dir = "../out"
    os.makedirs(output_dir, exist_ok=True)
    
    # 生成时间戳
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    print("="*80)
    print("光伏系统批量处理")
    print("="*80)
    print(f"输入文件: {args.input}")
    print(f"州: {args.state}")
    print(f"电网类型: {args.phase}")
    print(f"处理模式: {args.mode}")
    if args.limit:
        print(f"限制数量: {args.limit}")
    
    # 初始化处理器
    print("\n🔧 初始化处理器...")
    processor = BatchProcessor(args.config)
    
    # 加载房屋数据
    print(f"📂 加载房屋数据...")
    houses = processor.load_houses_from_csv(args.input)
    print(f"✅ 加载了 {len(houses)} 个房屋")
    
    # 限制数量（用于测试）
    if args.limit and args.limit < len(houses):
        house_ids = list(houses.keys())[:args.limit]
        houses = {k: houses[k] for k in house_ids}
        print(f"⚠️ 限制处理前 {args.limit} 个房屋")
    
    new_system_results = []
    expansion_results = []
    
    # 处理新建系统
    if args.mode in ['new', 'both']:
        new_system_results = processor.batch_process_new_systems(
            houses, args.state, args.phase
        )
        
        # 导出CSV
        csv_path = os.path.join(output_dir, f"新建系统_{timestamp}.csv")
        processor.export_to_csv(new_system_results, csv_path, 'new_system')
    
    # 处理储能扩容
    if args.mode in ['expansion', 'both']:
        expansion_results = processor.batch_process_expansions(
            houses, args.state, args.phase
        )
        
        # 导出CSV
        csv_path = os.path.join(output_dir, f"储能扩容_{timestamp}.csv")
        processor.export_to_csv(expansion_results, csv_path, 'expansion')
    
    # 生成汇总报告
    if new_system_results or expansion_results:
        summary_path = os.path.join(output_dir, f"汇总报告_{timestamp}.txt")
        processor.generate_summary_report(
            new_system_results, expansion_results, summary_path
        )
    
    print("\n" + "="*80)
    print("🎉 批量处理完成!")
    print("="*80)
    print(f"输出目录: {os.path.abspath(output_dir)}")
    if new_system_results:
        print(f"新建系统: {len(new_system_results)} 个")
    if expansion_results:
        print(f"储能扩容: {len(expansion_results)} 个")


if __name__ == "__main__":
    main()
