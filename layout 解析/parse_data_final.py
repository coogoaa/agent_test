#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解析 data 目录下的 final.json 文件
输出到 output/data_[地址简称]/ 目录
"""

import json
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
import math
import re


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


def parse_project_info(data: Dict[str, Any]) -> pd.DataFrame:
    """解析项目基本信息"""
    project_data = data.get('data', {})
    
    info = {
        '项目ID': project_data.get('id', ''),
        '项目代码': project_data.get('projectCode', ''),
        '地址': project_data.get('address', ''),
        '国家代码': project_data.get('countryCode', ''),
        '州/省': project_data.get('state', ''),
        '城市': project_data.get('city', ''),
        '邮编': project_data.get('siteZip', ''),
        '经度': project_data.get('longitude', 0),
        '纬度': project_data.get('latitude', 0),
        '屋顶面积': project_data.get('roofArea', 'N/A'),
        '类型': project_data.get('type', ''),
        '安装商代码': project_data.get('installerCode', ''),
        '地图链接': project_data.get('mapLink', ''),
        '设计方案数量': len(project_data.get('designs', []))
    }
    
    return pd.DataFrame([info])


def parse_design_summary(data: Dict[str, Any]) -> pd.DataFrame:
    """解析所有设计方案的汇总信息"""
    designs = data.get('data', {}).get('designs', [])
    
    rows = []
    for design in designs:
        # 解析 layout JSON 字符串
        layout_str = design.get('layout', '{}')
        layout = json.loads(layout_str)
        
        row = {
            '设计ID': design.get('id', ''),
            '设计类型': design.get('designType', ''),
            '设计名称': design.get('designName', ''),
            '系统大小 (kW)': design.get('systemSize', 0),
            '安装面板数量': layout.get('installPanelCount', 0),
            '前期投资 (最小)': design.get('upfrontInvestmentMin', 0),
            '前期投资': design.get('upfrontInvestment', 0),
            '前期投资 (最大)': design.get('upfrontInvestmentMax', 0),
            '补贴金额': design.get('subsidy', 0),
            '年度账单节省 (最小)': round(design.get('annualBillSavingsMin', 0), 2),
            '年度账单节省': round(design.get('annualBillSavings', 0), 2),
            '年度账单节省 (最大)': round(design.get('annualBillSavingsMax', 0), 2),
            '内部收益率 (IRR)': design.get('irr', 0),
            '回本期 (最小/月)': design.get('paybackPeriodMin', 0),
            '回本期 (月)': design.get('paybackPeriod', 0),
            '回本期 (最大/月)': design.get('paybackPeriodMax', 0),
            '电池容量 (kWh)': design.get('batteryCapacity', 0),
            '自用率 (最小)': design.get('selfConsumptionMin', 0),
            '自用率': design.get('selfConsumption', 0),
            '自用率 (最大)': design.get('selfConsumptionMax', 0)
        }
        rows.append(row)
    
    return pd.DataFrame(rows)


def parse_design_panels(data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
    """解析每个设计方案的面板详细信息"""
    designs = data.get('data', {}).get('designs', [])
    
    result = {}
    
    for design in designs:
        design_name = design.get('designName', 'unknown')
        layout_str = design.get('layout', '{}')
        layout = json.loads(layout_str)
        
        panel_infos = layout.get('panelLocationInfos', [])
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
        
        result[design_name] = pd.DataFrame(rows)
    
    return result


def parse_design_comparison(data: Dict[str, Any]) -> pd.DataFrame:
    """生成设计方案对比表"""
    designs = data.get('data', {}).get('designs', [])
    
    rows = []
    for design in designs:
        layout_str = design.get('layout', '{}')
        layout = json.loads(layout_str)
        
        # 计算总发电量
        total_annual_power = 0
        panel_infos = layout.get('panelLocationInfos', [])
        for panel in panel_infos:
            gen_power = panel.get('generationPowerVO', {})
            total_annual_power += gen_power.get('annualGeneratePower', 0)
        
        # 计算投资回报
        upfront = design.get('upfrontInvestment', 0)
        annual_savings = design.get('annualBillSavings', 0)
        payback_years = round(design.get('paybackPeriod', 0) / 12, 1)
        
        row = {
            '方案名称': design.get('designName', ''),
            '系统大小 (kW)': design.get('systemSize', 0),
            '面板数量': layout.get('installPanelCount', 0),
            '电池容量 (kWh)': design.get('batteryCapacity', 0),
            '前期投资 ($)': upfront,
            '补贴 ($)': design.get('subsidy', 0),
            '实际投资 ($)': upfront - design.get('subsidy', 0),
            '年度发电量 (kWh)': round(total_annual_power, 2),
            '年度节省 ($)': round(annual_savings, 2),
            '回本期 (年)': payback_years,
            'IRR (%)': round(design.get('irr', 0) * 100, 2),
            '自用率 (%)': round(design.get('selfConsumption', 0) * 100, 1)
        }
        rows.append(row)
    
    return pd.DataFrame(rows)


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


def get_address_short_name(address: str) -> str:
    """从地址中提取简短名称"""
    # 提取街道名称和城市
    # 例如: "19 Barrob St, Old Beach TAS 7017, Australia" -> "19_Barrob_St_Old_Beach"
    parts = address.split(',')
    if len(parts) >= 2:
        street = parts[0].strip().replace(' ', '_')
        city = parts[1].strip().replace(' ', '_')
        return f"{street}_{city}"
    return address.replace(' ', '_').replace(',', '_')[:50]


def main():
    """主函数"""
    base_dir = Path(__file__).parent
    data_dir = base_dir / 'data'
    
    # 查找所有包含 final.json 的目录
    final_files = list(data_dir.glob('**/final.json'))
    
    if not final_files:
        print("❌ 未找到任何 final.json 文件")
        return
    
    print("=" * 70)
    print(f"找到 {len(final_files)} 个 final.json 文件")
    print("=" * 70)
    
    for final_file in final_files:
        print(f"\n📁 处理文件: {final_file.relative_to(base_dir)}")
        
        # 加载数据
        data = load_json_data(final_file)
        project_data = data.get('data', {})
        project_id = project_data.get('id', 'N/A')
        address = project_data.get('address', 'unknown')
        designs_count = len(project_data.get('designs', []))
        
        # 生成输出目录名
        address_short = get_address_short_name(address)
        output_dir = base_dir / 'output' / f'data_{project_id}_{address_short}'
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"✓ 项目ID: {project_id}")
        print(f"✓ 地址: {address}")
        print(f"✓ 设计方案数: {designs_count}")
        print(f"✓ 输出目录: {output_dir.relative_to(base_dir)}")
        
        # 1. 项目基本信息
        print("\n📋 生成项目基本信息...")
        df_project = parse_project_info(data)
        save_to_csv(df_project, output_dir / '01_项目基本信息.csv')
        save_to_markdown(df_project, output_dir / '01_项目基本信息.md', '项目基本信息')
        
        # 2. 设计方案汇总
        print("\n📋 生成设计方案汇总...")
        df_designs = parse_design_summary(data)
        save_to_csv(df_designs, output_dir / '02_设计方案汇总.csv')
        save_to_markdown(df_designs, output_dir / '02_设计方案汇总.md', '设计方案汇总')
        
        # 3. 设计方案对比
        print("\n📋 生成设计方案对比...")
        df_comparison = parse_design_comparison(data)
        save_to_csv(df_comparison, output_dir / '03_设计方案对比.csv')
        save_to_markdown(df_comparison, output_dir / '03_设计方案对比.md', '设计方案对比')
        
        # 4. 每个设计方案的面板详情
        print("\n📋 生成各方案面板详情...")
        design_panels = parse_design_panels(data)
        
        for design_name, df_panels in design_panels.items():
            filename = f'04_{design_name}_面板详情'
            save_to_csv(df_panels, output_dir / f'{filename}.csv')
            save_to_markdown(df_panels, output_dir / f'{filename}.md', f'{design_name} - 面板详情')
        
        # 打印统计信息
        print("\n" + "=" * 70)
        print("📈 统计摘要")
        print("=" * 70)
        print(f"项目ID: {project_id}")
        print(f"项目地址: {address}")
        print(f"设计方案数量: {designs_count}")
        
        if not df_comparison.empty:
            print(f"\n方案对比:")
            for _, row in df_comparison.iterrows():
                print(f"  • {row['方案名称']}: {row['系统大小 (kW)']} kW, "
                      f"{row['面板数量']} 块面板, "
                      f"年发电 {row['年度发电量 (kWh)']} kWh, "
                      f"回本期 {row['回本期 (年)']} 年")
        
        print(f"\n✅ 表格已生成完成!")
        print(f"📁 输出目录: {output_dir}")
        print("=" * 70)


if __name__ == '__main__':
    main()
