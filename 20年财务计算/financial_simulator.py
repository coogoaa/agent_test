#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
20年240个月太阳能系统财务计算模拟器
基于20.md中的Java代码逻辑
"""

import math
from decimal import Decimal, ROUND_HALF_UP
import json
from datetime import datetime

class FinancialSimulator:
    def __init__(self):
        # 系统配置参数（基于代码中的SystemConfig）
        self.config = {
            # 电价相关
            'electricity_price_per_kwh': Decimal('0.30'),  # 购电单价(含税) $/kWh
            'feed_in_tariff': Decimal('0.05'),  # 上网电价(含税) $/kWh
            'fixed_charge_day': Decimal('0.50'),  # 日固定费用(含税) $/day
            
            # 系统参数
            'price_indexation': Decimal('0.025'),  # 电价膨胀率 2.5%
            'effective_interest_rate': Decimal('0.05'),  # 现金利率 5%
            'panel_degradation': Decimal('0.004'),  # 年发电衰减率 0.4%
            
            # 系统成本
            'tax_rate': Decimal('0.10'),  # 税率 10%
            'adjustment_coefficient': Decimal('0.10'),  # 调整系数 ±10%
        }
        
        # 示例项目参数
        self.project = {
            'system_size_kw': Decimal('10.0'),  # 系统容量 10kW
            'battery_capacity_kwh': Decimal('5.0'),  # 电池容量 5kWh
            'panel_count': 25,  # 板子数量
            'annual_usage_kwh': Decimal('8760'),  # 年用电量 8760kWh (1kW*24h*365d)
            'upfront_investment': Decimal('20000'),  # 前期投资 $20,000
            'subsidy': Decimal('3000'),  # 补贴 $3,000
            'final_price': Decimal('17000'),  # 最终价格 $17,000
        }
        
    def calculate_monthly_generation(self, year, month):
        """
        计算某年某月的发电量（考虑衰减）
        """
        # 月度发电量占比（简化：平均分配，实际应根据季节调整）
        month_percentages = [
            Decimal('0.070'), Decimal('0.075'), Decimal('0.085'), Decimal('0.090'),
            Decimal('0.095'), Decimal('0.095'), Decimal('0.095'), Decimal('0.090'),
            Decimal('0.085'), Decimal('0.080'), Decimal('0.075'), Decimal('0.065')
        ]
        
        # 年发电量 = 系统容量 * 假设年满发小时数
        annual_generation_year1 = self.project['system_size_kw'] * Decimal('1200')  # 12000 kWh/年
        
        # 考虑衰减：第year年的年发电量
        degradation_factor = (Decimal('1') - self.config['panel_degradation']) ** (year - 1)
        annual_generation = annual_generation_year1 * degradation_factor
        
        # 月发电量
        month_generation = annual_generation * month_percentages[month - 1]
        
        return month_generation.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def calculate_self_consumption_rate(self):
        """
        计算自用率（基于calBaseData逻辑）
        简化：假设有电池时自用率为70%，无电池时为40%
        """
        has_battery = self.project['battery_capacity_kwh'] > 0
        if has_battery:
            return Decimal('0.70')
        else:
            return Decimal('0.40')
    
    def calculate_monthly_data(self, year, month):
        """
        计算某年某月的详细财务数据
        """
        # 月度发电量
        month_gen_power = self.calculate_monthly_generation(year, month)
        
        # 月用电量（假设恒定）
        month_usage = self.project['annual_usage_kwh'] / 12
        
        # 自用率
        self_consumption_rate = self.calculate_self_consumption_rate()
        
        # 直接自用电量（发电即时消耗）
        direct_use = min(month_gen_power * self_consumption_rate, month_usage)
        
        # 上网电量
        export_power = month_gen_power - direct_use
        
        # 购电量
        grid_import = max(month_usage - direct_use, Decimal('0'))
        
        # 获取当月天数
        days_in_month = self._get_days_in_month(year, month)
        
        # 计算费用（考虑膨胀率）
        q = Decimal('1') + self.config['price_indexation']  # 膨胀因子
        year_factor = q ** year
        
        # 购电费用
        purchase_cost = (
            grid_import * self.config['electricity_price_per_kwh'] * year_factor +
            Decimal(days_in_month) * self.config['fixed_charge_day']
        )
        
        # 馈网收入
        feed_in_income = export_power * self.config['feed_in_tariff']
        
        # 安装前电费（如果没有太阳能系统）
        cost_without_solar = (
            month_usage * self.config['electricity_price_per_kwh'] * year_factor +
            Decimal(days_in_month) * self.config['fixed_charge_day']
        )
        
        # 净电费
        net_cost = purchase_cost - feed_in_income
        
        # 月节省
        monthly_saving = cost_without_solar - net_cost
        
        return {
            'year': year,
            'month': month,
            'days': days_in_month,
            'generation_kwh': float(month_gen_power),
            'usage_kwh': float(month_usage),
            'direct_use_kwh': float(direct_use),
            'export_kwh': float(export_power),
            'grid_import_kwh': float(grid_import),
            'self_consumption_rate': float(self_consumption_rate),
            'purchase_cost': float(purchase_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
            'feed_in_income': float(feed_in_income.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
            'net_cost': float(net_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
            'cost_without_solar': float(cost_without_solar.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
            'monthly_saving': float(monthly_saving.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
        }
    
    def _get_days_in_month(self, year, month):
        """获取某月的天数"""
        if month in [1, 3, 5, 7, 8, 10, 12]:
            return 31
        elif month in [4, 6, 9, 11]:
            return 30
        else:  # 2月
            if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):
                return 29
            return 28
    
    def simulate_20_years(self):
        """
        模拟完整的20年240个月数据
        """
        results = []
        cumulative_saving = Decimal('0')
        cumulative_cost_with_solar = Decimal('0')
        cumulative_cost_without_solar = Decimal('0')
        
        for year in range(1, 21):
            for month in range(1, 13):
                data = self.calculate_monthly_data(year, month)
                
                # 累计数据
                cumulative_saving += Decimal(str(data['monthly_saving']))
                cumulative_cost_with_solar += Decimal(str(data['net_cost']))
                cumulative_cost_without_solar += Decimal(str(data['cost_without_solar']))
                
                # 添加累计字段
                data['cumulative_saving'] = float(cumulative_saving.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
                data['cumulative_cost_with_solar'] = float(cumulative_cost_with_solar.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
                data['cumulative_cost_without_solar'] = float(cumulative_cost_without_solar.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
                
                # 回本进度（累计节省 vs 净投资）
                net_investment = self.project['final_price']
                payback_progress = (cumulative_saving / net_investment * 100) if net_investment > 0 else 0
                data['payback_progress_percent'] = float(Decimal(str(payback_progress)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
                
                results.append(data)
        
        return results
    
    def calculate_summary(self, monthly_data):
        """
        计算总结性指标
        """
        total_generation = sum(d['generation_kwh'] for d in monthly_data)
        total_export = sum(d['export_kwh'] for d in monthly_data)
        total_grid_import = sum(d['grid_import_kwh'] for d in monthly_data)
        total_saving = sum(d['monthly_saving'] for d in monthly_data)
        
        # 计算回本期（简化计算）
        net_investment = float(self.project['final_price'])
        annual_avg_saving = total_saving / 20
        payback_period = net_investment / annual_avg_saving if annual_avg_saving > 0 else 100
        
        # 计算IRR（简化）
        cash_flows = [-float(self.project['final_price'])]
        for year in range(1, 21):
            year_data = [d for d in monthly_data if d['year'] == year]
            year_saving = sum(d['monthly_saving'] for d in year_data)
            cash_flows.append(year_saving)
        
        irr = self._calculate_irr(cash_flows)
        
        summary = {
            'project_info': {
                'system_size_kw': float(self.project['system_size_kw']),
                'battery_capacity_kwh': float(self.project['battery_capacity_kwh']),
                'panel_count': self.project['panel_count'],
                'upfront_investment': float(self.project['upfront_investment']),
                'subsidy': float(self.project['subsidy']),
                'final_price': float(self.project['final_price']),
            },
            'performance_20years': {
                'total_generation_kwh': round(total_generation, 2),
                'total_export_kwh': round(total_export, 2),
                'total_grid_import_kwh': round(total_grid_import, 2),
                'total_saving': round(total_saving, 2),
                'average_annual_saving': round(annual_avg_saving, 2),
                'payback_period_years': round(payback_period, 2),
                'irr_percent': round(irr * 100, 2) if irr else None,
            }
        }
        
        return summary
    
    def _calculate_irr(self, cash_flows, guess=0.1):
        """
        简化的IRR计算（牛顿迭代法）
        """
        try:
            x = guess
            for _ in range(100):
                npv = sum(cf / ((1 + x) ** i) for i, cf in enumerate(cash_flows))
                npv_derivative = sum(-i * cf / ((1 + x) ** (i + 1)) for i, cf in enumerate(cash_flows))
                
                if abs(npv_derivative) < 1e-10:
                    break
                
                x_new = x - npv / npv_derivative
                
                if abs(x_new - x) < 1e-6:
                    return x_new
                
                x = x_new
            
            return x
        except:
            return None
    
    def export_to_json(self, filename='financial_simulation_240months.json'):
        """
        导出完整数据到JSON文件
        """
        monthly_data = self.simulate_20_years()
        summary = self.calculate_summary(monthly_data)
        
        output = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'description': '20年240个月太阳能系统财务模拟数据',
                'total_months': len(monthly_data),
            },
            'summary': summary,
            'monthly_data': monthly_data,
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 数据已导出到: {filename}")
        print(f"📊 总月数: {len(monthly_data)}")
        print(f"💰 20年总节省: ${summary['performance_20years']['total_saving']:,.2f}")
        print(f"⏱️  预计回本期: {summary['performance_20years']['payback_period_years']:.2f} 年")
        if summary['performance_20years']['irr_percent']:
            print(f"📈 IRR: {summary['performance_20years']['irr_percent']:.2f}%")
        
        return output

if __name__ == '__main__':
    print("🚀 开始生成20年240个月财务模拟数据...\n")
    
    simulator = FinancialSimulator()
    result = simulator.export_to_json()
    
    print("\n✨ 模拟完成!")
