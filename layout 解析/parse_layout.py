#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Layout 解析工具
解析屋顶光伏面板布局数据并生成结构化表格
"""

import json
import csv
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any
import math


def load_json_data(filepath: str) -> List[Dict[str, Any]]:
    """加载 JSON 数据"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def calculate_panel_count(positions: List[float]) -> int:
    """计算光伏面板数量
    positions 数组每6个元素代表一个面板的两个点坐标 (x1, y1, z1, x2, y2, z2)
    """
    if not positions:
        return 0
    return len(positions) // 6


def calculate_distance(point1: List[float], point2: List[float]) -> float:
    """计算两点之间的距离"""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(point1, point2)))


def degrees_to_direction(degrees: float) -> str:
    """将角度转换为方向描述"""
    # 标准化角度到 -180 到 180
    degrees = degrees % 360
    if degrees > 180:
        degrees -= 360
    
    if -22.5 <= degrees < 22.5:
        return "北 (North)"
    elif 22.5 <= degrees < 67.5:
        return "东北 (Northeast)"
    elif 67.5 <= degrees < 112.5:
        return "东 (East)"
    elif 112.5 <= degrees < 157.5:
        return "东南 (Southeast)"
    elif 157.5 <= degrees or degrees < -157.5:
        return "南 (South)"
    elif -157.5 <= degrees < -112.5:
        return "西南 (Southwest)"
    elif -112.5 <= degrees < -67.5:
        return "西 (West)"
    else:
        return "西北 (Northwest)"


def parse_roof_data(data: List[Dict[str, Any]]) -> pd.DataFrame:
    """解析屋顶数据为 DataFrame"""
    rows = []
    
    for idx, roof in enumerate(data, 1):
        panel_count = calculate_panel_count(roof.get('positions', []))
        aspect = roof.get('aspect', 0)
        slope = roof.get('slope', 0)
        start = roof.get('start', [0, 0, 0])
        end = roof.get('end', [0, 0, 0])
        center = roof.get('center', [0, 0, 0])
        
        # 计算屋顶长度
        roof_length = calculate_distance(start, end)
        
        row = {
            '屋顶编号': f'屋顶 {idx}',
            '光伏面板数量': panel_count,
            '是否安装面板': '是' if panel_count > 0 else '否',
            '朝向角度 (degrees)': round(aspect, 2),
            '朝向描述': degrees_to_direction(aspect),
            '坡度 (radians)': round(slope, 4),
            '坡度 (degrees)': round(math.degrees(slope), 2),
            '起点坐标 X': round(start[0], 2),
            '起点坐标 Y': round(start[1], 2),
            '起点坐标 Z': round(start[2], 2),
            '终点坐标 X': round(end[0], 2),
            '终点坐标 Y': round(end[1], 2),
            '终点坐标 Z': round(end[2], 2),
            '中心坐标 X': round(center[0], 2),
            '中心坐标 Y': round(center[1], 2),
            '中心坐标 Z': round(center[2], 2),
            '屋顶长度': round(roof_length, 2)
        }
        rows.append(row)
    
    return pd.DataFrame(rows)


def generate_summary_table(df: pd.DataFrame) -> pd.DataFrame:
    """生成汇总表"""
    summary = {
        '总屋顶数量': len(df),
        '已安装面板的屋顶数量': len(df[df['是否安装面板'] == '是']),
        '未安装面板的屋顶数量': len(df[df['是否安装面板'] == '否']),
        '光伏面板总数': df['光伏面板数量'].sum(),
        '平均坡度 (degrees)': round(df['坡度 (degrees)'].mean(), 2),
        '最大坡度 (degrees)': round(df['坡度 (degrees)'].max(), 2),
        '最小坡度 (degrees)': round(df['坡度 (degrees)'].min(), 2)
    }
    return pd.DataFrame([summary])


def generate_by_direction_table(df: pd.DataFrame) -> pd.DataFrame:
    """按朝向分类统计"""
    direction_stats = df.groupby('朝向描述').agg({
        '屋顶编号': 'count',
        '光伏面板数量': 'sum',
        '坡度 (degrees)': 'mean',
        '屋顶长度': 'sum'
    }).reset_index()
    
    direction_stats.columns = ['朝向', '屋顶数量', '光伏面板总数', '平均坡度 (degrees)', '总长度']
    direction_stats['平均坡度 (degrees)'] = direction_stats['平均坡度 (degrees)'].round(2)
    direction_stats['总长度'] = direction_stats['总长度'].round(2)
    
    return direction_stats


def generate_panel_installation_table(df: pd.DataFrame) -> pd.DataFrame:
    """生成面板安装详情表（仅包含已安装面板的屋顶）"""
    installed = df[df['是否安装面板'] == '是'].copy()
    
    if len(installed) == 0:
        return pd.DataFrame()
    
    result = installed[[
        '屋顶编号', '光伏面板数量', '朝向描述', '朝向角度 (degrees)',
        '坡度 (degrees)', '中心坐标 X', '中心坐标 Y', '中心坐标 Z'
    ]]
    
    return result


def generate_empty_roofs_table(df: pd.DataFrame) -> pd.DataFrame:
    """生成未安装面板的屋顶表"""
    empty = df[df['是否安装面板'] == '否'].copy()
    
    if len(empty) == 0:
        return pd.DataFrame()
    
    result = empty[[
        '屋顶编号', '朝向描述', '朝向角度 (degrees)',
        '坡度 (degrees)', '屋顶长度', '中心坐标 X', '中心坐标 Y', '中心坐标 Z'
    ]]
    
    return result


def save_to_csv(df: pd.DataFrame, filepath: str):
    """保存 DataFrame 到 CSV"""
    df.to_csv(filepath, index=False, encoding='utf-8-sig')
    print(f"✓ 已保存: {filepath}")


def save_to_markdown(df: pd.DataFrame, filepath: str, title: str = ""):
    """保存 DataFrame 到 Markdown"""
    with open(filepath, 'w', encoding='utf-8') as f:
        if title:
            f.write(f"# {title}\n\n")
        f.write(df.to_markdown(index=False))
    print(f"✓ 已保存: {filepath}")


def main():
    """主函数"""
    # 设置路径
    base_dir = Path(__file__).parent
    input_file = base_dir / 'sample-original.json'
    output_dir = base_dir / 'output'
    
    # 确保输出目录存在
    output_dir.mkdir(exist_ok=True)
    
    print("=" * 60)
    print("Layout 解析工具")
    print("=" * 60)
    
    # 加载数据
    print(f"\n📂 加载数据: {input_file}")
    data = load_json_data(input_file)
    print(f"✓ 成功加载 {len(data)} 个屋顶数据")
    
    # 解析数据
    print("\n📊 解析屋顶数据...")
    df_full = parse_roof_data(data)
    
    # 生成各类表格
    print("\n📋 生成结构化表格...")
    
    # 1. 完整详细表
    save_to_csv(df_full, output_dir / '01_完整屋顶数据.csv')
    save_to_markdown(df_full, output_dir / '01_完整屋顶数据.md', '完整屋顶数据')
    
    # 2. 汇总统计表
    df_summary = generate_summary_table(df_full)
    save_to_csv(df_summary, output_dir / '02_汇总统计.csv')
    save_to_markdown(df_summary, output_dir / '02_汇总统计.md', '汇总统计')
    
    # 3. 按朝向分类表
    df_direction = generate_by_direction_table(df_full)
    save_to_csv(df_direction, output_dir / '03_按朝向分类统计.csv')
    save_to_markdown(df_direction, output_dir / '03_按朝向分类统计.md', '按朝向分类统计')
    
    # 4. 已安装面板的屋顶
    df_installed = generate_panel_installation_table(df_full)
    if not df_installed.empty:
        save_to_csv(df_installed, output_dir / '04_已安装面板屋顶.csv')
        save_to_markdown(df_installed, output_dir / '04_已安装面板屋顶.md', '已安装面板的屋顶')
    
    # 5. 未安装面板的屋顶
    df_empty = generate_empty_roofs_table(df_full)
    if not df_empty.empty:
        save_to_csv(df_empty, output_dir / '05_未安装面板屋顶.csv')
        save_to_markdown(df_empty, output_dir / '05_未安装面板屋顶.md', '未安装面板的屋顶')
    
    # 打印统计信息
    print("\n" + "=" * 60)
    print("📈 统计摘要")
    print("=" * 60)
    print(f"总屋顶数量: {len(df_full)}")
    print(f"已安装面板的屋顶: {len(df_full[df_full['是否安装面板'] == '是'])}")
    print(f"未安装面板的屋顶: {len(df_full[df_full['是否安装面板'] == '否'])}")
    print(f"光伏面板总数: {df_full['光伏面板数量'].sum()}")
    print("\n✅ 所有表格已生成完成!")
    print(f"📁 输出目录: {output_dir}")
    print("=" * 60)


if __name__ == '__main__':
    main()
