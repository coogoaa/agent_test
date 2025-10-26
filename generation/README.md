# 屋顶光伏发电量计算程序

基于 PVGIS API 的多坡面屋顶光伏发电量计算工具。

## 📌 版本说明

本项目提供两个版本：

| 版本 | 脚本文件 | 数据年份 | 推荐使用 |
|------|---------|---------|---------|
| **2023年版** | `pv_calculator_2023.py` | 仅2023年 | ✅ **默认推荐** |
| 完整版 | `pv_calculator.py` | 所有可用年份 | 需要历史数据时 |

**快速开始（推荐）**：
```bash
# 使用默认启动脚本（2023年版本）
bash run.sh

# 或直接运行
python3 pv_calculator_2023.py config_australia.json
```

详细说明请查看 [README_2023.md](README_2023.md)

## 功能特性

### 2023年版本新特性 🆕
- ✅ **只获取2023年数据** - 数据量减少95%（8760条 vs 166536条）
- ✅ **本地时间输出** - 自动使用当地时间（非UTC）
- ✅ **按经纬度分类** - 输出目录自动按坐标组织
- ✅ **默认倾斜角23度** - 无需手动设置
- ✅ **双格式输出** - 同时保存CSV和JSON

### 通用特性
- ✅ 支持多坡面屋顶配置
- ✅ 自动计算每个坡面的年发电量
- ✅ 提供月度日均发电量详细数据
- ✅ 获取小时级太阳辐射数据
- ✅ 支持光伏面板衰减率配置
- ✅ 生成详细的计算报告

## 安装依赖

```bash
pip install -r requirements.txt
```

## 配置文件说明

编辑 `config.json` 文件来配置您的屋顶参数：

### 配置结构

```json
{
  "location": {
    "latitude": 31.2304,          // 纬度（十进制度）
    "longitude": 121.4737,        // 经度（十进制度）
    "description": "位置描述"
  },
  "system_loss": 14,              // 系统损耗百分比（默认 14%）
  "panel_spec": {
    "brand": "JA Solar",          // 面板品牌
    "model": "JAM54D40-440/LB",   // 面板型号
    "power_watts": 440,           // 单块面板功率（瓦）
    "efficiency": 22,             // 转换效率（%）
    "first_year_degradation": 0,  // 首年衰减率（%）
    "annual_degradation": 0.4     // 年衰减率（%）
  },
  "roof_surfaces": [
    {
      "name": "坡面A",            // 坡面名称
      "panel_count": 12,          // 面板数量
      "tilt_angle": 30,           // 倾角（度，0=水平，90=垂直）
      "azimuth": 0,               // 方位角（度，0=南，-90=东，90=西）
      "description": "描述"
    }
  ]
}
```

### 方位角说明

- **0°**: 正南
- **-90°**: 正东
- **90°**: 正西
- **180°** 或 **-180°**: 正北

### 倾角说明

- **0°**: 水平放置
- **30°**: 典型倾角（适合大部分地区）
- **90°**: 垂直安装

## 使用方法

### 1. 基本使用

```bash
python pv_calculator.py
```

程序将自动：
1. 读取 `config.json` 配置
2. 调用 PVGIS API 获取小时辐射数据
3. 计算每个坡面的发电量
4. 生成详细报告
5. 保存结果到 `results.json` 和 `hourly_radiation.csv`

### 2. 查看结果

程序运行后会生成以下文件：

- **results.json**: 完整的计算结果（JSON 格式）
- **hourly_radiation.csv**: 小时级太阳辐射数据（CSV 格式）

### 3. 示例输出

```
============================================================
屋顶光伏发电量计算报告
============================================================

【位置信息】
  坐标: 纬度 31.2304, 经度 121.4737
  描述: 上海市示例坐标

【光伏面板规格】
  品牌型号: JA Solar JAM54D40-440/LB/1500V
  额定功率: 440 W
  转换效率: 22%
  年衰减率: 0.4%

【各坡面发电量详情】

  1. 坡面A (朝南)
     面板数量: 12 块
     总功率: 5.28 kWp
     倾角: 30°
     方位角: 0° (0°=南, -90°=东, 90°=西)
     年发电量: 6234.56 kWh

     月度日均发电量 (kWh/day):
       1月: 12.34
       2月: 14.56
       ...

【总计】
  屋顶总年发电量: 10234.56 kWh
  屋顶总装机容量: 8.80 kWp
```

## 技术说明

### PVGIS API

本程序使用欧盟联合研究中心（JRC）提供的 PVGIS API：

- **PVcalc API**: 计算光伏系统发电量
- **seriescalc API**: 获取小时级辐射数据

API 文档: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/api-non-interactive-service_en

### 计算方法

1. **坡面总功率** = 单块面板功率 × 面板数量 ÷ 1000 (kWp)
2. **年发电量**: 由 PVGIS API 根据历史气象数据计算
3. **月度发电量**: API 提供每月的日均发电量
4. **系统损耗**: 包括逆变器、线缆、灰尘、温度等综合损耗

### 数据来源

- 太阳辐射数据: PVGIS 数据库（基于卫星和地面观测）
- 气象数据: 典型气象年（TMY）数据
- 覆盖范围: 全球大部分地区

## 注意事项

1. **网络连接**: 程序需要访问 PVGIS API，请确保网络连接正常
2. **API 限制**: PVGIS API 有请求频率限制，请勿频繁调用
3. **坐标范围**: 请确保坐标在 PVGIS 支持的地理范围内
4. **结果精度**: 计算结果为理论估算值，实际发电量会受多种因素影响

## 常见问题

### Q: 如何获取准确的地理坐标？

A: 可以使用以下方式：
- Google Maps: 右键点击位置，选择"这是哪里？"
- 百度地图拾取坐标系统
- GPS 设备

### Q: 系统损耗应该设置多少？

A: 典型值为 14%，包括：
- 逆变器损耗: 4-8%
- 线缆损耗: 1-3%
- 灰尘遮挡: 2-5%
- 温度影响: 2-5%

### Q: 如何确定最佳倾角？

A: 一般规则：
- 最佳倾角 ≈ 当地纬度
- 可以使用 PVGIS 的优化功能测试不同倾角

### Q: API 请求失败怎么办？

A: 可能的原因：
- 网络连接问题
- 坐标超出 PVGIS 覆盖范围
- API 服务暂时不可用
- 请求频率过高

## 许可证

本项目仅供学习和研究使用。

## 参考资料

- [PVGIS 官方网站](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en)
- [PVGIS API 文档](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/api-non-interactive-service_en)
- [JA Solar 产品手册](https://www.jasolar.com/)
