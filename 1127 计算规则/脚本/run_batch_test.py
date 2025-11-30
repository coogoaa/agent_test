#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量测试脚本 - 从JSON文件加载测试数据
"""

import json
import sys
from datetime import datetime
from solar_calculator import SolarCalculator, format_output
import os


def load_test_data(json_path: str = "test_data.json") -> list:
    """从JSON文件加载测试数据"""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('test_cases', [])
    except FileNotFoundError:
        print(f"❌ 错误: 找不到文件 {json_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ 错误: JSON格式错误 - {e}")
        sys.exit(1)


def run_batch_tests(test_data_path: str = "test_data.json", 
                   config_path: str = "config.json"):
    """运行批量测试"""
    
    # 创建输出目录
    output_dir = "../out"
    os.makedirs(output_dir, exist_ok=True)
    
    # 加载测试数据
    print("📂 加载测试数据...")
    test_cases = load_test_data(test_data_path)
    print(f"✅ 加载了 {len(test_cases)} 个测试案例")
    
    # 初始化计算器
    print("🔧 初始化计算器...")
    calculator = SolarCalculator(config_path)
    print("✅ 计算器初始化完成")
    
    # 生成时间戳
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 处理每个测试案例
    all_results = []
    print("\n" + "=" * 80)
    print("开始批量计算")
    print("=" * 80)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n[{i}/{len(test_cases)}] 处理: {test_case['name']}")
        print(f"    描述: {test_case.get('description', 'N/A')}")
        print(f"    州: {test_case['state']}, 电网: {test_case['phase_type']}")
        
        try:
            # 执行计算
            results = calculator.generate_proposals(
                test_case['house_data'],
                test_case['state'],
                test_case['phase_type']
            )
            
            # 格式化输出
            output_text = format_output(results)
            
            # 保存文本结果
            output_file = os.path.join(output_dir, f"result_{i}_{timestamp}.txt")
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"{test_case['name']}\n")
                f.write(f"描述: {test_case.get('description', 'N/A')}\n\n")
                f.write(output_text)
            
            # 保存JSON结果
            json_file = os.path.join(output_dir, f"result_{i}_{timestamp}.json")
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'test_case': test_case,
                    'results': results
                }, f, ensure_ascii=False, indent=2)
            
            print(f"    ✅ 文本结果: {output_file}")
            print(f"    ✅ JSON结果: {json_file}")
            
            # 显示简要结果
            for key in ['A', 'B', 'C']:
                prop = results['proposals'][key]
                print(f"    {prop['name']}: {prop['pvKw']}kW + "
                     f"{prop['inverterKw']}kW + {prop['battery']['standard']}kWh "
                     f"= ${prop['finalPrice']:,.2f}")
            
            all_results.append({
                'test_case': test_case,
                'results': results
            })
            
        except Exception as e:
            print(f"    ❌ 错误: {str(e)}")
            import traceback
            traceback.print_exc()
            continue
    
    # 生成汇总报告
    print("\n" + "=" * 80)
    print("生成汇总报告")
    print("=" * 80)
    
    summary_file = os.path.join(output_dir, f"summary_{timestamp}.txt")
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("批量计算汇总报告\n")
        f.write("=" * 80 + "\n")
        f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"测试案例数: {len(test_cases)}\n")
        f.write(f"成功计算: {len(all_results)}\n")
        f.write(f"失败: {len(test_cases) - len(all_results)}\n\n")
        
        for i, result in enumerate(all_results, 1):
            tc = result['test_case']
            f.write(f"\n{'=' * 80}\n")
            f.write(f"案例 {i}: {tc['name']}\n")
            f.write(f"{'=' * 80}\n")
            f.write(f"描述: {tc.get('description', 'N/A')}\n")
            f.write(f"州: {tc['state']}, 电网: {tc['phase_type']}\n")
            f.write(f"屋顶容量: {result['results']['roofAnalysis']['totalMaxKw']}kW\n\n")
            
            for key in ['A', 'B', 'C']:
                prop = result['results']['proposals'][key]
                f.write(f"{prop['name']}:\n")
                f.write(f"  光伏: {prop['pvKw']}kW ({prop['panels']}片)\n")
                f.write(f"  逆变器: {prop['inverterKw']}kW (容配比{prop['ratio']}%)\n")
                f.write(f"  储能: {prop['battery']['standard']}kWh\n")
                f.write(f"  成本: ${prop['cost']['taxTotal']:,.2f} (含税)\n")
                f.write(f"  补贴: ${prop['subsidy']['subsidyAmount']:,.2f}\n")
                f.write(f"  最终报价: ${prop['finalPrice']:,.2f}\n\n")
    
    print(f"✅ 汇总报告: {summary_file}")
    
    # 生成对比表格
    comparison_file = os.path.join(output_dir, f"comparison_{timestamp}.csv")
    with open(comparison_file, 'w', encoding='utf-8') as f:
        # CSV表头
        f.write("案例名称,州,电网,屋顶容量(kW),")
        f.write("方案A-PV(kW),方案A-逆变器(kW),方案A-储能(kWh),方案A-报价($),")
        f.write("方案B-PV(kW),方案B-逆变器(kW),方案B-储能(kWh),方案B-报价($),")
        f.write("方案C-PV(kW),方案C-逆变器(kW),方案C-储能(kWh),方案C-报价($)\n")
        
        # 数据行
        for result in all_results:
            tc = result['test_case']
            res = result['results']
            
            row = [
                tc['name'],
                tc['state'],
                tc['phase_type'],
                str(res['roofAnalysis']['totalMaxKw'])
            ]
            
            for key in ['A', 'B', 'C']:
                prop = res['proposals'][key]
                row.extend([
                    str(prop['pvKw']),
                    str(prop['inverterKw']),
                    str(prop['battery']['standard']),
                    str(prop['finalPrice'])
                ])
            
            f.write(','.join(row) + '\n')
    
    print(f"✅ 对比表格: {comparison_file}")
    
    print("\n" + "=" * 80)
    print("🎉 批量计算完成!")
    print("=" * 80)
    print(f"输出目录: {os.path.abspath(output_dir)}")
    print(f"总计处理: {len(test_cases)} 个案例")
    print(f"成功: {len(all_results)} 个")
    print(f"失败: {len(test_cases) - len(all_results)} 个")


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='批量运行光伏系统计算测试')
    parser.add_argument('-t', '--test-data', default='test_data.json',
                       help='测试数据JSON文件路径 (默认: test_data.json)')
    parser.add_argument('-c', '--config', default='config.json',
                       help='配置文件路径 (默认: config.json)')
    
    args = parser.parse_args()
    
    run_batch_tests(args.test_data, args.config)


if __name__ == "__main__":
    main()
