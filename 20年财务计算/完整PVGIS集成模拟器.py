#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整PVGIS集成模拟器 - SA州Seaford Rise
基于真实PVGIS光照数据 + Java代码完整逻辑
包含：24小时发电/用电、电池充放电、完整能量流计算
"""

import json
import csv
import requests
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Dict, List, Tuple
import sys

class CompletePVGISSimulator:
    """
    完整的PVGIS集成模拟器
    可选择使用PVGIS API或理论值
    """
    
    def __init__(self, use_pvgis_api=True):
        self.use_pvgis_api = use_pvgis_api
        
        # SA州Seaford Rise配置
        self.location = {
            'address': 'QFVP+9V5, Seaford Rise SA 5169',
            'latitude': -35.1816,  # Seaford Rise坐标
            'longitude': 138.4939,
            'state': 'SA'
        }
        
        # 系统配置
        self.system = {
            'size_kw': Decimal('6.6'),
            'panel_count': 15,
            'panel_power_w': 440,
            'battery_capacity_kwh': Decimal('13.5'),  # 可用容量
            'battery_efficiency': Decimal('0.90'),  # 充放电效率
            'system_loss': 15,  # 系统损耗%
            'panel_degradation': Decimal('0.004'),  # 年衰减率
            'battery_replacement_cost': Decimal('8000'),  # 电池更换成本
            'battery_lifespan_years': 10,  # 电池寿命（年）
            'battery_replacement_times': 1,  # 20年内更换次数（1=只第10年更换，2=第10年和第20年都更换）
        }
        
        # SA州用电数据
        self.usage_data = {
            'annual_kwh': Decimal('4950'),
            'month_percentages': [
                Decimal('0.0855'), Decimal('0.0778'), Decimal('0.0751'), Decimal('0.0714'),
                Decimal('0.0847'), Decimal('0.1055'), Decimal('0.1067'), Decimal('0.0945'),
                Decimal('0.0736'), Decimal('0.0721'), Decimal('0.0730'), Decimal('0.0803')
            ],
            'hour_percentages': [
                Decimal('0.0485'), Decimal('0.05185'), Decimal('0.03814'), Decimal('0.02956'),
                Decimal('0.02568'), Decimal('0.02654'), Decimal('0.03142'), Decimal('0.03655'),
                Decimal('0.03563'), Decimal('0.03624'), Decimal('0.04103'), Decimal('0.04366'),
                Decimal('0.04188'), Decimal('0.03980'), Decimal('0.03997'), Decimal('0.04111'),
                Decimal('0.04525'), Decimal('0.05442'), Decimal('0.05990'), Decimal('0.05715'),
                Decimal('0.05315'), Decimal('0.04739'), Decimal('0.03905'), Decimal('0.03607')
            ]
        }
        
        # 电价配置（SA州）
        self.tariff = {
            'electricity_price_kwh': Decimal('0.35'),
            'feed_in_tariff': Decimal('0.06'),
            'fixed_charge_day': Decimal('0.80'),
            'price_indexation': Decimal('0.025'),
        }
        
        # 财务配置
        self.finance = {
            'upfront_investment': Decimal('18000'),
            'subsidy': Decimal('2500'),
            'final_price': Decimal('15500'),
            'discount_rate': Decimal('0.05'),  # 贴现率（用于NPV计算）
        }
        
        # 计算电池更换月度计提
        self._calculate_battery_provision()
        
        # PVGIS数据缓存
        self.pvgis_data = None
    
    def _calculate_battery_provision(self):
        """
        计算电池更换的月度计提金额
        采用直线法：将电池更换成本平均分摊到电池寿命期内的每个月
        
        计提逻辑：
        - replacement_times = 1: 只在第10年更换，计提分摊到前120个月
        - replacement_times = 2: 第10年和第20年都更换，计提分摊到全部240个月
        """
        battery_cost = self.system['battery_replacement_cost']
        lifespan_years = self.system['battery_lifespan_years']
        replacement_times = self.system['battery_replacement_times']
        
        # 计提期间：根据更换次数决定
        if replacement_times == 1:
            # 只更换1次，计提分摊到第1个寿命周期（前10年）
            provision_months = lifespan_years * 12
            total_provision = battery_cost
        else:
            # 更换多次，计提分摊到整个20年
            provision_months = 240
            total_provision = battery_cost * replacement_times
        
        # 月度计提 = 总计提 / 计提月数
        self.monthly_battery_provision = total_provision / provision_months
        self.provision_months = provision_months
        
        print(f"\n电池更换计提设置:")
        print(f"  - 电池更换成本: ${float(battery_cost):,.2f}")
        print(f"  - 电池寿命: {lifespan_years}年")
        print(f"  - 20年内更换次数: {replacement_times}次")
        if replacement_times == 1:
            print(f"  - 更换时间: 第{lifespan_years}年")
        else:
            print(f"  - 更换时间: 第{lifespan_years}年、第{lifespan_years*2}年")
        print(f"  - 计提期间: {provision_months}个月")
        print(f"  - 月度计提: ${float(self.monthly_battery_provision):.2f}")
        print(f"  - 总计提金额: ${float(total_provision):,.2f}")
        
    def fetch_pvgis_hourly_data(self):
        """
        从PVGIS API获取小时级辐射和发电数据
        """
        print("\n=== 步骤1: 获取PVGIS真实光照数据 ===")
        print(f"地址: {self.location['address']}")
        print(f"坐标: {self.location['latitude']}, {self.location['longitude']}")
        
        if not self.use_pvgis_api:
            print("⚠️  使用理论值模式（未启用PVGIS API）")
            return self._generate_theoretical_data()
        
        try:
            # PVGIS API参数
            params = {
                'lat': self.location['latitude'],
                'lon': self.location['longitude'],
                'peakpower': float(self.system['size_kw']),
                'loss': self.system['system_loss'],
                'angle': 23,  # 倾角
                'aspect': 0,  # 正南
                'outputformat': 'json',
                'pvtechchoice': 'crystSi',
            }
            
            print("\n正在请求PVGIS API...")
            print(f"系统容量: {self.system['size_kw']} kW")
            print(f"系统损耗: {self.system['system_loss']}%")
            
            # 获取小时数据
            url = "https://re.jrc.ec.europa.eu/api/seriescalc"
            response = requests.get(url, params=params, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            
            if 'outputs' in data and 'hourly' in data['outputs']:
                hourly_data = data['outputs']['hourly']
                print(f"✅ 成功获取 {len(hourly_data)} 条小时数据")
                
                # 处理数据
                self.pvgis_data = self._process_pvgis_data(hourly_data)
                return self.pvgis_data
            else:
                print("❌ PVGIS返回数据格式异常，使用理论值")
                return self._generate_theoretical_data()
                
        except Exception as e:
            print(f"❌ PVGIS API请求失败: {e}")
            print("使用理论值模式")
            return self._generate_theoretical_data()
    
    def _process_pvgis_data(self, hourly_data):
        """
        处理PVGIS小时数据，按月份和小时汇总
        """
        print("\n处理PVGIS数据...")
        
        # 初始化12个月×24小时的数据结构
        monthly_hourly_gen = [[Decimal('0') for _ in range(24)] for _ in range(12)]
        monthly_counts = [[0 for _ in range(24)] for _ in range(12)]
        
        for record in hourly_data:
            time_str = str(record['time'])
            # 格式: YYYYMMDD:HHMM
            month = int(time_str[4:6]) - 1  # 0-11
            hour = int(time_str[9:11])  # 0-23
            
            # P是发电功率(W)，转换为kWh（1小时）
            power_kw = Decimal(str(record.get('P', 0))) / 1000
            
            monthly_hourly_gen[month][hour] += power_kw
            monthly_counts[month][hour] += 1
        
        # 计算平均值
        for month in range(12):
            for hour in range(24):
                if monthly_counts[month][hour] > 0:
                    monthly_hourly_gen[month][hour] /= monthly_counts[month][hour]
        
        # 计算月度和年度总发电量
        monthly_totals = []
        for month in range(12):
            days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
            month_total = sum(monthly_hourly_gen[month]) * days
            monthly_totals.append(month_total)
        
        annual_total = sum(monthly_totals)
        
        print(f"✅ 年发电量: {float(annual_total):.2f} kWh")
        print(f"✅ 日均发电: {float(annual_total/365):.2f} kWh")
        
        return {
            'monthly_hourly_generation': monthly_hourly_gen,
            'monthly_totals': monthly_totals,
            'annual_total': annual_total,
            'source': 'PVGIS API'
        }
    
    def _generate_theoretical_data(self):
        """
        生成理论发电数据（当PVGIS不可用时）
        """
        print("\n使用理论值生成发电数据...")
        
        # 假设年发电量 = 系统容量 × 1200小时
        annual_gen = self.system['size_kw'] * 1200
        
        # 简化的小时发电曲线（模拟太阳轨迹）
        hour_pattern = [
            0, 0, 0, 0, 0, 0,  # 0-5: 夜间
            0.02, 0.15, 0.35, 0.55, 0.75, 0.90,  # 6-11: 上午
            1.0, 0.95, 0.85, 0.70, 0.50, 0.25,  # 12-17: 下午
            0.08, 0, 0, 0, 0, 0  # 18-23: 傍晚和夜间
        ]
        
        # 归一化
        total_pattern = sum(hour_pattern)
        hour_pattern = [Decimal(str(h / total_pattern)) for h in hour_pattern]
        
        # 按月分配
        monthly_hourly_gen = []
        monthly_totals = []
        
        for month in range(12):
            month_pct = self.usage_data['month_percentages'][month]
            month_gen = annual_gen * month_pct
            days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
            
            # 日均小时发电
            daily_total = month_gen / days
            hourly_gen = [daily_total * pct for pct in hour_pattern]
            
            monthly_hourly_gen.append(hourly_gen)
            monthly_totals.append(month_gen)
        
        print(f"✅ 理论年发电量: {float(annual_gen):.2f} kWh")
        
        return {
            'monthly_hourly_generation': monthly_hourly_gen,
            'monthly_totals': monthly_totals,
            'annual_total': annual_gen,
            'source': 'Theoretical'
        }
    
    def calculate_monthly_energy_flow(self, year, month, gen_data):
        """
        计算月度能量流 - 基于Java calBaseData()逻辑
        包含24小时详细计算和电池充放电
        """
        days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
        
        # 步骤1: 获取月度发电数据（24小时）
        hourly_gen = gen_data['monthly_hourly_generation'][month - 1]
        
        # 步骤2: 计算月度用电量和24小时分布
        month_usage = self.usage_data['annual_kwh'] * self.usage_data['month_percentages'][month - 1]
        daily_usage = month_usage / days
        hourly_usage = [daily_usage * pct for pct in self.usage_data['hour_percentages']]
        
        # 步骤3: 24小时能量流计算（基于Java代码逻辑）
        # 初始化累计值
        usage_gen_day_power = Decimal('0')  # 发电时即时被消耗的电量
        battery_day_power = Decimal('0')  # 可用于充电的剩余发电量
        gen_day_power = Decimal('0')  # 日发电量
        use_day_power = Decimal('0')  # 日用电量
        
        # 24小时逐时计算
        hourly_details = []
        for hour in range(24):
            gen_power = hourly_gen[hour]
            use_power = hourly_usage[hour]
            
            gen_day_power += gen_power
            use_day_power += use_power
            
            # 发电时即时被消耗的电量 = min(发电, 用电)
            usage_gen_hour = min(gen_power, use_power)
            usage_gen_day_power += usage_gen_hour
            
            # 可充电量 = max(发电 - 用电, 0)
            battery_hour_power = max(gen_power - use_power, Decimal('0'))
            battery_day_power += battery_hour_power
            
            hourly_details.append({
                'hour': hour,
                'generation': float(gen_power),
                'usage': float(use_power),
                'direct_use': float(usage_gen_hour),
                'surplus_for_battery': float(battery_hour_power)
            })
        
        # 步骤4: 月度能量计算
        # 月发电量
        month_gen_power = gen_day_power * days
        
        # 月度发电时即时消耗量
        usage_gen_month_power = usage_gen_day_power * days
        
        # 月度总用电量
        month_total_usage = use_day_power * days
        
        # 非发电时段用电量（需要电池或电网供电）
        use_month_power_no_solar = month_total_usage - usage_gen_month_power
        
        # 步骤5: 电池充放电计算（基于Java代码）
        battery_capacity = self.system['battery_capacity_kwh']
        
        # 最终电池放电量 = min(可充电量, 电池容量×天数, 非发电时段用电量)
        battery_final_month_power = min(
            battery_day_power * days,  # 月度可充电量
            battery_capacity * days,  # 电池月度可放电量（假设每天一次循环）
            use_month_power_no_solar  # 需要被电池覆盖的用电量
        )
        
        # 步骤6: 计算自用率（基于Java代码）
        if month_gen_power > 0:
            month_self_consumption = (usage_gen_month_power + battery_final_month_power) / month_gen_power
        else:
            month_self_consumption = Decimal('0')
        
        # 步骤7: 计算上网和购电
        # 上网电量 = 发电量 × (1 - 自用率)
        export_power = month_gen_power * (Decimal('1') - month_self_consumption)
        
        # 购电量 = max(总用电 - 发电时即时消耗 - 电池放电, 0)
        grid_import = max(month_total_usage - usage_gen_month_power - battery_final_month_power, Decimal('0'))
        
        return {
            'days': days,
            'hourly_details': hourly_details,
            
            # 发电数据
            'generation': {
                'hourly_avg': [float(h) for h in hourly_gen],
                'daily_avg': float(gen_day_power),
                'monthly_total': float(month_gen_power)
            },
            
            # 用电数据
            'usage': {
                'hourly_avg': [float(h) for h in hourly_usage],
                'daily_avg': float(use_day_power),
                'monthly_total': float(month_total_usage)
            },
            
            # 能量流（基于Java calBaseData计算）
            'energy_flow': {
                'direct_use_from_pv': float(usage_gen_month_power),
                'surplus_for_battery': float(battery_day_power * days),
                'battery_discharge': float(battery_final_month_power),
                'non_solar_usage': float(use_month_power_no_solar),
                'export_to_grid': float(export_power),
                'import_from_grid': float(grid_import),
                'self_consumption_rate': float(month_self_consumption)
            },
            
            # 能量守恒验证
            'energy_balance': {
                'generation_total': float(month_gen_power),
                'usage_breakdown': {
                    'direct_from_pv': float(usage_gen_month_power),
                    'from_battery': float(battery_final_month_power),
                    'from_grid': float(grid_import),
                    'total': float(usage_gen_month_power + battery_final_month_power + grid_import)
                },
                'generation_breakdown': {
                    'direct_use': float(usage_gen_month_power),
                    'to_battery': float(battery_final_month_power),
                    'to_grid': float(export_power),
                    'total': float(usage_gen_month_power + battery_final_month_power + export_power)
                }
            }
        }
    def calculate_monthly_financials(self, year, month, energy_flow):
        """
        计算月度财务数据 - 基于Java calculate20YearData逻辑
        """
        days = energy_flow['days']
        
        # 电价膨胀因子
        q = Decimal('1') + self.tariff['price_indexation']
        year_factor = q ** year
        
        # 购电费用
        grid_import = Decimal(str(energy_flow['energy_flow']['import_from_grid']))
        purchase_cost = (
            grid_import * self.tariff['electricity_price_kwh'] * year_factor +
            Decimal(days) * self.tariff['fixed_charge_day']
        )
        
        # 馈网收入
        export_power = Decimal(str(energy_flow['energy_flow']['export_to_grid']))
        feed_in_income = export_power * self.tariff['feed_in_tariff']
        
        # 净电费
        net_cost = purchase_cost - feed_in_income
        
        # 无太阳能情况下的电费
        month_usage = Decimal(str(energy_flow['usage']['monthly_total']))
        cost_without_solar = (
            month_usage * self.tariff['electricity_price_kwh'] * year_factor +
            Decimal(days) * self.tariff['fixed_charge_day']
        )
        
        # 电池更换计提（只在计提期间内生效）
        month_index = (year - 1) * 12 + month  # 当前是第几个月（1-240）
        if month_index <= self.provision_months:
            battery_provision = self.monthly_battery_provision
        else:
            battery_provision = Decimal('0')  # 超过计提期间，不再计提
        
        # 考虑电池计提后的净成本
        net_cost_with_battery = net_cost + battery_provision
        
        # 月度节省（考虑电池计提）
        monthly_saving = cost_without_solar - net_cost_with_battery
        
        # 计算贴现因子（用于NPV）
        # 月度贴现因子 = 1 / (1 + discount_rate)^(year + (month-1)/12)
        discount_factor = Decimal('1') / ((Decimal('1') + self.finance['discount_rate']) ** (year + Decimal(month - 1) / 12))
        discounted_saving = monthly_saving * discount_factor
        
        return {
            'purchase_cost': float(purchase_cost.quantize(Decimal('0.01'), ROUND_HALF_UP)),
            'feed_in_income': float(feed_in_income.quantize(Decimal('0.01'), ROUND_HALF_UP)),
            'net_cost': float(net_cost.quantize(Decimal('0.01'), ROUND_HALF_UP)),
            'battery_provision': float(battery_provision.quantize(Decimal('0.01'), ROUND_HALF_UP)),
            'net_cost_with_battery': float(net_cost_with_battery.quantize(Decimal('0.01'), ROUND_HALF_UP)),
            'cost_without_solar': float(cost_without_solar.quantize(Decimal('0.01'), ROUND_HALF_UP)),
            'monthly_saving': float(monthly_saving.quantize(Decimal('0.01'), ROUND_HALF_UP)),
            'discount_factor': float(discount_factor.quantize(Decimal('0.0001'), ROUND_HALF_UP)),
            'discounted_saving': float(discounted_saving.quantize(Decimal('0.01'), ROUND_HALF_UP))
        }
    
    def run_complete_simulation(self):
        """
        运行完整的240个月模拟
        """
        print("\n" + "="*60)
        print("完整PVGIS集成模拟器 - 20年240个月详细计算")
        print("="*60)
        
        # 步骤1: 获取PVGIS数据
        gen_data = self.fetch_pvgis_hourly_data()
        
        if gen_data is None:
            print("❌ 无法获取发电数据，退出")
            return None
        
        print(f"\n数据来源: {gen_data['source']}")
        print(f"年发电量: {float(gen_data['annual_total']):.2f} kWh")
        
        # 步骤2: 逐月计算240个月
        results = []
        cumulative_saving = Decimal('0')
        cumulative_discounted_saving = Decimal('0')  # 累计贴现后节省
        
        print("\n=== 步骤2: 开始240个月详细计算 ===\n")
        
        for year in range(1, 21):
            print(f"正在计算第{year}年...")
            
            # 考虑发电衰减
            degradation_factor = (Decimal('1') - self.system['panel_degradation']) ** (year - 1)
            
            # 调整发电数据
            year_gen_data = {
                'monthly_hourly_generation': [
                    [h * degradation_factor for h in month_hours]
                    for month_hours in gen_data['monthly_hourly_generation']
                ],
                'monthly_totals': [m * degradation_factor for m in gen_data['monthly_totals']],
                'annual_total': gen_data['annual_total'] * degradation_factor,
                'source': gen_data['source']
            }
            
            for month in range(1, 13):
                # 计算能量流
                energy_flow = self.calculate_monthly_energy_flow(year, month, year_gen_data)
                
                # 计算财务
                financials = self.calculate_monthly_financials(year, month, energy_flow)
                
                # 累计节省（名义值和贴现值）
                cumulative_saving += Decimal(str(financials['monthly_saving']))
                cumulative_discounted_saving += Decimal(str(financials['discounted_saving']))
                
                # 组合结果
                result = {
                    'year': year,
                    'month': month,
                    'generation': energy_flow['generation'],
                    'usage': energy_flow['usage'],
                    'energy_flow': energy_flow['energy_flow'],
                    'energy_balance': energy_flow['energy_balance'],
                    'hourly_details': energy_flow['hourly_details'][:3],  # 只保存前3小时示例
                    'financials': financials,
                    'cumulative_saving': float(cumulative_saving.quantize(Decimal('0.01'), ROUND_HALF_UP)),
                    'cumulative_discounted_saving': float(cumulative_discounted_saving.quantize(Decimal('0.01'), ROUND_HALF_UP)),
                    'payback_progress': float((cumulative_saving / self.finance['final_price'] * 100).quantize(Decimal('0.01'), ROUND_HALF_UP)),
                    'discounted_payback_progress': float((cumulative_discounted_saving / self.finance['final_price'] * 100).quantize(Decimal('0.01'), ROUND_HALF_UP))
                }
                
                results.append(result)
        
        print("\n✅ 240个月计算完成!")
        return results
    
    def export_results(self, results):
        """
        导出结果到JSON和CSV
        """
        if not results:
            print("❌ 无结果可导出")
            return
        
        # 计算NPV（净现值）
        npv = Decimal(str(results[-1]['cumulative_discounted_saving'])) - self.finance['final_price']
        
        # 导出JSON
        output = {
            'metadata': {
                'location': self.location,
                'system': {k: float(v) if isinstance(v, Decimal) else v 
                          for k, v in self.system.items()},
                'tariff': {k: float(v) if isinstance(v, Decimal) else v 
                          for k, v in self.tariff.items()},
                'finance': {k: float(v) if isinstance(v, Decimal) else v 
                           for k, v in self.finance.items()},
                'data_source': results[0]['generation'].get('source', 'Unknown'),
                'generated_at': datetime.now().isoformat(),
                'total_months': len(results)
            },
            'summary': {
                'total_20year_saving_nominal': results[-1]['cumulative_saving'],
                'total_20year_saving_discounted': results[-1]['cumulative_discounted_saving'],
                'npv': float(npv.quantize(Decimal('0.01'), ROUND_HALF_UP)),
                'payback_period_years_nominal': self._calculate_payback_period(results, 'cumulative_saving'),
                'payback_period_years_discounted': self._calculate_payback_period(results, 'cumulative_discounted_saving'),
                'final_payback_progress_nominal': results[-1]['payback_progress'],
                'final_payback_progress_discounted': results[-1]['discounted_payback_progress']
            },
            'monthly_results': results
        }
        
        json_file = '完整PVGIS模拟数据_240个月.json'
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ JSON数据已导出: {json_file}")
        
        # 导出CSV
        csv_file = '完整PVGIS模拟数据_240个月.csv'
        with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                '年份', '月份', '发电(kWh)', '用电(kWh)', 
                '直接自用(kWh)', '电池放电(kWh)', '上网(kWh)', '购电(kWh)',
                '自用率(%)', '购电费($)', '馈网收入($)', '净电费($)',
                '电池计提($)', '净成本含电池($)', '无太阳能电费($)', 
                '月节省($)', '贴现因子', '贴现后节省($)',
                '累计节省($)', '累计贴现后节省($)', '回本进度(%)', '贴现回本进度(%)'
            ])
            
            for r in results:
                writer.writerow([
                    r['year'], r['month'],
                    round(r['generation']['monthly_total'], 2),
                    round(r['usage']['monthly_total'], 2),
                    round(r['energy_flow']['direct_use_from_pv'], 2),
                    round(r['energy_flow']['battery_discharge'], 2),
                    round(r['energy_flow']['export_to_grid'], 2),
                    round(r['energy_flow']['import_from_grid'], 2),
                    round(r['energy_flow']['self_consumption_rate'] * 100, 1),
                    r['financials']['purchase_cost'],
                    r['financials']['feed_in_income'],
                    r['financials']['net_cost'],
                    r['financials']['battery_provision'],
                    r['financials']['net_cost_with_battery'],
                    r['financials']['cost_without_solar'],
                    r['financials']['monthly_saving'],
                    r['financials']['discount_factor'],
                    r['financials']['discounted_saving'],
                    r['cumulative_saving'],
                    r['cumulative_discounted_saving'],
                    r['payback_progress'],
                    r['discounted_payback_progress']
                ])
        
        print(f"✅ CSV数据已导出: {csv_file}")
        
        # 打印总结
        print("\n" + "="*60)
        print("模拟总结")
        print("="*60)
        print(f"数据来源: {output['metadata']['data_source']}")
        print(f"\n配置参数:")
        print(f"  - 电价通胀膨胀率: {output['metadata']['tariff']['price_indexation']*100:.1f}%/年")
        print(f"  - 贴现率: {output['metadata']['finance']['discount_rate']*100:.1f}%/年")
        print(f"  - 日固定费用: ${output['metadata']['tariff']['fixed_charge_day']:.2f}/天")
        print(f"\n电池更换计提:")
        print(f"  - 电池更换成本: ${output['metadata']['system']['battery_replacement_cost']:,.2f}")
        print(f"  - 电池寿命: {output['metadata']['system']['battery_lifespan_years']}年")
        print(f"  - 20年内更换次数: {output['metadata']['system']['battery_replacement_times']}次")
        if output['metadata']['system']['battery_replacement_times'] == 1:
            print(f"  - 更换时间: 第{output['metadata']['system']['battery_lifespan_years']}年")
        else:
            print(f"  - 更换时间: 第{output['metadata']['system']['battery_lifespan_years']}年、第{output['metadata']['system']['battery_lifespan_years']*2}年")
        print(f"  - 计提期间: {self.provision_months}个月")
        print(f"  - 月度计提: ${float(self.monthly_battery_provision):.2f}")
        print(f"  - 总计提金额: ${float(self.monthly_battery_provision * self.provision_months):,.2f}")
        print(f"\n财务结果 (名义值, 含电池计提):")
        print(f"  - 20年总节省: ${output['summary']['total_20year_saving_nominal']:,.2f}")
        print(f"  - 回本周期: {output['summary']['payback_period_years_nominal']:.2f}年")
        print(f"  - 最终回本进度: {output['summary']['final_payback_progress_nominal']:.1f}%")
        print(f"\n财务结果 (贴现值, 含电池计提):")
        print(f"  - 20年总节省(贴现): ${output['summary']['total_20year_saving_discounted']:,.2f}")
        print(f"  - NPV(净现值): ${output['summary']['npv']:,.2f}")
        print(f"  - 贴现回本周期: {output['summary']['payback_period_years_discounted']:.2f}年")
        print(f"  - 贴现回本进度: {output['summary']['final_payback_progress_discounted']:.1f}%")
    
    def _calculate_payback_period(self, results, saving_field='cumulative_saving'):
        """计算回本周期"""
        net_investment = float(self.finance['final_price'])
        for r in results:
            if r[saving_field] >= net_investment:
                return r['year'] + (r['month'] - 1) / 12
        return 20.0  # 未回本

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='完整PVGIS集成模拟器')
    parser.add_argument('--no-pvgis', action='store_true', 
                       help='不使用PVGIS API，使用理论值')
    args = parser.parse_args()
    
    use_api = not args.no_pvgis
    
    simulator = CompletePVGISSimulator(use_pvgis_api=use_api)
    results = simulator.run_complete_simulation()
    
    if results:
        simulator.export_results(results)
        print("\n✨ 模拟完成!")
