#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将JSON数据导出为CSV格式
"""

import json
import csv

def export_to_csv():
    # 读取JSON数据
    with open('financial_simulation_240months.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    monthly_data = data['monthly_data']
    
    # 定义CSV列
    fieldnames = [
        '年份', '月份', '天数',
        '发电量(kWh)', '用电量(kWh)', '直接自用(kWh)', 
        '上网(kWh)', '购电(kWh)', '自用率(%)',
        '购电费用($)', '馈网收入($)', '净电费($)',
        '无太阳能电费($)', '月度节省($)',
        '累计节省($)', '回本进度(%)'
    ]
    
    # 写入CSV
    with open('财务数据_240个月.csv', 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in monthly_data:
            writer.writerow({
                '年份': row['year'],
                '月份': row['month'],
                '天数': row['days'],
                '发电量(kWh)': round(row['generation_kwh'], 2),
                '用电量(kWh)': round(row['usage_kwh'], 2),
                '直接自用(kWh)': round(row['direct_use_kwh'], 2),
                '上网(kWh)': round(row['export_kwh'], 2),
                '购电(kWh)': round(row['grid_import_kwh'], 2),
                '自用率(%)': round(row['self_consumption_rate'] * 100, 1),
                '购电费用($)': round(row['purchase_cost'], 2),
                '馈网收入($)': round(row['feed_in_income'], 2),
                '净电费($)': round(row['net_cost'], 2),
                '无太阳能电费($)': round(row['cost_without_solar'], 2),
                '月度节省($)': round(row['monthly_saving'], 2),
                '累计节省($)': round(row['cumulative_saving'], 2),
                '回本进度(%)': round(row['payback_progress_percent'], 2),
            })
    
    print("✅ CSV文件已生成: 财务数据_240个月.csv")
    print(f"📊 包含 {len(monthly_data)} 行数据")

if __name__ == '__main__':
    export_to_csv()
