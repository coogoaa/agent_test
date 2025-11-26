#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SolarQuote数据简单分析脚本（不依赖pandas）
"""

import json
import re
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime


def parse_system_size(size_str):
    """解析系统容量"""
    if not size_str:
        return None
    match = re.search(r'(\d+\.?\d*)', str(size_str))
    return float(match.group(1)) if match else None


def parse_cost_range(cost_str):
    """解析价格区间"""
    if not cost_str:
        return None, None
    
    numbers = re.findall(r'\d+,?\d*', str(cost_str))
    if len(numbers) >= 2:
        min_cost = int(numbers[0].replace(',', ''))
        max_cost = int(numbers[1].replace(',', ''))
        return min_cost, max_cost
    elif len(numbers) == 1:
        cost = int(numbers[0].replace(',', ''))
        if 'more than' in cost_str.lower():
            return cost, cost * 1.5
        return cost * 0.8, cost * 1.2
    return None, None


def analyze_data(data_dir):
    """分析数据"""
    data_dir = Path(data_dir)
    
    # 统计数据
    stats = {
        'total_companies': 0,
        'total_reviews': 0,
        'system_sizes': [],
        'costs': [],
        'panel_brands': Counter(),
        'inverter_brands': Counter(),
        'battery_brands': Counter(),
        'states': Counter(),
        'has_battery_count': 0,
        'ratings': [],
        'by_state': defaultdict(lambda: {
            'count': 0,
            'sizes': [],
            'costs': [],
            'battery_count': 0
        }),
        'by_size': defaultdict(lambda: {
            'count': 0,
            'costs': [],
            'battery_count': 0,
            'panel_brands': Counter(),
            'inverter_brands': Counter()
        })
    }
    
    print("🔄 开始分析数据...")
    
    json_files = list(data_dir.glob("*_202*.json"))
    print(f"📁 找到 {len(json_files)} 个JSON文件\n")
    
    for idx, json_file in enumerate(json_files, 1):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            stats['total_companies'] += 1
            
            company_info = data.get('company_info', {})
            company_name = company_info.get('company_name', 'Unknown')
            
            reviews = data.get('reviews', [])
            stats['total_reviews'] += len(reviews)
            
            for review in reviews:
                # 系统容量
                system_kw = parse_system_size(review.get('system_size', ''))
                if system_kw:
                    stats['system_sizes'].append(system_kw)
                    
                    # 按容量分组
                    size_key = round(system_kw, 1)
                    stats['by_size'][size_key]['count'] += 1
                
                # 价格
                cost_min, cost_max = parse_cost_range(review.get('system_cost', ''))
                if cost_min and cost_max:
                    cost_mid = (cost_min + cost_max) / 2
                    stats['costs'].append(cost_mid)
                    
                    if system_kw:
                        stats['by_size'][size_key]['costs'].append(cost_mid)
                
                # 品牌
                panel = review.get('panel_brand', '').strip()
                if panel:
                    stats['panel_brands'][panel] += 1
                    if system_kw:
                        stats['by_size'][size_key]['panel_brands'][panel] += 1
                
                inverter = review.get('inverter_brand', '').strip()
                if inverter:
                    stats['inverter_brands'][inverter] += 1
                    if system_kw:
                        stats['by_size'][size_key]['inverter_brands'][inverter] += 1
                
                battery = review.get('battery_brand', '').strip()
                if battery:
                    stats['battery_brands'][battery] += 1
                    stats['has_battery_count'] += 1
                    if system_kw:
                        stats['by_size'][size_key]['battery_count'] += 1
                
                # 州
                state = review.get('reviewer_state', '').strip()
                if state:
                    stats['states'][state] += 1
                    stats['by_state'][state]['count'] += 1
                    
                    if system_kw:
                        stats['by_state'][state]['sizes'].append(system_kw)
                    if cost_min and cost_max:
                        stats['by_state'][state]['costs'].append((cost_min + cost_max) / 2)
                    if battery:
                        stats['by_state'][state]['battery_count'] += 1
                
                # 评分
                rating = review.get('overall_review_rating', 0)
                if rating > 0:
                    stats['ratings'].append(rating)
            
            if idx % 20 == 0:
                print(f"   处理进度: {idx}/{len(json_files)}")
        
        except Exception as e:
            print(f"❌ 处理文件失败 {json_file.name}: {e}")
            continue
    
    return stats


def print_report(stats):
    """打印报告"""
    print("\n" + "="*70)
    print("📊 SolarQuote 市场数据分析报告")
    print("="*70)
    
    print(f"\n【数据概览】")
    print(f"  公司数量: {stats['total_companies']}")
    print(f"  评价总数: {stats['total_reviews']}")
    print(f"  有效系统容量数据: {len(stats['system_sizes'])}")
    print(f"  有效价格数据: {len(stats['costs'])}")
    
    # 系统容量分析
    if stats['system_sizes']:
        sizes = stats['system_sizes']
        print(f"\n【系统容量分析】")
        print(f"  平均容量: {sum(sizes)/len(sizes):.2f} kW")
        print(f"  中位数: {sorted(sizes)[len(sizes)//2]:.2f} kW")
        print(f"  最小: {min(sizes):.1f} kW")
        print(f"  最大: {max(sizes):.1f} kW")
        
        # 最常见容量
        size_counter = Counter([round(s, 1) for s in sizes])
        print(f"\n  最常见容量 Top 10:")
        for size, count in size_counter.most_common(10):
            pct = count / len(sizes) * 100
            print(f"    {size:5.1f} kW: {count:4d} 次 ({pct:5.1f}%)")
    
    # 价格分析
    if stats['costs']:
        costs = stats['costs']
        print(f"\n【价格分析】")
        print(f"  平均价格: ${sum(costs)/len(costs):,.0f}")
        print(f"  中位数: ${sorted(costs)[len(costs)//2]:,.0f}")
        print(f"  最低: ${min(costs):,.0f}")
        print(f"  最高: ${max(costs):,.0f}")
        
        # 按容量段统计价格
        print(f"\n  各容量段平均价格:")
        for size in sorted([k for k in stats['by_size'].keys() if k in [4.0, 5.0, 6.6, 8.0, 10.0, 13.2, 15.0, 20.0]]):
            size_data = stats['by_size'][size]
            if size_data['costs']:
                avg_cost = sum(size_data['costs']) / len(size_data['costs'])
                print(f"    {size:5.1f} kW: ${avg_cost:8,.0f} (样本数: {len(size_data['costs'])})")
    
    # 电池配置率
    print(f"\n【电池配置分析】")
    battery_rate = stats['has_battery_count'] / stats['total_reviews'] * 100 if stats['total_reviews'] > 0 else 0
    print(f"  总评价数: {stats['total_reviews']}")
    print(f"  含电池: {stats['has_battery_count']} ({battery_rate:.1f}%)")
    print(f"  无电池: {stats['total_reviews'] - stats['has_battery_count']} ({100-battery_rate:.1f}%)")
    
    # 按容量统计电池配置率
    print(f"\n  各容量段电池配置率:")
    for size in sorted([k for k in stats['by_size'].keys() if k in [4.0, 5.0, 6.6, 8.0, 10.0, 13.2]]):
        size_data = stats['by_size'][size]
        if size_data['count'] > 10:
            rate = size_data['battery_count'] / size_data['count'] * 100
            print(f"    {size:5.1f} kW: {rate:5.1f}% (样本数: {size_data['count']})")
    
    # 品牌分析
    print(f"\n【品牌受欢迎度】")
    
    print(f"\n  光伏板品牌 Top 10:")
    for brand, count in stats['panel_brands'].most_common(10):
        pct = count / sum(stats['panel_brands'].values()) * 100
        print(f"    {brand:30s}: {count:4d} ({pct:5.1f}%)")
    
    print(f"\n  逆变器品牌 Top 10:")
    for brand, count in stats['inverter_brands'].most_common(10):
        pct = count / sum(stats['inverter_brands'].values()) * 100
        print(f"    {brand:30s}: {count:4d} ({pct:5.1f}%)")
    
    print(f"\n  电池品牌 Top 10:")
    for brand, count in stats['battery_brands'].most_common(10):
        pct = count / sum(stats['battery_brands'].values()) * 100
        print(f"    {brand:30s}: {count:4d} ({pct:5.1f}%)")
    
    # 地域分析
    print(f"\n【地域分析】")
    print(f"\n  各州统计:")
    for state, count in stats['states'].most_common():
        state_data = stats['by_state'][state]
        if state_data['count'] > 20:
            avg_size = sum(state_data['sizes']) / len(state_data['sizes']) if state_data['sizes'] else 0
            avg_cost = sum(state_data['costs']) / len(state_data['costs']) if state_data['costs'] else 0
            battery_rate = state_data['battery_count'] / state_data['count'] * 100
            
            print(f"\n    {state}:")
            print(f"      评价数: {count}")
            print(f"      平均系统容量: {avg_size:.2f} kW")
            print(f"      平均价格: ${avg_cost:,.0f}")
            print(f"      电池配置率: {battery_rate:.1f}%")
    
    # 评分分析
    if stats['ratings']:
        print(f"\n【评分分析】")
        avg_rating = sum(stats['ratings']) / len(stats['ratings'])
        print(f"  平均评分: {avg_rating:.2f} / 5.0")
        print(f"  样本数: {len(stats['ratings'])}")
    
    print("\n" + "="*70)


def export_summary(stats, output_file):
    """导出汇总JSON"""
    
    # 准备导出数据
    summary = {
        'generated_at': datetime.now().isoformat(),
        'overview': {
            'total_companies': stats['total_companies'],
            'total_reviews': stats['total_reviews'],
            'battery_adoption_rate': stats['has_battery_count'] / stats['total_reviews'] if stats['total_reviews'] > 0 else 0
        },
        'system_sizes': {
            'average': sum(stats['system_sizes']) / len(stats['system_sizes']) if stats['system_sizes'] else None,
            'median': sorted(stats['system_sizes'])[len(stats['system_sizes'])//2] if stats['system_sizes'] else None,
            'distribution': dict(Counter([round(s, 1) for s in stats['system_sizes']]).most_common(20))
        },
        'pricing': {
            'average': sum(stats['costs']) / len(stats['costs']) if stats['costs'] else None,
            'median': sorted(stats['costs'])[len(stats['costs'])//2] if stats['costs'] else None,
            'by_size': {}
        },
        'brands': {
            'panels': dict(stats['panel_brands'].most_common(15)),
            'inverters': dict(stats['inverter_brands'].most_common(15)),
            'batteries': dict(stats['battery_brands'].most_common(15))
        },
        'by_state': {}
    }
    
    # 按容量统计价格
    for size in [4.0, 5.0, 6.6, 8.0, 10.0, 13.2, 15.0, 20.0]:
        if size in stats['by_size'] and stats['by_size'][size]['costs']:
            size_data = stats['by_size'][size]
            summary['pricing']['by_size'][str(size)] = {
                'average': sum(size_data['costs']) / len(size_data['costs']),
                'count': len(size_data['costs']),
                'battery_rate': size_data['battery_count'] / size_data['count'],
                'top_panel': size_data['panel_brands'].most_common(1)[0][0] if size_data['panel_brands'] else None,
                'top_inverter': size_data['inverter_brands'].most_common(1)[0][0] if size_data['inverter_brands'] else None
            }
    
    # 按州统计
    for state, state_data in stats['by_state'].items():
        if state_data['count'] > 20:
            summary['by_state'][state] = {
                'count': state_data['count'],
                'avg_size': sum(state_data['sizes']) / len(state_data['sizes']) if state_data['sizes'] else None,
                'avg_cost': sum(state_data['costs']) / len(state_data['costs']) if state_data['costs'] else None,
                'battery_rate': state_data['battery_count'] / state_data['count']
            }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ 汇总数据已导出到: {output_file}")


def main():
    """主函数"""
    data_dir = Path(__file__).parent
    
    print("="*70)
    print("🌞 SolarQuote 数据分析工具 (简化版)")
    print("="*70 + "\n")
    
    # 分析数据
    stats = analyze_data(data_dir)
    
    # 打印报告
    print_report(stats)
    
    # 导出JSON
    output_file = data_dir / 'market_summary.json'
    export_summary(stats, output_file)
    
    print("\n✅ 分析完成！\n")


if __name__ == '__main__':
    main()
