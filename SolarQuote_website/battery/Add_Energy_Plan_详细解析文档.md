# Add your Energy Plan 详细解析文档

## 概述

本文档详细解析 SolarQuotes Battery Calculator 中 "Add your Energy Plan" 功能的完整实现，包括电力供应商、计划类别、州匹配映射、所有预设值（Blocks、Rate等）以及详细的业务逻辑。

---

## 一、组件架构

### 1.1 核心组件

```
CreateEnergyPlanPopup (主组件)
├── SQToggleButton (计划类型切换)
├── SQSwitch (季节费率/每日费率开关)
├── FlexiblePeriod (费率周期管理)
│   ├── BlockRatesInput (单一费率输入)
│   ├── TimeOfUsePlan (分时电价输入)
│   │   ├── DifferentDailyRatesSelector (每日费率选择器)
│   │   └── TimesOfUseBlocks (时段区块)
│   └── SupplyCharge (供电费输入)
├── FiT Section (上网电价)
│   ├── Fixed Rate (固定费率)
│   ├── Time Periods (时段费率)
│   └── Volume Tiers (阶梯费率)
└── Total Discount (折扣)
```

### 1.2 文件依赖

| 文件 | 功能 |
|------|------|
| `battery.html.md` | 主组件定义 (CreateEnergyPlanPopup) |
| `electricity_plan_selection.js.md` | 零售商列表、API调用、计划保存 |
| `calc-shared_calc.js.md` | 邮编信息获取、状态默认值 |

---

## 二、电力供应商 (Retailers)

### 2.1 零售商获取逻辑

```javascript
// API 端点
POST /battery-storage/calculator/ajaxSearchRetailers/
Body: { postcode: '3000' }
Response: { retailers: ['Origin Energy', 'AGL', 'EnergyAustralia', ...] }
```

### 2.2 零售商列表更新流程

```javascript
updateRetailersList: function () {
    const postcode = $('#postcode').val();
    if (!postcode) return;

    $.post({
        url: '/battery-storage/calculator/ajaxSearchRetailers/',
        data: { postcode: postcode },
        success: (result) => {
            this.retailersList = result.retailers || [];
            // 填充下拉列表
            this.retailersList.forEach((retailer) => {
                retailerDropdown.addOption(
                    `<p class="retailer-name">${retailer}</p>`,
                    retailer
                );
            });
        }
    });
}
```

### 2.3 零售商选择事件

```javascript
const retailerChanged = (event) => {
    currentPeriod.value = 0;
    selectedRetailer.value = event.target.value;
    updateDefaultPlan();  // 触发默认计划加载
    localStorage.setItem('retailer-create-plan', event.target.value);  // 本地存储
}
```

---

## 三、计划类别 (Plan Types)

### 3.1 计划类型常量

```javascript
const TIME_OF_USE = 'Time of Use';  // 分时电价
const SINGLE_RATE = 'Single Rate';  // 单一费率
```

### 3.2 计划类型映射

| 用户界面 | 内部代码 | 存储格式 |
|---------|---------|---------|
| Single Rate | `SINGLE_RATE` | `SR` |
| Time of Use | `TIME_OF_USE` | `TOU` |
| Single Rate + Controlled Load | - | `SRCL` |
| Time of Use + Controlled Load | - | `TOUCL` |

### 3.3 计划类型切换逻辑

```javascript
const selectedPlanTypeChanged = (type) => {
    if(currentPeriod.value > 0 && type == SINGLE_RATE) 
        currentPeriod.value = 0;
    if(type == SINGLE_RATE) 
        differentDailyRatesStatus.value = false;
    selectedPlan.value = type;
    updateDefaultPlan();  // 重新加载默认计划
}
```

---

## 四、州匹配与映射

### 4.1 邮编到州的映射

通过 `sCalc.getPostcodeInfo()` 获取：

```javascript
$('#postcode').on('keyup change', (e) => {
    if ($(e.target).val().length >= 3) {
        sCalc.getPostcodeInfo($(e.target), window.calcs.stateDefaults, {
            callback: (oldState, newState) => {
                if (oldState !== newState) {
                    ElectricityPlanSelection.resetPlan();  // 州变化时重置计划
                }
                ElectricityPlanSelection.updateRetailersList();
            },
        });
    }
});
```

### 4.2 默认计划搜索参数

```javascript
// API 端点
POST /battery-storage/calculator/ajaxSearchDefaultPlan/
Body: {
    planType: 'Time of Use',           // 计划类型
    multipleTariffPeriods: false,      // 是否多季节费率
    controlledLoad: false,             // 是否有控制负载
    retailer: 'Origin Energy',         // 零售商
    postcode: '3000',                  // 邮编
    state: 'VIC'                       // 州
}
Response: {
    energyPlan: {...},
    ratesStructure: {...}
}
```

### 4.3 州特定的默认值

参见 `state_defaults` 对象，包含各州的：
- `kWhCost`: 电价 (c/kWh)
- `FiT`: 上网电价 (c/kWh)
- `daily`: 日供电费 (c/day)
- `annual_bill`: 年度账单 ($)
- `bill_factor`: 季节账单因子
- `self_consumption_ratio`: 自用率比例
- `charge`: 季节固定费用

---

## 五、费率周期结构 (Periods)

### 5.1 默认周期结构

```javascript
const defaultPeriodsStructure = [
    {
        name: 'Summer',
        startDate: '',
        endDate: '',
        dailySupplyCharge: '',
        demandCharge: null
    },
    {
        name: 'Winter',
        startDate: '',
        endDate: '',
        dailySupplyCharge: '',
        demandCharge: null
    }
];
```

### 5.2 周期数据结构

```javascript
// 单一费率周期
{
    name: 'Summer',
    startDate: '01/12',
    endDate: '28/02',
    dailySupplyCharge: 114,      // c/day (含GST)
    demandCharge: null,
    planType: 'Single Rate',
    data: {
        blockPeriod: 'D',
        blockRates: [
            { rate: 36.00, volume: null }
        ]
    }
}

// 分时电价周期
{
    name: 'Summer',
    startDate: '01/12',
    endDate: '28/02',
    dailySupplyCharge: 114,
    demandCharge: 16.5,
    planType: 'Time of Use',
    data: {
        brokenDownBlocks: {...},
        touBlock: [...]
    }
}
```

---

## 六、Block Rates 预设结构

### 6.1 用电费率初始结构

```javascript
const usageChargeInitialStructure = {
    blockPeriod: 'D',           // 默认按日计算
    blockRates: [
        { rate: null, volume: null }
    ],
};
```

### 6.2 Block Period 选项

| 代码 | 显示名称 | 说明 |
|------|---------|------|
| `D` | Day | 每日 |
| `M` | Month | 每月 |
| `3M` | Quarter | 每季度 |
| `Y` | Year | 每年 |

### 6.3 Block Rates 数据结构

```javascript
// 单一费率
blockRates: [
    { rate: 36.00, volume: null }  // 36c/kWh 全部用电
]

// 阶梯费率
blockRates: [
    { rate: 28.00, volume: 10 },   // 前10kWh: 28c/kWh
    { rate: 35.00, volume: 20 },   // 接下来20kWh: 35c/kWh
    { rate: 42.00, volume: null }  // 剩余: 42c/kWh
]
```

### 6.4 Block Rates 显示逻辑

```javascript
// 根据位置显示不同文本
if(i == 0) {
    if(blockRates.length > 1) {
        spanText = 'c/kWh for the first';
    } else {
        spanText = 'c/kWh for all usage';
    }
} else {
    if(i == blockRates.length - 1) {
        spanText = 'c/kWh for all remaining usage';
    } else {
        spanText = 'c/kWh for the next';
    }
}
```

---

## 七、分时电价 (Time of Use) 结构

### 7.1 TOU 初始结构

```javascript
const touInitialStructure = [
    {
        name: 'Peak',
        blockPeriod: 'D',
        blockRates: [{ rate: null, volume: null }],
        timeOfUse: [
            { days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ], startTime: 0, endTime: 59 },
            { days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ], startTime: 600, endTime: 959 },
            { days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ], startTime: 1500, endTime: 2359 },
        ],
    },
    {
        name: 'Off-Peak',
        blockPeriod: 'D',
        blockRates: [{ rate: null, volume: null }],
        timeOfUse: [
            { days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ], startTime: 100, endTime: 559 },
        ],
    },
    {
        name: 'Shoulder',
        blockPeriod: 'D',
        blockRates: [{ rate: null, volume: null }],
        timeOfUse: [
            { days: [ BUSINESS_DAYS, SATURDAY, SUNDAY ], startTime: 1000, endTime: 1459 },
        ],
    },
];
```

### 7.2 日期常量定义

```javascript
const BUSINESS_DAYS = 'Business Days';
const SUNDAY = 'Sunday';
const MONDAY = 'Monday';
const TUESDAY = 'Tuesday';
const WEDNESDAY = 'Wednesday';
const THURSDAY = 'Thursday';
const FRIDAY = 'Friday';
const SATURDAY = 'Saturday';
const OTHERS = 'Others';

const THE_BUSINESS_DAYS = [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY];

const DAY_ORDER = {
    Sunday: 1,
    Monday: 2,
    Tuesday: 3,
    Wednesday: 4,
    Thursday: 5,
    Friday: 6,
    Saturday: 7,
    Others: 8,
};
```

### 7.3 不同每日费率结构

```javascript
const differentDailyRatesInitialStructure = [
    {
        name: null,
        blockPeriod: 'D',
        blockRates: [{ rate: null, volume: null }],
        timeOfUse: [
            { days: [ OTHERS ], startTime: 0, endTime: 2359 },
        ],
    },
];
```

### 7.4 TOU Block 颜色映射

```javascript
let colors = ['var(--denim)', 'var(--punch)', 'var(--rum)', 'var(--heather)'];
// Peak: denim (蓝色)
// Off-Peak: punch (红色)
// Shoulder: rum (棕色)
// 其他: heather (紫色)
```

---

## 八、上网电价 (Feed-in Tariff) 模式

### 8.1 FiT 模式选项

```javascript
const fitMode = useSignal('Fixed Rate');
// 可选值: 'Fixed Rate', 'Time Periods', 'Volume Tiers'
```

### 8.2 Fixed Rate 模式

```javascript
// 初始值
solarFit.value = null;

// 保存格式
fit = [{
    rate: parseFloat(solarFit.value),
    type: 'R',
    description: 'Retailer Feed-in Tariff',
}];
```

### 8.3 Time Periods 模式

```javascript
// 初始值
solarFit.value = [
    { startTime: '00:00', endTime: '23:59', rate: null }
];

// 添加新时段
const incrementFitTP = () => {
    solarFit.value.push({ startTime: '', endTime: '', rate: null });
    // 自动链接时间
    if(solarFit.value.length > 1) {
        solarFit.value[solarFit.value.length - 2].endTime = '';
        solarFit.value[solarFit.value.length - 1].endTime = solarFit.value[0].startTime;
    }
};

// 保存格式
fit = solarFit.value.map((fit) => {
    return {
        startTime: parseTime(fit.startTime),
        endTime: endTime,  // 处理边界
        rate: parseFloat(fit.rate),
    };
});
```

### 8.4 Volume Tiers 模式

```javascript
// 初始值
solarFit.value = [
    { rate: null, volume: null },
    { rate: null }  // 最后一个没有volume
];

// 添加新层级
const incrementFitTier = () => {
    solarFit.value.splice(solarFit.value.length - 1, 0, { rate: null, volume: null });
};

// 保存格式
fit = solarFit.value.map((fit, index) => ({
    rate: parseFloat(fit.rate),
    volume: index < solarFit.value.length - 1 ? parseFloat(fit.volume) : null,
}));
```

---

## 九、供电费与需量费

### 9.1 供电费 (Supply Charge)

```javascript
// 输入格式: c/day (含GST)
// 存储格式: $/day (不含GST)

// 保存时转换
dailySupplyCharge: period.dailySupplyCharge / 1.1
```

### 9.2 需量费 (Demand Charge)

```javascript
// 可选字段，默认隐藏
const showDemandCharge = useSignal(false);

// 输入格式: c/kW/day (含GST)
// 存储格式: $/kW/day (不含GST)

// 保存时转换
demandCharge: period.demandCharge ? period.demandCharge / 1.1 : null
```

### 9.3 费率警告逻辑

```javascript
// 检测是否误输入美元而非澳分
const looksLikeDollars = (value, threshold = 1) => {
    const numeric = parseFloat(value);
    return !Number.isNaN(numeric) && numeric > 0 && numeric < threshold;
};

// 供电费阈值: 2 (即 < $2/day 可能是误输入)
// 用电费率阈值: 1 (即 < $1/kWh 可能是误输入)
```

---

## 十、折扣 (Discounts)

### 10.1 折扣输入

```javascript
const totalDiscount = useSignal('0');

// 输入范围: 0-100 (百分比)
```

### 10.2 折扣保存格式

```javascript
let discountList = [];
if(totalDiscount.value != '0') {
    discountList.push({
        name: `${totalDiscount.value}% Guaranteed Discount`,
        type: 'U',  // U = Usage discount
        description: `${totalDiscount.value}% off electricity usage and supply charges.`,
        discountPercent: parseFloat(totalDiscount.value),
    });
}
```

---

## 十一、完整计划保存结构

### 11.1 保存函数

```javascript
const saveEnergyPlan = () => {
    // 1. 确定费率类型
    var tariffType = selectedPlan.value == TIME_OF_USE ? 'TOU' : 'SR';
    if(controlledLoad.value) tariffType += 'CL';
    
    // 2. 处理 FiT
    var fit = processFiT();
    
    // 3. 处理费率周期
    let tariffPeriod = processPeriods();
    
    // 4. 处理折扣
    let discountList = processDiscounts();
    
    // 5. 构建合同结构
    let contract = {
        pricingModel: selectedPlan.value == TIME_OF_USE ? 'TOU' : 'SR',
        solarFit: fit,
        controlledLoad: {},
        tariffPeriod: tariffPeriod,
        discount: discountList,
        weekdayRates: {
            differentDailyRatesStatus: differentDailyRatesStatus.value,
        },
    };
    
    // 6. 构建计划数据
    let data = {
        planId: 'CUSTOM',
        planName: 'Custom',
        customerType: 'R',  // R = Residential
        retailerName: selectedRetailer.value,
        tariffType: tariffType,
        contract: [contract],
    };
    
    // 7. 构建最终计划对象
    let energyPlan = {
        planId: 'CUSTOM',
        planData: data,
    };
    
    onPlanSaved(energyPlan);
}
```

### 11.2 完整计划 JSON 示例

```json
{
    "planId": "CUSTOM",
    "planData": {
        "planId": "CUSTOM",
        "planName": "Custom",
        "customerType": "R",
        "retailerName": "Origin Energy",
        "tariffType": "TOU",
        "contract": [{
            "pricingModel": "TOU",
            "solarFit": [{
                "rate": 8.0,
                "type": "R",
                "description": "Retailer Feed-in Tariff"
            }],
            "controlledLoad": {},
            "tariffPeriod": [{
                "name": "All Year",
                "startDate": "2024-01-01",
                "endDate": "2024-12-31",
                "dailySupplyCharge": 1.036,
                "demandCharge": null,
                "touBlock": [{
                    "type": "simplified",
                    "name": "Peak",
                    "blockPeriod": "P1D",
                    "blockRate": [{
                        "volume": null,
                        "unitPrice": 0.3727
                    }],
                    "timeOfUse": {
                        "Business Days": "st:1400;et:2000"
                    }
                }, {
                    "type": "simplified",
                    "name": "Off-Peak",
                    "blockPeriod": "P1D",
                    "blockRate": [{
                        "volume": null,
                        "unitPrice": 0.1654
                    }],
                    "timeOfUse": {
                        "Business Days": "st:2200;et:700",
                        "Saturday": "st:0;et:2359",
                        "Sunday": "st:0;et:2359"
                    }
                }, {
                    "type": "simplified",
                    "name": "Shoulder",
                    "blockPeriod": "P1D",
                    "blockRate": [{
                        "volume": null,
                        "unitPrice": 0.2481
                    }],
                    "timeOfUse": {
                        "Business Days": "st:700;et:1400|st:2000;et:2200"
                    }
                }]
            }],
            "discount": [{
                "name": "10% Guaranteed Discount",
                "type": "U",
                "description": "10% off electricity usage and supply charges.",
                "discountPercent": 10
            }],
            "weekdayRates": {
                "differentDailyRatesStatus": false
            }
        }]
    }
}
```

---

## 十二、GST 处理规则

### 12.1 输入与存储转换

| 字段 | 用户输入 | 存储格式 | 转换公式 |
|------|---------|---------|---------|
| 用电费率 | 含GST (c/kWh) | 不含GST ($/kWh) | `rate / 1.1 / 100` |
| 供电费 | 含GST (c/day) | 不含GST ($/day) | `charge / 1.1 / 100` |
| 需量费 | 含GST (c/kW/day) | 不含GST ($/kW/day) | `charge / 1.1 / 100` |
| 上网电价 | 不含GST (c/kWh) | 不含GST (c/kWh) | 无转换 |

### 12.2 加载时的转换

```javascript
// 从API加载时，添加GST
for(const block of blockRates) {
    block.rate = parseFloat(((block.rate * 1.1) * 100).toFixed(2));
}

period.dailySupplyCharge = parseFloat((ratesStructure.dailySupplyChargeGST * 100).toFixed(2));
```

### 12.3 保存时的转换

```javascript
// 保存时，移除GST
let rates = data.blockRates.map((rate) => {
    return { 
        volume: rate.volume ? parseFloat(rate.volume) : null, 
        unitPrice: parseFloat(rate.rate) / 1.1 / 100
    };
});

tariff.dailySupplyCharge = period.dailySupplyCharge / 1.1 / 100;
```

---

## 十三、时间格式处理

### 13.1 时间格式函数

```javascript
// 整数时间 → 可读时间
function formatTime(time) {
    if (typeof time === 'string' && time.includes(':')) return time;
    if (time % 100 == 59) time += 41;
    if (time >= 2400) time = 2359;
    
    let hours = Math.floor(time / 100);
    let minutes = time % 100;
    let minutesStr = minutes < 10 ? '0' + minutes : minutes;
    let hoursStr = hours < 10 ? '0' + hours : hours;
    return hoursStr + ':' + minutesStr;
}

// 可读时间 → 整数时间
function parseTime(time) {
    return parseInt(time.replace(':', ''));
}
```

### 13.2 时间舍入到30分钟

```javascript
function roundToNearest30(valInt) {
    let hours = Math.floor(valInt / 100);
    let minutes = valInt % 100;

    if (minutes < 15) {
        minutes = 0;
    } else if (minutes < 45) {
        minutes = 30;
    } else {
        hours += 1;
        minutes = 0;
    }

    return hours * 100 + minutes;
}
```

### 13.3 时间边界处理

```javascript
// 保存时处理结束时间边界
if (parseTime(fit.endTime) == 0) {
    endTime = 2359;
} else {
    const modEndTime = parseTime(fit.endTime) % 100;
    endTime = (modEndTime == 29 || modEndTime == 59) 
        ? parseTime(fit.endTime) 
        : parseTime(fit.endTime) - 1;
}
if (endTime % 100 >= 60) endTime -= 40;
```

---

## 十四、日期格式处理

### 14.1 日期格式

```javascript
// 用户输入格式: DD/MM (如 "01/12" = 12月1日)
// API存储格式: YYYY-MM-DD (如 "2024-12-01")
```

### 14.2 日期转换函数

```javascript
// DD/MM → YYYY-MM-DD
const parseDateToSave = (date, nextYear = false) => {
    let parts = date.split('/');
    let currentYear = new Date().getFullYear() + (nextYear ? 1 : 0);
    return `${currentYear}-${parts[1]}-${parts[0]}`;
}

// YYYY-MM-DD → DD/MM
function formatDateInDDMM(date) {
    if (date == '') return '';
    if (date.includes('/')) {
        let parts = date.split('/');
        return parts[0] + '/' + parts[1];
    } else {
        let parts = date.split('-');
        return parts[2] + '/' + parts[1];
    }
}
```

### 14.3 日期减一天

```javascript
const remove1Day = (date) => {
    if(date == '') return '';
    let parts = date.split('/');
    let currentYear = new Date().getFullYear();
    let dateObj = new Date(currentYear, parseInt(parts[1]) - 1, parseInt(parts[0]));
    dateObj.setDate(dateObj.getDate() - 1);
    return `${padNumber(dateObj.getDate())}/${padNumber(dateObj.getMonth() + 1)}`;
}
```

---

## 十五、验证规则

### 15.1 必填字段验证

```javascript
// 单一费率必填字段
var required = [ 
    period.startDate, 
    period.endDate, 
    period.dailySupplyCharge, 
    period.name,
    period.data.blockPeriod
];

// 阶梯费率额外验证
for(var i = 0; i < period.data.blockRates.length; i++) {
    let block = period.data.blockRates[i];
    if(i != period.data.blockRates.length - 1) 
        required.push(block.volume);  // 非最后一个需要volume
    required.push(block.rate);  // 所有都需要rate
}
```

### 15.2 分时电价验证

```javascript
// TOU 必填字段
for(const tblock of touBlock) {
    required.push(tblock.name);
    for(var i = 0; i < tblock.blockRates.length; i++) {
        if(i != tblock.blockRates.length - 1) 
            required.push(tblock.blockRates[i].volume);
        required.push(tblock.blockRates[i].rate);
    }
}

// 时段验证
for(const key of Object.keys(brokenDownBlocks)) {
    let brokenDownBlockArray = brokenDownBlocks[key];
    let fieldsToAdd = brokenDownBlockArray.map((block) => { 
        return [ block.startTime, block.endTime, block.name ]; 
    }).flat();
    required = [ ...required, ...fieldsToAdd ];
}
```

### 15.3 美元/澳分检测

```javascript
// 检测是否误输入美元
const looksLikeDollars = (value, threshold = 1) => {
    const numeric = parseFloat(value);
    return !Number.isNaN(numeric) && numeric > 0 && numeric < threshold;
};

// 如果检测到可能是美元，禁用保存按钮
<button disabled=${invalidFields.value || hasDollarRate.value || loadingDefaultPlan.value}>
    Confirm
</button>
```

---

## 十六、API 端点汇总

| 端点 | 方法 | 用途 |
|------|------|------|
| `/battery-storage/calculator/ajaxSearchRetailers/` | POST | 获取零售商列表 |
| `/battery-storage/calculator/ajaxSearchDefaultPlan/` | POST | 获取默认计划 |
| `/battery-storage/calculator/getEnergyPlans/` | GET | 获取能源计划列表 |

---

## 十七、状态管理

### 17.1 Preact Signals 状态

```javascript
const fitMode = useSignal('Fixed Rate');
const solarFit = useSignal([]);
const selectedPlan = useSignal(SINGLE_RATE);
const controlledLoad = useSignal(false);
const totalDiscount = useSignal('0');
const selectedRetailer = useSignal(null);
const useDifferentRates = useSignal(false);
const useControlledLoad = useSignal(false);
const periods = useSignal(JSON.parse(JSON.stringify(defaultPeriodsStructure)));
const currentPeriod = useSignal(0);
const loadingDefaultPlan = useSignal(false);
const foundDefaultPlan = useSignal(false);
const invalidFields = useSignal(false);
const invalidPeriods = useSignal([]);
const hasDollarRate = useSignal(false);
const showDemandCharge = useSignal(false);
const differentDailyRatesStatus = useSignal(false);
```

### 17.2 表单重置逻辑

```javascript
const resetForm = () => {
    if (initialPlanData.value && initialRatesData.value) {
        // 如果有初始数据，重新加载
        selectedRetailer.value = initialPlanData.value.providerName;
        loadedDefaultPlan({
            energyPlan: initialPlanData.value,
            ratesStructure: initialRatesData.value
        });
    } else {
        // 否则重置为默认值
        fitMode.value = 'Fixed Rate';
        solarFit.value = [];
        selectedPlan.value = SINGLE_RATE;
        // ... 重置所有状态
    }
};
```

---

## 十八、计划保存后的处理

### 18.1 URL 更新

```javascript
onPlanSaved: (plan) => {
    // 保存到隐藏字段
    $('#custom-plan').val(JSON.stringify(plan));
    
    // 生成显示名称
    const retailerName = plan?.planData?.retailerName || '';
    const tariffType = {
        SR: 'Single Rate',
        TOU: 'Time of Use',
    }[plan?.planData?.tariffType] || 'Custom';
    const customPlanDisplayName = `${retailerName} ${tariffType} Plan`;
    
    // 序列化表单数据
    const form = document.querySelector(".form-calculator");
    const dataObj = serializeForm(form);
    dataObj['custom-plan-display-name'] = customPlanDisplayName;
    
    // Base64 编码并更新URL
    const json = JSON.stringify(dataObj);
    const encoded = encodeURIComponent(btoa(json));
    const url = new URL(window.location.href);
    url.searchParams.set('data', encoded);
    url.hash = '!create-plan';
    
    window.location.href = url.toString();
}
```

---

*文档版本: 1.0*
*最后更新: 2024年*
*数据来源: SolarQuotes.com.au Battery Calculator*
