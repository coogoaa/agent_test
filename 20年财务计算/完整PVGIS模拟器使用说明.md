# 完整PVGIS集成模拟器 - 使用说明

## ✅ 已完成的功能

### 核心功能
1. ✅ **PVGIS API集成** - 可选择使用真实光照数据或理论值
2. ✅ **24小时能量流计算** - 基于Java `calBaseData()`逻辑
3. ✅ **电池充放电详细计算** - 完整的储能逻辑
4. ✅ **能量守恒验证** - 自动验证能量平衡
5. ✅ **20年240个月完整模拟** - 考虑衰减和通胀
6. ✅ **多格式导出** - JSON（含详细数据）+ CSV（Excel可读）

---

## 🚀 快速开始

### 1. 使用理论值模式（无需网络）
```bash
python3 完整PVGIS集成模拟器.py --no-pvgis
```

### 2. 使用PVGIS API真实数据
```bash
python3 完整PVGIS集成模拟器.py
```

**注意**: PVGIS API模式需要网络连接，可能需要等待1-2分钟获取数据。

---

## 📊 生成的数据说明

### JSON文件结构
```json
{
  "metadata": {
    "location": "Seaford Rise SA 5169坐标",
    "system": "系统配置参数",
    "data_source": "PVGIS API 或 Theoretical"
  },
  "summary": {
    "total_20year_saving": "20年总节省",
    "payback_period_years": "回本周期"
  },
  "monthly_results": [
    {
      "year": 1,
      "month": 1,
      "generation": {
        "hourly_avg": [24个小时发电量],
        "daily_avg": "日均发电",
        "monthly_total": "月度总发电"
      },
      "usage": {
        "hourly_avg": [24个小时用电量],
        "daily_avg": "日均用电",
        "monthly_total": "月度总用电"
      },
      "energy_flow": {
        "direct_use_from_pv": "发电时即时消耗",
        "surplus_for_battery": "可充电量",
        "battery_discharge": "电池放电量",
        "non_solar_usage": "非发电时段用电",
        "export_to_grid": "上网电量",
        "import_from_grid": "购电量",
        "self_consumption_rate": "自用率"
      },
      "energy_balance": {
        "generation_total": "总发电",
        "usage_breakdown": "用电来源分解",
        "generation_breakdown": "发电去向分解"
      },
      "hourly_details": [前3小时详细数据],
      "financials": {
        "purchase_cost": "购电费用",
        "feed_in_income": "馈网收入",
        "net_cost": "净电费",
        "cost_without_solar": "无太阳能电费",
        "monthly_saving": "月度节省"
      },
      "cumulative_saving": "累计节省",
      "payback_progress": "回本进度%"
    }
  ]
}
```

---

## 🔢 详细计算过程（基于Java代码）

### 步骤1: 获取PVGIS数据
```
如果启用PVGIS API:
  → 请求 https://re.jrc.ec.europa.eu/api/seriescalc
  → 获取Seaford Rise坐标的小时级发电数据
  → 按月份和小时汇总平均值
  
如果使用理论值:
  → 年发电量 = 系统容量 × 1200小时
  → 按太阳轨迹模拟24小时发电曲线
  → 按月度占比分配
```

### 步骤2: 24小时能量流计算
```java
// 基于Java calBaseData()逻辑

for (hour = 0; hour < 24; hour++) {
    genPower = 小时发电量
    usePower = 小时用电量
    
    // 即时消耗
    usageGenHour = min(genPower, usePower)
    
    // 可充电量
    batteryHourPower = max(genPower - usePower, 0)
}

// 月度汇总
monthGenPower = sum(genPower) × days
usageGenMonthPower = sum(usageGenHour) × days
batteryDayPower = sum(batteryHourPower)
```

### 步骤3: 电池充放电计算
```java
// 基于Java代码逻辑

// 非发电时段用电量
useMonthPowerNoSolar = monthTotalUsage - usageGenMonthPower

// 最终电池放电量（三者取最小）
batteryFinalMonthPower = min(
    batteryDayPower × days,        // 可充电量
    batteryCapacity × days,         // 电池容量×天数
    useMonthPowerNoSolar            // 需要覆盖的用电量
)
```

### 步骤4: 自用率计算
```java
// 基于Java代码公式

selfConsumptionRate = (usageGenMonthPower + batteryFinalMonthPower) / monthGenPower
```

### 步骤5: 上网和购电
```java
// 上网电量
exportPower = monthGenPower × (1 - selfConsumptionRate)

// 购电量
gridImport = max(monthTotalUsage - usageGenMonthPower - batteryFinalMonthPower, 0)
```

### 步骤6: 财务计算
```java
// 基于Java calculate20YearData逻辑

// 电价膨胀因子
yearFactor = (1 + 0.025)^year

// 购电费用
purchaseCost = gridImport × electricityPrice × yearFactor + fixedCharge × days

// 馈网收入
feedInIncome = exportPower × feedInTariff

// 净电费
netCost = purchaseCost - feedInIncome

// 月度节省
monthlySaving = costWithoutSolar - netCost
```

---

## 📈 数据示例（第1年第1月）

### 发电数据
```
24小时发电曲线（kWh）:
00:00-06:00: 0 (夜间)
06:00: 0.06
07:00: 0.46
08:00: 1.08
09:00: 1.70
10:00: 2.32
11:00: 2.79
12:00: 3.10 (峰值)
13:00: 2.94
14:00: 2.63
15:00: 2.17
16:00: 1.55
17:00: 0.77
18:00: 0.25
19:00-23:00: 0 (夜间)

日均发电: 21.84 kWh
月度总发电: 677.16 kWh
```

### 用电数据
```
24小时用电曲线（kWh）:
00:00: 0.66
01:00: 0.71
02:00: 0.52
...
18:00: 0.82 (晚高峰)
19:00: 0.78
20:00: 0.73
...

日均用电: 13.65 kWh
月度总用电: 423.20 kWh
```

### 能量流
```
发电总量: 677.16 kWh
  ├─ 发电时即时消耗: 201.34 kWh (29.7%)
  ├─ 充入电池: 221.86 kWh (32.8%)
  └─ 上网售电: 253.96 kWh (37.5%)

用电总量: 423.20 kWh
  ├─ 来自发电即时: 201.34 kWh (47.6%)
  ├─ 来自电池: 221.86 kWh (52.4%)
  └─ 来自电网: 0.00 kWh (0%)

自用率: 62.5%
```

### 财务数据
```
购电费用: $24.80 (仅固定费用)
馈网收入: $15.24
净电费: $9.56
无太阳能电费: $176.63
月度节省: $167.07
```

---

## 🎯 能量守恒验证

模拟器自动验证能量平衡：

### 发电侧平衡
```
发电总量 = 直接自用 + 充入电池 + 上网
677.16 = 201.34 + 221.86 + 253.96 ✅
```

### 用电侧平衡
```
用电总量 = 来自PV + 来自电池 + 来自电网
423.20 = 201.34 + 221.86 + 0.00 ✅
```

---

## 📝 与Java代码的对应关系

| Java方法 | Python实现 | 说明 |
|----------|------------|------|
| `calBaseData()` | `calculate_monthly_energy_flow()` | 24小时能量流计算 |
| `calculate20YearData...()` | `calculate_monthly_financials()` | 财务计算 |
| `min(genPower, usaPower)` | `usage_gen_hour` | 即时消耗 |
| `max(genPower - usaPower, 0)` | `battery_hour_power` | 可充电量 |
| `min(batteryDayPower×days, batteryCapacity×days, useMonthPowerNoSolar)` | `battery_final_month_power` | 电池放电 |

---

## 🔧 自定义配置

### 修改系统参数
编辑 `完整PVGIS集成模拟器.py` 中的配置：

```python
self.system = {
    'size_kw': Decimal('6.6'),  # 系统容量
    'battery_capacity_kwh': Decimal('13.5'),  # 电池容量
    'panel_degradation': Decimal('0.004'),  # 年衰减率
}
```

### 修改电价参数
```python
self.tariff = {
    'electricity_price_kwh': Decimal('0.35'),  # 购电单价
    'feed_in_tariff': Decimal('0.06'),  # 上网电价
    'fixed_charge_day': Decimal('0.80'),  # 日固定费用
}
```

### 修改地址坐标
```python
self.location = {
    'latitude': -35.1816,  # 纬度
    'longitude': 138.4939,  # 经度
}
```

---

## ⚠️ 注意事项

### PVGIS API模式
- ✅ 使用真实光照数据，更准确
- ⚠️ 需要网络连接
- ⚠️ 可能需要1-2分钟获取数据
- ⚠️ API可能偶尔不可用

### 理论值模式
- ✅ 无需网络，快速运行
- ✅ 适合测试和演示
- ⚠️ 使用简化的太阳轨迹模型
- ⚠️ 精度略低于真实数据

---

## 📞 使用建议

1. **首次运行**: 使用 `--no-pvgis` 快速测试
2. **正式分析**: 使用PVGIS API获取真实数据
3. **数据分析**: 用Excel打开CSV文件
4. **程序化处理**: 读取JSON文件进行深度分析

---

**生成时间**: 2025-10-24  
**版本**: v1.0 (完整集成版)  
**基于**: Java代码逻辑 + PVGIS API + 真实SA州数据
