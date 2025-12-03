# SolarQuotes 核心计算逻辑分析

基于 `shared_calc.js` 提取的完整计算逻辑。

## 1. 核心计算函数

### 1.1 季节用电量计算 `calculateUsageValuesPerSeason`

```javascript
// 根据年度电费反推每季度用电量
v.usage[season] = ((state_defaults.bill_factor[season] * annual_bill) - charge[season]) / (kWh_cost / 100);
```

**公式说明：**
- `bill_factor[season]`: 季节电费占比（如夏季 0.231）
- `annual_bill`: 年度电费（如 $1824）
- `charge[season]`: 季节日供电费总额
- `kWh_cost`: 每度电价格（分）

**示例（VIC 夏季）：**
```
usage_summer = (0.23138833 * 1824 - 122.30) / 0.27 = 1110.7 kWh
```

---

### 1.2 年度节省计算 `calculateYearlyValues`

这是核心计算函数，逐年计算节省金额。

#### 输入参数
```javascript
{
  values: {},           // 累计结果对象
  year: 0,              // 年份（0=第一年）
  options: {
    forceSelfC: false,  // 强制自用率
    energyPlan: null,   // 能源计划
    changeHTML: true,   // 是否更新UI
    currentSelfC: 37,   // 当前自用率
    has_battery: true,  // 是否有电池
    infl: 0.03          // 通胀率
  }
}
```

#### 计算步骤

**Step 1: 自用率季节加权**
```javascript
var seasonSC = {
  summer: selfC * state_defaults.self_consumption_ratio['summer'] / variables.selfC,
  autumn: selfC * state_defaults.self_consumption_ratio['autumn'] / variables.selfC,
  winter: selfC * state_defaults.self_consumption_ratio['winter'] / variables.selfC,
  spring: selfC * state_defaults.self_consumption_ratio['spring'] / variables.selfC
};
```

**Step 2: 上网电价递减（可选）**
```javascript
var FiT_value = (FiT - (reduce_fit ? year : 0)) / 100;
if(reduce_fit && FiT_value < 0.06) FiT_value = FiT > 6 ? 0.06 : FiT/100;
```

**Step 3: 逆变器更换成本（第12年）**
```javascript
if(year == 12-1) {
  var inverter_size = Math.ceil(total_capacity / dc_ac_ratio);
  var watts = inverter_size * 1000;
  inverterReplacementCost = watts * inverter_cost_per_watt * Math.pow(1+infl, 12);
  year_savings -= inverterReplacementCost;
}
```

**Step 4: 每季度计算**

```javascript
$.each(seasons, function(idx, season){
  // 1. 电价通胀调整
  state_cost = (kWh_cost / 100) * Math.pow(1+infl, year);
  
  // 2. 太阳能前电费
  pre_solar_bill = seasonCharge[season] + (usage * state_cost);
  
  // 3. 自用电量（不超过用电量）
  selfc = Math.min(generated_season[season] * selfC, usage);
  
  // 4. 自用节省
  savings_selfc = selfc * state_cost;
  
  // 5. 电网用电
  grid_use = usage - selfc;
  grid_cost = grid_use * state_cost;
  
  // 6. 出口电量
  exported = generated_season[season] - selfc;
  
  // 7. 上网收入
  FiT_income = exported * FiT_value;
  
  // 8. 总节省
  savings = FiT_income + savings_selfc;
  
  // 9. 太阳能后电费
  after_solar_bill = grid_cost + seasonCharge[season] - FiT_income;
});
```

---

### 1.3 电池计算逻辑

```javascript
if(has_battery){
  // 电池效率（往返效率）
  var roundTripEff = battery['data-efficiency'] ?? 0.9;  // 90%
  var chargeEff = Math.sqrt(roundTripEff);    // 充电效率 ~94.9%
  var dischargeEff = Math.sqrt(roundTripEff); // 放电效率 ~94.9%
  
  // 季节可用容量
  bat.capacity = days_in_season * (battery['data-capacity'] * (1 - battery['data-reserve']));
  // 例: 92天 * (10kWh * 0.8) = 736 kWh
  
  // 可存储能量（考虑充电损耗）
  var storable_energy = exported * chargeEff;
  bat.available = Math.min(bat.capacity, storable_energy);
  
  // 可用能量（考虑放电损耗）
  var usable_energy = bat.available * dischargeEff;
  bat.selfc = Math.min(usable_energy, grid_use);
  
  // 电池后电网用电
  bat.grid_use = grid_use - bat.selfc;
  bat.grid_cost = bat.selfc * state_cost;
  
  // 电池后出口（扣除存储损耗）
  bat.exported = exported - (bat.available / chargeEff);
  
  // 电池后账单
  bat.imports = bat.grid_use * state_cost;
  bat.export_earnings = bat.exported * FiT_value;
  bat.bill = (days_in_season * dailyCharge/100) + bat.imports - bat.export_earnings;
  
  // 电池节省
  bat.savings_selfc = bat.selfc * state_cost;
  bat.savings = bat.savings_selfc + solar_savings_selfc + bat.export_earnings;
}
```

---

### 1.4 回收期计算 `detailedPayback`

```javascript
detailedPayback: function(year, aggSavings, currentYearSavings, total = total_cost){
  var monthlyAvg = currentYearSavings / 12;
  var months = Math.ceil((total - aggSavings) / monthlyAvg);
  
  if (months == 0){
    return {string: year + " yr", years: year, months: 0};
  } else if(months >= 12) {
    return {string: (year + 1) + " yrs", years: year + 1, months: 0};
  }
  return {
    string: year + " yrs, " + months + " mths",
    years: year,
    months: months,
    monthsNumber: (year * 12) + months
  };
}
```

---

### 1.5 最大自用率计算 `calculateMaxSelfC`

```javascript
calculateMaxSelfC: function(v, highestSelfC = 0, highestBatSelfC = 0) {
  let usageFirstYear = Object.values(v.usage).reduce((a,b) => a+b, 0);
  let generated = v.generated_year;
  let maxSCR = (usageFirstYear / generated) * 100;
  let maxAvgScr = Math.round(maxSCR);
  
  if(highestSelfC != 0) // 有电池时
    maxAvgScr = Math.ceil(highestBatSelfC * 100);
    
  return Math.min(100, maxAvgScr);
}
```

---

## 2. 完整计算流程

```
┌─────────────────────────────────────────────────────────────┐
│                      用户输入                                │
├─────────────────────────────────────────────────────────────┤
│ • 邮编 → 经纬度、州、配电商                                   │
│ • 系统容量、朝向、倾角                                        │
│ • 电池容量、效率、保留比例                                    │
│ • 年电费、每度电价、日供电费、上网电价                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   PVWatts API 计算                           │
├─────────────────────────────────────────────────────────────┤
│ 输入: lat, lon, system_capacity, azimuth, tilt              │
│ 输出: 月发电量、小时发电曲线、年发电量                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               calculateUsageValuesPerSeason                  │
├─────────────────────────────────────────────────────────────┤
│ 根据年电费和季节比例，计算每季度用电量                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                calculateYearlyValues (循环20年)              │
├─────────────────────────────────────────────────────────────┤
│ For year = 0 to 19:                                         │
│   For season in [summer, autumn, winter, spring]:           │
│     1. 计算通胀后电价                                        │
│     2. 计算太阳能前电费                                      │
│     3. 计算自用电量和节省                                    │
│     4. 计算出口电量和收入                                    │
│     5. 如有电池，计算电池节省                                 │
│     6. 累计季节节省                                          │
│   累计年度节省                                               │
│   第12年扣除逆变器更换成本                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      输出结果                                │
├─────────────────────────────────────────────────────────────┤
│ • 第一年节省                                                 │
│ • 简单回收期                                                 │
│ • 10年/20年累计节省                                          │
│ • 季节账单对比                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 关键公式汇总

### 3.1 季节用电量
```
usage[season] = (bill_factor[season] × annual_bill - daily_charge[season]) / (kWh_cost / 100)
```

### 3.2 自用节省
```
self_consumption = min(generated[season] × selfC_ratio, usage[season])
savings_selfc = self_consumption × electricity_price
```

### 3.3 上网收入
```
exported = generated[season] - self_consumption
FiT_income = exported × FiT_rate
```

### 3.4 太阳能后电费
```
after_solar_bill = (usage - self_consumption) × electricity_price + daily_charge - FiT_income
```

### 3.5 电池额外节省
```
battery_capacity_season = days × usable_capacity
storable = exported × charge_efficiency
available = min(battery_capacity_season, storable)
usable = available × discharge_efficiency
battery_selfc = min(usable, grid_use)
battery_savings = battery_selfc × electricity_price
```

### 3.6 简单回收期
```
payback_years = total_cost / first_year_savings
```

### 3.7 通胀调整
```
price_year_n = price_year_0 × (1 + inflation)^n
```

---

## 4. 默认参数（VIC）

| 参数 | 值 | 说明 |
|------|-----|------|
| kWhCost | 27c | 每度电价格 |
| FiT | 7c | 上网电价 |
| daily | 124c | 日供电费 |
| annual_bill | $1824 | 年电费 |
| selfC | 37% | 默认自用率 |
| dc_ac_ratio | 1.32 | 直流/交流比 |
| inverter_cost_per_watt | $0.20 | 逆变器更换成本 |
| inflation | 3% | 默认通胀率 |
| battery_efficiency | 90% | 电池往返效率 |
| battery_reserve | 20% | 电池保留容量 |

---

## 5. 需要补充的内容

要完全复现计算逻辑，还需要：

1. **`custom.js`** - 可能包含结果页面特定的计算逻辑
2. **`result_debug.js`** - 调试和结果展示逻辑
3. **能源计划处理逻辑** - TOU（分时电价）的详细计算
4. **NEM12 数据处理** - 实际用电数据的导入和分析

---

## 6. Python 实现示例

```python
def calculate_season_savings(
    usage: float,           # 季节用电量 kWh
    generated: float,       # 季节发电量 kWh
    self_consumption_ratio: float,  # 自用率 0-1
    kwh_cost: float,        # 电价 $/kWh
    fit_rate: float,        # 上网电价 $/kWh
    daily_charge: float,    # 季节日供电费总额 $
    battery_capacity: float = 0,    # 电池可用容量 kWh
    battery_efficiency: float = 0.9 # 电池效率
) -> dict:
    """计算单季度节省"""
    
    # 自用电量
    self_consumption = min(generated * self_consumption_ratio, usage)
    
    # 自用节省
    savings_selfc = self_consumption * kwh_cost
    
    # 电网用电
    grid_use = usage - self_consumption
    
    # 出口电量
    exported = generated - self_consumption
    
    # 上网收入
    fit_income = exported * fit_rate
    
    # 太阳能前电费
    before_solar = usage * kwh_cost + daily_charge
    
    # 太阳能后电费
    after_solar = grid_use * kwh_cost + daily_charge - fit_income
    
    # 电池计算
    battery_savings = 0
    if battery_capacity > 0:
        charge_eff = battery_efficiency ** 0.5
        discharge_eff = battery_efficiency ** 0.5
        
        storable = exported * charge_eff
        available = min(battery_capacity, storable)
        usable = available * discharge_eff
        battery_selfc = min(usable, grid_use)
        
        battery_savings = battery_selfc * kwh_cost
        
        # 更新出口和电网用电
        exported -= available / charge_eff
        grid_use -= battery_selfc
        
        after_solar = grid_use * kwh_cost + daily_charge - exported * fit_rate
    
    return {
        'before_solar': before_solar,
        'after_solar': after_solar,
        'savings': before_solar - after_solar,
        'self_consumption': self_consumption,
        'exported': exported,
        'fit_income': fit_income,
        'battery_savings': battery_savings
    }
```

---

## 总结

**已找到的核心计算逻辑：**
- ✅ 季节用电量计算
- ✅ 自用率和出口计算
- ✅ 电池效率和节省计算
- ✅ 通胀调整
- ✅ 逆变器更换成本
- ✅ 回收期计算
- ✅ 上网电价递减逻辑

**计算逻辑位置：**
- 主要在 `/js/calc/shared_calc.js` 的 `sCalc.solarCalc` 对象中
- 发电量数据来自后端 PVWatts API 调用
