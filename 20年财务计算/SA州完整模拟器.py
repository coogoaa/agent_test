#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SA州Seaford Rise 20年240个月详细财务模拟器
基于Java代码逻辑 + 真实澳洲数据
"""
import json, csv
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Dict, List

class SADetailedSimulator:
    def __init__(self):
        # SA州基础数据
        self.state = 'SA'
        self.annual_usage_kwh = Decimal('4950')  # SA州年均用电量
        
        # 月度用电比例 (SA州)
        self.month_percentages = [
            Decimal('0.0855'), Decimal('0.0778'), Decimal('0.0751'), Decimal('0.0714'),
            Decimal('0.0847'), Decimal('0.1055'), Decimal('0.1067'), Decimal('0.0945'),
            Decimal('0.0736'), Decimal('0.0721'), Decimal('0.0730'), Decimal('0.0803')
        ]
        
        # 小时用电比例 (SA州，24小时)
        self.hour_percentages = [
            Decimal('0.0485'), Decimal('0.05185'), Decimal('0.03814'), Decimal('0.02956'),
            Decimal('0.02568'), Decimal('0.02654'), Decimal('0.03142'), Decimal('0.03655'),
            Decimal('0.03563'), Decimal('0.03624'), Decimal('0.04103'), Decimal('0.04366'),
            Decimal('0.04188'), Decimal('0.03980'), Decimal('0.03997'), Decimal('0.04111'),
            Decimal('0.04525'), Decimal('0.05442'), Decimal('0.05990'), Decimal('0.05715'),
            Decimal('0.05315'), Decimal('0.04739'), Decimal('0.03905'), Decimal('0.03607')
        ]
        
        # 系统配置
        self.config = {
            'system_size_kw': Decimal('6.6'),
            'battery_capacity_kwh': Decimal('13.5'),
            'panel_count': 15,
            'panel_power_w': 440,
            'upfront_investment': Decimal('18000'),
            'subsidy': Decimal('2500'),
            'final_price': Decimal('15500'),
            
            # 电价配置 (SA州)
            'electricity_price_kwh': Decimal('0.35'),
            'feed_in_tariff': Decimal('0.06'),
            'fixed_charge_day': Decimal('0.80'),
            
            # 系统参数
            'price_indexation': Decimal('0.025'),
            'panel_degradation': Decimal('0.004'),
            'interest_rate': Decimal('0.05'),
        }
        
    def calculate_monthly_usage(self, year: int, month: int) -> Decimal:
        """计算月度用电量 - 详细步骤"""
        monthly_usage = self.annual_usage_kwh * self.month_percentages[month - 1]
        return monthly_usage.quantize(Decimal('0.01'))
    
    def calculate_hourly_usage(self, month_usage: Decimal, days: int) -> List[Decimal]:
        """计算24小时用电量分布 - 详细步骤"""
        daily_usage = month_usage / days
        hourly_usage = [daily_usage * pct for pct in self.hour_percentages]
        return hourly_usage
    
    def get_days_in_month(self, year: int, month: int) -> int:
        """获取月份天数"""
        if month in [1,3,5,7,8,10,12]: return 31
        elif month in [4,6,9,11]: return 30
        else: return 29 if (year%4==0 and year%100!=0) or year%400==0 else 28
    
    def simulate_month_detailed(self, year: int, month: int) -> Dict:
        """模拟单月详细计算过程"""
        days = self.get_days_in_month(year, month)
        
        # 步骤1: 计算月度用电量
        month_usage = self.calculate_monthly_usage(year, month)
        
        # 步骤2: 计算小时用电分布
        hourly_usage = self.calculate_hourly_usage(month_usage, days)
        
        # 步骤3: 模拟发电量 (简化：使用理论值)
        annual_gen = self.config['system_size_kw'] * Decimal('1200')
        degradation = (Decimal('1') - self.config['panel_degradation']) ** (year - 1)
        month_gen = annual_gen * self.month_percentages[month-1] * degradation
        
        # 步骤4: 计算自用率和能量流
        has_battery = self.config['battery_capacity_kwh'] > 0
        self_consumption_rate = Decimal('0.75') if has_battery else Decimal('0.45')
        
        direct_use = min(month_gen * self_consumption_rate, month_usage)
        export_power = month_gen - direct_use
        grid_import = max(month_usage - direct_use, Decimal('0'))
        
        # 步骤5: 计算费用
        q = Decimal('1') + self.config['price_indexation']
        year_factor = q ** year
        
        purchase_cost = (
            grid_import * self.config['electricity_price_kwh'] * year_factor +
            Decimal(days) * self.config['fixed_charge_day']
        )
        
        feed_in_income = export_power * self.config['feed_in_tariff']
        
        cost_without_solar = (
            month_usage * self.config['electricity_price_kwh'] * year_factor +
            Decimal(days) * self.config['fixed_charge_day']
        )
        
        net_cost = purchase_cost - feed_in_income
        monthly_saving = cost_without_solar - net_cost
        
        return {
            'year': year,
            'month': month,
            'days': days,
            'calculation_steps': {
                'step1_usage': float(month_usage),
                'step2_hourly_dist': [float(h) for h in hourly_usage[:3]],
                'step3_generation': float(month_gen),
                'step4_energy_flow': {
                    'direct_use': float(direct_use),
                    'export': float(export_power),
                    'grid_import': float(grid_import),
                    'self_consumption_rate': float(self_consumption_rate)
                },
                'step5_financials': {
                    'purchase_cost': float(purchase_cost.quantize(Decimal('0.01'))),
                    'feed_in_income': float(feed_in_income.quantize(Decimal('0.01'))),
                    'net_cost': float(net_cost.quantize(Decimal('0.01'))),
                    'cost_without_solar': float(cost_without_solar.quantize(Decimal('0.01'))),
                    'monthly_saving': float(monthly_saving.quantize(Decimal('0.01')))
                }
            }
        }
    
    def run_full_simulation(self):
        """运行完整的240个月模拟"""
        print("\\n🚀 开始SA州Seaford Rise 20年240个月详细模拟...\\n")
        
        results = []
        cumulative_saving = Decimal('0')
        
        for year in range(1, 21):
            print(f"正在计算第{year}年...")
            for month in range(1, 13):
                data = self.simulate_month_detailed(year, month)
                
                cumulative_saving += Decimal(str(data['calculation_steps']['step5_financials']['monthly_saving']))
                data['cumulative_saving'] = float(cumulative_saving.quantize(Decimal('0.01')))
                
                payback_progress = (cumulative_saving / self.config['final_price'] * 100)
                data['payback_progress_percent'] = float(payback_progress.quantize(Decimal('0.01')))
                
                results.append(data)
        
        return results
    
    def export_results(self, results: List[Dict]):
        """导出结果"""
        # 导出JSON
        output = {
            'metadata': {
                'state': self.state,
                'location': 'Seaford Rise SA 5169',
                'generated_at': datetime.now().isoformat(),
                'total_months': len(results)
            },
            'config': {k: float(v) if isinstance(v, Decimal) else v 
                      for k, v in self.config.items()},
            'results': results
        }
        
        filename = 'SA州详细模拟数据_240个月.json'
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        
        print(f"\\n✅ 数据已导出: {filename}")
        print(f"📊 总月数: {len(results)}")
        
        final_saving = results[-1]['cumulative_saving']
        print(f"💰 20年总节省: ${final_saving:,.2f}")
        
        net_investment = float(self.config['final_price'])
        annual_avg = final_saving / 20
        payback = net_investment / annual_avg if annual_avg > 0 else 100
        print(f"⏱️  预计回本期: {payback:.2f}年")

if __name__ == '__main__':
    simulator = SADetailedSimulator()
    results = simulator.run_full_simulation()
    simulator.export_results(results)
    print("\\n✨ 模拟完成!")
