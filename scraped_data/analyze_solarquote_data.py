#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SolarQuote数据分析脚本
用途：处理抓取的JSON数据，生成市场统计报告
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
import re
from collections import Counter
from datetime import datetime

class SolarQuoteAnalyzer:
    """SolarQuote数据分析器"""
    
    def __init__(self, data_dir):
        self.data_dir = Path(data_dir)
        self.reviews_df = None
        self.companies_df = None
        
    def load_all_data(self):
        """加载所有JSON文件"""
        print("🔄 开始加载数据...")
        
        all_reviews = []
        all_companies = []
        
        json_files = list(self.data_dir.glob("*_202*.json"))
        print(f"📁 找到 {len(json_files)} 个JSON文件")
        
        for idx, json_file in enumerate(json_files, 1):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                company_info = data.get('company_info', {})
                company_name = company_info.get('company_name', 'Unknown')
                
                # 提取公司信息
                all_companies.append({
                    'company_name': company_name,
                    'abn': company_info.get('abn_number'),
                    'phone': company_info.get('contact_phone'),
                    'website': company_info.get('website_url'),
                    'review_count': data.get('overall_ratings', {}).get('total_review_count', 0)
                })
                
                # 提取评价信息
                for review in data.get('reviews', []):
                    review_data = self._extract_review_data(review, company_name)
                    if review_data:
                        all_reviews.append(review_data)
                
                if idx % 20 == 0:
                    print(f"   处理进度: {idx}/{len(json_files)}")
                    
            except Exception as e:
                print(f"❌ 处理文件失败 {json_file.name}: {e}")
                continue
        
        self.reviews_df = pd.DataFrame(all_reviews)
        self.companies_df = pd.DataFrame(all_companies)
        
        print(f"✅ 数据加载完成！")
        print(f"   - 公司数量: {len(self.companies_df)}")
        print(f"   - 评价数量: {len(self.reviews_df)}")
        
        return self.reviews_df, self.companies_df
    
    def _extract_review_data(self, review, company_name):
        """提取单条评价数据"""
        try:
            # 解析系统容量
            system_kw = self._parse_system_size(review.get('system_size', ''))
            
            # 解析价格区间
            cost_min, cost_max = self._parse_cost_range(review.get('system_cost', ''))
            
            # 判断是否有电池
            has_battery = bool(review.get('battery_brand') and 
                             review.get('battery_brand').strip())
            
            return {
                'company': company_name,
                'review_id': review.get('review_id'),
                'reviewer_name': review.get('reviewer_name'),
                'state': review.get('reviewer_state'),
                'postcode': review.get('reviewer_postcode'),
                'date': review.get('review_date'),
                'system_kw': system_kw,
                'cost_min': cost_min,
                'cost_max': cost_max,
                'cost_mid': (cost_min + cost_max) / 2 if cost_min and cost_max else None,
                'panel_brand': review.get('panel_brand', '').strip(),
                'inverter_brand': review.get('inverter_brand', '').strip(),
                'battery_brand': review.get('battery_brand', '').strip(),
                'has_battery': has_battery,
                'overall_rating': review.get('overall_review_rating', 0),
                'value_rating': review.get('value_for_money_rating', 0),
                'installation_rating': review.get('installation_rating', 0),
                'service_rating': review.get('customer_service_rating', 0),
                'panel_rating': review.get('panel_rating', 0),
                'inverter_rating': review.get('inverter_rating', 0),
                'battery_rating': review.get('battery_rating', 0),
            }
        except Exception as e:
            return None
    
    def _parse_system_size(self, size_str):
        """解析系统容量"""
        if not size_str or size_str == "":
            return None
        
        # 匹配数字（包括小数）
        match = re.search(r'(\d+\.?\d*)', str(size_str))
        if match:
            return float(match.group(1))
        return None
    
    def _parse_cost_range(self, cost_str):
        """解析价格区间"""
        if not cost_str or cost_str == "":
            return None, None
        
        # 匹配所有数字
        numbers = re.findall(r'\d+,?\d*', str(cost_str))
        if len(numbers) >= 2:
            min_cost = int(numbers[0].replace(',', ''))
            max_cost = int(numbers[1].replace(',', ''))
            return min_cost, max_cost
        elif len(numbers) == 1:
            # 只有一个数字，可能是"More than $20,000"
            cost = int(numbers[0].replace(',', ''))
            if 'more than' in cost_str.lower():
                return cost, cost * 1.5
            else:
                return cost * 0.8, cost * 1.2
        
        return None, None
    
    def generate_statistics(self):
        """生成统计报告"""
        if self.reviews_df is None:
            print("❌ 请先加载数据！")
            return
        
        print("\n" + "="*60)
        print("📊 市场统计报告")
        print("="*60)
        
        df = self.reviews_df
        
        # 1. 系统容量分布
        print("\n【1. 系统容量分布】")
        valid_sizes = df[df['system_kw'].notna()]['system_kw']
        if len(valid_sizes) > 0:
            print(f"   样本数: {len(valid_sizes)}")
            print(f"   平均容量: {valid_sizes.mean():.2f} kW")
            print(f"   中位数: {valid_sizes.median():.2f} kW")
            print(f"   最常见容量:")
            size_counts = valid_sizes.value_counts().head(10)
            for size, count in size_counts.items():
                print(f"      {size} kW: {count} 次 ({count/len(valid_sizes)*100:.1f}%)")
        
        # 2. 价格分析
        print("\n【2. 价格分析】")
        valid_prices = df[df['cost_mid'].notna()]
        if len(valid_prices) > 0:
            print(f"   样本数: {len(valid_prices)}")
            print(f"   平均价格: ${valid_prices['cost_mid'].mean():,.0f}")
            print(f"   中位数: ${valid_prices['cost_mid'].median():,.0f}")
            
            # 按容量段统计价格
            print(f"\n   各容量段平均价格:")
            price_by_size = valid_prices.groupby(
                pd.cut(valid_prices['system_kw'], 
                       bins=[0, 5, 7, 10, 15, 100],
                       labels=['<5kW', '5-7kW', '7-10kW', '10-15kW', '>15kW'])
            )['cost_mid'].agg(['mean', 'count'])
            for idx, row in price_by_size.iterrows():
                if row['count'] > 0:
                    print(f"      {idx}: ${row['mean']:,.0f} (样本数: {int(row['count'])})")
        
        # 3. 电池配置率
        print("\n【3. 电池配置分析】")
        total = len(df)
        with_battery = df['has_battery'].sum()
        battery_rate = (with_battery / total * 100) if total > 0 else 0
        print(f"   总评价数: {total}")
        print(f"   含电池: {with_battery} ({battery_rate:.1f}%)")
        print(f"   无电池: {total - with_battery} ({100-battery_rate:.1f}%)")
        
        # 按州统计电池配置率
        print(f"\n   各州电池配置率:")
        battery_by_state = df.groupby('state')['has_battery'].agg(['sum', 'count'])
        battery_by_state['rate'] = battery_by_state['sum'] / battery_by_state['count'] * 100
        battery_by_state = battery_by_state.sort_values('rate', ascending=False)
        for state, row in battery_by_state.iterrows():
            if pd.notna(state) and row['count'] > 10:
                print(f"      {state}: {row['rate']:.1f}% (样本数: {int(row['count'])})")
        
        # 4. 品牌分析
        print("\n【4. 品牌受欢迎度】")
        
        # 光伏板品牌
        print(f"\n   光伏板品牌 Top 10:")
        panel_brands = df[df['panel_brand'] != '']['panel_brand'].value_counts().head(10)
        for brand, count in panel_brands.items():
            pct = count / len(df[df['panel_brand'] != '']) * 100
            print(f"      {brand}: {count} ({pct:.1f}%)")
        
        # 逆变器品牌
        print(f"\n   逆变器品牌 Top 10:")
        inverter_brands = df[df['inverter_brand'] != '']['inverter_brand'].value_counts().head(10)
        for brand, count in inverter_brands.items():
            pct = count / len(df[df['inverter_brand'] != '']) * 100
            print(f"      {brand}: {count} ({pct:.1f}%)")
        
        # 电池品牌
        print(f"\n   电池品牌 Top 10:")
        battery_brands = df[df['battery_brand'] != '']['battery_brand'].value_counts().head(10)
        for brand, count in battery_brands.items():
            pct = count / len(df[df['battery_brand'] != '']) * 100
            print(f"      {brand}: {count} ({pct:.1f}%)")
        
        # 5. 评分分析
        print("\n【5. 评分分析】")
        rating_cols = ['overall_rating', 'value_rating', 'installation_rating', 'service_rating']
        for col in rating_cols:
            valid_ratings = df[df[col] > 0][col]
            if len(valid_ratings) > 0:
                print(f"   {col}: {valid_ratings.mean():.2f} (样本数: {len(valid_ratings)})")
        
        # 6. 地域分析
        print("\n【6. 地域分析】")
        state_stats = df.groupby('state').agg({
            'system_kw': ['mean', 'count'],
            'cost_mid': 'mean',
            'has_battery': 'mean'
        }).round(2)
        
        print(f"\n   各州统计:")
        for state, row in state_stats.iterrows():
            if pd.notna(state) and row[('system_kw', 'count')] > 10:
                print(f"      {state}:")
                print(f"         平均系统容量: {row[('system_kw', 'mean')]:.2f} kW")
                print(f"         平均价格: ${row[('cost_mid', 'mean')]:,.0f}")
                print(f"         电池配置率: {row[('has_battery', 'mean')]*100:.1f}%")
                print(f"         样本数: {int(row[('system_kw', 'count')])}")
        
        print("\n" + "="*60)
    
    def export_summary(self, output_file='market_summary.json'):
        """导出汇总数据为JSON"""
        if self.reviews_df is None:
            print("❌ 请先加载数据！")
            return
        
        df = self.reviews_df
        
        # 系统容量分布
        size_dist = df[df['system_kw'].notna()]['system_kw'].value_counts().to_dict()
        
        # 常见配置
        common_configs = []
        for size in [4.0, 5.0, 6.6, 8.0, 10.0, 13.2]:
            size_data = df[df['system_kw'] == size]
            if len(size_data) > 5:
                common_configs.append({
                    'size_kw': size,
                    'count': len(size_data),
                    'avg_cost': int(size_data['cost_mid'].mean()) if size_data['cost_mid'].notna().any() else None,
                    'battery_rate': float(size_data['has_battery'].mean()),
                    'top_panel_brand': size_data['panel_brand'].mode()[0] if len(size_data['panel_brand'].mode()) > 0 else None,
                    'top_inverter_brand': size_data['inverter_brand'].mode()[0] if len(size_data['inverter_brand'].mode()) > 0 else None
                })
        
        # 品牌评分
        brand_ratings = {}
        for brand_col, rating_col in [
            ('panel_brand', 'panel_rating'),
            ('inverter_brand', 'inverter_rating'),
            ('battery_brand', 'battery_rating')
        ]:
            brands = df[df[rating_col] > 0].groupby(brand_col)[rating_col].agg(['mean', 'count'])
            brand_ratings[brand_col] = brands[brands['count'] >= 5].to_dict('index')
        
        summary = {
            'generated_at': datetime.now().isoformat(),
            'total_reviews': len(df),
            'total_companies': len(self.companies_df),
            'system_size_distribution': size_dist,
            'common_configurations': common_configs,
            'brand_ratings': brand_ratings,
            'battery_adoption_rate': float(df['has_battery'].mean()),
            'avg_system_size': float(df['system_kw'].mean()) if df['system_kw'].notna().any() else None,
            'avg_cost': int(df['cost_mid'].mean()) if df['cost_mid'].notna().any() else None
        }
        
        output_path = self.data_dir / output_file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 汇总数据已导出到: {output_path}")
        return summary
    
    def export_csv(self, output_file='processed_reviews.csv'):
        """导出处理后的CSV文件"""
        if self.reviews_df is None:
            print("❌ 请先加载数据！")
            return
        
        output_path = self.data_dir / output_file
        self.reviews_df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"✅ CSV文件已导出到: {output_path}")


def main():
    """主函数"""
    # 数据目录
    data_dir = Path(__file__).parent
    
    print("="*60)
    print("🌞 SolarQuote 数据分析工具")
    print("="*60)
    
    # 创建分析器
    analyzer = SolarQuoteAnalyzer(data_dir)
    
    # 加载数据
    reviews_df, companies_df = analyzer.load_all_data()
    
    # 生成统计报告
    analyzer.generate_statistics()
    
    # 导出数据
    print("\n📤 导出数据...")
    analyzer.export_summary('market_summary.json')
    analyzer.export_csv('processed_reviews.csv')
    
    print("\n✅ 分析完成！")


if __name__ == '__main__':
    main()
