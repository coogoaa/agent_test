#!/usr/bin/env python3
"""
屋顶光伏发电量计算程序
基于 PVGIS API 计算多坡面屋顶的光伏发电量
"""

import json
import requests
import csv
import os
from datetime import datetime, timezone
from typing import Dict, List, Any
from pathlib import Path
try:
    from timezonefinder import TimezoneFinder
    import pytz
    TIMEZONE_SUPPORT = True
except ImportError:
    TIMEZONE_SUPPORT = False
    print("警告: 时区支持库未安装，将使用UTC时间。请运行: pip install timezonefinder pytz")


class PVGISCalculator:
    """PVGIS API 调用和计算类"""
    
    PVCALC_API = "https://re.jrc.ec.europa.eu/api/PVcalc"
    SERIESCALC_API = "https://re.jrc.ec.europa.eu/api/seriescalc"
    
    def __init__(self, config_path: str = "config.json"):
        """初始化计算器"""
        self.config = self._load_config(config_path)
        self.timezone_info = self._get_timezone_info()
        self._setup_output_directory()
        
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "location": self.config["location"],
            "timezone_info": self.timezone_info,
            "panel_spec": self.config["panel_spec"],
            "surfaces": [],
            "total_annual_energy": 0,
            "hourly_radiation_file": None
        }
    
    def _load_config(self, config_path: str) -> Dict:
        """加载配置文件"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _get_timezone_info(self) -> Dict:
        """根据坐标获取时区信息"""
        lat = self.config["location"]["latitude"]
        lon = self.config["location"]["longitude"]
        
        if not TIMEZONE_SUPPORT:
            return {
                "timezone_name": "UTC",
                "utc_offset": 0,
                "description": "时区库未安装，使用UTC时间"
            }
        
        try:
            tf = TimezoneFinder()
            timezone_name = tf.timezone_at(lat=lat, lng=lon)
            
            if timezone_name:
                tz = pytz.timezone(timezone_name)
                now = datetime.now(tz)
                utc_offset = now.utcoffset().total_seconds() / 3600
                
                return {
                    "timezone_name": timezone_name,
                    "utc_offset": utc_offset,
                    "description": f"当前时区: {timezone_name}, UTC{utc_offset:+.1f}"
                }
            else:
                return {
                    "timezone_name": "UTC",
                    "utc_offset": 0,
                    "description": "无法确定时区，使用UTC时间"
                }
        except Exception as e:
            print(f"警告: 时区检测失败: {e}")
            return {
                "timezone_name": "UTC",
                "utc_offset": 0,
                "description": "时区检测失败，使用UTC时间"
            }
    
    def _setup_output_directory(self):
        """设置输出目录"""
        output_config = self.config.get("output", {})
        self.output_dir = output_config.get("output_directory", "output")
        self.add_timestamp = output_config.get("add_timestamp", True)
        
        # 创建输出目录
        Path(self.output_dir).mkdir(exist_ok=True)
        
        # 生成时间戳
        if self.add_timestamp:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self.timestamp_suffix = f"_{timestamp}"
        else:
            self.timestamp_suffix = ""
    
    def _get_output_path(self, filename: str) -> str:
        """获取带时间戳的输出文件路径"""
        name, ext = os.path.splitext(filename)
        timestamped_name = f"{name}{self.timestamp_suffix}{ext}"
        return os.path.join(self.output_dir, timestamped_name)
    
    def convert_utc_to_local(self, utc_time_str: str) -> str:
        """将UTC时间转换为本地时间"""
        if not TIMEZONE_SUPPORT or self.timezone_info["timezone_name"] == "UTC":
            return utc_time_str
        
        try:
            # 解析UTC时间
            utc_dt = datetime.strptime(utc_time_str, "%Y%m%d:%H%M")
            utc_dt = utc_dt.replace(tzinfo=pytz.UTC)
            
            # 转换为本地时间
            local_tz = pytz.timezone(self.timezone_info["timezone_name"])
            local_dt = utc_dt.astimezone(local_tz)
            
            return local_dt.strftime("%Y%m%d:%H%M")
        except Exception as e:
            print(f"警告: 时间转换失败: {e}")
            return utc_time_str
    
    def normalize_azimuth(self, azimuth: float) -> float:
        """将方位角转换为 PVGIS API 可接受的范围 (-180° 到 +180°)"""
        # 将角度转换为 -180 到 +180 范围
        while azimuth > 180:
            azimuth -= 360
        while azimuth <= -180:
            azimuth += 360
        return azimuth
    
    def get_hourly_radiation(self) -> str:
        """获取小时级辐射数据"""
        print("\n=== 获取小时级辐射数据 ===")
        
        lat = self.config["location"]["latitude"]
        lon = self.config["location"]["longitude"]
        
        print(f"坐标: 纬度 {lat}, 经度 {lon}")
        print(f"时区信息: {self.timezone_info['description']}")
        
        params = {
            "lat": lat,
            "lon": lon,
            "outputformat": "json"
        }
        
        try:
            print(f"正在请求 PVGIS seriescalc API...")
            
            response = requests.get(self.SERIESCALC_API, params=params, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            
            # 保存到 CSV 文件
            output_file = self._get_output_path("hourly_radiation.csv")
            self._save_hourly_radiation_csv(data, output_file)
            
            self.results["hourly_radiation_file"] = output_file
            print(f"✓ 小时辐射数据已保存到: {output_file}")
            
            return output_file
            
        except requests.exceptions.RequestException as e:
            print(f"✗ 获取小时辐射数据失败: {e}")
            return None
    
    def _save_hourly_radiation_csv(self, data: Dict, filename: str):
        """将小时辐射数据保存为 CSV"""
        if "outputs" not in data or "hourly" not in data["outputs"]:
            print("警告: API 返回数据格式不符合预期")
            return
        
        hourly_data = data["outputs"]["hourly"]
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # 写入表头
            if len(hourly_data) > 0:
                headers = list(hourly_data[0].keys())
                # 添加本地时间列
                if TIMEZONE_SUPPORT and self.timezone_info["timezone_name"] != "UTC":
                    headers.insert(1, "local_time")
                writer.writerow(headers)
                
                # 写入数据
                for row in hourly_data:
                    row_values = list(row.values())
                    # 添加本地时间
                    if TIMEZONE_SUPPORT and self.timezone_info["timezone_name"] != "UTC":
                        utc_time = row_values[0]  # 第一列是 time
                        local_time = self.convert_utc_to_local(str(utc_time))
                        row_values.insert(1, local_time)
                    writer.writerow(row_values)
        
        print(f"  共保存 {len(hourly_data)} 条小时数据")
        if TIMEZONE_SUPPORT and self.timezone_info["timezone_name"] != "UTC":
            print(f"  已添加本地时间列 ({self.timezone_info['timezone_name']})")
        else:
            print(f"  使用UTC时间")
    
    def calculate_surface_energy(self, surface: Dict) -> Dict:
        """计算单个坡面的发电量"""
        print(f"\n--- 计算坡面: {surface['name']} ---")
        
        # 计算坡面总功率
        panel_power_w = self.config["panel_spec"]["power_watts"]
        panel_count = surface["panel_count"]
        peak_power_kw = (panel_power_w * panel_count) / 1000
        
        # 方位角自动转换
        original_azimuth = surface["azimuth"]
        normalized_azimuth = self.normalize_azimuth(original_azimuth)
        
        print(f"  面板数量: {panel_count} 块")
        print(f"  单块功率: {panel_power_w} W")
        print(f"  总功率: {peak_power_kw:.2f} kWp")
        if original_azimuth != normalized_azimuth:
            print(f"  方位角: {original_azimuth}° → {normalized_azimuth}° (API转换)")
        else:
            print(f"  方位角: {original_azimuth}°")
        
        # 构造 API 请求参数
        params = {
            "lat": self.config["location"]["latitude"],
            "lon": self.config["location"]["longitude"],
            "peakpower": peak_power_kw,
            "loss": self.config["system_loss"],
            "angle": surface["tilt_angle"],
            "aspect": normalized_azimuth,
            "outputformat": "json"
        }
        
        # 添加衰减率参数（如果 API 支持）
        if self.config["panel_spec"]["annual_degradation"] > 0:
            params["pvtechchoice"] = "crystSi"
            params["pv_degradation"] = self.config["panel_spec"]["annual_degradation"]
        
        try:
            print(f"  正在请求 PVGIS PVcalc API...")
            response = requests.get(self.PVCALC_API, params=params, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # 提取结果
            if "outputs" in data and "totals" in data["outputs"]:
                totals = data["outputs"]["totals"]["fixed"]
                monthly = data["outputs"]["monthly"]["fixed"]
                
                result = {
                    "name": surface["name"],
                    "panel_count": panel_count,
                    "peak_power_kw": peak_power_kw,
                    "tilt_angle": surface["tilt_angle"],
                    "azimuth": surface["azimuth"],
                    "annual_energy_kwh": totals["E_y"],
                    "monthly_energy": monthly,
                    "api_response": data
                }
                
                print(f"  ✓ 年发电量: {totals['E_y']:.2f} kWh")
                print(f"  ✓ 平均日发电量: {totals['E_d']:.2f} kWh/day")
                
                return result
            else:
                print(f"  ✗ API 返回数据格式异常")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"  ✗ API 请求失败: {e}")
            return None
    
    def calculate_all_surfaces(self):
        """计算所有坡面的发电量"""
        print("\n=== 开始计算各坡面发电量 ===")
        
        total_energy = 0
        
        for surface in self.config["roof_surfaces"]:
            result = self.calculate_surface_energy(surface)
            
            if result:
                self.results["surfaces"].append(result)
                total_energy += result["annual_energy_kwh"]
        
        self.results["total_annual_energy"] = total_energy
        
        print(f"\n=== 计算完成 ===")
        print(f"总年发电量: {total_energy:.2f} kWh")
    
    def generate_report(self):
        """生成报告"""
        report_content = self._generate_report_content()
        
        # 输出到控制台
        print(report_content)
        
        # 保存到文件
        report_file = self._get_output_path("report.txt")
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"\n报告已保存到: {report_file}")
        return report_file
    
    def _generate_report_content(self) -> str:
        """生成报告内容"""
        lines = []
        lines.append("="*60)
        lines.append("屋顶光伏发电量计算报告")
        lines.append("="*60)
        
        # 生成时间和计算参数
        lines.append("")
        lines.append("【报告信息】")
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"  计算时间: {self.results['timestamp'][:19].replace('T', ' ')}")
        lines.append(f"  系统损耗: {self.config['system_loss']}%")
        lines.append(f"  API数据源: PVGIS (European Commission JRC)")
        
        # 位置信息
        loc = self.results["location"]
        lines.append("")
        lines.append("【位置信息】")
        lines.append(f"  坐标: 纬度 {loc['latitude']}, 经度 {loc['longitude']}")
        if "description" in loc:
            lines.append(f"  描述: {loc['description']}")
        
        # 时区信息
        if "timezone_info" in self.results:
            tz_info = self.results["timezone_info"]
            lines.append(f"  {tz_info['description']}")
        
        # 光伏面板信息
        panel = self.results["panel_spec"]
        lines.append("")
        lines.append("【光伏面板规格】")
        lines.append(f"  品牌型号: {panel.get('brand', 'N/A')} {panel.get('model', 'N/A')}")
        lines.append(f"  额定功率: {panel['power_watts']} W")
        lines.append(f"  转换效率: {panel.get('efficiency', 'N/A')}%")
        lines.append(f"  年衰减率: {panel['annual_degradation']}%")
        if panel.get('temperature_coefficient_pmax'):
            lines.append(f"  温度系数: {panel['temperature_coefficient_pmax']}%/°C")
        
        # 计算参数汇总
        lines.append("")
        lines.append("【计算参数汇总】")
        total_panels = sum(s['panel_count'] for s in self.results['surfaces'])
        lines.append(f"  屋顶坡面数量: {len(self.results['surfaces'])} 个")
        lines.append(f"  面板总数量: {total_panels} 块")
        lines.append(f"  装机总容量: {sum(s['peak_power_kw'] for s in self.results['surfaces']):.2f} kWp")
        lines.append(f"  系统损耗设置: {self.config['system_loss']}%")
        
        # 各坡面详情
        lines.append("")
        lines.append("【各坡面发电量详情】")
        for i, surface in enumerate(self.results["surfaces"], 1):
            # 查找原始配置中的方位角
            original_surface = self.config['roof_surfaces'][i-1]
            original_azimuth = original_surface['azimuth']
            
            lines.append("")
            lines.append(f"  {i}. {surface['name']}")
            lines.append(f"     面板数量: {surface['panel_count']} 块")
            lines.append(f"     总功率: {surface['peak_power_kw']:.2f} kWp")
            lines.append(f"     倾角: {surface['tilt_angle']}°")
            
            # 显示方位角转换信息
            normalized_azimuth = self.normalize_azimuth(original_azimuth)
            if original_azimuth != normalized_azimuth:
                lines.append(f"     方位角: {original_azimuth}° → {normalized_azimuth}° (API转换)")
            else:
                lines.append(f"     方位角: {original_azimuth}°")
            
            lines.append(f"     方位说明: (0°=南, -90°=东, 90°=西)")
            lines.append(f"     年发电量: {surface['annual_energy_kwh']:.2f} kWh")
            
            # 月度数据
            if "monthly_energy" in surface:
                lines.append("")
                lines.append(f"     月度日均发电量 (kWh/day):")
                for month_data in surface["monthly_energy"]:
                    month = month_data["month"]
                    e_d = month_data["E_d"]
                    lines.append(f"       {month}月: {e_d:.2f}")
        
        # 总计
        lines.append("")
        lines.append("【发电量总计】")
        lines.append(f"  屋顶总年发电量: {self.results['total_annual_energy']:.2f} kWh")
        lines.append(f"  平均日发电量: {self.results['total_annual_energy']/365:.2f} kWh/day")
        lines.append(f"  平均月发电量: {self.results['total_annual_energy']/12:.2f} kWh/month")
        
        # 效率分析
        total_capacity = sum(s['peak_power_kw'] for s in self.results['surfaces'])
        capacity_factor = (self.results['total_annual_energy'] / (total_capacity * 8760)) * 100
        lines.append(f"  容量因子: {capacity_factor:.1f}%")
        lines.append(f"  单位容量发电量: {self.results['total_annual_energy']/total_capacity:.0f} kWh/kWp/year")
        
        if self.results["hourly_radiation_file"]:
            lines.append("")
            lines.append("【数据文件】")
            lines.append(f"  小时辐射数据: {self.results['hourly_radiation_file']}")
            lines.append(f"  计算结果数据: {self._get_output_path('results.json').split('/')[-1]}")
            lines.append(f"  报告文件: {self._get_output_path('report.txt').split('/')[-1]}")
        
        # 免责声明
        lines.append("")
        lines.append("【免责声明】")
        lines.append(f"  本报告基于PVGIS数据库的理论计算，仅供参考。")
        lines.append(f"  实际发电量可能受天气、设备状态、维护等因素影响。")
        lines.append(f"  建议结合实际情况进行综合评估。")
        
        lines.append("")
        lines.append("="*60)
        lines.append(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("="*60)
        
        return "\n".join(lines)
    
    def save_results(self, filename: str = "results.json"):
        """保存结果到 JSON 文件"""
        output_file = self._get_output_path(filename)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        
        print(f"\n结果已保存到: {output_file}")
        return output_file
    
    def run(self):
        """运行完整计算流程"""
        print("="*60)
        print("屋顶光伏发电量计算程序")
        print("="*60)
        
        # 1. 获取小时辐射数据
        if self.config.get("output", {}).get("save_hourly_radiation", True):
            self.get_hourly_radiation()
        
        # 2. 计算各坡面发电量
        self.calculate_all_surfaces()
        
        # 3. 生成报告
        self.generate_report()
        
        # 4. 保存结果
        self.save_results()


def main():
    """主函数"""
    import sys
    
    # 默认使用config.json，但允许命令行参数指定其他配置文件
    config_file = "config.json"
    if len(sys.argv) > 1:
        config_file = sys.argv[1]
    
    print(f"使用配置文件: {config_file}")
    
    try:
        calculator = PVGISCalculator(config_file)
        calculator.run()
    except FileNotFoundError:
        print(f"错误: 配置文件 {config_file} 不存在")
        print("请确保配置文件存在，或使用命令: python pv_calculator.py <config_file>")
    except Exception as e:
        print(f"错误: {e}")


if __name__ == "__main__":
    main()
