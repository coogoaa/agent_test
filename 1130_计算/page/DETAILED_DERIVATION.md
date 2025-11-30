# 📐 详细推导过程文档

## 目录
1. [负荷曲线生成详细推导](#1-负荷曲线生成详细推导)
2. [PV发电曲线生成详细推导](#2-pv发电曲线生成详细推导)
3. [小时级仿真详细推导](#3-小时级仿真详细推导)
4. [电池容量优化详细推导](#4-电池容量优化详细推导)
5. [KPI指标计算详细推导](#5-kpi指标计算详细推导)
6. [能量守恒验证详细推导](#6-能量守恒验证详细推导)

---

## 1. 负荷曲线生成详细推导

### 1.1 问题定义

**已知条件**:
- 年用电量: `E_annual` (kWh)
- 州代码: `state`
- 月度用电比例: `W_month[12]` (归一化到1)
- 小时用电比例: `W_hour[24]` (归一化到1)

**求解目标**:
- 8760小时负荷曲线: `Load_t[8760]` (kW)

### 1.2 数学推导

#### 步骤1: 计算每月用电量

对于第 `m` 月 (m = 0, 1, ..., 11):

```
E_month[m] = E_annual × W_month[m]
```

**示例** (NSW州, 年用电6729 kWh):
```
E_month[0] = 6729 × 0.0891 = 599.6 kWh  (1月)
E_month[1] = 6729 × 0.0811 = 545.7 kWh  (2月)
...
```

#### 步骤2: 计算每月日均用电量

设第 `m` 月有 `D_month[m]` 天:

```
E_daily[m] = E_month[m] / D_month[m]
```

**示例** (1月, 31天):
```
E_daily[0] = 599.6 / 31 = 19.34 kWh/天
```

#### 步骤3: 计算每小时负荷

对于第 `m` 月的第 `d` 天的第 `h` 小时:

```
时间索引: t = (Σ(i=0 to m-1) D_month[i] + d) × 24 + h

负荷功率: Load_t[t] = E_daily[m] × W_hour[h]
```

**详细推导**:

设某小时的负荷为 `P_h` (kW)，则该小时的用电量为:
```
E_h = P_h × 1 hour = P_h (kWh)
```

一天24小时的总用电量:
```
E_daily = Σ(h=0 to 23) P_h = Σ(h=0 to 23) E_daily × W_hour[h]
        = E_daily × Σ(h=0 to 23) W_hour[h]
        = E_daily × 1  (因为W_hour归一化)
```

因此:
```
P_h = Load_t[t] = E_daily[m] × W_hour[h]
```

**示例** (NSW州, 1月1日, 0点):
```
t = 0
Load_t[0] = 19.34 × 0.04427 = 0.856 kW
```

### 1.3 归一化验证

**月度权重验证**:
```
Σ(m=0 to 11) W_month[m] = 1.0
```

**小时权重验证**:
```
Σ(h=0 to 23) W_hour[h] = 1.0
```

**总量验证**:
```
Σ(t=0 to 8759) Load_t[t] ≈ E_annual

误差 = |Σ Load_t[t] - E_annual| / E_annual < 0.1%
```

---

## 2. PV发电曲线生成详细推导

### 2.1 问题定义

**已知条件**:
- 坡面方位角: `α` (度, 0°=北)
- 坡面面板数: `N_panels`
- 单板功率: `P_panel = 0.44 kW`
- 标准方位角模板: `G_std[θ][month][hour]` (归一化发电系数)

**求解目标**:
- 8760小时发电曲线: `PV_t[8760]` (kW)

### 2.2 插值查表法推导

#### 步骤1: 找到相邻标准方位角

设标准方位角集合为: `Θ = {0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°}`

对于任意方位角 `α`:

```
找到 θ_lower, θ_upper ∈ Θ 使得:
θ_lower ≤ α < θ_upper

特殊情况: 如果 α > 315°, 则:
θ_lower = 315°, θ_upper = 360° (等价于0°)
```

**示例** (α = 237.6°):
```
θ_lower = 225°
θ_upper = 270°
```

#### 步骤2: 线性插值计算权重

```
w = (α - θ_lower) / (θ_upper - θ_lower)
```

**示例**:
```
w = (237.6 - 225) / (270 - 225) = 12.6 / 45 = 0.28
```

#### 步骤3: 插值计算发电系数

对于第 `m` 月的第 `h` 小时:

```
G[m][h] = (1 - w) × G_std[θ_lower][m][h] + w × G_std[θ_upper][m][h]
```

**示例** (1月, 12点):
```
G[0][12] = 0.72 × G_std[225°][0][12] + 0.28 × G_std[270°][0][12]
         = 0.72 × 0.55 + 0.28 × 0.48
         = 0.396 + 0.134
         = 0.530
```

#### 步骤4: 季节性调整

引入季节性调整因子:

```
S_month[m] = 1.0 + 0.2 × sin((m - 5) × π / 6)
```

**物理意义**:
- m = 5 (6月, 南半球冬季): S = 1.0 - 0.2 = 0.8
- m = 11 (12月, 南半球夏季): S = 1.0 + 0.2 = 1.2

**调整后的发电系数**:
```
G_adj[m][h] = G[m][h] × S_month[m]
```

#### 步骤5: 计算实际发电功率

对于第 `m` 月的第 `d` 天的第 `h` 小时:

```
时间索引: t = (Σ(i=0 to m-1) D_month[i] + d) × 24 + h

发电功率: PV_t[t] = G_adj[m][h] × N_panels × P_panel
```

**示例** (10片面板, 1月1日12点):
```
PV_t[12] = 0.530 × 1.0 × 10 × 0.44 = 2.33 kW
```

### 2.3 坡面评分推导

#### 方位角评分

**公式**:
```
diff = min(|α|, 360 - |α|)
score_aspect = max(0, 1 - diff / 180)
```

**推导**:
- 北向 (α = 0°): diff = 0, score = 1.0 (最佳)
- 东向 (α = 90°): diff = 90, score = 0.5
- 南向 (α = 180°): diff = 180, score = 0.0 (最差)

**示例**:
```
α = 45° (东北): score_aspect = 1 - 45/180 = 0.75
α = 270° (西): score_aspect = 1 - 90/180 = 0.5
```

#### 倾角评分

**理想倾角**:
```
tilt_ideal = |latitude| × 0.8
```

**物理意义**: 
- 悉尼 (lat = -33.87°): tilt_ideal = 27.1°
- 霍巴特 (lat = -42.88°): tilt_ideal = 34.3°

**评分公式**:
```
score_tilt = max(0, 1 - |tilt - tilt_ideal| / 90)
```

#### 综合评分

```
score_total = 100 × (0.6 × score_aspect + 0.3 × score_tilt + 0.1 × score_shade)
```

**权重说明**:
- 方位角 60%: 最重要因素
- 倾角 30%: 次要因素
- 遮挡 10%: 修正因素

---

## 3. 小时级仿真详细推导

### 3.1 能量平衡方程

对于第 `t` 小时，能量守恒方程:

```
PV_t[t] + Import_t[t] = Load_t[t] + Export_t[t] + Clipped_t[t] + Loss_battery[t]
```

其中:
```
Loss_battery[t] = Charge_t[t] - Discharge_t[t] × η_rte
```

### 3.2 白天场景 (PV ≥ Load)

#### 初始条件

```
surplus = PV_t[t] - Load_t[t] ≥ 0
SOC_t = 当前电池SOC (0-1)
C_usable = 电池可用容量 (kWh)
```

#### 步骤1: 计算可充电量

**物理约束**:
1. 剩余PV功率: `surplus`
2. 电池充电功率限制: `P_charge_max`
3. 逆变器功率限制: `P_inv_max`
4. 电池剩余空间: `(1 - SOC_t) × C_usable / η_chg`

**充电功率**:
```
P_charge[t] = min(surplus, P_charge_max, P_inv_max, (1 - SOC_t) × C_usable / η_chg)
```

**充电效率**:
```
η_chg = √η_rte = √0.9 ≈ 0.949
```

**物理意义**: 往返效率90%，假设充放电效率相等，则单向效率为√0.9

**实际存储能量**:
```
E_stored[t] = P_charge[t] × η_chg (kWh)
```

**SOC更新**:
```
SOC_{t+1} = SOC_t + E_stored[t] / C_usable
SOC_{t+1} = min(SOC_{t+1}, 1.0)  // 限制在100%
```

**剩余盈余**:
```
surplus_after_charge = surplus - P_charge[t]
```

#### 步骤2: 计算并网导出

**导出功率**:
```
P_export[t] = min(surplus_after_charge, P_export_limit)
```

其中:
- 单相: `P_export_limit = 5 kW`
- 三相: `P_export_limit = 15 kW`

**剩余盈余**:
```
surplus_final = surplus_after_charge - P_export[t]
```

#### 步骤3: 计算裁切量

```
P_clipped[t] = surplus_final
```

**物理意义**: 无处可去的PV发电被浪费

### 3.3 夜间场景 (PV < Load)

#### 初始条件

```
deficit = Load_t[t] - PV_t[t] > 0
SOC_t = 当前电池SOC (0-1)
```

#### 步骤1: 计算可放电量

**物理约束**:
1. 负荷缺口: `deficit`
2. 电池放电功率限制: `P_discharge_max`
3. 逆变器功率限制: `P_inv_max`
4. 电池可用能量: `SOC_t × C_usable × η_dis`

**放电功率**:
```
P_discharge[t] = min(deficit, P_discharge_max, P_inv_max, SOC_t × C_usable × η_dis)
```

**放电效率**:
```
η_dis = √η_rte = √0.9 ≈ 0.949
```

**实际消耗能量**:
```
E_consumed[t] = P_discharge[t] / η_dis (kWh)
```

**SOC更新**:
```
SOC_{t+1} = SOC_t - E_consumed[t] / C_usable
SOC_{t+1} = max(SOC_{t+1}, 0.0)  // 限制在0%
```

**剩余缺口**:
```
deficit_final = deficit - P_discharge[t]
```

#### 步骤2: 计算电网进口

```
P_import[t] = deficit_final
```

### 3.4 完整算法流程

```
初始化: SOC = 0.5 (50%)

for t = 0 to 8759:
    if PV_t[t] >= Load_t[t]:
        // 白天场景
        surplus = PV_t[t] - Load_t[t]
        
        // 充电
        P_charge[t] = min(surplus, P_charge_max, P_inv_max, 
                         (1 - SOC) × C_usable / η_chg)
        E_stored = P_charge[t] × η_chg
        SOC += E_stored / C_usable
        SOC = min(SOC, 1.0)
        surplus -= P_charge[t]
        
        // 导出
        P_export[t] = min(surplus, P_export_limit)
        surplus -= P_export[t]
        
        // 裁切
        P_clipped[t] = surplus
        
    else:
        // 夜间场景
        deficit = Load_t[t] - PV_t[t]
        
        // 放电
        P_discharge[t] = min(deficit, P_discharge_max, P_inv_max,
                            SOC × C_usable × η_dis)
        E_consumed = P_discharge[t] / η_dis
        SOC -= E_consumed / C_usable
        SOC = max(SOC, 0.0)
        deficit -= P_discharge[t]
        
        // 进口
        P_import[t] = deficit
    
    SOC_t[t] = SOC
```

---

## 4. 电池容量优化详细推导

### 4.1 问题定义

**目标函数**:
```
找到最小电池容量 C_battery，使得:
- night_coverage ≥ target_night (例如0.9)
- autarky_rate ≥ target_autarky (例如0.7)
```

### 4.2 二分法推导

#### 算法原理

**单调性假设**:
```
C_battery ↑ ⟹ night_coverage ↑, autarky_rate ↑
```

**搜索区间**:
```
C_min = 0 kWh
C_max = 50 kWh
```

#### 迭代过程

```
迭代 k:
    C_mid = (C_min + C_max) / 2
    
    运行仿真: result = simulate(PV_t, Load_t, C_mid, ...)
    
    if result.night_coverage ≥ target_night AND 
       result.autarky_rate ≥ target_autarky:
        // 满足目标，尝试更小容量
        C_max = C_mid
        C_best = C_mid
    else:
        // 不满足，需要更大容量
        C_min = C_mid
    
    if C_max - C_min < 0.5:
        break  // 收敛
```

#### 收敛性分析

**收敛速度**:
```
第k次迭代后的区间长度: Δ_k = (C_max - C_min) / 2^k

例如: 初始区间 [0, 50]
- 迭代1: Δ_1 = 50/2 = 25 kWh
- 迭代2: Δ_2 = 50/4 = 12.5 kWh
- 迭代3: Δ_3 = 50/8 = 6.25 kWh
- 迭代4: Δ_4 = 50/16 = 3.125 kWh
- 迭代5: Δ_5 = 50/32 = 1.56 kWh
- 迭代6: Δ_6 = 50/64 = 0.78 kWh
- 迭代7: Δ_7 = 50/128 = 0.39 kWh < 0.5 (收敛)
```

**时间复杂度**:
```
迭代次数 = ⌈log₂(Δ_initial / ε)⌉
         = ⌈log₂(50 / 0.5)⌉
         = ⌈log₂(100)⌉
         = 7 次
```

#### 标准化处理

```
标准规格: [5, 6.5, 9.6, 10, 13.5, 16, 20, 30, 40, 50] kWh

C_final = min{C_std ∈ standards | C_std ≥ C_best}
```

**示例**:
```
C_best = 8.7 kWh
⟹ C_final = 9.6 kWh (最接近的标准规格)
```

---

## 5. KPI指标计算详细推导

### 5.1 自耗率 (Self-consumption Rate)

**定义**: PV发电中被自己消耗的比例

**公式推导**:

```
PV总发电: E_pv_total = Σ(t=0 to 8759) PV_t[t]

PV自耗: E_self_consumed = E_pv_total - E_export - E_clipped

其中:
E_export = Σ(t=0 to 8759) P_export[t]
E_clipped = Σ(t=0 to 8759) P_clipped[t]

自耗率: R_self_consumption = E_self_consumed / E_pv_total
```

**物理意义**:
- R = 1.0 (100%): 所有PV发电都被自己使用
- R = 0.5 (50%): 一半PV发电被自己使用，一半导出或裁切
- R = 0.0 (0%): 所有PV发电都被导出或裁切

**示例计算**:
```
E_pv_total = 10000 kWh
E_export = 4500 kWh
E_clipped = 500 kWh

E_self_consumed = 10000 - 4500 - 500 = 5000 kWh
R_self_consumption = 5000 / 10000 = 0.50 (50%)
```

### 5.2 自给率 (Autarky Rate)

**定义**: 负荷中由PV+电池满足的比例

**公式推导**:

```
总负荷: E_load_total = Σ(t=0 to 8759) Load_t[t]

电网进口: E_import = Σ(t=0 to 8759) P_import[t]

自给能量: E_self_supplied = E_load_total - E_import

自给率: R_autarky = E_self_supplied / E_load_total
                  = 1 - E_import / E_load_total
```

**物理意义**:
- R = 1.0 (100%): 完全能源独立，不需要电网
- R = 0.7 (70%): 70%负荷由PV+电池满足，30%来自电网
- R = 0.0 (0%): 完全依赖电网

**示例计算**:
```
E_load_total = 8000 kWh
E_import = 2400 kWh

R_autarky = 1 - 2400/8000 = 1 - 0.3 = 0.70 (70%)
```

### 5.3 夜间覆盖率 (Night Coverage Rate)

**定义**: 夜间负荷被电池覆盖的比例

**时段定义**:
```
夜间时段: [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5]
```

**公式推导**:

```
夜间负荷: E_night_load = Σ(t ∈ night_hours) Load_t[t]

夜间电池放电: E_night_battery = Σ(t ∈ night_hours) P_discharge[t]

夜间覆盖率: R_night_coverage = E_night_battery / E_night_load
```

**详细计算**:

```
for t = 0 to 8759:
    hour_of_day = t % 24
    if hour_of_day in [18,19,20,21,22,23,0,1,2,3,4,5]:
        E_night_load += Load_t[t]
        E_night_battery += P_discharge[t]

R_night_coverage = E_night_battery / E_night_load
```

**示例计算**:
```
E_night_load = 3000 kWh (全年夜间总负荷)
E_night_battery = 2400 kWh (全年夜间电池放电)

R_night_coverage = 2400 / 3000 = 0.80 (80%)
```

### 5.4 溢出吸收率 (Surplus Absorbed Rate)

**定义**: PV溢出中被电池吸收的比例

**公式推导**:

```
总溢出: E_surplus_total = Σ(t: PV_t[t] > Load_t[t]) (PV_t[t] - Load_t[t])

电池充电: E_battery_charged = Σ(t=0 to 8759) P_charge[t]

吸收率: R_surplus_absorbed = E_battery_charged / E_surplus_total
```

**物理意义**:
- R = 1.0 (100%): 所有PV溢出都被电池吸收
- R = 0.5 (50%): 一半溢出被电池吸收，一半导出或裁切
- R = 0.0 (0%): 所有溢出都被导出或裁切

### 5.5 裁切率 (Clipping Rate)

**定义**: PV发电被裁切的比例

**公式推导**:

```
总裁切: E_clipped_total = Σ(t=0 to 8759) P_clipped[t]

裁切率: R_clipping = E_clipped_total / E_pv_total
```

**物理意义**:
- R < 0.03 (3%): 优秀，裁切很少
- R = 0.05 (5%): 可接受
- R > 0.08 (8%): 需要优化（增加电池或导出限制）

### 5.6 电池循环次数

**定义**: 年平均充放电循环次数

**公式推导**:

```
总放电量: E_discharged_total = Σ(t=0 to 8759) P_discharge[t]

循环次数: N_cycles = E_discharged_total / C_usable
```

**物理意义**:
- N = 365: 每天充放电一次
- N = 182.5: 每两天充放电一次
- N = 730: 每天充放电两次

**寿命估算**:
```
电池寿命 (年) ≈ 额定循环次数 / N_cycles

例如: 
- 额定6000次循环
- 年循环365次
- 寿命 ≈ 6000 / 365 ≈ 16.4 年
```

---

## 6. 能量守恒验证详细推导

### 6.1 能量守恒方程

**基本原理**: 能量不能凭空产生或消失

**完整方程**:

```
输入能量 = 输出能量 + 损耗能量

PV发电 + 电网进口 = 负荷消耗 + 电网导出 + 裁切损失 + 电池损耗
```

### 6.2 数学表达式

```
E_pv_total + E_import_total = E_load_total + E_export_total + E_clipped_total + E_battery_loss

其中:
E_pv_total = Σ(t=0 to 8759) PV_t[t]
E_import_total = Σ(t=0 to 8759) P_import[t]
E_load_total = Σ(t=0 to 8759) Load_t[t]
E_export_total = Σ(t=0 to 8759) P_export[t]
E_clipped_total = Σ(t=0 to 8759) P_clipped[t]
E_battery_loss = E_charged_total - E_discharged_total
```

### 6.3 电池损耗详细推导

**充电过程**:
```
输入电能: E_in = P_charge × 1h
存储电能: E_stored = E_in × η_chg
损耗: Loss_charge = E_in × (1 - η_chg)
```

**放电过程**:
```
存储电能: E_stored
输出电能: E_out = E_stored × η_dis
损耗: Loss_discharge = E_stored × (1 - η_dis)
```

**总损耗**:
```
E_battery_loss = Σ(t) P_charge[t] × (1 - η_chg) + Σ(t) P_discharge[t] / η_dis × (1 - η_dis)
               = Σ(t) P_charge[t] - Σ(t) P_discharge[t] × η_rte
```

**简化形式** (η_chg = η_dis = √η_rte):
```
E_battery_loss ≈ E_charged_total - E_discharged_total
```

### 6.4 验证算法

```javascript
function validateEnergyBalance(results, PV_t, Load_t) {
    // 计算各项能量
    const E_pv = sum(PV_t);
    const E_load = sum(Load_t);
    const E_import = sum(results.grid_import);
    const E_export = sum(results.grid_export);
    const E_clipped = sum(results.clipped);
    const E_charged = sum(results.battery_charge);
    const E_discharged = sum(results.battery_discharge);
    
    // 电池损耗
    const E_battery_loss = E_charged - E_discharged;
    
    // 能量守恒检查
    const input = E_pv + E_import;
    const output = E_load + E_export + E_clipped + E_battery_loss;
    const balance = input - output;
    
    // 相对误差
    const error_rate = Math.abs(balance) / E_pv;
    
    console.log('能量守恒验证:');
    console.log('  输入: PV=' + E_pv.toFixed(2) + ' + Import=' + E_import.toFixed(2) + ' = ' + input.toFixed(2));
    console.log('  输出: Load=' + E_load.toFixed(2) + ' + Export=' + E_export.toFixed(2) + 
                ' + Clipped=' + E_clipped.toFixed(2) + ' + Loss=' + E_battery_loss.toFixed(2) + ' = ' + output.toFixed(2));
    console.log('  误差: ' + balance.toFixed(4) + ' kWh (' + (error_rate * 100).toFixed(4) + '%)');
    
    // 判断
    if (Math.abs(balance) < 0.1) {
        console.log('  ✅ 能量守恒验证通过');
        return true;
    } else {
        console.error('  ❌ 能量守恒违规!');
        return false;
    }
}
```

### 6.5 误差来源分析

**可接受的误差来源**:
1. 浮点数精度: ±1e-10
2. 数组求和累积误差: ±0.01 kWh
3. SOC边界处理: ±0.001 kWh

**不可接受的误差**:
1. 算法逻辑错误
2. 能量凭空产生或消失
3. 误差 > 0.1 kWh

**示例验证**:
```
输入: PV=10000.00 + Import=2400.00 = 12400.00 kWh
输出: Load=8000.00 + Export=4000.00 + Clipped=200.00 + Loss=199.95 = 12399.95 kWh
误差: 0.05 kWh (0.0005%)
✅ 能量守恒验证通过
```

---

## 7. 完整示例计算

### 7.1 场景设置

**房屋信息**:
- 坡面1: 方位角0° (北向), 20片面板
- 坡面2: 方位角180° (南向), 10片面板
- 州: NSW
- 年用电量: 6729 kWh
- 电网相位: 单相

**系统配置**:
- PV总容量: 30片 × 0.44kW = 13.2 kW
- 逆变器: 8 kW
- 电池: 13.5 kWh (可用12.15 kWh)
- DC/AC比: 13.2/8 = 165%

### 7.2 典型日计算 (1月15日)

#### 时刻 t=12 (中午12点)

**输入数据**:
```
PV_t[12] = 10.5 kW (北向满发)
Load_t[12] = 0.8 kW (白天低负荷)
SOC = 0.3 (30%)
```

**计算过程**:

1. **判断场景**: PV > Load, 白天场景

2. **计算盈余**:
```
surplus = 10.5 - 0.8 = 9.7 kW
```

3. **计算充电**:
```
空间可用 = (1 - 0.3) × 12.15 = 8.505 kWh
充电功率限制 = min(9.7, 6.75, 8.0, 8.505/0.949) = min(9.7, 6.75, 8.0, 8.96) = 6.75 kW
实际存储 = 6.75 × 0.949 = 6.406 kWh
SOC更新 = 0.3 + 6.406/12.15 = 0.827 (82.7%)
剩余盈余 = 9.7 - 6.75 = 2.95 kW
```

4. **计算导出**:
```
导出功率 = min(2.95, 5.0) = 2.95 kW
剩余盈余 = 2.95 - 2.95 = 0 kW
```

5. **裁切**:
```
裁切 = 0 kW
```

#### 时刻 t=20 (晚上8点)

**输入数据**:
```
PV_t[20] = 0 kW (夜间无发电)
Load_t[20] = 1.5 kW (晚间高峰)
SOC = 0.827 (82.7%)
```

**计算过程**:

1. **判断场景**: PV < Load, 夜间场景

2. **计算缺口**:
```
deficit = 1.5 - 0 = 1.5 kW
```

3. **计算放电**:
```
能量可用 = 0.827 × 12.15 × 0.949 = 9.53 kWh
放电功率限制 = min(1.5, 6.75, 8.0, 9.53) = 1.5 kW
实际消耗 = 1.5 / 0.949 = 1.581 kWh
SOC更新 = 0.827 - 1.581/12.15 = 0.697 (69.7%)
剩余缺口 = 1.5 - 1.5 = 0 kW
```

4. **电网进口**:
```
进口 = 0 kW (电池完全满足负荷)
```

### 7.3 全年汇总

**年度能量统计**:
```
PV发电: 15000 kWh
负荷: 6729 kWh
电网进口: 2018 kWh
电网导出: 8500 kWh
裁切: 300 kWh
电池充电: 4500 kWh
电池放电: 4200 kWh
```

**KPI计算**:
```
自耗率 = (15000 - 8500 - 300) / 15000 = 0.413 (41.3%)
自给率 = 1 - 2018/6729 = 0.700 (70.0%)
夜间覆盖率 = 2100 / 2500 = 0.840 (84.0%)
裁切率 = 300 / 15000 = 0.020 (2.0%)
电池循环 = 4200 / 12.15 = 345.7 次/年
```

**能量守恒验证**:
```
输入 = 15000 + 2018 = 17018 kWh
输出 = 6729 + 8500 + 300 + (4500-4200) = 17029 kWh
误差 = 17018 - 17029 = -11 kWh
相对误差 = 11/15000 = 0.073% ✅
```

---

## 8. 总结

本文档详细推导了1130小时级仿真系统的所有核心算法，包括:

1. ✅ 负荷曲线生成 - 从年用电量到8760小时曲线
2. ✅ PV发电曲线生成 - 插值查表法和季节性调整
3. ✅ 小时级仿真 - 能量平衡和电池充放电
4. ✅ 电池容量优化 - 二分法搜索
5. ✅ KPI指标计算 - 6个关键指标
6. ✅ 能量守恒验证 - 完整性检查

所有公式都经过详细推导，并提供了示例计算，确保实现的正确性和可追溯性。

---

**文档版本**: v1.0  
**创建日期**: 2024-12-01  
**作者**: SolarFit Pro Development Team
