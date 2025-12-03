# SolarQuotes 核心计算逻辑分析

基于 `shared_calc.js`、`custom.js`、`result_debug.js` 提取的完整计算逻辑。

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

## 4. 配电商出口限制 (shared_calc.js)

```javascript
const exportLimitRates = {
    'Essential Energy': { single: 5, three: 5 },
    'Ausgrid': { single: 10, three: 30 },
    'Endeavour Energy': { single: 5, three: 30 },
    'Energex': { single: 5, three: 15 },
    'Ergon Energy': { single: 5, three: 15 },
    'Evoenergy': { single: 5, three: 15 },
    'CitiPower': { single: 5, three: 15 },
    'PowerCor': { single: 5, three: 15 },
    'Jemena': { single: 5, three: 15 },
    'AusNet Services': { single: 5, three: 15 },
    'United Energy': { single: 5, three: 15 },
    'TasNetworks': { single: 10, three: 30 },
    'SA Power Networks': { single: 10, three: 30 },
    'Western Power': { single: 5, three: 30 },
    'Horizon Power': { single: 5, three: 15 },
    'PowerWater': { single: 5, three: 7 }
};
```

| 配电商 | 单相限制(kW) | 三相限制(kW) |
|--------|------------|------------|
| Ausgrid | 10 | 30 |
| TasNetworks | 10 | 30 |
| SA Power Networks | 10 | 30 |
| Western Power | 5 | 30 |
| Endeavour Energy | 5 | 30 |
| 其他大多数 | 5 | 15 |
| PowerWater | 5 | 7 |

---

## 5. 默认参数（VIC）

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

## 6. 邮编信息获取 `getPostcodeInfo()` (shared_calc.js)

```javascript
sCalc.getPostcodeInfo = function(elem, updateStateDefaults, options = {}) {
    $.ajax({
        url: '/solar-calculator/postcodeInformation/',
        data: { postcode: elem.val() },
        success: function(result) {
            // 1. 设置经纬度
            $('#postcode-lat').val(result.response.lat);
            $('#postcode-lon').val(result.response.lon);
            
            // 2. 设置州
            $('#postcode-state').val(result.response.state);
            
            // 3. 更新州默认值
            updateStateDefaults(result.response.isEnergex ? 'Energex' : result.response.state);
            
            // 4. 设置配电商和出口限制
            const distributors = result.response.solarDistributors;
            // ... 根据配电商设置出口限制
            const isThreePhase = $('#three_phase').is(':checked');
            const phaseKey = isThreePhase ? 'three' : 'single';
            const exportLimit = exportLimitRates[distributorName][phaseKey];
            $('#export-limit').val(exportLimit);
        }
    });
}
```

**返回数据结构：**
```javascript
result.response = {
    lat: -37.8136,           // 纬度
    lon: 144.9631,           // 经度
    state: 'VIC',            // 州
    isEnergex: false,        // 是否Energex区域
    solarDistributors: ['CitiPower', 'Jemena']  // 可用配电商
}
```

---

## 7. 前端成本计算逻辑 (custom.js)

### 5.1 系统总成本计算 `Calcs.cost()`

```javascript
// 获取所有太阳能板阵列的容量
var capacities = jQuery('select.sa-system-capacity').map(function() {
    return $(this).closest('.panel-array').find('select.sa-system-status').val() == 1 
        ? parseFloat(jQuery(this).val()) : 0; 
}).get();
var system_size_new = capacities.reduce((total, num) => total + num, 0);

var battery_cost = parseFloat($('#battery-cost').val().replace(',',''));

var total_cost;
if (isNaN(battery_cost) || battery_cost === 0) {
    // 无电池：每kW $900
    total_cost = system_size_new * 900;
} else if (battery_cost > 0) {
    // 有电池：电池成本 + 每kW $700
    total_cost = battery_cost + system_size_new * 700;
}
```

**成本计算公式：**
| 场景 | 公式 |
|------|------|
| 无电池 | `total_cost = system_capacity_kW × $900` |
| 有电池 | `total_cost = battery_cost + system_capacity_kW × $700` |

### 5.2 电池成本计算 `Calcs.battery()`

```javascript
var installation_cost = 3000;  // 固定安装费
var total_cost = 0;

$('select.battery-selection').each(function(idx, val){
    var option = $(val).find('option:selected');
    var price = parseFloat(option.attr('data-price'));
    
    // SA州特殊价格
    if($('#postcode-state').val() == 'SA' && option.attr('data-SA-price') !== undefined) 
        price = parseFloat(option.attr('data-SA-price'));  
    
    // 自定义电池：按容量估算 $750/kWh
    if (isNaN(price) || price == 0) {
        const capacity = $(val).closest('.battery-item').find('[name*=capacity]').val();
        if (capacity != '' && parseFloat(capacity) > 0) 
            price = parseFloat(capacity) * 750;
    }
    
    var cost = installation_cost + price;
    total_cost += cost;
});
```

**电池成本公式：**
```
battery_total_cost = Σ(battery_price + $3000_installation)

// 自定义电池估算
custom_battery_price = capacity_kWh × $750
```

### 5.3 上网电价限制 `checkFiTRestrictions()`

```javascript
// WA州：系统容量 > 6.6kW 时，FiT = 0
if(state == 'WA' && totalSystemSize > 6.6) {
    $('#FiT').val("0c");
}

// VIC州：系统容量 >= 100kW 时，FiT = 0
if(state == 'VIC' && totalSystemSize >= 100) {
    $('#FiT').val("0c");
}
```

### 5.4 州默认值加载 `stateDefaults()`

```javascript
Calcs.stateDefaults = function(state){
    var defaults = state_defaults[state];
    
    // 设置 FiT 和 kWhCost
    $('#FiT').val(defaults['FiT'] + 'c');
    $('#kWhCost').val(defaults['kWhCost'] + 'c');
    
    // 设置年度电费
    $('#annual-bill').val(defaults['annual_bill']);
    
    // 计算日供电费（从季节数据汇总）
    var dailyCharge = 0;
    Object.values(defaults['charge']).forEach(function(seasonCharge) {
        dailyCharge += seasonCharge;
    });
    dailyCharge = dailyCharge / 365 * 100;  // 转换为分/天
    $('#daily-charge').val(dailyCharge.toFixed(2));
}
```

---

## 8. 结果页面计算逻辑 (result_debug.js)

### 6.1 初始化流程

```javascript
function init(){
    // 1. 计算季节用电量
    sCalc.solarCalc.calculateUsageValuesPerSeason(variables);
    
    // 2. 预计算所有自用率场景 (-1% 到 100%)
    for(i=-1; i<=100; i++)
        rCalcs.utils.calculateYearlyValues(0, {forceSelfC: i});
    
    // 3. 刷新计算结果
    rCalcs.refreshCalc();
    
    // 4. 绑定滑块事件
    rCalcs.init();
    
    // 5. 绘制图表
    graphs.generationYearly();
    graphs.generationDaily(new Date().getMonth() + 1);
}
```

### 6.2 结果刷新 `refreshCalc()`

```javascript
rCalcs.refreshCalc = function(){
    // 1. 刷新30年数据
    rCalcs.refreshValues();  // 计算 values.years[0..29]
    
    var result = values.years[0];  // 第一年结果
    
    // 2. 显示第一年节省
    $('.fy-savings').text(Math.round(result.savings.year));
    
    // 3. 计算系统回收期
    var total_savings = 0;
    for(var i = 1; i <= values.years.length; i++){
        total_savings += years[i-1].savings.year;
        if(total_savings > total_cost){
            var detPayback = sCalc.detailedPayback(
                i-1, 
                total_savings - years[i-1].savings.year, 
                values.years[i-1].savings.year
            );
            $('#detailed-payback').text(detPayback.string);
            break;
        }
    }
    
    // 4. 有电池时，分别计算电池和太阳能回收期
    if(has_battery) {
        // 电池回收期
        var batteryonly_cost = pData.battery_cost;
        var batt_savings_year0 = values.years[0].savings.year 
                               - values.years[0].savings.year_after_solar;
        // ... 迭代计算
        
        // 太阳能回收期
        var solaronly_cost = total_cost - batteryonly_cost;
        // ... 迭代计算
    }
    
    // 5. 计算10年/20年累计节省
    var ten_year_savings = 0;
    for(var i=1; i<=10; i++)
        ten_year_savings += years[i-1].savings.year;
    
    var twenty_year_savings = ten_year_savings;
    for(var i=11; i<=20; i++)
        twenty_year_savings += years[i-1].savings.year;
}
```

### 6.3 电池单独回收期计算

```javascript
// 电池节省 = 总节省 - 纯太阳能节省
var batt_savings_year0 = values.years[0].savings.year 
                       - values.years[0].savings.year_after_solar;

// 考虑通胀的累计节省
var savings_batteryonly = 0;
for(var j = 0; j <= 10000; j++){
    savings_batteryonly += batt_savings_year0 * Math.pow((1+infl), j);
    if(savings_batteryonly >= batteryonly_cost){
        // 找到回收年份
        break;
    }
}
```

**电池回收期公式：**
```
battery_savings_year_n = battery_savings_year_0 × (1 + inflation)^n
cumulative_battery_savings = Σ battery_savings_year_n
payback_year = min(n) where cumulative_battery_savings >= battery_cost
```

### 6.4 自用率滑块逻辑

```javascript
// 计算最大可能自用率
let maxAvgScr = sCalc.solarCalc.calculateMaxSelfC(v, highestSelfC, highestBatSelfC);
jQuery('#self-consumption-slider .slider').slider({max: maxAvgScr});

// 默认值：最大自用率的一半
let currentValue = Math.round(maxAvgScr / 2);

// 滑块变化时重新计算
jQuery('#self-consumption-slider .slider').slider({
    slide: function(event, ui){
        $('#self-consumption-slider').data('value', ui.value);
        rCalcs.refreshCalc();  // 重新计算所有结果
    }
});
```

### 6.5 逆变器更换成本显示

```javascript
var unitPrice = inverterReplacementCost - inverterReplacementInflation;
$('#inverterReplacementCost').html(
    `Includes an inverter replacement at the 12 year mark. ` 
    + `Replacement cost is $${Math.round(inverterReplacementCost)} ` 
    + `($${Math.round(unitPrice)} for the unit and ` 
    + `$${Math.round(inverterReplacementInflation)} accounting for ${inflation}% inflation)`
);
```

### 6.6 图表数据结构

**累计节省图表 `cumulativeYearly()`：**
```javascript
// 数据列：年份、上网收入累计、自用节省累计、系统成本线
for(var i=0; i<10; i++){
    var year_info = values.years[i];
    exported_agg += year_info.savings.year_exported;  // 上网收入累计
    sc_agg += year_info.savings.year - year_info.savings.year_exported;  // 自用节省累计
    
    data.addRow([i+1, exported_agg, sc_agg, total_cost]);
}
```

**日发电量图表 `generationDaily(month)`：**
```javascript
// 从 production_info 获取小时发电数据
var hourly = production_info.monthly[month - 1].hourly_average;
var daily = production_info.monthly[month - 1].daily;  // 日均发电量

for(var i=0; i<=hourly.length; i++){
    data.addRow([i, hourly[i], tooltip]);
}
```

---

## 9. 完整数据流

```
┌─────────────────────────────────────────────────────────────────────┐
│                         输入页面 (custom.js)                         │
├─────────────────────────────────────────────────────────────────────┤
│  1. 用户输入邮编 → getPostcodeInfo() → 获取州、经纬度、配电商         │
│  2. 根据州加载默认值 → stateDefaults() → FiT, kWhCost, annual_bill  │
│  3. 选择系统容量 → Calcs.cost() → 计算系统总成本                     │
│  4. 选择电池 → Calcs.battery() → 计算电池成本                        │
│  5. 检查FiT限制 → checkFiTRestrictions() → WA/VIC特殊规则           │
│  6. 提交表单 → 后端计算发电量 (PVWatts API)                          │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      后端处理 (服务器端)                              │
├─────────────────────────────────────────────────────────────────────┤
│  • 调用 PVWatts API 获取发电量数据                                   │
│  • 处理 NEM12 智能电表数据（如有）                                    │
│  • 生成 production_info 对象（月发电量、小时曲线）                    │
│  • 返回结果页面                                                      │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    结果页面 (result_debug.js)                        │
├─────────────────────────────────────────────────────────────────────┤
│  1. init() → 初始化计算                                              │
│  2. calculateUsageValuesPerSeason() → 计算季节用电量                 │
│  3. 预计算所有自用率场景 (0-100%)                                     │
│  4. refreshCalc() → 计算并显示结果                                   │
│     - 第一年节省                                                     │
│     - 系统回收期                                                     │
│     - 电池单独回收期（如有）                                          │
│     - 10年/20年累计节省                                              │
│  5. 绑定滑块事件 → 自用率/通胀率变化时重新计算                        │
│  6. 绘制图表 → 累计节省、日发电量、年发电量                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. 关键变量说明

### 8.1 全局变量 (result_debug.js)

| 变量 | 类型 | 说明 |
|------|------|------|
| `generationDailyMax` | number | 日发电量最大值（用于图表Y轴） |
| `highestSelfC` | number | 最高自用率（无电池） |
| `highestBatSelfC` | number | 最高自用率（有电池） |
| `inverterReplacementCost` | number | 逆变器更换总成本（含通胀） |
| `inverterReplacementInflation` | number | 逆变器更换的通胀部分 |
| `energyPlan` | object | 当前选择的能源计划 |
| `values` | object | 缓存的计算结果 |
| `has_battery` | boolean | 是否有电池 |
| `total_cost` | number | 系统总成本 |
| `total_capacity` | number | 系统总容量 (kW) |
| `production_info` | object | 发电量数据（来自后端） |
| `pData` | object | 页面数据（含 battery_cost 等） |

### 8.2 values 对象结构

```javascript
var values = {
    years: [  // 30年数据
        {
            savings: {
                year: 1200,           // 年度总节省
                year_after_solar: 900, // 纯太阳能节省（不含电池）
                year_exported: 300,    // 上网收入
                summer: {...},         // 夏季详情
                autumn: {...},
                winter: {...},
                spring: {...}
            }
        },
        // ... 共30年
    ],
    maxSelfC: {  // 各季节最大自用率
        summer: 0.45,
        autumn: 0.38,
        winter: 0.52,
        spring: 0.40
    }
};
```

---

## 11. Python 实现示例

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

## 12. 总结

### 12.1 已找到的核心计算逻辑

| 功能 | 文件 | 函数/对象 | 状态 |
|------|------|----------|------|
| 季节用电量计算 | shared_calc.js | `calculateUsageValuesPerSeason` | ✅ 完整 |
| 年度节省计算 | shared_calc.js | `calculateYearlyValues` | ✅ 完整 |
| 电池效率和节省 | shared_calc.js | `calculateYearlyValues` | ✅ 完整 |
| 回收期计算 | shared_calc.js | `detailedPayback` | ✅ 完整 |
| 最大自用率计算 | shared_calc.js | `calculateMaxSelfC` | ✅ 完整 |
| 系统成本计算 | custom.js | `Calcs.cost()` | ✅ 完整 |
| 电池成本计算 | custom.js | `Calcs.battery()` | ✅ 完整 |
| 州默认值加载 | custom.js | `Calcs.stateDefaults()` | ✅ 完整 |
| FiT限制检查 | custom.js | `checkFiTRestrictions()` | ✅ 完整 |
| 结果页面刷新 | result_debug.js | `rCalcs.refreshCalc()` | ✅ 完整 |
| 电池单独回收期 | result_debug.js | `refreshCalc()` | ✅ 完整 |
| 图表绑定 | result_debug.js | `graphs.*` | ✅ 完整 |

### 12.2 计算逻辑位置汇总

```
/js/calc/
├── shared_calc.js      # 核心计算逻辑（季节节省、电池、回收期） ✅ 已完整分析
├── custom.js           # 前端成本计算（系统成本、电池成本、州默认值） ✅ 已完整分析
├── result_debug.js     # 结果页面逻辑（刷新计算、图表、滑块绑定） ✅ 已完整分析
├── scripts.js          # 通用UI脚本
├── tooltip.js          # 提示框逻辑
└── electricity_plan_selection.js  # 能源计划选择UI逻辑（非核心计算）
```

### 12.3 关于 `electricity_plan_selection.js`

该文件主要处理能源计划选择的 **UI 交互逻辑**，而非核心计算：
- 能源计划下拉菜单的显示/隐藏
- 电价计划的加载和切换
- TOU（分时电价）的 UI 展示

**TOU 的实际计算逻辑已在 `shared_calc.js` 中：**
```javascript
// 在 calculateYearlyValues 中处理 energyPlan
if(_energyPlan !== undefined) {
    let usageValues = _energyPlan.usageCharge;
    // ... 根据电价计划计算实际电价
}
```

### 12.4 仍需补充的内容

要完全复现计算逻辑，还需要：

1. **NEM12 数据处理** - 后端处理智能电表数据的逻辑
2. **PVWatts API 调用** - 后端获取发电量数据的逻辑
3. **`production_info` 数据结构** - 后端返回的发电量数据格式示例

### 12.5 核心公式速查

```
# 系统成本
total_cost = system_kW × $900                    (无电池)
total_cost = battery_cost + system_kW × $700     (有电池)

# 电池成本
battery_cost = Σ(battery_price + $3000)
custom_battery = capacity_kWh × $750

# 季节用电量
usage = (bill_factor × annual_bill - daily_charge) / kWh_cost

# 自用节省
self_consumption = min(generated × selfC, usage)
savings_selfc = self_consumption × electricity_price

# 上网收入
exported = generated - self_consumption
FiT_income = exported × FiT_rate

# 电池节省
battery_selfc = min(available × discharge_eff, grid_use)
battery_savings = battery_selfc × electricity_price

# 回收期
payback = min(year) where cumulative_savings >= total_cost
```
