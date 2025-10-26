# 光伏发电量计算程序 - 2023年数据版本

## 概述

这是专门用于获取和计算 **2023年** 光伏发电数据的脚本。相比原版本，主要改进：

1. ✅ **只获取2023年数据** - 大幅减少数据量（从19年约16万条减少到8760条）
2. ✅ **启用本地时间** - 使用 `localtime=1` 参数，时间戳为当地时间
3. ✅ **默认倾斜角23度** - 自动设置未指定的倾斜角
4. ✅ **按经纬度分类输出** - 自动创建基于坐标的子目录
5. ✅ **同时保存CSV和JSON** - 方便不同用途使用

---

## 快速开始

### 基本用法

```bash
# 使用默认配置文件 config_australia.json
python3 pv_calculator_2023.py

# 使用指定配置文件
python3 pv_calculator_2023.py your_config.json
```

### 配置文件示例

```json
{
  "location": {
    "latitude": -41.1676875,
    "longitude": 146.3472656,
    "description": "Devonport TAS 7310"
  },
  "system_loss": 15,
  "panel_spec": {
    "brand": "JA Solar",
    "model": "JAM54D40-440/LB/1500V",
    "power_watts": 440,
    "efficiency": 22,
    "first_year_degradation": 0,
    "annual_degradation": 0.4,
    "temperature_coefficient_pmax": -0.3
  },
  "roof_surfaces": [
    {
      "name": "坡面1",
      "panel_count": 5,
      "tilt_angle": 23,
      "azimuth": -55.62,
      "description": "5块面板"
    }
  ],
  "output": {
    "save_hourly_radiation": true,
    "save_monthly_details": true,
    "output_format": "json",
    "output_directory": "output",
    "add_timestamp": true
  }
}
```

---

## 输出文件结构

### 目录命名规则

输出文件会自动保存到基于经纬度的子目录：

```
output/
└── lat_41.1677S_lon_146.3473E/          # 根据经纬度自动创建
    ├── hourly_radiation_2023_20251027_021306.csv    # 小时辐射数据(CSV)
    ├── hourly_radiation_2023_20251027_021306.json   # 小时辐射数据(JSON)
    ├── results_2023_20251027_021306.json            # 计算结果
    └── report_2023_20251027_021306.txt              # 详细报告
```

### 文件说明

| 文件 | 格式 | 说明 |
|------|------|------|
| `hourly_radiation_2023_*.csv` | CSV | 2023年全年8760条小时辐射数据 |
| `hourly_radiation_2023_*.json` | JSON | 原始API返回的完整JSON数据 |
| `results_2023_*.json` | JSON | 各坡面发电量计算结果 |
| `report_2023_*.txt` | TXT | 人类可读的详细报告 |

---

## 小时辐射数据格式

### CSV数据列说明

```csv
time,G(i),H_sun,T2m,WS10m,Int
20230101:0030,687.75,61.0,21.36,4.48,0.0
20230101:0130,801.65,69.23,22.49,4.41,0.0
```

| 列名 | 单位 | 说明 |
|------|------|------|
| `time` | - | **本地时间**（格式：YYYYMMDD:HHMM） |
| `G(i)` | W/m² | 倾斜面太阳辐照度 |
| `H_sun` | 度 | 太阳高度角 |
| `T2m` | °C | 2米高度环境温度 |
| `WS10m` | m/s | 10米高度风速 |
| `Int` | - | 插值标志 |

### 重要特性

- ✅ **本地时间**: 已启用 `localtime=1`，时间为当地时间（非UTC）
- ✅ **2023年数据**: 只包含2023年1月1日至12月31日
- ✅ **8760条记录**: 完整一年的小时数据（非闰年）

---

## API参数说明

### Seriescalc API（获取小时辐射数据）

```python
params = {
    "lat": -41.1676875,          # 纬度
    "lon": 146.3472656,          # 经度
    "startyear": 2023,           # ✅ 起始年份
    "endyear": 2023,             # ✅ 结束年份
    "pvcalculation": 0,          # 不计算PV，只要辐射数据
    "localtime": 1,              # ✅ 启用本地时间
    "outputformat": "json"
}
```

### PVcalc API（计算发电量）

```python
params = {
    "lat": -41.1676875,
    "lon": 146.3472656,
    "peakpower": 2.20,           # 峰值功率(kWp)
    "loss": 15,                  # 系统损耗(%)
    "angle": 23,                 # ✅ 默认倾斜角23度
    "aspect": -55.62,            # 方位角
    "pvtechchoice": "crystSi",   # 晶硅技术
    "pv_degradation": 0.4,       # 年衰减率(%)
    "outputformat": "json"
}
```

---

## 关键改进说明

### 1. 本地时间 vs UTC时间

**旧版本**（未启用localtime）:
```
20230101:0030  # UTC时间
```

**新版本**（启用localtime=1）:
```
20230101:0030  # 当地时间（澳大利亚东部时间）
```

### 2. 数据量对比

| 版本 | 年份范围 | 数据条数 | 文件大小 |
|------|---------|---------|---------|
| 旧版本 | 2005-2023 (19年) | ~166,536条 | ~10MB |
| **新版本** | **2023 (1年)** | **8,760条** | **~500KB** |

### 3. 输出目录结构

**旧版本**:
```
output/
├── hourly_radiation_20251027_002956.csv
├── results_20251027_002956.json
└── report_20251027_002956.txt
```

**新版本**:
```
output/
└── lat_41.1677S_lon_146.3473E/    # ✅ 按经纬度分类
    ├── hourly_radiation_2023_*.csv
    ├── hourly_radiation_2023_*.json
    ├── results_2023_*.json
    └── report_2023_*.txt
```

### 4. 默认倾斜角

如果配置文件中未指定 `tilt_angle`，自动使用 **23度**：

```python
# 自动设置
for surface in config.get("roof_surfaces", []):
    if "tilt_angle" not in surface or surface["tilt_angle"] is None:
        surface["tilt_angle"] = 23  # ✅ 默认23度
```

---

## 使用场景

### 场景1: 快速评估2023年发电量

```bash
python3 pv_calculator_2023.py config_australia.json
```

### 场景2: 批量计算多个地点

```bash
# 为不同地点创建配置文件
python3 pv_calculator_2023.py location1.json
python3 pv_calculator_2023.py location2.json
python3 pv_calculator_2023.py location3.json

# 输出会自动分类到不同的经纬度目录
output/
├── lat_41.1677S_lon_146.3473E/
├── lat_42.8821S_lon_147.3272E/
└── lat_37.8136S_lon_144.9631E/
```

### 场景3: 分析小时级辐射数据

```python
import pandas as pd

# 读取CSV数据
df = pd.read_csv('output/lat_41.1677S_lon_146.3473E/hourly_radiation_2023_*.csv')

# 分析
print(f"年平均辐照度: {df['G(i)'].mean():.2f} W/m²")
print(f"最大辐照度: {df['G(i)'].max():.2f} W/m²")
print(f"年平均温度: {df['T2m'].mean():.2f} °C")
```

---

## 常见问题

### Q1: 为什么只有2023年的数据？

**A**: 这是设计选择，因为：
- 最新数据更有参考价值
- 大幅减少数据量和处理时间
- 如需其他年份，可修改 `startyear` 和 `endyear` 参数

### Q2: 如何修改年份？

**A**: 编辑脚本中的参数：

```python
params = {
    "startyear": 2022,  # 修改为你需要的年份
    "endyear": 2022,
    # ...
}
```

### Q3: 时间是UTC还是本地时间？

**A**: **本地时间**。已启用 `localtime=1` 参数，时间戳为当地时间。

### Q4: 如何禁用时间戳后缀？

**A**: 在配置文件中设置：

```json
{
  "output": {
    "add_timestamp": false
  }
}
```

### Q5: 为什么有些参数不参与计算？

**A**: 参考 `PVGIS_API_参数说明.md` 文档，了解哪些参数被PVGIS API使用。

---

## 与原版本对比

| 特性 | 原版本 (pv_calculator.py) | 新版本 (pv_calculator_2023.py) |
|------|--------------------------|-------------------------------|
| 数据年份 | 所有可用年份(19年) | 仅2023年 ✅ |
| 本地时间 | 需要安装时区库 | API原生支持 ✅ |
| 数据量 | ~166,536条 | 8,760条 ✅ |
| 输出目录 | 固定output/ | 按经纬度分类 ✅ |
| 默认倾斜角 | 需手动设置 | 自动23度 ✅ |
| JSON输出 | 仅results | CSV+JSON双格式 ✅ |

---

## 技术细节

### 经纬度目录命名

```python
lat_str = f"{abs(lat):.4f}{'N' if lat >= 0 else 'S'}"
lon_str = f"{abs(lon):.4f}{'E' if lon >= 0 else 'W'}"
location_dir = f"lat_{lat_str}_lon_{lon_str}"

# 示例:
# 纬度 -41.1676875 → lat_41.1677S
# 经度 146.3472656 → lon_146.3473E
# 目录名: lat_41.1677S_lon_146.3473E
```

### 方位角自动转换

PVGIS API 要求方位角在 -180° 到 +180° 范围内：

```python
def normalize_azimuth(azimuth):
    while azimuth > 180:
        azimuth -= 360
    while azimuth <= -180:
        azimuth += 360
    return azimuth

# 示例:
# 270° → -90° (西)
# 350° → -10° (略偏东的北)
```

---

## 依赖要求

```bash
pip install requests
```

**注意**: 不需要安装 `timezonefinder` 和 `pytz`，因为使用API原生的 `localtime=1` 参数。

---

## 许可证

与主项目相同

---

## 更新日志

### v2.0 (2025-10-27)
- ✅ 新增2023年专用版本
- ✅ 启用本地时间输出
- ✅ 按经纬度分类输出目录
- ✅ 默认倾斜角23度
- ✅ 同时输出CSV和JSON格式

---

## 联系方式

如有问题或建议，请联系项目维护者。
