# SolarChoice "Determining Optimal Battery Capacity" 计算器分析

## 架构概述

这是一个**前端配置驱动**的表单计算器，核心计算逻辑在**后端 API** 中执行。

- **前端框架**: SolarChoice Form SDK v1.12.7
- **计算器 URL**: https://embed.solarchoice.net.au/forms/battery_advanced_calculator.html

---

## 用户输入参数

| 参数 | 字段ID | 说明 | 默认值 | 范围 |
|------|--------|------|--------|------|
| 城市 | `city` | 最近的城市 | sydney | Adelaide/Brisbane/Canberra/Darwin/Hobart/Melbourne/Perth/Sydney |
| 已有太阳能 | `have_solar` | 是否已安装太阳能 | no | yes/no |
| 系统容量 | `size_system` | 太阳能系统容量 (kW) | 6.6 | 2-100 kW |
| 出口比例 | `percentage_exported_grid` | 出口到电网的比例 | 60% | 0-100% |
| 用电模式 | `load_profile` | 用电习惯 | evening_peak | 见下表 |
| 日均用电 | `average_daily_usage_kwh` | 日均用电量 (kWh) | 19 | 0-200 kWh |
| 电池容量 | `battery_usable_kwh` | 电池可用容量 (kWh) | 10 | 5-50 kWh |
| 电价类型 | `tariff_type` | 单一/分时电价 | flat | flat/tou |
| 单一电价 | `flat_rate` | 固定电价 ($/kWh) | 0.38 | 0-10 |
| 上网电价 | `solar_fit` | Feed-in Tariff ($/kWh) | 0.02 | 0-100 |
| 峰值电价 | `peak` | TOU峰值电价 ($/kWh) | - | 0-10 |
| 非峰值电价 | `off_peak` | TOU非峰值电价 ($/kWh) | - | 0-10 |
| 肩峰电价 | `shoulder` | TOU肩峰电价 ($/kWh) | - | 0-10 |

### 用电模式选项 (load_profile)

| 值 | 说明 |
|----|------|
| `double_peak` | 双峰 |
| `evening_peak` | 晚间高峰 |
| `high_day_and_evening_peak` | 日间和晚间高峰 |
| `day_focus` | 日间为主 |
| `night_focus` | 夜间为主 |
| `day_focus_business` | 日间为主（商业） |
| `constant_business` | 恒定（商业） |

---

## 后端 API

### 1. 能量流图表 API

**端点:**
```
POST https://portal.solarchoice.net.au/api/v1/calculation/battery/graph/energy_flow.php
```

**请求参数:**
```json
{
  "city": "sydney",
  "percentageExportedGrid": "60",
  "batterySizes": [5,6,7,8,9,10,...,50],
  "haveSolarInstalled": "yes/no",
  "solarSystemSize": "6.6",
  "averageDailyUsageKwh": "19",
  "loadProfileType": "evening_peak",
  "dataSets": ["load", "pv_output", "battery_discharge"],
  "dataPoints": ["jan-1-0", "jan-1-2", ...],  // 每2小时一个数据点
  "labelFormat": "\\D\\a\\y j - ga"
}
```

**返回数据:**
- `load` - 负载/用电量
- `pv_output` - 太阳能发电量
- `battery_discharge` - 电池放电量

---

### 2. 电池计算 API

**端点:**
```
POST https://portal.solarchoice.net.au/api/v1/calculation/battery/calculator.php
```

**请求参数:**
```json
{
  "city": "sydney",
  "percentageExportedGrid": "60",
  "batterySizes": [10],
  "haveSolarInstalled": "yes/no",
  "solarSystemSize": "6.6",
  "averageDailyUsageKwh": "19",
  "loadProfileType": "evening_peak",
  "tariffType": "flat",
  "tariffFlatCents": "38",
  "tariffPeakCents": "0",
  "tariffOffPeakCents": "0",
  "tariffShoulderCents": "0",
  "solarFitCents": "2",
  "dailySupplyChargeCents": "0",
  "dataSets": [
    "battery_annual_utilisation_percentage",
    "annual_electricity_covered_solar_battery_percentage",
    "annual_savings",
    "battery_cost",
    "battery_cost_with_rebates",
    "solar_cost",
    "total_cost",
    "total_cost_with_rebates",
    "payback_years",
    "battery_cost_rebate_amount"
  ]
}
```

**返回数据:**

| 字段 | 说明 |
|------|------|
| `battery_annual_utilisation_percentage` | 电池年利用率（电池能充满的天数/365） |
| `annual_electricity_covered_solar_battery_percentage` | 太阳能+电池覆盖的用电比例 |
| `annual_savings` | 年度节省金额 ($) |
| `battery_cost` | 电池成本 ($) |
| `battery_cost_with_rebates` | 含补贴电池成本 ($) |
| `solar_cost` | 太阳能系统成本 ($) |
| `total_cost` | 总成本 ($) |
| `total_cost_with_rebates` | 含补贴总成本 ($) |
| `payback_years` | 回收期（年） |
| `battery_cost_rebate_amount` | 联邦电池补贴金额 ($) |

---

## 前端计算公式

### 1. 电价转换（美元→分）
```javascript
flat_rate = max(0, flat_rate) * 100
solar_fit = max(0, solar_fit) * 100
peak = max(0, peak) * 100
off_peak = max(0, off_peak) * 100
shoulder = max(0, shoulder) * 100
```

### 2. 电池利用率颜色判断
```javascript
// 利用率 >= 80% 绿色，>= 60% 橙色，否则红色
colour = number >= 80 ? '#34a851' : number >= 60 ? '#D08311' : '#dd3535'
```

**建议**: 利用率最低应达到 80%

### 3. 电力覆盖率颜色判断
```javascript
// 覆盖率 >= 70% 绿色，>= 50% 橙色，否则红色
colour = number >= 70 ? '#34a851' : number >= 50 ? '#D08311' : '#dd3535'
```

### 4. 回收期计算（用户自定义价格时）
```javascript
// 已有太阳能
total_install_cost = battery_price_custom - battery_rebate_price_custom
payback_years = total_install_cost / annual_savings

// 新装太阳能
total_install_cost = battery_price_custom + solar_price_custom - battery_rebate_price_custom
payback_years = total_install_cost / annual_savings
```

---

## 计算流程

```
┌─────────────────────────────────────────────────────────────┐
│  第1步: 基本信息 (calc0)                                      │
│  - 选择城市                                                   │
│  - 是否已有太阳能                                              │
│  - 太阳能系统容量                                              │
│  - 出口比例（已有太阳能时）                                     │
│  - 用电模式                                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  第2步: 电费信息 (calc1)                                      │
│  - 电价类型（单一/分时）                                       │
│  - 电价费率                                                   │
│  - 上网电价                                                   │
│  - 日均用电量                                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  第3步: 确定最佳电池容量 (calc2)                               │
│  - 调用 energy_flow.php API 获取能量流数据                     │
│  - 调用 calculator.php API 获取效率数据                        │
│  - 显示电池利用率和电力覆盖率                                   │
│  - 用户可调整电池容量 (5-50 kWh)                               │
│  - 显示季节性能量流图表                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  第4步: 财务结果 (calc3)                                      │
│  - 调用 calculator.php API 获取成本和节省数据                   │
│  - 显示太阳能成本、电池成本、联邦补贴                           │
│  - 显示总安装成本、年度节省、回收期                             │
│  - 用户可编辑自定义价格                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 关键假设（来自计算器说明）

1. **日照辐射**: 基于所选城市的 BOM（气象局）站点数据
2. **电费节省**: 按小时计算，覆盖全年，考虑典型太阳能和电池效率
3. **电价假设**: 假设电价在未来保持不变
4. **设备定价**: 基于 Solar Choice Price Index 的平均成本
5. **补贴**: 包含联邦电池补贴，不包含州级补贴和 VPP 激励

---

## 待获取信息

要完全理解后端计算逻辑，需要：

1. **后端 API 源代码** - `calculator.php` 和 `energy_flow.php`
2. **API 响应示例** - 调用 API 后返回的完整 JSON 数据
3. **城市日照数据** - 各城市的太阳能发电系数
4. **电池效率参数** - 充放电效率、损耗等

---

## 参考价格

详见 `/1127 计算规则/参考价格/` 目录：
- `solarchoice_battery.md` - 电池价格指数
- `solarchoice_pv.md` - 太阳能面板价格指数
