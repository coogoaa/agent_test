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

def analyze_scraped_data(data_dir):
    """分析爬取的数据"""
    
    # 获取所有CSV文件
    csv_files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
    
    print(f"找到 {len(csv_files)} 个CSV文件\n")
    
    # 存储所有数据
    all_reviews = []
    
    # 读取所有CSV文件
    for csv_file in csv_files:
        file_path = os.path.join(data_dir, csv_file)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                company_name = csv_file.replace('_reviews_', '|||').split('|||')[0]
                
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
    
    # 过滤有效数据
    valid_reviews = [r for r in all_reviews if 'date_obj' in r]
    
    print("=" * 80)
    print("数据概览")
    print("=" * 80)
    print(f"总评论数: {len(df_valid)}")
    print(f"涉及公司数: {df_valid['company_name'].nunique()}")
    print(f"日期范围: {df_valid['review_date'].min()} 至 {df_valid['review_date'].max()}")
    print()
    
    # 年份分布分析
    print("=" * 80)
    print("年份分布分析")
    print("=" * 80)
    year_stats = df_valid.groupby('year').agg({
        'review_id': 'count',
        'overall_review_rating': 'mean',
        'system_size': lambda x: x.notna().sum(),
        'battery_brand': lambda x: x.notna().sum()
    }).round(2)
    year_stats.columns = ['评论数', '平均评分', '有系统大小信息', '有电池信息']
    print(year_stats)
    print()
    
    # 2025年详细分析
    print("=" * 80)
    print("2025年详细分析")
    print("=" * 80)
    df_2025 = df_valid[df_valid['year'] == 2025]
    
    if len(df_2025) > 0:
        print(f"2025年总评论数: {len(df_2025)}")
        print(f"平均评分: {df_2025['overall_review_rating'].mean():.2f}")
        print(f"有电池信息的评论: {df_2025['battery_brand'].notna().sum()}")
        print()
        
        # 按月份分析
        print("2025年月度分布:")
        monthly_2025 = df_2025.groupby('month').agg({
            'review_id': 'count',
            'overall_review_rating': 'mean',
            'battery_brand': lambda x: x.notna().sum()
        }).round(2)
        monthly_2025.columns = ['评论数', '平均评分', '有电池信息']
        print(monthly_2025)
        print()
    else:
        print("未找到2025年的数据")
        print()
    
    # 2025年7月后的电池补贴影响分析
    print("=" * 80)
    print("2025年7月前后对比分析（电池补贴影响）")
    print("=" * 80)
    
    # 2025年7月1日作为分界点
    cutoff_date = pd.Timestamp('2025-07-01')
    
    df_before_july = df_valid[
        (df_valid['year'] == 2025) & 
        (df_valid['review_date'] < cutoff_date)
    ]
    
    df_after_july = df_valid[
        (df_valid['year'] == 2025) & 
        (df_valid['review_date'] >= cutoff_date)
    ]
    
    print(f"\n2025年7月前 (1-6月):")
    print(f"  评论数: {len(df_before_july)}")
    if len(df_before_july) > 0:
        print(f"  平均评分: {df_before_july['overall_review_rating'].mean():.2f}")
        print(f"  有电池信息: {df_before_july['battery_brand'].notna().sum()} ({df_before_july['battery_brand'].notna().sum()/len(df_before_july)*100:.1f}%)")
        
        # 电池品牌分布
        battery_before = df_before_july['battery_brand'].value_counts()
        if len(battery_before) > 0:
            print(f"  主要电池品牌:")
            for brand, count in battery_before.head(5).items():
                print(f"    - {brand}: {count}")
    
    print(f"\n2025年7月后 (7月及以后):")
    print(f"  评论数: {len(df_after_july)}")
    if len(df_after_july) > 0:
        print(f"  平均评分: {df_after_july['overall_review_rating'].mean():.2f}")
        print(f"  有电池信息: {df_after_july['battery_brand'].notna().sum()} ({df_after_july['battery_brand'].notna().sum()/len(df_after_july)*100:.1f}%)")
        
        # 电池品牌分布
        battery_after = df_after_july['battery_brand'].value_counts()
        if len(battery_after) > 0:
            print(f"  主要电池品牌:")
            for brand, count in battery_after.head(5).items():
                print(f"    - {brand}: {count}")
    
    # 电池采用率趋势
    print("\n" + "=" * 80)
    print("电池采用率年度趋势")
    print("=" * 80)
    
    battery_trend = df_valid.groupby('year').agg({
        'review_id': 'count',
        'battery_brand': lambda x: x.notna().sum()
    })
    battery_trend['电池采用率(%)'] = (battery_trend['battery_brand'] / battery_trend['review_id'] * 100).round(2)
    battery_trend.columns = ['总评论数', '有电池评论数', '电池采用率(%)']
    print(battery_trend)
    print()
    
    # 系统成本分析
    print("=" * 80)
    print("系统成本分布")
    print("=" * 80)
    
    cost_dist = df_valid['system_cost'].value_counts().sort_index()
    print(cost_dist)
    print()
    
    # 各州分布
    print("=" * 80)
    print("各州评论分布（Top 10）")
    print("=" * 80)
    
    state_dist = df_valid['reviewer_state'].value_counts().head(10)
    print(state_dist)
    print()
    
    # 热门电池品牌
    print("=" * 80)
    print("热门电池品牌（所有年份）")
    print("=" * 80)
    
    battery_brands = df_valid[df_valid['battery_brand'].notna()]['battery_brand'].value_counts().head(15)
    print(battery_brands)
    print()
    
    # 热门光伏板品牌
    print("=" * 80)
    print("热门光伏板品牌（Top 15）")
    print("=" * 80)
    
    panel_brands = df_valid[df_valid['panel_brand'].notna()]['panel_brand'].value_counts().head(15)
    print(panel_brands)
    print()
    
    # 热门逆变器品牌
    print("=" * 80)
    print("热门逆变器品牌（Top 15）")
    print("=" * 80)
    
    inverter_brands = df_valid[df_valid['inverter_brand'].notna()]['inverter_brand'].value_counts().head(15)
    print(inverter_brands)
    print()
    
    # 导出详细数据
    output_dir = os.path.join(os.path.dirname(data_dir), 'analysis_output')
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存2025年数据
    if len(df_2025) > 0:
        output_file = os.path.join(output_dir, '2025年评论数据.csv')
        df_2025.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"已保存2025年数据到: {output_file}")
    
    # 保存2025年7月后数据
    if len(df_after_july) > 0:
        output_file = os.path.join(output_dir, '2025年7月后评论数据.csv')
        df_after_july.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"已保存2025年7月后数据到: {output_file}")
    
    # 保存有电池信息的所有评论
    df_with_battery = df_valid[df_valid['battery_brand'].notna()]
    if len(df_with_battery) > 0:
        output_file = os.path.join(output_dir, '所有含电池评论数据.csv')
        df_with_battery.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"已保存所有含电池评论数据到: {output_file}")
    
    # 生成统计摘要JSON
    summary = {
        '数据概览': {
            '总评论数': int(len(df_valid)),
            '涉及公司数': int(df_valid['company_name'].nunique()),
            '日期范围': f"{df_valid['review_date'].min()} 至 {df_valid['review_date'].max()}"
        },
        '2025年统计': {
            '总评论数': int(len(df_2025)),
            '平均评分': float(df_2025['overall_review_rating'].mean()) if len(df_2025) > 0 else 0,
            '有电池信息': int(df_2025['battery_brand'].notna().sum()) if len(df_2025) > 0 else 0
        },
        '2025年7月前': {
            '评论数': int(len(df_before_july)),
            '平均评分': float(df_before_july['overall_review_rating'].mean()) if len(df_before_july) > 0 else 0,
            '有电池信息': int(df_before_july['battery_brand'].notna().sum()) if len(df_before_july) > 0 else 0,
            '电池采用率': f"{df_before_july['battery_brand'].notna().sum()/len(df_before_july)*100:.1f}%" if len(df_before_july) > 0 else "0%"
        },
        '2025年7月后': {
            '评论数': int(len(df_after_july)),
            '平均评分': float(df_after_july['overall_review_rating'].mean()) if len(df_after_july) > 0 else 0,
            '有电池信息': int(df_after_july['battery_brand'].notna().sum()) if len(df_after_july) > 0 else 0,
            '电池采用率': f"{df_after_july['battery_brand'].notna().sum()/len(df_after_july)*100:.1f}%" if len(df_after_july) > 0 else "0%"
        }
    }
    
    summary_file = os.path.join(output_dir, '分析摘要.json')
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2, default=str)
    print(f"已保存分析摘要到: {summary_file}")
    
    print("\n" + "=" * 80)
    print("分析完成！")
    print("=" * 80)

if __name__ == '__main__':
    data_dir = '/Users/paulgao/Documents/augment-projects/Sales_Agent_测试/scraped_data/scraped_data'
    analyze_scraped_data(data_dir)
