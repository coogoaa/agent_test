#!/usr/bin/env python3
"""
屋顶光伏发电量计算程序 - 2023年数据版本
基于 PVGIS API 计算多坡面屋顶的光伏发电量
默认只获取2023年的小时辐射数据，并使用本地时间
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
    print("提示: 未安装时区库，将使用UTC时间。如需本地时间转换，请运行: pip install timezonefinder pytz")


class PVGISCalculator2023:
    """PVGIS API 调用和计算类 - 2023年版本"""
    
    PVCALC_API = "https://re.jrc.ec.europa.eu/api/PVcalc"
    SERIESCALC_API = "https://re.jrc.ec.europa.eu/api/seriescalc"
    
    def __init__(self, config_path: str = "config_australia.json"):
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
            config = json.load(f)
        
        # 设置默认倾斜角为23度
        for surface in config.get("roof_surfaces", []):
            if "tilt_angle" not in surface or surface["tilt_angle"] is None:
                surface["tilt_angle"] = 23
        
        # 设置默认时区转换选项（默认开启）
        if "output" not in config:
            config["output"] = {}
        if "convert_to_local_time" not in config["output"]:
            config["output"]["convert_to_local_time"] = True
        
        return config
    
    def _get_timezone_info(self) -> Dict:
        """根据坐标获取时区信息"""
        lat = self.config["location"]["latitude"]
        lon = self.config["location"]["longitude"]
        
        # 检查是否启用时区转换
        convert_enabled = self.config.get("output", {}).get("convert_to_local_time", True)
        
        if not convert_enabled:
            return {
                "timezone_name": "UTC",
                "utc_offset": 0,
                "description": "时区转换已禁用，使用UTC时间",
                "conversion_enabled": False
            }
        
        if not TIMEZONE_SUPPORT:
            return {
                "timezone_name": "UTC",
                "utc_offset": 0,
                "description": "时区库未安装，使用UTC时间",
                "conversion_enabled": False
            }
        
        try:
            tf = TimezoneFinder()
            timezone_name = tf.timezone_at(lat=lat, lng=lon)
            
            if timezone_name:
                tz = pytz.timezone(timezone_name)
                # 使用2023年1月1日来获取该地区的时区偏移（包含夏令时）
                sample_date = datetime(2023, 1, 1, 12, 0, 0)
                localized_date = tz.localize(sample_date)
                utc_offset = localized_date.utcoffset().total_seconds() / 3600
                
                return {
                    "timezone_name": timezone_name,
                    "utc_offset": utc_offset,
                    "description": f"时区: {timezone_name}, UTC{utc_offset:+.1f}",
                    "conversion_enabled": True,
                    "note": "时间已自动转换为本地时间（含夏令时调整）"
                }
            else:
                return {
                    "timezone_name": "UTC",
                    "utc_offset": 0,
                    "description": "无法确定时区，使用UTC时间",
                    "conversion_enabled": False
                }
        except Exception as e:
            print(f"警告: 时区检测失败: {e}")
            return {
                "timezone_name": "UTC",
                "utc_offset": 0,
                "description": "时区检测失败，使用UTC时间",
                "conversion_enabled": False
            }
    
    def _setup_output_directory(self):
        """设置输出目录 - 根据经纬度创建子目录"""
        lat = self.config["location"]["latitude"]
        lon = self.config["location"]["longitude"]
        
        # 创建基于经纬度的目录名
        lat_str = f"{abs(lat):.4f}{'N' if lat >= 0 else 'S'}"
        lon_str = f"{abs(lon):.4f}{'E' if lon >= 0 else 'W'}"
        location_dir = f"lat_{lat_str}_lon_{lon_str}"
        
        # 基础输出目录
        base_output_dir = self.config.get("output", {}).get("output_directory", "output")
        
        # 完整输出路径
        self.output_dir = os.path.join(base_output_dir, location_dir)
        
        # 创建目录
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)
        
        print(f"输出目录: {self.output_dir}")
        
        # 时间戳设置
        self.add_timestamp = self.config.get("output", {}).get("add_timestamp", True)
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
    
    def normalize_azimuth(self, azimuth: float) -> float:
        """将方位角转换为 PVGIS API 可接受的范围 (-180° 到 +180°)"""
        while azimuth > 180:
            azimuth -= 360
        while azimuth <= -180:
            azimuth += 360
        return azimuth
    
    def get_hourly_radiation_2023(self) -> str:
        """获取2023年的小时级辐射数据"""
        print("\n=== 获取2023年小时级辐射数据 ===")
        
        lat = self.config["location"]["latitude"]
        lon = self.config["location"]["longitude"]
        
        print(f"坐标: 纬度 {lat}, 经度 {lon}")
        print(f"年份: 2023")
        print(f"时区转换: {self.timezone_info['description']}")
        
        params = {
            "lat": lat,
            "lon": lon,
            "startyear": 2023,          # 只获取2023年
            "endyear": 2023,            # 只获取2023年
            "pvcalculation": 0,         # 不计算PV，只要辐射数据
            "outputformat": "json"
        }
        
        # 注意: seriescalc API 不支持 localtime 参数，我们在后处理中转换时间
        
        try:
            print(f"正在请求 PVGIS seriescalc API...")
            print(f"API URL: {self.SERIESCALC_API}")
            print(f"参数: {params}")
            
            response = requests.get(self.SERIESCALC_API, params=params, timeout=120)
            response.raise_for_status()
            
            data = response.json()
            
            # 在 JSON 中添加我们使用的参数信息
            data["request_params"] = params
            data["timezone_conversion"] = self.timezone_info
            
            # 保存到 CSV 文件
            output_file = self._get_output_path("hourly_radiation_2023.csv")
            self._save_hourly_radiation_csv(data, output_file)
            
            # 同时保存原始 JSON（包含请求参数）
            json_file = self._get_output_path("hourly_radiation_2023.json")
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"✓ JSON数据已保存到: {json_file}")
            
            self.results["hourly_radiation_file"] = output_file
            self.results["hourly_radiation_json"] = json_file
            
            return output_file
            
        except requests.exceptions.RequestException as e:
            print(f"✗ 获取小时辐射数据失败: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"响应内容: {e.response.text[:500]}")
            return None
    
    def _convert_utc_to_local(self, utc_time_str: str) -> str:
        """将UTC时间转换为本地时间"""
        if not self.timezone_info["conversion_enabled"]:
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
    
    def _save_hourly_radiation_csv(self, data: Dict, filename: str):
        """将小时辐射数据保存为 CSV"""
        if "outputs" not in data or "hourly" not in data["outputs"]:
            print("警告: API 返回数据格式不符合预期")
            print(f"返回的数据键: {data.keys()}")
            return
        
        hourly_data = data["outputs"]["hourly"]
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # 写入表头
            if len(hourly_data) > 0:
                headers = list(hourly_data[0].keys())
                
                # 如果启用了时区转换，添加本地时间列
                if self.timezone_info["conversion_enabled"]:
                    # 在 time 列后面插入 local_time 列
                    time_index = headers.index('time') if 'time' in headers else 0
                    headers.insert(time_index + 1, 'local_time')
                
                writer.writerow(headers)
                
                # 写入数据
                for row in hourly_data:
                    row_values = list(row.values())
                    
                    # 如果启用了时区转换，添加本地时间
                    if self.timezone_info["conversion_enabled"]:
                        utc_time = row['time']
                        local_time = self._convert_utc_to_local(utc_time)
                        time_index = list(row.keys()).index('time')
                        row_values.insert(time_index + 1, local_time)
                    
                    writer.writerow(row_values)
        
        print(f"✓ 小时辐射数据已保存到: {filename}")
        print(f"  共保存 {len(hourly_data)} 条小时数据")
        
        # 显示数据列说明
        if len(hourly_data) > 0:
            if self.timezone_info["conversion_enabled"]:
                print(f"  数据列: time(UTC), local_time({self.timezone_info['timezone_name']}), {', '.join(list(hourly_data[0].keys())[1:])}")
                print(f"  ✓ 已添加本地时间列: {self.timezone_info['timezone_name']}")
            else:
                print(f"  数据列: {', '.join(hourly_data[0].keys())}")
                print(f"  时间格式: UTC")
    
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
        
        # 使用默认倾斜角23度
        tilt_angle = surface.get("tilt_angle", 23)
        
        print(f"  面板数量: {panel_count} 块")
        print(f"  单块功率: {panel_power_w} W")
        print(f"  总功率: {peak_power_kw:.2f} kWp")
        print(f"  倾斜角: {tilt_angle}°")
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
            "angle": tilt_angle,
            "aspect": normalized_azimuth,
            "outputformat": "json"
        }
        
        # 添加衰减率参数
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
                    "tilt_angle": tilt_angle,
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
        report_file = self._get_output_path("report_2023.txt")
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"\n报告已保存到: {report_file}")
        return report_file
    
    def _generate_report_content(self) -> str:
        """生成报告内容"""
        lines = []
        lines.append("="*60)
        lines.append("屋顶光伏发电量计算报告 (2023年数据)")
        lines.append("="*60)
        
        # 生成时间和计算参数
        lines.append("")
        lines.append("【报告信息】")
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"  计算时间: {self.results['timestamp'][:19].replace('T', ' ')}")
        lines.append(f"  数据年份: 2023")
        lines.append(f"  系统损耗: {self.config['system_loss']}%")
        lines.append(f"  API数据源: PVGIS (European Commission JRC)")
        
        # 位置信息
        loc = self.results["location"]
        lines.append("")
        lines.append("【位置信息】")
        lines.append(f"  坐标: 纬度 {loc['latitude']}, 经度 {loc['longitude']}")
        if "description" in loc:
            lines.append(f"  描述: {loc['description']}")
        
        # 光伏面板信息
        panel = self.results["panel_spec"]
        lines.append("")
        lines.append("【光伏面板规格】")
        lines.append(f"  品牌型号: {panel['brand']} {panel['model']}")
        lines.append(f"  额定功率: {panel['power_watts']} W")
        lines.append(f"  转换效率: {panel['efficiency']}%")
        lines.append(f"  年衰减率: {panel['annual_degradation']}%")
        lines.append(f"  温度系数: {panel['temperature_coefficient_pmax']}%/°C")
        
        # 计算参数汇总
        total_panels = sum(s["panel_count"] for s in self.results["surfaces"])
        total_power = sum(s["peak_power_kw"] for s in self.results["surfaces"])
        
        lines.append("")
        lines.append("【计算参数汇总】")
        lines.append(f"  屋顶坡面数量: {len(self.results['surfaces'])} 个")
        lines.append(f"  面板总数量: {total_panels} 块")
        lines.append(f"  装机总容量: {total_power:.2f} kWp")
        lines.append(f"  系统损耗设置: {self.config['system_loss']}%")
        lines.append(f"  默认倾斜角: 23°")
        
        # 各坡面发电量详情
        lines.append("")
        lines.append("【各坡面发电量详情】")
        
        for i, surface in enumerate(self.results["surfaces"], 1):
            lines.append("")
            lines.append(f"  {i}. {surface['name']}")
            lines.append(f"     面板数量: {surface['panel_count']} 块")
            lines.append(f"     总功率: {surface['peak_power_kw']:.2f} kWp")
            lines.append(f"     倾角: {surface['tilt_angle']}°")
            lines.append(f"     方位角: {surface['azimuth']}°")
            lines.append(f"     方位说明: (0°=南, -90°=东, 90°=西)")
            lines.append(f"     年发电量: {surface['annual_energy_kwh']:.2f} kWh")
            
            # 月度发电量
            lines.append("")
            lines.append(f"     月度日均发电量 (kWh/day):")
            for month_data in surface["monthly_energy"]:
                month = month_data["month"]
                e_d = month_data["E_d"]
                lines.append(f"       {month}月: {e_d:.2f}")
        
        # 发电量总计
        lines.append("")
        lines.append("【发电量总计】")
        lines.append(f"  屋顶总年发电量: {self.results['total_annual_energy']:.2f} kWh")
        avg_daily = self.results['total_annual_energy'] / 365
        avg_monthly = self.results['total_annual_energy'] / 12
        lines.append(f"  平均日发电量: {avg_daily:.2f} kWh/day")
        lines.append(f"  平均月发电量: {avg_monthly:.2f} kWh/month")
        
        if total_power > 0:
            capacity_factor = (self.results['total_annual_energy'] / (total_power * 8760)) * 100
            specific_yield = self.results['total_annual_energy'] / total_power
            lines.append(f"  容量因子: {capacity_factor:.1f}%")
            lines.append(f"  单位容量发电量: {specific_yield:.0f} kWh/kWp/year")
        
        # 数据文件
        lines.append("")
        lines.append("【数据文件】")
        if "hourly_radiation_file" in self.results:
            lines.append(f"  小时辐射数据(CSV): {self.results['hourly_radiation_file']}")
        if "hourly_radiation_json" in self.results:
            lines.append(f"  小时辐射数据(JSON): {self.results['hourly_radiation_json']}")
        
        results_file = self._get_output_path("results_2023.json")
        lines.append(f"  计算结果数据: {results_file}")
        lines.append(f"  报告文件: {self._get_output_path('report_2023.txt')}")
        
        # 免责声明
        lines.append("")
        lines.append("【免责声明】")
        lines.append("  本报告基于PVGIS数据库的理论计算，仅供参考。")
        lines.append("  实际发电量可能受天气、设备状态、维护等因素影响。")
        lines.append("  建议结合实际情况进行综合评估。")
        
        lines.append("")
        lines.append("="*60)
        lines.append(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("="*60)
        
        return "\n".join(lines)
    
    def save_results(self):
        """保存计算结果为JSON"""
        results_file = self._get_output_path("results_2023.json")
        
        # 准备保存的数据（移除api_response以减小文件大小）
        save_data = {
            "timestamp": self.results["timestamp"],
            "location": self.results["location"],
            "panel_spec": self.results["panel_spec"],
            "total_annual_energy": self.results["total_annual_energy"],
            "surfaces": []
        }
        
        for surface in self.results["surfaces"]:
            surface_data = {
                "name": surface["name"],
                "panel_count": surface["panel_count"],
                "peak_power_kw": surface["peak_power_kw"],
                "tilt_angle": surface["tilt_angle"],
                "azimuth": surface["azimuth"],
                "annual_energy_kwh": surface["annual_energy_kwh"],
                "monthly_energy": surface["monthly_energy"]
            }
            save_data["surfaces"].append(surface_data)
        
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n结果已保存到: {results_file}")
        return results_file
    
    def run(self):
        """运行完整的计算流程"""
        print("="*60)
        print("屋顶光伏发电量计算程序 (2023年数据版本)")
        print("="*60)
        
        # 1. 获取小时级辐射数据
        self.get_hourly_radiation_2023()
        
        # 2. 计算各坡面发电量
        self.calculate_all_surfaces()
        
        # 3. 生成报告
        self.generate_report()
        
        # 4. 保存结果
        self.save_results()


def main():
    """主函数"""
    import sys
    
    # 默认使用config_australia.json，但允许命令行参数指定其他配置文件
    config_file = "config_australia.json"
    if len(sys.argv) > 1:
        config_file = sys.argv[1]
    
    print(f"使用配置文件: {config_file}\n")
    
    calculator = PVGISCalculator2023(config_file)
    calculator.run()


if __name__ == "__main__":
    main()
