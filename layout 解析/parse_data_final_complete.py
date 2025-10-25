#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整解析 data 目录下的 final.json 文件
提取所有信息，包括嵌套的 layout JSON 字符串中的详细数据
输出到 output/data_[项目ID]_[地址简称]/complete/ 目录
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


def parse_complete_project_info(data: Dict[str, Any]) -> pd.DataFrame:
    """解析完整的项目信息"""
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
        '行布局': project_data.get('rowLayout', 'N/A'),
        '类型': project_data.get('type', ''),
        '最高温度': project_data.get('maxTemperature', 'N/A'),
        '最低温度': project_data.get('minTemperature', 'N/A'),
        '安装商代码': project_data.get('installerCode', ''),
        '地图链接': project_data.get('mapLink', ''),
        '设计方案数量': len(project_data.get('designs', []))
    }
    
    return pd.DataFrame([info])


def parse_design_complete_info(data: Dict[str, Any]) -> pd.DataFrame:
    """解析每个设计方案的完整信息（不包括 layout 详情）"""
    designs = data.get('data', {}).get('designs', [])
    
    rows = []
    for design in designs:
        # 解析 layout JSON 字符串获取基本信息
        layout_str = design.get('layout', '{}')
        layout = json.loads(layout_str)
        
        row = {
            '设计ID': design.get('id', ''),
            '项目ID': design.get('projectId', ''),
            '设计类型': design.get('designType', ''),
            '设计名称': design.get('designName', ''),
            '系统大小 (kW)': design.get('systemSize', 0),
            '安装面板数量': layout.get('installPanelCount', 0),
            'GIS时间ID': layout.get('gisTimeId', ''),
            'GIS日期': layout.get('gisDate', ''),
            '屋顶数量': len(layout.get('panelLocationInfos', [])),
            '前期投资 (最小)': design.get('upfrontInvestmentMin', 0),
            '前期投资': design.get('upfrontInvestment', 0),
            '前期投资 (最大)': design.get('upfrontInvestmentMax', 0),
            '补贴金额': design.get('subsidy', 0),
            '实际投资': design.get('upfrontInvestment', 0) - design.get('subsidy', 0),
            '年度账单节省 (最小)': round(design.get('annualBillSavingsMin', 0), 2),
            '年度账单节省': round(design.get('annualBillSavings', 0), 2),
            '年度账单节省 (最大)': round(design.get('annualBillSavingsMax', 0), 2),
            '内部收益率 (IRR)': design.get('irr', 0),
            'IRR (%)': round(design.get('irr', 0) * 100, 2),
            '回本期 (最小/月)': design.get('paybackPeriodMin', 0),
            '回本期 (月)': design.get('paybackPeriod', 0),
            '回本期 (最大/月)': design.get('paybackPeriodMax', 0),
            '回本期 (年)': round(design.get('paybackPeriod', 0) / 12, 1),
            '电池容量 (kWh)': design.get('batteryCapacity', 0),
            '自用率 (最小)': design.get('selfConsumptionMin', 0),
            '自用率': design.get('selfConsumption', 0),
            '自用率 (最大)': design.get('selfConsumptionMax', 0),
            '自用率 (%)': round(design.get('selfConsumption', 0) * 100, 1),
            '卡片链接': design.get('cardLink', 'N/A'),
            '渲染链接': design.get('renderingLink', 'N/A')
        }
        rows.append(row)
    
    return pd.DataFrame(rows)


def parse_design_layout_panels(data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
    """解析每个设计方案中 layout 的面板详细信息"""
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
            monthly_daily_power = gen_power.get('monthlyDailyPowerList', [])
            cal_status = gen_power.get('calStatus', False)
            
            row = {
                '设计方案': design_name,
                '屋顶编号': f'屋顶 {idx}',
                '面板数量': panel_count,
                '朝向角度 (degrees)': round(aspect, 2),
                '朝向描述': degrees_to_direction(aspect),
                '坡度 (radians)': round(slope, 4),
                '坡度 (degrees)': round(math.degrees(slope), 2),
                '计算状态': '成功' if cal_status else '失败',
                '年度总发电量 (kWh)': round(annual_power, 2)
            }
            
            # 添加月度发电量
            for month_idx, power in enumerate(monthly_power, 1):
                row[f'{month_idx}月发电量 (kWh)'] = round(power, 2)
            
            # 添加月度日均发电量
            for month_idx, power in enumerate(monthly_daily_power, 1):
                row[f'{month_idx}月日均 (kWh)'] = round(power, 4)
            
            rows.append(row)
        
        result[design_name] = pd.DataFrame(rows)
    
    return result


def parse_design_layout_hourly(data: Dict[str, Any]) -> Dict[str, Dict[str, pd.DataFrame]]:
    """解析每个设计方案中每个屋顶的小时发电量数据"""
    designs = data.get('data', {}).get('designs', [])
    
    result = {}
    
    for design in designs:
        design_name = design.get('designName', 'unknown')
        layout_str = design.get('layout', '{}')
        layout = json.loads(layout_str)
        
        panel_infos = layout.get('panelLocationInfos', [])
        design_result = {}
        
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
            
            design_result[f'屋顶{idx}'] = pd.DataFrame(rows)
        
        result[design_name] = design_result
    
    return result


def parse_design_monthly_summary(data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
    """为每个设计方案生成月度发电量汇总表"""
    designs = data.get('data', {}).get('designs', [])
    
    result = {}
    
    for design in designs:
        design_name = design.get('designName', 'unknown')
        layout_str = design.get('layout', '{}')
        layout = json.loads(layout_str)
        
        panel_infos = layout.get('panelLocationInfos', [])
        
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
        
        result[design_name] = pd.DataFrame(rows)
    
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


def get_address_short_name(address: str) -> str:
    """从地址中提取简短名称"""
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
        output_dir = base_dir / 'output' / f'data_{project_id}_{address_short}' / 'complete'
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"✓ 项目ID: {project_id}")
        print(f"✓ 地址: {address}")
        print(f"✓ 设计方案数: {designs_count}")
        print(f"✓ 输出目录: {output_dir.relative_to(base_dir)}")
        
        # 1. 完整项目信息
        print("\n📋 生成完整项目信息...")
        df_project = parse_complete_project_info(data)
        save_to_csv(df_project, output_dir / '01_完整项目信息.csv')
        save_to_markdown(df_project, output_dir / '01_完整项目信息.md', '完整项目信息')
        
        # 2. 设计方案完整信息
        print("\n📋 生成设计方案完整信息...")
        df_designs = parse_design_complete_info(data)
        save_to_csv(df_designs, output_dir / '02_设计方案完整信息.csv')
        save_to_markdown(df_designs, output_dir / '02_设计方案完整信息.md', '设计方案完整信息')
        
        # 3. 每个设计方案的面板详细信息（含月度发电量）
        print("\n📋 生成各方案面板完整信息...")
        design_panels = parse_design_layout_panels(data)
        
        for design_name, df_panels in design_panels.items():
            filename = f'03_{design_name}_面板完整信息'
            save_to_csv(df_panels, output_dir / f'{filename}.csv')
            save_to_markdown(df_panels, output_dir / f'{filename}.md', f'{design_name} - 面板完整信息')
        
        # 4. 每个设计方案的月度发电量汇总
        print("\n📋 生成各方案月度发电量汇总...")
        monthly_summaries = parse_design_monthly_summary(data)
        
        for design_name, df_monthly in monthly_summaries.items():
            filename = f'04_{design_name}_月度发电量汇总'
            save_to_csv(df_monthly, output_dir / f'{filename}.csv')
            save_to_markdown(df_monthly, output_dir / f'{filename}.md', f'{design_name} - 月度发电量汇总')
        
        # 5. 每个设计方案的小时发电量数据
        print("\n📋 生成各方案小时发电量数据...")
        hourly_data = parse_design_layout_hourly(data)
        
        for design_name, roofs in hourly_data.items():
            for roof_name, df_hourly in roofs.items():
                filename = f'05_{design_name}_{roof_name}_小时发电量'
                save_to_csv(df_hourly, output_dir / f'{filename}.csv')
                save_to_markdown(df_hourly, output_dir / f'{filename}.md', 
                               f'{design_name} - {roof_name} - 小时发电量')
        
        # 打印统计信息
        print("\n" + "=" * 70)
        print("📈 统计摘要")
        print("=" * 70)
        print(f"项目ID: {project_id}")
        print(f"项目地址: {address}")
        print(f"设计方案数量: {designs_count}")
        
        if not df_designs.empty:
            print(f"\n设计方案详情:")
            for _, row in df_designs.iterrows():
                print(f"  • {row['设计名称']}: {row['系统大小 (kW)']} kW, "
                      f"{row['安装面板数量']} 块面板 ({row['屋顶数量']} 个屋顶), "
                      f"电池 {row['电池容量 (kWh)']} kWh, "
                      f"投资 ${row['前期投资']:.0f}, "
                      f"回本期 {row['回本期 (年)']} 年")
        
        print(f"\n✅ 所有表格已生成完成!")
        print(f"📁 输出目录: {output_dir}")
        print("=" * 70)


if __name__ == '__main__':
    main()
