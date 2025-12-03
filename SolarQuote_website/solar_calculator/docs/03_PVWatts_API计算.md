# PVWatts API 计算

本文档详细说明 PVWatts API 的调用过程和发电量计算逻辑。

---

## 1. 数据流概览

```
┌─────────────────────────────────────────────────────────────┐
│                   PVWatts API 计算                           │
├─────────────────────────────────────────────────────────────┤
│ 输入: lat, lon, system_capacity, azimuth, tilt              │
│ 输出: 月发电量、小时发电曲线、年发电量                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. API 调用参数

### 2.1 必需参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| lat | float | 纬度 | -37.814563 |
| lon | float | 经度 | 144.970267 |
| system_capacity | float | 系统容量 (kW) | 6.6 |
| azimuth | int | 朝向角度 (0=北, 90=东, 180=南, 270=西) | 0 |
| tilt | int | 倾斜角度 (度) | 23 |

### 2.2 固定参数 (默认值)

| 参数 | 默认值 | 说明 |
|------|--------|------|
| array_type | 1 | 固定倾斜屋顶安装 |
| module_type | 1 | 标准模块 |
| losses | 10.07 | 系统损耗百分比 |
| dc_ac_ratio | 1.32 | 直流/交流比 |

### 2.3 array_type 选项

| 值 | 说明 |
|----|------|
| 0 | 固定开放式支架 |
| 1 | 固定倾斜屋顶 (默认) |
| 2 | 单轴跟踪 |
| 3 | 单轴跟踪带倾斜 |
| 4 | 双轴跟踪 |

### 2.4 module_type 选项

| 值 | 说明 |
|----|------|
| 0 | 标准模块 |
| 1 | 高级模块 (默认) |
| 2 | 薄膜模块 |

---

## 3. API 请求示例

### 3.1 请求 URL

```
https://developer.nrel.gov/api/pvwatts/v8.json
```

### 3.2 请求参数

```javascript
{
    api_key: 'YOUR_API_KEY',
    lat: -37.814563,
    lon: 144.970267,
    system_capacity: 6.6,
    azimuth: 0,
    tilt: 23,
    array_type: 1,
    module_type: 1,
    losses: 10.07,
    dc_ac_ratio: 1.32
}
```

---

## 4. API 返回数据

### 4.1 返回数据结构

```javascript
{
    "inputs": {
        "lat": -37.814563,
        "lon": 144.970267,
        "system_capacity": 6.6,
        "azimuth": 0,
        "tilt": 23,
        "array_type": 1,
        "module_type": 1,
        "losses": 10.07,
        "dc_ac_ratio": 1.32
    },
    "outputs": {
        "ac_monthly": [1106, 945, 937, 724, 484, 461, 492, 634, 725, 969, 961, 1011],
        "ac_annual": 9449,
        "solrad_monthly": [6.82, 5.94, 5.12, 3.67, 2.37, 2.14, 2.41, 3.30, 4.35, 5.33, 5.87, 6.24],
        "solrad_annual": 4.46,
        "capacity_factor": 16.3
    }
}
```

### 4.2 输出字段说明

| 字段 | 单位 | 说明 |
|------|------|------|
| ac_monthly | kWh | 每月交流电发电量 (12个值) |
| ac_annual | kWh | 年度总发电量 |
| solrad_monthly | kWh/m²/day | 每月平均日辐射量 |
| solrad_annual | kWh/m²/day | 年平均日辐射量 |
| capacity_factor | % | 容量因子 |

---

## 5. 发电量数据处理

### 5.1 月发电量转换

```javascript
// 后端返回的 generation_data
var generation_data = [
    ["Jan", 1106],
    ["Feb", 945],
    ["Mar", 937],
    ["Apr", 724],
    ["May", 484],
    ["Jun", 461],
    ["Jul", 492],
    ["Aug", 634],
    ["Sep", 725],
    ["Oct", 969],
    ["Nov", 961],
    ["Dec", 1011]
];
```

### 5.2 季节发电量计算

```javascript
// 文件: 后端处理 (production_info)

// 季节月份映射
const seasonMonths = {
    summer: ['Dec', 'Jan', 'Feb'],  // 12月, 1月, 2月
    autumn: ['Mar', 'Apr', 'May'],  // 3月, 4月, 5月
    winter: ['Jun', 'Jul', 'Aug'],  // 6月, 7月, 8月
    spring: ['Sep', 'Oct', 'Nov']   // 9月, 10月, 11月
};

// 计算各季节发电量
var generated_season = {
    summer: 1011 + 1106 + 945,  // Dec + Jan + Feb = 3062
    autumn: 937 + 724 + 484,    // Mar + Apr + May = 2145
    winter: 461 + 492 + 634,    // Jun + Jul + Aug = 1587
    spring: 725 + 969 + 961     // Sep + Oct + Nov = 2655
};

// 年发电量
var generated_year = 3062 + 2145 + 1587 + 2655;  // = 9449 kWh
```

### 5.3 production_info 对象

```javascript
// 后端生成的 production_info 对象
var production_info = {
    "lat": -42.7521,
    "lon": 147.2753,
    "capacity": 6.6,
    "tilt": 23,
    "azimuth": 0,
    "dc_ac_ratio": 1.32,
    "losses": 10.07,
    "array_type": 1,
    "module_type": 1,
    "annual": 9449,
    "monthly": {
        "1": 1106,   // January
        "2": 945,    // February
        "3": 937,    // March
        "4": 724,    // April
        "5": 484,    // May
        "6": 461,    // June
        "7": 492,    // July
        "8": 634,    // August
        "9": 725,    // September
        "10": 969,   // October
        "11": 961,   // November
        "12": 1011   // December
    },
    "hourly": [/* 8760个小时数据 */]
};
```

---

## 6. 多阵列处理

### 6.1 多阵列输入

```javascript
// 用户可以添加多个太阳能阵列
var solarArrays = [
    {
        capacity: 6.6,
        azimuth: 0,      // 北向
        tilt: 23,
        status: 1        // 新安装
    },
    {
        capacity: 3.3,
        azimuth: 270,    // 西向
        tilt: 15,
        status: 1        // 新安装
    }
];
```

### 6.2 多阵列发电量合并

```javascript
// 后端对每个阵列分别调用 PVWatts API
// 然后合并发电量

var totalGeneration = {
    summer: 0,
    autumn: 0,
    winter: 0,
    spring: 0
};

solarArrays.forEach(function(array) {
    var pvwattsResult = callPVWattsAPI(array);
    
    totalGeneration.summer += pvwattsResult.summer;
    totalGeneration.autumn += pvwattsResult.autumn;
    totalGeneration.winter += pvwattsResult.winter;
    totalGeneration.spring += pvwattsResult.spring;
});
```

---

## 7. 小时发电曲线

### 7.1 典型日发电曲线

```javascript
// 每小时发电量 (示例: 夏季典型日)
var hourlyGeneration = [
    0,      // 00:00
    0,      // 01:00
    0,      // 02:00
    0,      // 03:00
    0,      // 04:00
    0.1,    // 05:00
    0.5,    // 06:00
    1.2,    // 07:00
    2.5,    // 08:00
    4.0,    // 09:00
    5.2,    // 10:00
    5.8,    // 11:00
    6.0,    // 12:00 (峰值)
    5.8,    // 13:00
    5.2,    // 14:00
    4.0,    // 15:00
    2.5,    // 16:00
    1.2,    // 17:00
    0.5,    // 18:00
    0.1,    // 19:00
    0,      // 20:00
    0,      // 21:00
    0,      // 22:00
    0       // 23:00
];
```

### 7.2 用于图表显示

```javascript
// 文件: result_debug.js

// 日发电量图表数据
var generationDaily = {
    columns: [
        ['x', '12am', '1am', '2am', /* ... */ '11pm'],
        ['Summer', 0, 0, 0, /* ... */ 0],
        ['Autumn', 0, 0, 0, /* ... */ 0],
        ['Winter', 0, 0, 0, /* ... */ 0],
        ['Spring', 0, 0, 0, /* ... */ 0]
    ]
};
```

---

## 8. 发电量到 variables 的映射

### 8.1 variables 中的发电量数据

```javascript
var variables = {
    // ... 其他属性
    
    // 季节发电量 (kWh)
    "generated_season": {
        "summer": 3062.34,
        "autumn": 2145.16,
        "winter": 1586.90,
        "spring": 2654.68
    },
    
    // 年发电量 (kWh)
    "generated_year": 9449.08,
    
    // 季节天数
    "days_in_season": {
        "summer": 90,
        "autumn": 92,
        "winter": 92,
        "spring": 91
    }
};
```

### 8.2 日均发电量计算

```javascript
// 计算每季节日均发电量
var dailyGeneration = {
    summer: generated_season.summer / days_in_season.summer,  // 3062/90 = 34.03 kWh/day
    autumn: generated_season.autumn / days_in_season.autumn,  // 2145/92 = 23.32 kWh/day
    winter: generated_season.winter / days_in_season.winter,  // 1587/92 = 17.25 kWh/day
    spring: generated_season.spring / days_in_season.spring   // 2655/91 = 29.18 kWh/day
};
```

---

## 9. 发电量影响因素

### 9.1 朝向影响

| 朝向 | 角度 | 相对发电量 (澳洲) |
|------|------|------------------|
| 北 | 0° | 100% (最佳) |
| 东北/西北 | 45°/315° | ~95% |
| 东/西 | 90°/270° | ~85% |
| 东南/西南 | 135°/225° | ~75% |
| 南 | 180° | ~60% (最差) |

### 9.2 倾角影响

| 纬度 | 最佳倾角 | 说明 |
|------|----------|------|
| 20°S | 15-20° | 北昆士兰 |
| 30°S | 25-30° | 悉尼、布里斯班 |
| 35°S | 30-35° | 墨尔本、阿德莱德 |
| 40°S | 35-40° | 霍巴特 |

### 9.3 损耗因素

```javascript
// 系统损耗 = 10.07%
// 包含:
// - 污染和遮挡: 2%
// - 温度损耗: 3%
// - 线缆损耗: 2%
// - 逆变器效率损耗: 3%
// - 其他: 0.07%
```

---

## 10. 示例计算

### 10.1 输入参数

```
位置: 墨尔本 (lat: -37.81, lon: 144.97)
系统容量: 6.6 kW
朝向: 北 (0°)
倾角: 23°
```

### 10.2 API 返回

```javascript
{
    ac_monthly: [1106, 945, 937, 724, 484, 461, 492, 634, 725, 969, 961, 1011],
    ac_annual: 9449
}
```

### 10.3 季节发电量

```
Summer (Dec+Jan+Feb): 1011 + 1106 + 945 = 3062 kWh
Autumn (Mar+Apr+May): 937 + 724 + 484 = 2145 kWh
Winter (Jun+Jul+Aug): 461 + 492 + 634 = 1587 kWh
Spring (Sep+Oct+Nov): 725 + 969 + 961 = 2655 kWh
─────────────────────────────────────────────────
Total Annual: 9449 kWh
```

### 10.4 日均发电量

```
Summer: 3062 / 90 = 34.02 kWh/day
Autumn: 2145 / 92 = 23.32 kWh/day
Winter: 1587 / 92 = 17.25 kWh/day
Spring: 2655 / 91 = 29.18 kWh/day
─────────────────────────────────────────────────
Average: 9449 / 365 = 25.89 kWh/day
```
