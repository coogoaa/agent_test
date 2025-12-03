# SolarQuotes 计算器分析

## 文件说明

| 文件 | 说明 |
|------|------|
| `quote.html.md` | 结果页面的 HTML 源码（精简版） |
| `quote元素.md` | 完整渲染后的页面 HTML（包含浏览器插件等） |
| `html.md` | 其他相关 HTML 内容 |
| `元素.md` | 其他元素内容 |

## 核心计算逻辑分析

### 1. 输入参数（从 `pData` 和 `variables` 提取）

```javascript
// 基础参数
var pData = {
  "calcversion": "simple",
  "postcode": "3000",
  "lat": -37.814563,
  "lon": 144.970267,
  "state": "VIC",
  
  // 太阳能系统
  "solararray": {
    "1": {
      "system_status": "1",
      "system_capacity": "6.6 kW",
      "orientation": "0",      // 朝向：0=北
      "tilt": "23°"            // 倾斜角度
    }
  },
  
  // 电池
  "battery": [{
    "selection": "100",
    "capacity": "5.85",        // 可用容量 kWh
    "efficiency": "90",        // 效率 90%
    "reserve": "20"            // 保留 20%
  }],
  "battery_cost": "10,500",
  
  // 电费参数
  "total_cost": "15,120",      // 系统总成本
  "kWhCost": "27",             // 每度电 27c
  "annual_bill": "1824",       // 年电费 $1824
  "daily_charge": "135.89",    // 日供电费 135.89c
  "FiT": "7",                  // 上网电价 7c
  "export_limit": "5"          // 出口限制 5kW
};
```

### 2. 发电量数据（PVWatts API 计算）

```javascript
// PVWatt 参数
var debug = {
  "PVWatt Params": {
    "array_type": "1",
    "azimuth": "0",
    "tilt": "23",
    "lat": -37.814563,
    "lon": 144.970267,
    "system_capacity": 6.6,
    "dc_ac_ratio": 1.32,
    "module_type": 1,
    "losses": 10.0692455788
  },
  "PVWatt kWh Per Season": {
    "summer": 3062.34,
    "autumn": 2145.16,
    "winter": 1586.9,
    "spring": 2654.68
  }
};

// 年发电量
var generated_year = 9449.08;  // kWh/年

// 月发电量
var generation_data = [
  ["Jan", 1106], ["Feb", 945], ["Mar", 937], ["Apr", 724],
  ["May", 484], ["Jun", 461], ["Jul", 492], ["Aug", 634],
  ["Sep", 725], ["Oct", 969], ["Nov", 961], ["Dec", 1011]
];
```

### 3. 核心变量（`variables` 对象）

```javascript
var variables = {
  "isSimpleMode": true,
  "state": "VIC",
  
  // 州默认值
  "state_defaults": {
    "kWhCost": 27,
    "FiT": 7,
    "daily": 124,
    "annual_bill": 1824,
    "bill_factor": {
      "summer": 0.23138833,
      "autumn": 0.235412475,
      "winter": 0.293762575,
      "spring": 0.23943662
    },
    "self_consumption_ratio": {
      "summer": 38,
      "autumn": 38,
      "winter": 39,
      "spring": 32
    }
  },
  
  // 电池参数
  "battery": [{
    "text": "Generic 10kWh Lithium Battery",
    "data-price": "7500",
    "data-capacity": "10",
    "data-efficiency": "0.9",
    "data-reserve": 0.2,
    "value": 100
  }],
  
  // 财务参数
  "FiT": 7,
  "kWh_cost": 27,
  "annual_bill": "1824",
  "total_cost": 15120,
  "irr_guess": 5,
  "inflation": 3,
  "dc_ac_ratio": "1.32",
  "inverter_cost_per_watt": 0.2,
  
  // 季节发电量
  "generated_season": {
    "summer": 3062.34,
    "autumn": 2145.16,
    "winter": 1586.9,
    "spring": 2654.68
  },
  "generated_year": 9449.08,
  
  // 季节天数
  "days_in_season": {
    "summer": 90,
    "autumn": 92,
    "winter": 92,
    "spring": 91
  },
  
  // 日供电费
  "dailyCharge": 135.89,
  
  // 自用率
  "selfC": 37,
  "reduce_fit": true,
  "reduce_fit_advanced": true
};
```

### 4. 小时发电曲线（`production_info`）

每月包含：
- `month_total`: 月总发电量 (kWh)
- `hourly_average`: 24小时平均发电功率 (W)
- `daily`: 日均发电量 (kWh)

示例（1月）：
```javascript
{
  "month_total": 1106.17,
  "hourly_average": [
    0, 0, 0, 0, 0,           // 0-4点
    80.26, 474.55, 1347.3,   // 5-7点
    2432.04, 3464.12,        // 8-9点
    4208.17, 4260.68,        // 10-11点
    4312.69, 4113.56,        // 12-13点
    3987.27, 3228.3,         // 14-15点
    2281.21, 1254.94,        // 16-17点
    236.71, 1.03,            // 18-19点
    0, 0, 0, 0               // 20-23点
  ],
  "daily": 36
}
```

## 关键 JS 文件（需要获取）

计算逻辑主要在以下外部 JS 文件中：

1. `/js/calc/scripts.js` - 基础脚本
2. `/js/calc/shared_calc.js` - **核心计算逻辑**
3. `/js/calc/custom.js` - 自定义计算
4. `/js/calc/result_debug.js` - 调试/结果展示

## 需要补充的内容

要完整还原计算逻辑，需要：

1. **获取 JS 文件内容**
   - `https://www.solarquotes.com.au/js/calc/shared_calc.js`
   - `https://www.solarquotes.com.au/js/calc/custom.js`
   - `https://www.solarquotes.com.au/js/calc/result_debug.js`

2. **确认计算公式**
   - 季节账单计算
   - 自用率计算（含电池）
   - 投资回报期计算
   - 10年/20年累计节省计算

## 已知计算结果

从页面可以看到的输出：
- 第一年节省: 显示在 `.fy-savings`
- 简单回收期: 显示在 `#payback`
- 10年节省: 显示在 `.ten-year-savings`
- 20年节省: 显示在 `.twenty-year-savings`
- 季节账单: 显示在 `#summer-savings`, `#autumn-savings` 等

## 下一步

1. 下载并分析 JS 文件
2. 提取核心计算函数
3. 用 Python/JS 重新实现计算逻辑
