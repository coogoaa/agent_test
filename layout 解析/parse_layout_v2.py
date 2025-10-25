#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Layout 解析工具 V2
分别解析 sample-original.json 和 sample-final.json
"""

import json
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any
import math


def load_json_data(filepath: str) -> Any:
    """加载 JSON 数据"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def calculate_panel_count(positions: List[float]) -> int:
    """计算光伏面板数量
    positions 数组每3个元素代表一个面板的坐标 (x, y, z)
    """
    if not positions:
        return 0
    return len(positions) // 3


def calculate_distance(point1: List[float], point2: List[float]) -> float:
    """计算两点之间的距离"""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(point1, point2)))


def degrees_to_direction(degrees: float) -> str:
    """将角度转换为方向描述"""
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


def parse_original_json(data: List[Dict[str, Any]]) -> pd.DataFrame:
    """解析 original JSON 数据"""
    rows = []
    
    for idx, roof in enumerate(data, 1):
        positions = roof.get('positions', [])
        panel_count = len(positions) // 6 if positions else 0  # original 是每6个元素一个面板
        aspect = roof.get('aspect', 0)
        slope = roof.get('slope', 0)
        start = roof.get('start', [0, 0, 0])
        end = roof.get('end', [0, 0, 0])
        center = roof.get('center', [0, 0, 0])
        
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


def parse_final_json(data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
    """解析 final JSON 数据，返回多个 DataFrame"""
    
    # 1. 项目基本信息
    project_info = {
        '项目ID': data.get('projectId', ''),
        'GIS时间ID': data.get('gisTimeId', ''),
        'GIS日期': data.get('gisDate', ''),
        '安装面板总数': data.get('installPanelCount', 0)
    }
    df_project = pd.DataFrame([project_info])
    
    # 2. 面板位置信息
    panel_infos = data.get('panelLocationInfos', [])
    panel_rows = []
    
    for idx, panel in enumerate(panel_infos, 1):
        positions = panel.get('positions', [])
        aspect = panel.get('aspect', 0)
        slope = panel.get('slope', 0)
        
        # 解析发电量信息
        gen_power = panel.get('generationPowerVO', {})
        cal_status = gen_power.get('calStatus', False)
        
        # 计算年度总发电量
        monthly_hourly = gen_power.get('monthlyHourlyPowerList', [])
        total_annual_power = 0
        monthly_totals = []
        
        for month_data in monthly_hourly:
            month_total = sum(month_data) if month_data else 0
            monthly_totals.append(round(month_total, 2))
            total_annual_power += month_total
        
        row = {
            '面板编号': f'面板 {idx}',
            '位置坐标 X': round(positions[0], 2) if len(positions) > 0 else 0,
            '位置坐标 Y': round(positions[1], 2) if len(positions) > 1 else 0,
            '位置坐标 Z': round(positions[2], 2) if len(positions) > 2 else 0,
            '朝向角度 (degrees)': round(aspect, 2),
            '朝向描述': degrees_to_direction(aspect),
            '坡度 (radians)': round(slope, 4),
            '坡度 (degrees)': round(math.degrees(slope), 2),
            '计算状态': '成功' if cal_status else '失败',
            '年度总发电量 (kWh)': round(total_annual_power, 2)
        }
        
        # 添加每月发电量
        for month_idx, month_total in enumerate(monthly_totals, 1):
            row[f'{month_idx}月发电量 (kWh)'] = month_total
        
        panel_rows.append(row)
    
    df_panels = pd.DataFrame(panel_rows)
    
    # 3. 发电量汇总统计
    if panel_rows:
        summary = {
            '面板总数': len(panel_rows),
            '年度总发电量 (kWh)': round(sum(row['年度总发电量 (kWh)'] for row in panel_rows), 2),
            '平均单板年发电量 (kWh)': round(sum(row['年度总发电量 (kWh)'] for row in panel_rows) / len(panel_rows), 2),
            '最大单板年发电量 (kWh)': round(max(row['年度总发电量 (kWh)'] for row in panel_rows), 2),
            '最小单板年发电量 (kWh)': round(min(row['年度总发电量 (kWh)'] for row in panel_rows), 2)
        }
        df_summary = pd.DataFrame([summary])
    else:
        df_summary = pd.DataFrame()
    
    # 4. 按朝向分类统计
    if not df_panels.empty:
        direction_stats = df_panels.groupby('朝向描述').agg({
            '面板编号': 'count',
            '年度总发电量 (kWh)': 'sum',
            '坡度 (degrees)': 'mean'
        }).reset_index()
        
        direction_stats.columns = ['朝向', '面板数量', '年度总发电量 (kWh)', '平均坡度 (degrees)']
        direction_stats['平均坡度 (degrees)'] = direction_stats['平均坡度 (degrees)'].round(2)
        direction_stats['年度总发电量 (kWh)'] = direction_stats['年度总发电量 (kWh)'].round(2)
        df_direction = direction_stats
    else:
        df_direction = pd.DataFrame()
    
    # 5. 月度发电量汇总
    if panel_rows and monthly_totals:
        monthly_summary = []
        for month in range(1, 13):
            month_key = f'{month}月发电量 (kWh)'
            month_total = sum(row.get(month_key, 0) for row in panel_rows)
            monthly_summary.append({
                '月份': f'{month}月',
                '总发电量 (kWh)': round(month_total, 2),
                '平均单板发电量 (kWh)': round(month_total / len(panel_rows), 2)
            })
        df_monthly = pd.DataFrame(monthly_summary)
    else:
        df_monthly = pd.DataFrame()
    
    return {
        'project': df_project,
        'panels': df_panels,
        'summary': df_summary,
        'direction': df_direction,
        'monthly': df_monthly
    }


def save_to_csv(df: pd.DataFrame, filepath: str):
    """保存 DataFrame 到 CSV"""
    if df.empty:
        print(f"⚠ 跳过空表格: {filepath}")
        return
    df.to_csv(filepath, index=False, encoding='utf-8-sig')
    print(f"✓ 已保存: {filepath}")


def save_to_markdown(df: pd.DataFrame, filepath: str, title: str = ""):
    """保存 DataFrame 到 Markdown"""
    if df.empty:
        print(f"⚠ 跳过空表格: {filepath}")
        return
    with open(filepath, 'w', encoding='utf-8') as f:
        if title:
            f.write(f"# {title}\n\n")
        f.write(df.to_markdown(index=False))
    print(f"✓ 已保存: {filepath}")


def main():
    """主函数"""
    base_dir = Path(__file__).parent
    original_file = base_dir / 'sample' / 'sample-original.json'
    final_file = base_dir / 'sample' / 'sample-final.json'
    output_dir = base_dir / 'output'
    
    output_dir.mkdir(exist_ok=True)
    
    print("=" * 70)
    print("Layout 解析工具 V2 - 分别解析原始和最终 JSON")
    print("=" * 70)
    
    # ========== 解析 Original JSON ==========
    print("\n" + "=" * 70)
    print("📂 第一部分: 解析 sample-original.json (原始屋顶数据)")
    print("=" * 70)
    
    original_data = load_json_data(original_file)
    print(f"✓ 加载 {len(original_data)} 个屋顶数据")
    
    df_original = parse_original_json(original_data)
    
    # 保存 original 数据
    original_output_dir = output_dir / 'original'
    original_output_dir.mkdir(exist_ok=True)
    
    save_to_csv(df_original, original_output_dir / '01_完整屋顶数据.csv')
    save_to_markdown(df_original, original_output_dir / '01_完整屋顶数据.md', '完整屋顶数据 (Original)')
    
    # 汇总统计
    summary_original = {
        '总屋顶数量': len(df_original),
        '已安装面板的屋顶数量': len(df_original[df_original['是否安装面板'] == '是']),
        '未安装面板的屋顶数量': len(df_original[df_original['是否安装面板'] == '否']),
        '光伏面板总数': df_original['光伏面板数量'].sum(),
        '平均坡度 (degrees)': round(df_original['坡度 (degrees)'].mean(), 2)
    }
    df_summary_original = pd.DataFrame([summary_original])
    save_to_csv(df_summary_original, original_output_dir / '02_汇总统计.csv')
    save_to_markdown(df_summary_original, original_output_dir / '02_汇总统计.md', '汇总统计 (Original)')
    
    # 按朝向分类
    direction_original = df_original.groupby('朝向描述').agg({
        '屋顶编号': 'count',
        '光伏面板数量': 'sum',
        '坡度 (degrees)': 'mean',
        '屋顶长度': 'sum'
    }).reset_index()
    direction_original.columns = ['朝向', '屋顶数量', '光伏面板总数', '平均坡度 (degrees)', '总长度']
    direction_original['平均坡度 (degrees)'] = direction_original['平均坡度 (degrees)'].round(2)
    direction_original['总长度'] = direction_original['总长度'].round(2)
    
    save_to_csv(direction_original, original_output_dir / '03_按朝向分类统计.csv')
    save_to_markdown(direction_original, original_output_dir / '03_按朝向分类统计.md', '按朝向分类统计 (Original)')
    
    # 已安装面板
    df_installed = df_original[df_original['是否安装面板'] == '是'][[
        '屋顶编号', '光伏面板数量', '朝向描述', '朝向角度 (degrees)',
        '坡度 (degrees)', '中心坐标 X', '中心坐标 Y', '中心坐标 Z'
    ]]
    save_to_csv(df_installed, original_output_dir / '04_已安装面板屋顶.csv')
    save_to_markdown(df_installed, original_output_dir / '04_已安装面板屋顶.md', '已安装面板的屋顶 (Original)')
    
    # 未安装面板
    df_empty = df_original[df_original['是否安装面板'] == '否'][[
        '屋顶编号', '朝向描述', '朝向角度 (degrees)',
        '坡度 (degrees)', '屋顶长度', '中心坐标 X', '中心坐标 Y', '中心坐标 Z'
    ]]
    save_to_csv(df_empty, original_output_dir / '05_未安装面板屋顶.csv')
    save_to_markdown(df_empty, original_output_dir / '05_未安装面板屋顶.md', '未安装面板的屋顶 (Original)')
    
    print(f"\n📊 Original 统计: 总屋顶 {len(df_original)}, 已安装 {len(df_installed)}, 未安装 {len(df_empty)}")
    
    # ========== 解析 Final JSON ==========
    print("\n" + "=" * 70)
    print("📂 第二部分: 解析 sample-final.json (最终方案数据)")
    print("=" * 70)
    
    final_data = load_json_data(final_file)
    print(f"✓ 加载项目数据 (项目ID: {final_data.get('projectId', 'N/A')})")
    
    final_dfs = parse_final_json(final_data)
    
    # 保存 final 数据
    final_output_dir = output_dir / 'final'
    final_output_dir.mkdir(exist_ok=True)
    
    save_to_csv(final_dfs['project'], final_output_dir / '01_项目基本信息.csv')
    save_to_markdown(final_dfs['project'], final_output_dir / '01_项目基本信息.md', '项目基本信息 (Final)')
    
    save_to_csv(final_dfs['panels'], final_output_dir / '02_面板详细信息.csv')
    save_to_markdown(final_dfs['panels'], final_output_dir / '02_面板详细信息.md', '面板详细信息 (Final)')
    
    save_to_csv(final_dfs['summary'], final_output_dir / '03_发电量汇总统计.csv')
    save_to_markdown(final_dfs['summary'], final_output_dir / '03_发电量汇总统计.md', '发电量汇总统计 (Final)')
    
    save_to_csv(final_dfs['direction'], final_output_dir / '04_按朝向分类统计.csv')
    save_to_markdown(final_dfs['direction'], final_output_dir / '04_按朝向分类统计.md', '按朝向分类统计 (Final)')
    
    save_to_csv(final_dfs['monthly'], final_output_dir / '05_月度发电量汇总.csv')
    save_to_markdown(final_dfs['monthly'], final_output_dir / '05_月度发电量汇总.md', '月度发电量汇总 (Final)')
    
    if not final_dfs['summary'].empty:
        annual_power = final_dfs['summary']['年度总发电量 (kWh)'].values[0]
        panel_count = final_dfs['summary']['面板总数'].values[0]
        print(f"\n📊 Final 统计: {panel_count} 块面板, 年度总发电量 {annual_power} kWh")
    
    # ========== 总结 ==========
    print("\n" + "=" * 70)
    print("✅ 解析完成!")
    print("=" * 70)
    print(f"📁 Original 输出目录: {original_output_dir}")
    print(f"📁 Final 输出目录: {final_output_dir}")
    print("=" * 70)


if __name__ == '__main__':
    main()
