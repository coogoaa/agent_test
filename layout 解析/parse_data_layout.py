#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析 data 目录下的 layout.json 文件
这是纯粹的 layout 数据，只包含面板位置和发电量信息
输出到对应项目的输出目录
"""

import json
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
import math


def load_json_data(filepath: str) -> Any:
    """加载 JSON 数据"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


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


def parse_layout_info(data: Dict[str, Any]) -> pd.DataFrame:
    """解析 layout 基本信息"""
    info = {
        '项目ID': data.get('projectId', ''),
        'GIS时间ID': data.get('gisTimeId', ''),
        'GIS日期': data.get('gisDate', ''),
        '安装面板总数': data.get('installPanelCount', 0),
        '屋顶数量': len(data.get('panelLocationInfos', []))
    }
    
    return pd.DataFrame([info])


def parse_panels_detail(data: Dict[str, Any]) -> pd.DataFrame:
    """解析面板详细信息"""
    panel_infos = data.get('panelLocationInfos', [])
    rows = []
    
    for idx, panel in enumerate(panel_infos, 1):
        positions = panel.get('positions', [])
        aspect = panel.get('aspect', 0)
        slope = panel.get('slope', 0)
        
        # 计算面板数量（每3个元素一个坐标点）
        panel_count = len(positions) // 3 if positions else 0
        
        # 解析发电量信息
        gen_power = panel.get('generationPowerVO', {})
        annual_power = gen_power.get('annualGeneratePower', 0)
        monthly_power = gen_power.get('monthlyPowerList', [])
        
        row = {
            '屋顶编号': f'屋顶 {idx}',
            '面板数量': panel_count,
            '朝向角度 (degrees)': round(aspect, 2),
            '朝向描述': degrees_to_direction(aspect),
            '坡度 (radians)': round(slope, 4),
            '坡度 (degrees)': round(math.degrees(slope), 2),
            '年度总发电量 (kWh)': round(annual_power, 2)
        }
        
        # 添加月度发电量
        for month_idx, power in enumerate(monthly_power, 1):
            row[f'{month_idx}月发电量 (kWh)'] = round(power, 2)
        
        rows.append(row)
    
    return pd.DataFrame(rows)


def parse_monthly_summary(data: Dict[str, Any]) -> pd.DataFrame:
    """生成月度发电量汇总表"""
    panel_infos = data.get('panelLocationInfos', [])
    
    # 初始化月度总计
    monthly_totals = [0] * 12
    
    rows = []
    for idx, panel in enumerate(panel_infos, 1):
        gen_power = panel.get('generationPowerVO', {})
        monthly_power = gen_power.get('monthlyPowerList', [])
        
        row = {'屋顶编号': f'屋顶 {idx}'}
        for month_idx, power in enumerate(monthly_power, 1):
            row[f'{month_idx}月'] = round(power, 2)
            if month_idx <= len(monthly_totals):
                monthly_totals[month_idx - 1] += power
        
        # 添加年度总计
        row['年度总计'] = round(sum(monthly_power), 2)
        rows.append(row)
    
    # 添加总计行
    total_row = {'屋顶编号': '总计'}
    for month_idx in range(1, 13):
        total_row[f'{month_idx}月'] = round(monthly_totals[month_idx - 1], 2)
    total_row['年度总计'] = round(sum(monthly_totals), 2)
    rows.append(total_row)
    
    return pd.DataFrame(rows)


def parse_hourly_summary(data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
    """解析每个屋顶的小时发电量数据（12个月 x 24小时）"""
    panel_infos = data.get('panelLocationInfos', [])
    
    result = {}
    
    for idx, panel in enumerate(panel_infos, 1):
        gen_power = panel.get('generationPowerVO', {})
        hourly_data = gen_power.get('monthlyHourlyPowerList', [])
        
        if not hourly_data:
            continue
        
        rows = []
        month_names = ['1月', '2月', '3月', '4月', '5月', '6月', 
                      '7月', '8月', '9月', '10月', '11月', '12月']
        
        for month_idx, hours in enumerate(hourly_data):
            row = {'月份': month_names[month_idx]}
            for hour_idx, power in enumerate(hours):
                row[f'{hour_idx}时'] = round(power, 6)
            rows.append(row)
        
        result[f'屋顶{idx}'] = pd.DataFrame(rows)
    
    return result


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


def get_address_short_name(parent_dir: Path) -> str:
    """从父目录名称中提取地址简称"""
    dir_name = parent_dir.name
    # 例如: "Address: 19 Barrob St, Old Beach TAS 7017, Australia 147.2752573,-42.7520648"
    if dir_name.startswith('Address:'):
        address_part = dir_name.replace('Address:', '').strip()
        parts = address_part.split(',')
        if len(parts) >= 2:
            street = parts[0].strip().replace(' ', '_')
            city = parts[1].strip().replace(' ', '_')
            return f"{street}_{city}"
    return dir_name.replace(' ', '_').replace(',', '_')[:50]


def main():
    """主函数"""
    base_dir = Path(__file__).parent
    data_dir = base_dir / 'data'
    
    # 查找所有包含 layout.json 的目录
    layout_files = list(data_dir.glob('**/layout.json'))
    
    if not layout_files:
        print("❌ 未找到任何 layout.json 文件")
        return
    
    print("=" * 70)
    print(f"找到 {len(layout_files)} 个 layout.json 文件")
    print("=" * 70)
    
    for layout_file in layout_files:
        print(f"\n📁 处理文件: {layout_file.relative_to(base_dir)}")
        
        # 加载数据
        data = load_json_data(layout_file)
        project_id = data.get('projectId', 'N/A')
        gis_date = data.get('gisDate', 'unknown')
        panel_count = data.get('installPanelCount', 0)
        roof_count = len(data.get('panelLocationInfos', []))
        
        # 生成输出目录名
        parent_dir = layout_file.parent
        address_short = get_address_short_name(parent_dir)
        output_dir = base_dir / 'output' / f'data_{project_id}_{address_short}' / 'layout_detail'
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"✓ 项目ID: {project_id}")
        print(f"✓ GIS日期: {gis_date}")
        print(f"✓ 面板总数: {panel_count}")
        print(f"✓ 屋顶数量: {roof_count}")
        print(f"✓ 输出目录: {output_dir.relative_to(base_dir)}")
        
        # 1. Layout 基本信息
        print("\n📋 生成 Layout 基本信息...")
        df_layout = parse_layout_info(data)
        save_to_csv(df_layout, output_dir / '01_Layout基本信息.csv')
        save_to_markdown(df_layout, output_dir / '01_Layout基本信息.md', 'Layout 基本信息')
        
        # 2. 面板详细信息
        print("\n📋 生成面板详细信息...")
        df_panels = parse_panels_detail(data)
        save_to_csv(df_panels, output_dir / '02_面板详细信息.csv')
        save_to_markdown(df_panels, output_dir / '02_面板详细信息.md', '面板详细信息')
        
        # 3. 月度发电量汇总
        print("\n📋 生成月度发电量汇总...")
        df_monthly = parse_monthly_summary(data)
        save_to_csv(df_monthly, output_dir / '03_月度发电量汇总.csv')
        save_to_markdown(df_monthly, output_dir / '03_月度发电量汇总.md', '月度发电量汇总')
        
        # 4. 小时发电量数据
        print("\n📋 生成小时发电量数据...")
        hourly_data = parse_hourly_summary(data)
        
        for roof_name, df_hourly in hourly_data.items():
            filename = f'04_{roof_name}_小时发电量'
            save_to_csv(df_hourly, output_dir / f'{filename}.csv')
            save_to_markdown(df_hourly, output_dir / f'{filename}.md', f'{roof_name} - 小时发电量 (12月 x 24小时)')
        
        # 打印统计信息
        print("\n" + "=" * 70)
        print("📈 统计摘要")
        print("=" * 70)
        print(f"项目ID: {project_id}")
        print(f"GIS日期: {gis_date}")
        print(f"面板总数: {panel_count}")
        print(f"屋顶数量: {roof_count}")
        
        if not df_panels.empty:
            print(f"\n屋顶详情:")
            for _, row in df_panels.iterrows():
                print(f"  • {row['屋顶编号']}: {row['面板数量']} 块面板, "
                      f"{row['朝向描述']}, "
                      f"年发电 {row['年度总发电量 (kWh)']} kWh")
        
        if not df_monthly.empty:
            total_row = df_monthly[df_monthly['屋顶编号'] == '总计']
            if not total_row.empty:
                annual_total = total_row['年度总计'].values[0]
                print(f"\n年度总发电量: {annual_total} kWh")
        
        print(f"\n✅ 表格已生成完成!")
        print(f"📁 输出目录: {output_dir}")
        print("=" * 70)


if __name__ == '__main__':
    main()
