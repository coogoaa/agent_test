#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
屋顶面板信息提取脚本

功能：
- 支持解析载荷数据（直接包含 panelLocationInfos）
- 支持解析预览数据（包含 designs 数组，每个方案的 layout 是 JSON 字符串）
- 提取每个坡面的方位角、坡度、面板数量

使用方法：
    python roof_panel_extractor.py <输入文件路径>
    
输入文件可以是 .json 或 .md 文件（内容为 JSON 格式）
"""

import json
import os
import sys
from typing import Dict, List, Optional


def load_json_from_file(file_path: str) -> Dict:
    """从文件加载 JSON 数据"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
        return json.loads(content)


def extract_panel_info_from_locations(panel_infos: List[Dict]) -> List[Dict]:
    """
    从 panelLocationInfos 提取面板信息
    
    Args:
        panel_infos: panelLocationInfos 数组
        
    Returns:
        包含每个坡面信息的列表
    """
    results = []
    for idx, info in enumerate(panel_infos):
        positions = info.get('positions', [])
        # positions 除以 3 就是面板数量（每个面板有 x, y, z 三个坐标）
        panel_count = len(positions) // 3
        
        results.append({
            '坡面索引': idx,
            '方位角(aspect)': info.get('aspect'),
            '坡度(slope)': info.get('slope'),
            '面板数量': panel_count
        })
    
    return results


def detect_data_type(data: Dict) -> str:
    """
    检测数据类型
    
    Returns:
        'load' - 载荷数据
        'preview' - 预览数据
        'unknown' - 未知类型
    """
    # 预览数据特征：有 data.designs 结构
    if 'data' in data and isinstance(data.get('data'), dict):
        if 'designs' in data['data']:
            return 'preview'
    
    # 载荷数据特征：直接有 panelLocationInfos
    if 'panelLocationInfos' in data:
        return 'load'
    
    return 'unknown'


def parse_load_data(data: Dict) -> Dict:
    """
    解析载荷数据
    
    Args:
        data: 载荷数据 JSON
        
    Returns:
        解析结果
    """
    panel_infos = data.get('panelLocationInfos', [])
    panels = extract_panel_info_from_locations(panel_infos)
    
    total_panels = sum(p['面板数量'] for p in panels)
    
    return {
        '数据类型': '载荷数据（全部铺满）',
        'projectId': data.get('projectId'),
        '总面板数': total_panels,
        '坡面详情': panels
    }


def parse_preview_data(data: Dict) -> Dict:
    """
    解析预览数据
    
    Args:
        data: 预览数据 JSON
        
    Returns:
        解析结果
    """
    inner_data = data.get('data', {})
    designs = inner_data.get('designs', [])
    
    result = {
        '数据类型': '预览数据（实际铺设）',
        'projectId': inner_data.get('id'),
        '地址': inner_data.get('address'),
        '州': inner_data.get('state'),
        '方案数量': len(designs),
        '方案详情': []
    }
    
    for design in designs:
        design_info = {
            '方案ID': design.get('id'),
            '方案类型': design.get('designType'),
            '方案名称': design.get('designName'),
            '系统容量(kW)': design.get('systemSize'),
            '电池容量(kWh)': design.get('batteryCapacity'),
        }
        
        # 解析 layout JSON 字符串
        layout_str = design.get('layout', '{}')
        try:
            layout = json.loads(layout_str)
            panel_infos = layout.get('panelLocationInfos', [])
            panels = extract_panel_info_from_locations(panel_infos)
            
            design_info['总面板数'] = layout.get('installPanelCount', sum(p['面板数量'] for p in panels))
            design_info['坡面详情'] = panels
        except json.JSONDecodeError:
            design_info['解析错误'] = 'layout JSON 解析失败'
            design_info['坡面详情'] = []
        
        result['方案详情'].append(design_info)
    
    return result


def parse_data(data: Dict) -> Dict:
    """
    自动检测并解析数据
    
    Args:
        data: 输入的 JSON 数据
        
    Returns:
        解析结果
    """
    data_type = detect_data_type(data)
    
    if data_type == 'load':
        return parse_load_data(data)
    elif data_type == 'preview':
        return parse_preview_data(data)
    else:
        return {'错误': '无法识别的数据类型'}


def _fmt_number(value, precision=2):
    if isinstance(value, (int, float)):
        return f"{value:.{precision}f}"
    return "N/A"


def format_output(result: Dict) -> str:
    """格式化输出结果"""
    lines = []
    lines.append("=" * 60)
    lines.append(f"数据类型: {result.get('数据类型', '未知')}")
    lines.append(f"项目ID: {result.get('projectId', 'N/A')}")
    
    if '地址' in result:
        lines.append(f"地址: {result['地址']}")
        lines.append(f"州: {result['州']}")
    
    lines.append("=" * 60)
    
    if '坡面详情' in result:
        # 载荷数据
        lines.append(f"\n总面板数: {result.get('总面板数', 0)}")
        lines.append("\n坡面信息:")
        lines.append("-" * 50)
        for panel in result['坡面详情']:
            if panel['面板数量'] > 0:
                lines.append(
                    f"  坡面 {panel['坡面索引']}: "
                    f"方位角={_fmt_number(panel['方位角(aspect)'])}°, "
                    f"坡度={_fmt_number(panel['坡度(slope)'], 4)}, "
                    f"面板数={panel['面板数量']}"
                )
    
    elif '方案详情' in result:
        # 预览数据
        lines.append(f"\n方案数量: {result['方案数量']}")
        
        for design in result['方案详情']:
            lines.append("\n" + "=" * 50)
            lines.append(f"方案: {design['方案名称']} (类型: {design['方案类型']})")
            lines.append(f"系统容量: {design.get('系统容量(kW)', 'N/A')} kW")
            lines.append(f"电池容量: {design.get('电池容量(kWh)', 'N/A')} kWh")
            lines.append(f"总面板数: {design.get('总面板数', 0)}")
            lines.append("-" * 50)
            lines.append("坡面信息:")
            
            for panel in design.get('坡面详情', []):
                if panel['面板数量'] > 0:
                    lines.append(
                        f"  坡面 {panel['坡面索引']}: "
                        f"方位角={_fmt_number(panel['方位角(aspect)'])}°, "
                        f"坡度={_fmt_number(panel['坡度(slope)'], 4)}, "
                        f"面板数={panel['面板数量']}"
                    )
    
    return '\n'.join(lines)


def main():
    if len(sys.argv) < 2:
        print("使用方法: python roof_panel_extractor.py <输入文件或目录> [输出目录]")
        print("\n示例:")
        print("  python roof_panel_extractor.py 载荷.md")
        print("  python roof_panel_extractor.py 预览.md 输出.txt")
        print("  python roof_panel_extractor.py ./屋顶数据/输入 ./out/屋顶信息")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    if not os.path.exists(input_path):
        print(f"错误: 输入路径不存在 - {input_path}")
        sys.exit(1)

    def ensure_output_dir(path: str) -> str:
        os.makedirs(path, exist_ok=True)
        return path

    def write_output(content: str, target: str):
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, 'w', encoding='utf-8') as f:
            f.write(content)

    def process_file(file_path: str, out_dir: Optional[str], out_file: Optional[str] = None):
        try:
            data = load_json_from_file(file_path)
            result = parse_data(data)
            formatted = format_output(result)
            json_section = "\n" + "=" * 60 + "\nJSON 格式输出:\n" + json.dumps(result, ensure_ascii=False, indent=2)
            combined = formatted + json_section

            print(f"\n>>> 处理文件: {file_path}")
            print(combined)

            if out_file:
                write_output(combined, out_file)
                print(f"已输出到: {out_file}")
            elif out_dir:
                ensure_output_dir(out_dir)
                base = os.path.splitext(os.path.basename(file_path))[0]
                target_path = os.path.join(out_dir, f"{base}_解析.txt")
                write_output(combined, target_path)
                print(f"已输出到: {target_path}")
        except json.JSONDecodeError as e:
            print(f"错误: JSON 解析失败 - {file_path}: {e}")
        except Exception as e:
            print(f"错误: 处理 {file_path} 时发生异常 - {e}")

    if os.path.isfile(input_path):
        out_dir = None
        out_file = None
        if output_path:
            if os.path.isdir(output_path) or output_path.endswith(os.sep):
                out_dir = ensure_output_dir(output_path)
            else:
                out_file = output_path
        process_file(input_path, out_dir, out_file)
    else:
        # 目录模式：遍历所有 .md/.json 文件
        files = [
            os.path.join(input_path, name)
            for name in sorted(os.listdir(input_path))
            if os.path.isfile(os.path.join(input_path, name)) and os.path.splitext(name)[1].lower() in {'.md', '.json'}
        ]

        if not files:
            print(f"警告: 在目录 {input_path} 中未找到 .md 或 .json 文件")
            return

        if output_path:
            out_dir = ensure_output_dir(output_path)
        else:
            # 默认输出到同级目录 ../out/屋顶信息
            base_dir = os.path.dirname(os.path.dirname(input_path))
            out_dir = ensure_output_dir(os.path.join(base_dir, 'out', '屋顶信息'))

        for file_path in files:
            process_file(file_path, out_dir)


if __name__ == '__main__':
    main()
