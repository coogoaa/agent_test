#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析 scraped_data 目录下的评论数据
重点关注：
1. 不同年份的数据分布
2. 2025年的情况
3. 2025年7月后澳洲电池补贴的影响
"""

import csv
import os
from datetime import datetime
import json
from collections import defaultdict, Counter

def parse_date(date_str):
    """解析日期字符串"""
    try:
        return datetime.strptime(date_str, '%Y-%m-%d')
    except:
        return None

def safe_float(value):
    """安全转换为浮点数"""
    try:
        return float(value)
    except:
        return None

def analyze_scraped_data(data_dir):
    """分析爬取的数据"""
    
    # 获取所有CSV文件
    csv_files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
    
    print(f"找到 {len(csv_files)} 个CSV文件\n")
    
    # 存储所有数据
    all_reviews = []
    companies = set()
    
    # 读取所有CSV文件
    for csv_file in csv_files:
        file_path = os.path.join(data_dir, csv_file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                company_name = csv_file.replace('_reviews_', '|||').split('|||')[0]
                companies.add(company_name)
                
                for row in reader:
                    row['company_name'] = company_name
                    # 解析日期
                    date_obj = parse_date(row.get('review_date', ''))
                    if date_obj:
                        row['date_obj'] = date_obj
                        row['year'] = date_obj.year
                        row['month'] = date_obj.month
                        all_reviews.append(row)
        except Exception as e:
            print(f"读取文件 {csv_file} 时出错: {e}")
    
    if not all_reviews:
        print("没有找到有效的数据")
        return
    
    # 获取日期范围
    dates = [r['date_obj'] for r in all_reviews]
    min_date = min(dates)
    max_date = max(dates)
    
    print("=" * 80)
    print("数据概览")
    print("=" * 80)
    print(f"总评论数: {len(all_reviews)}")
    print(f"涉及公司数: {len(companies)}")
    print(f"日期范围: {min_date.strftime('%Y-%m-%d')} 至 {max_date.strftime('%Y-%m-%d')}")
    print()
    
    # 年份分布分析
    print("=" * 80)
    print("年份分布分析")
    print("=" * 80)
    
    year_data = defaultdict(lambda: {
        'count': 0,
        'ratings': [],
        'has_system_size': 0,
        'has_battery': 0
    })
    
    for review in all_reviews:
        year = review['year']
        year_data[year]['count'] += 1
        
        rating = safe_float(review.get('overall_review_rating', ''))
        if rating:
            year_data[year]['ratings'].append(rating)
        
        if review.get('system_size') and review['system_size'].strip():
            year_data[year]['has_system_size'] += 1
        
        if review.get('battery_brand') and review['battery_brand'].strip():
            year_data[year]['has_battery'] += 1
    
    print(f"{'年份':<10} {'评论数':<10} {'平均评分':<12} {'有系统大小':<12} {'有电池信息':<12}")
    print("-" * 80)
    for year in sorted(year_data.keys()):
        data = year_data[year]
        avg_rating = sum(data['ratings']) / len(data['ratings']) if data['ratings'] else 0
        print(f"{year:<10} {data['count']:<10} {avg_rating:<12.2f} {data['has_system_size']:<12} {data['has_battery']:<12}")
    print()
    
    # 2025年详细分析
    print("=" * 80)
    print("2025年详细分析")
    print("=" * 80)
    
    reviews_2025 = [r for r in all_reviews if r['year'] == 2025]
    
    if reviews_2025:
        ratings_2025 = [safe_float(r.get('overall_review_rating', '')) for r in reviews_2025]
        ratings_2025 = [r for r in ratings_2025 if r is not None]
        avg_rating_2025 = sum(ratings_2025) / len(ratings_2025) if ratings_2025 else 0
        
        battery_2025 = sum(1 for r in reviews_2025 if r.get('battery_brand') and r['battery_brand'].strip())
        
        print(f"2025年总评论数: {len(reviews_2025)}")
        print(f"平均评分: {avg_rating_2025:.2f}")
        print(f"有电池信息的评论: {battery_2025}")
        print()
        
        # 按月份分析
        print("2025年月度分布:")
        month_data = defaultdict(lambda: {'count': 0, 'ratings': [], 'has_battery': 0})
        
        for review in reviews_2025:
            month = review['month']
            month_data[month]['count'] += 1
            
            rating = safe_float(review.get('overall_review_rating', ''))
            if rating:
                month_data[month]['ratings'].append(rating)
            
            if review.get('battery_brand') and review['battery_brand'].strip():
                month_data[month]['has_battery'] += 1
        
        print(f"{'月份':<10} {'评论数':<10} {'平均评分':<12} {'有电池信息':<12}")
        print("-" * 60)
        for month in sorted(month_data.keys()):
            data = month_data[month]
            avg_rating = sum(data['ratings']) / len(data['ratings']) if data['ratings'] else 0
            print(f"{month:<10} {data['count']:<10} {avg_rating:<12.2f} {data['has_battery']:<12}")
        print()
    else:
        print("未找到2025年的数据")
        print()
    
    # 2025年7月前后对比分析
    print("=" * 80)
    print("2025年7月前后对比分析（电池补贴影响）")
    print("=" * 80)
    
    cutoff_date = datetime(2025, 7, 1)
    
    reviews_before_july = [r for r in all_reviews if r['year'] == 2025 and r['date_obj'] < cutoff_date]
    reviews_after_july = [r for r in all_reviews if r['year'] == 2025 and r['date_obj'] >= cutoff_date]
    
    print(f"\n2025年7月前 (1-6月):")
    print(f"  评论数: {len(reviews_before_july)}")
    
    if reviews_before_july:
        ratings_before = [safe_float(r.get('overall_review_rating', '')) for r in reviews_before_july]
        ratings_before = [r for r in ratings_before if r is not None]
        avg_rating_before = sum(ratings_before) / len(ratings_before) if ratings_before else 0
        
        battery_before = sum(1 for r in reviews_before_july if r.get('battery_brand') and r['battery_brand'].strip())
        battery_rate_before = battery_before / len(reviews_before_july) * 100 if reviews_before_july else 0
        
        print(f"  平均评分: {avg_rating_before:.2f}")
        print(f"  有电池信息: {battery_before} ({battery_rate_before:.1f}%)")
        
        # 电池品牌分布
        battery_brands_before = Counter()
        for r in reviews_before_july:
            brand = r.get('battery_brand', '').strip()
            if brand:
                battery_brands_before[brand] += 1
        
        if battery_brands_before:
            print(f"  主要电池品牌:")
            for brand, count in battery_brands_before.most_common(5):
                print(f"    - {brand}: {count}")
    
    print(f"\n2025年7月后 (7月及以后):")
    print(f"  评论数: {len(reviews_after_july)}")
    
    if reviews_after_july:
        ratings_after = [safe_float(r.get('overall_review_rating', '')) for r in reviews_after_july]
        ratings_after = [r for r in ratings_after if r is not None]
        avg_rating_after = sum(ratings_after) / len(ratings_after) if ratings_after else 0
        
        battery_after = sum(1 for r in reviews_after_july if r.get('battery_brand') and r['battery_brand'].strip())
        battery_rate_after = battery_after / len(reviews_after_july) * 100 if reviews_after_july else 0
        
        print(f"  平均评分: {avg_rating_after:.2f}")
        print(f"  有电池信息: {battery_after} ({battery_rate_after:.1f}%)")
        
        # 电池品牌分布
        battery_brands_after = Counter()
        for r in reviews_after_july:
            brand = r.get('battery_brand', '').strip()
            if brand:
                battery_brands_after[brand] += 1
        
        if battery_brands_after:
            print(f"  主要电池品牌:")
            for brand, count in battery_brands_after.most_common(5):
                print(f"    - {brand}: {count}")
    
    # 电池采用率趋势
    print("\n" + "=" * 80)
    print("电池采用率年度趋势")
    print("=" * 80)
    
    print(f"{'年份':<10} {'总评论数':<12} {'有电池评论数':<15} {'电池采用率(%)':<15}")
    print("-" * 80)
    for year in sorted(year_data.keys()):
        data = year_data[year]
        rate = data['has_battery'] / data['count'] * 100 if data['count'] > 0 else 0
        print(f"{year:<10} {data['count']:<12} {data['has_battery']:<15} {rate:<15.2f}")
    print()
    
    # 系统成本分布
    print("=" * 80)
    print("系统成本分布")
    print("=" * 80)
    
    cost_counter = Counter()
    for review in all_reviews:
        cost = review.get('system_cost', '').strip()
        if cost:
            cost_counter[cost] += 1
    
    for cost, count in cost_counter.most_common():
        print(f"{cost}: {count}")
    print()
    
    # 各州分布
    print("=" * 80)
    print("各州评论分布（Top 10）")
    print("=" * 80)
    
    state_counter = Counter()
    for review in all_reviews:
        state = review.get('reviewer_state', '').strip()
        if state:
            state_counter[state] += 1
    
    for state, count in state_counter.most_common(10):
        print(f"{state}: {count}")
    print()
    
    # 热门电池品牌
    print("=" * 80)
    print("热门电池品牌（所有年份）")
    print("=" * 80)
    
    battery_counter = Counter()
    for review in all_reviews:
        brand = review.get('battery_brand', '').strip()
        if brand:
            battery_counter[brand] += 1
    
    for brand, count in battery_counter.most_common(15):
        print(f"{brand}: {count}")
    print()
    
    # 热门光伏板品牌
    print("=" * 80)
    print("热门光伏板品牌（Top 15）")
    print("=" * 80)
    
    panel_counter = Counter()
    for review in all_reviews:
        brand = review.get('panel_brand', '').strip()
        if brand:
            panel_counter[brand] += 1
    
    for brand, count in panel_counter.most_common(15):
        print(f"{brand}: {count}")
    print()
    
    # 热门逆变器品牌
    print("=" * 80)
    print("热门逆变器品牌（Top 15）")
    print("=" * 80)
    
    inverter_counter = Counter()
    for review in all_reviews:
        brand = review.get('inverter_brand', '').strip()
        if brand:
            inverter_counter[brand] += 1
    
    for brand, count in inverter_counter.most_common(15):
        print(f"{brand}: {count}")
    print()
    
    # 导出详细数据
    output_dir = os.path.join(os.path.dirname(data_dir), 'analysis_output')
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存2025年数据
    if reviews_2025:
        output_file = os.path.join(output_dir, '2025年评论数据.csv')
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            if reviews_2025:
                fieldnames = list(reviews_2025[0].keys())
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for review in reviews_2025:
                    # 移除date_obj，因为它不能直接写入CSV
                    row = {k: v for k, v in review.items() if k != 'date_obj'}
                    writer.writerow(row)
        print(f"已保存2025年数据到: {output_file}")
    
    # 保存2025年7月后数据
    if reviews_after_july:
        output_file = os.path.join(output_dir, '2025年7月后评论数据.csv')
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            if reviews_after_july:
                fieldnames = list(reviews_after_july[0].keys())
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for review in reviews_after_july:
                    row = {k: v for k, v in review.items() if k != 'date_obj'}
                    writer.writerow(row)
        print(f"已保存2025年7月后数据到: {output_file}")
    
    # 保存有电池信息的所有评论
    reviews_with_battery = [r for r in all_reviews if r.get('battery_brand') and r['battery_brand'].strip()]
    if reviews_with_battery:
        output_file = os.path.join(output_dir, '所有含电池评论数据.csv')
        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            fieldnames = list(reviews_with_battery[0].keys())
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for review in reviews_with_battery:
                row = {k: v for k, v in review.items() if k != 'date_obj'}
                writer.writerow(row)
        print(f"已保存所有含电池评论数据到: {output_file}")
    
    # 生成统计摘要JSON
    summary = {
        '数据概览': {
            '总评论数': len(all_reviews),
            '涉及公司数': len(companies),
            '日期范围': f"{min_date.strftime('%Y-%m-%d')} 至 {max_date.strftime('%Y-%m-%d')}"
        },
        '2025年统计': {
            '总评论数': len(reviews_2025),
            '平均评分': avg_rating_2025 if reviews_2025 else 0,
            '有电池信息': battery_2025 if reviews_2025 else 0
        },
        '2025年7月前': {
            '评论数': len(reviews_before_july),
            '平均评分': avg_rating_before if reviews_before_july else 0,
            '有电池信息': battery_before if reviews_before_july else 0,
            '电池采用率': f"{battery_rate_before:.1f}%" if reviews_before_july else "0%"
        },
        '2025年7月后': {
            '评论数': len(reviews_after_july),
            '平均评分': avg_rating_after if reviews_after_july else 0,
            '有电池信息': battery_after if reviews_after_july else 0,
            '电池采用率': f"{battery_rate_after:.1f}%" if reviews_after_july else "0%"
        }
    }
    
    summary_file = os.path.join(output_dir, '分析摘要.json')
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"已保存分析摘要到: {summary_file}")
    
    print("\n" + "=" * 80)
    print("分析完成！")
    print("=" * 80)

if __name__ == '__main__':
    data_dir = '/Users/paulgao/Documents/augment-projects/Sales_Agent_测试/scraped_data/scraped_data'
    analyze_scraped_data(data_dir)
