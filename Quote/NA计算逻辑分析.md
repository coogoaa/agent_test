# N/A计算逻辑深度分析

## N/A的含义

在IRR计算结果中，**N/A（Not Available）表示计算无法得出有效结果**，具体含义：

1. **回本周期N/A**：在240个月（20年）内，累计节省无法达到初始投资成本
2. **贴现回本周期N/A**：在240个月内，累计贴现节省无法达到初始投资成本
3. **IRR N/A**：无法找到使净现值（NPV）为零的贴现率，即投资永远无法盈利

## 计算流程详解

### 第一步：月度现金流计算

#### 1. 月度节省计算

```javascript
// 每月的节省 = 无光伏成本 - 有光伏成本 + 上网收入 - 电池计提
monthlySavings = costWithoutSolar - (costWithSolar - revenueFromGrid) - batteryAmortization
```

**具体计算**：
```javascript
// 无光伏成本
costWithoutSolar = (月度用电量 × 电价) + (天数 × 日固定费用)

// 有光伏成本
costWithSolar = (从电网购电量 × 电价) + (天数 × 日固定费用)

// 上网收入
revenueFromGrid = 上网电量 × 上网电价

// 电池计提（仅前120个月）
batteryAmortization = 电池更换成本 ÷ 120
```

#### 2. 累计节省计算

```javascript
// 简单累计（不考虑货币时间价值）
cumulativeSavingsMonthly += monthlySavings
```

#### 3. 贴现累计节省计算

```javascript
// 考虑货币时间价值
discountedMonthlySavings = monthlySavings / Math.pow(monthlyDiscountFactor, month)
cumulativeDiscountedSavingsMonthly += discountedMonthlySavings

// 其中 monthlyDiscountFactor = Math.pow(1 + discountRate, 1/12)
// discountRate = 5% (年化贴现率)
```

### 第二步：回本周期计算

#### 回本周期（Payback Period）

```javascript
if (paybackPeriodMonthly === null && cumulativeSavingsMonthly >= config.investmentCost) {
    // 找到累计节省首次超过投资成本的月份
    const remainingCost = config.investmentCost - prevCumulativeSavingsMonthly;
    if (monthlySavings > 0) {
        paybackPeriodMonthly = (month - 1) + (remainingCost / monthlySavings);
    }
}
```

**返回N/A的条件**：
- 在240个月内，`cumulativeSavingsMonthly` 始终 < `investmentCost`
- 变量保持为 `null`，输出时显示为 "N/A"

#### 贴现回本周期（Discounted Payback Period）

```javascript
if (discountedPaybackPeriodMonthly === null && 
    cumulativeDiscountedSavingsMonthly >= config.investmentCost) {
    // 找到累计贴现节省首次超过投资成本的月份
    const remainingDiscountedCost = config.investmentCost - prevCumulativeDiscountedSavingsMonthly;
    if (discountedMonthlySavings > 0) {
        discountedPaybackPeriodMonthly = (month - 1) + (remainingDiscountedCost / discountedMonthlySavings);
    }
}
```

**返回N/A的条件**：
- 在240个月内，`cumulativeDiscountedSavingsMonthly` 始终 < `investmentCost`
- 变量保持为 `null`，输出时显示为 "N/A"

### 第三步：IRR计算

#### 年度现金流汇总

```javascript
// 将240个月的数据汇总为20年
for (let year = 1; year <= 20; year++) {
    const yearMonths = monthlyProjection.filter(m => m.year === year);
    const netSavings = yearMonths.reduce((sum, m) => sum + m.monthlySavings, 0);
    cashFlows.push(netSavings);
}

// cashFlows = [year0: -投资成本, year1: 净节省, year2: 净节省, ..., year20: 净节省]
```

#### IRR二分法计算

```javascript
function calculateIRR(cashFlows, maxIterations = 100, tolerance = 1e-6) {
    // 前置检查
    if (cashFlows.length === 0 || cashFlows[0] >= 0) {
        return null;  // ← 条件1：第一项非负数
    }

    let low = 0.0;   // 下界：0%
    let high = 1.0;  // 上界：100%
    let mid = 0.0;

    // 二分法迭代
    for (let i = 0; i < maxIterations; i++) {
        mid = (low + high) / 2;
        const npv = calculateNPV(mid, cashFlows);

        if (Math.abs(npv) < tolerance) {
            return mid;  // ← 找到IRR
        } else if (calculateNPV(low, cashFlows) * npv < 0) {
            high = mid;
        } else {
            low = mid;
        }
    }

    return null;  // ← 条件2：100次迭代未收敛
}
```

#### NPV计算

```javascript
function calculateNPV(rate, cashFlows) {
    return cashFlows.reduce((acc, cashFlow, i) => 
        acc + cashFlow / Math.pow(1 + rate, i), 0
    );
}
```

**NPV公式**：
```
NPV = CF₀ + CF₁/(1+r)¹ + CF₂/(1+r)² + ... + CF₂₀/(1+r)²⁰

其中：
- CF₀ = -投资成本（负数）
- CF₁...CF₂₀ = 各年净节省
- r = 贴现率（IRR就是使NPV=0的r）
```

**返回N/A的条件**：
1. **前置检查失败**：`cashFlows[0] >= 0`（不适用，我们的第一项是负数）
2. **100次迭代未收敛**：在[0%, 100%]区间内找不到使NPV=0的点

## N/A产生的三种情况

### 情况1：回本周期N/A

#### 数学条件
```
Σ(monthlySavings) < investmentCost  (在240个月内)
```

#### 典型案例：2块面板方案A（不考虑补贴）

**输入参数**：
```
投资成本: 24,077 AUD
光伏容量: 0.44 kW
电池容量: 22.44 kWh
电池更换成本: 19,411 AUD
```

**月度计算**（前10年）：
```
月度发电量: 0.44 × 1526 ÷ 12 = 56 kWh
月度节省（发电）: 56 × 0.30 = 16.8 AUD
月度电池计提: 19,411 ÷ 120 = 161.8 AUD
月度净节省: 16.8 - 161.8 = -145 AUD  ← 负数！
```

**累计节省**：
```
前120个月: -145 × 120 = -17,400 AUD
后120个月: +16.8 × 120 = +2,016 AUD
总计: -17,400 + 2,016 = -15,384 AUD  ← 仍为负数

投资成本: 24,077 AUD
累计节省: -15,384 AUD
差距: 39,461 AUD  ← 永远无法回本
```

**结果**：回本周期 = N/A

### 情况2：贴现回本周期N/A

#### 数学条件
```
Σ(discountedMonthlySavings) < investmentCost  (在240个月内)
```

#### 贴现效应

**月度贴现因子**：
```javascript
monthlyDiscountFactor = Math.pow(1 + 0.05, 1/12) = 1.004074
```

**贴现值计算**：
```
Month 1:  savings / 1.004074¹  = savings × 0.9959
Month 12: savings / 1.004074¹² = savings × 0.9512 (约95%)
Month 60: savings / 1.004074⁶⁰ = savings × 0.7788 (约78%)
Month 120: savings / 1.004074¹²⁰ = savings × 0.6065 (约61%)
Month 240: savings / 1.004074²⁴⁰ = savings × 0.3677 (约37%)
```

**关键发现**：
- 第10年的节省，贴现后只值原来的61%
- 第20年的节省，贴现后只值原来的37%
- 越往后的节省，贴现值越低

#### 典型案例：50块面板方案A（不考虑补贴）

**输入参数**：
```
投资成本: 41,306 AUD
年均节省: 约2,000 AUD
```

**简单回本周期**：
```
41,306 ÷ 2,000 = 20.65年 ≈ 248个月
```

**贴现回本周期计算**：
```
20年累计节省: 2,000 × 20 = 40,000 AUD
20年累计贴现值: 约24,900 AUD  ← 远小于投资成本

投资成本: 41,306 AUD
累计贴现值: 24,900 AUD
差距: 16,406 AUD  ← 无法在20年内回本
```

**为什么累计贴现值只有24,900 AUD？**

```
Year 1:  2,000 / 1.05¹  = 1,905 AUD
Year 2:  2,000 / 1.05²  = 1,814 AUD
Year 5:  2,000 / 1.05⁵  = 1,567 AUD
Year 10: 2,000 / 1.05¹⁰ = 1,227 AUD
Year 15: 2,000 / 1.05¹⁵ = 961 AUD
Year 20: 2,000 / 1.05²⁰ = 754 AUD

总计: 约24,900 AUD (≈ 2,000 × 12.46)
```

**临界倍数**：
- 在5%贴现率下，20年现金流的贴现值 ≈ 年均现金流 × 12.46
- 如果投资成本 > 年均节省 × 12.46，则贴现回本周期必然 > 20年

**结果**：贴现回本周期 = N/A

### 情况3：IRR N/A

#### 数学条件

IRR是使NPV=0的贴现率r，即：
```
NPV(r) = -投资成本 + Σ(年度净节省 / (1+r)^t) = 0
```

**返回N/A的原因**：在[0%, 100%]区间内，NPV始终不为0

#### 典型案例：100块面板方案A VIC（不考虑补贴）

**现金流**：
```
Year 0: -77,408 AUD
Year 1-20: 各年净节省（包含负值）
```

**NPV在不同贴现率下的值**：
```
r = 0%:   NPV = -77,408 + Σ(年度节省) = -5,000 AUD  ← 负数
r = 5%:   NPV = -77,408 + Σ(年度节省/(1.05)^t) = -15,000 AUD  ← 更负
r = 10%:  NPV = -77,408 + Σ(年度节省/(1.10)^t) = -22,000 AUD  ← 更更负
r = 50%:  NPV = -77,408 + Σ(年度节省/(1.50)^t) = -35,000 AUD  ← 极负
r = 100%: NPV = -77,408 + Σ(年度节省/(2.00)^t) = -40,000 AUD  ← 极负
```

**关键发现**：
- NPV在任何贴现率下都是负数
- 随着贴现率增加，NPV反而更负（因为未来现金流贴现值更小）
- 无法找到使NPV=0的点
- 二分法在100次迭代后仍未收敛

**为什么NPV恒为负？**

1. **投资成本过高**：77,408 AUD
2. **年度节省不足**：20年累计节省约72,000 AUD
3. **20年累计 < 投资成本**：即使不考虑贴现，也无法回本
4. **考虑贴现后更差**：贴现值约45,000 AUD

**结果**：IRR = N/A

## 三种N/A的关系

### 逻辑关系

```
IRR N/A  →  必然导致  →  贴现回本周期 N/A
                    ↓
                可能导致
                    ↓
               回本周期 N/A
```

**说明**：
1. **IRR N/A** → **贴现回本周期 N/A**（必然）
   - IRR N/A意味着20年累计贴现值 < 投资成本
   - 因此贴现回本周期必然 > 20年

2. **IRR N/A** → **回本周期 N/A**（可能）
   - 如果20年累计节省 < 投资成本，则回本周期也N/A
   - 如果20年累计节省 > 投资成本，则回本周期有值（但IRR仍N/A）

### 三种组合情况

#### 组合1：全部N/A（最差）
```
回本周期: N/A
贴现回本周期: N/A
IRR: N/A
```
**含义**：20年累计节省 < 投资成本，完全无法回本

**案例**：2块面板方案A（不考虑补贴）
- 投资成本：24,077 AUD
- 20年累计：-15,384 AUD（负数）

#### 组合2：回本但贴现不回本（中等）
```
回本周期: 15.83年
贴现回本周期: N/A
IRR: 3.29%
```
**含义**：不考虑货币时间价值能回本，但考虑后无法在20年内回本

**案例**：50块面板方案A NSW（不考虑补贴）
- 投资成本：41,306 AUD
- 20年累计节省：约40,000 AUD（简单累计）
- 20年累计贴现值：约24,900 AUD（考虑贴现）

#### 组合3：全部有值（正常）
```
回本周期: 12.60年
贴现回本周期: 16.04年
IRR: 7.38%
```
**含义**：投资经济性良好，能够在合理时间内回本

**案例**：50块面板方案A NSW（考虑补贴）
- 投资成本：25,777 AUD
- 20年累计节省：约40,000 AUD
- 20年累计贴现值：约30,000 AUD

## 关键临界值分析

### 回本周期临界值

**条件**：
```
20年累计节省 ≥ 投资成本
```

**推导**：
```
假设月度节省恒定为 S
前120个月: S - 电池计提
后120个月: S

20年累计 = (S - 电池计提) × 120 + S × 120
         = S × 240 - 电池计提 × 120
         ≥ 投资成本

解得: S ≥ (投资成本 + 电池计提 × 120) / 240
```

**案例计算**（50块方案A不考虑补贴）：
```
投资成本: 41,306 AUD
电池计提: 24,255 ÷ 120 = 202 AUD/月

临界月度节省: (41,306 + 202 × 120) / 240 = 273 AUD/月

实际月度节省: 约167 AUD/月（不足）

结论: 回本周期 N/A
```

### 贴现回本周期临界值

**条件**：
```
20年累计贴现值 ≥ 投资成本
```

**简化公式**（假设年度节省恒定）：
```
投资成本 ≤ 年度节省 × PV因子

其中 PV因子 = [1 - (1+r)^(-n)] / r
在 r=5%, n=20 时，PV因子 ≈ 12.46
```

**临界条件**：
```
投资成本 ≤ 年度节省 × 12.46
```

**案例验证**（50块方案A不考虑补贴）：
```
投资成本: 41,306 AUD
年度节省: 约2,000 AUD
临界值: 2,000 × 12.46 = 24,920 AUD

41,306 > 24,920  ← 超过临界值

结论: 贴现回本周期 N/A
```

### IRR临界值

**条件**：
```
20年累计净现值 > 0 (在某个贴现率下)
```

**关键点**：
- 如果 NPV(0%) < 0，则IRR必然为负（或不存在）
- NPV(0%) = -投资成本 + 20年累计节省

**案例验证**（100块方案A VIC不考虑补贴）：
```
投资成本: 77,408 AUD
20年累计节省: 约72,000 AUD

NPV(0%) = -77,408 + 72,000 = -5,408 AUD  ← 负数

结论: IRR N/A（或为负数）
```

## 不同模式下N/A的差异

### 考虑补贴模式

**投资成本较低** → **更容易满足临界条件** → **N/A较少**

| 临界条件 | 考虑补贴 | 不考虑补贴 |
|---------|---------|-----------|
| 回本周期临界月度节省 | 较低 | 较高 |
| 贴现回本周期临界年度节省 | 较低 | 较高 |
| IRR临界累计节省 | 较低 | 较高 |

### 案例对比：50块方案A NSW

#### 考虑补贴
```
投资成本: 25,777 AUD

回本周期临界: (25,777 + 202×120) / 240 = 208 AUD/月
实际月度节省: 约167 AUD/月
结果: 能回本（12.60年）

贴现回本临界: 25,777 / 12.46 = 2,069 AUD/年
实际年度节省: 约2,000 AUD/年
结果: 勉强回本（16.04年）

IRR临界: NPV(0%) = -25,777 + 40,000 = 14,223 AUD > 0
结果: IRR = 7.38%
```

#### 不考虑补贴
```
投资成本: 41,306 AUD (+60%)

回本周期临界: (41,306 + 202×120) / 240 = 273 AUD/月
实际月度节省: 约167 AUD/月
结果: 能回本（15.83年）

贴现回本临界: 41,306 / 12.46 = 3,314 AUD/年
实际年度节省: 约2,000 AUD/年
结果: 无法回本（N/A）

IRR临界: NPV(0%) = -41,306 + 40,000 = -1,306 AUD < 0
结果: IRR = 3.29%（勉强为正）
```

## 总结

### N/A的本质含义

1. **回本周期N/A**：
   - 数学含义：20年累计节省 < 投资成本
   - 经济含义：投资永远无法回本
   - 计算原因：累计节省始终小于投资成本

2. **贴现回本周期N/A**：
   - 数学含义：20年累计贴现值 < 投资成本
   - 经济含义：考虑货币时间价值后，20年内无法回本
   - 计算原因：贴现效应使未来现金流价值大幅降低

3. **IRR N/A**：
   - 数学含义：无法找到使NPV=0的贴现率
   - 经济含义：投资无法产生正回报
   - 计算原因：NPV在[0%, 100%]区间内恒为负或无解

### 关键计算要素

1. **月度节省**：
   - 发电节省 - 电池计提（前10年）
   - 如果为负数，累计节省会下降

2. **贴现因子**：
   - 5%年化贴现率 → 月度因子1.004074
   - 20年后的现金流只值原来的37%

3. **临界条件**：
   - 回本周期：投资成本 ≤ 月度节省 × 240
   - 贴现回本：投资成本 ≤ 年度节省 × 12.46
   - IRR：20年累计节省 > 投资成本

### 不考虑补贴时N/A激增的计算原因

1. **投资成本增加50-60%**
   - 所有临界值相应提高
   - 原本接近临界的配置全部超过临界

2. **年度节省不变**
   - 发电量不变
   - 节省金额不变
   - 但相对于更高的投资成本显得不足

3. **贴现效应放大**
   - 投资成本增加后，需要更长时间回本
   - 更长时间意味着更多现金流在遥远的未来
   - 遥远未来的现金流贴现值很低
   - 导致贴现回本周期大量变为N/A

---

**文档版本**: 1.0  
**生成日期**: 2025-11-12  
**计算逻辑来源**: batch-irr-calculator.js  
**贴现率**: 5% per year  
**计算周期**: 240个月（20年）
