# 核心算法实施逻辑详解

## 1. 数据合成器 (DataSynthesizer)

### 1.1 负荷曲线生成逻辑

**目标**: 将用户的年用电量 (kWh) 转换为 8760 小时的负荷曲线 `Load_t[8760]`。

**输入**:
- `annualKwh`: 年用电量 (例如 6729 kWh for NSW)
- `stateCode`: 州代码 (例如 'NSW')

**数据源**:
- `各州月用电比例.md`: 12个月的用电比例
- `各州各时段用电比例.md`: 24小时的用电比例

**算法步骤**:

```
1. 读取该州的月度分配系数 monthly_weights[12]
   例如 NSW: [8.55%, 7.78%, 7.51%, ...]

2. 读取该州的小时分配系数 hourly_weights[24]
   例如 NSW: [4.427%, 3.912%, 3.176%, ...]

3. 计算每月的天数 days_in_month[12] = [31, 28, 31, ...]

4. 对每个月 m (0-11):
   - 该月总用电量 = annualKwh * monthly_weights[m]
   - 该月日均用电量 = 该月总用电量 / days_in_month[m]
   
   对该月的每一天 d:
     对每小时 h (0-23):
       index = (累计天数 + d) * 24 + h
       Load_t[index] = 该月日均用电量 * hourly_weights[h]
```

**关键点**:
- 归一化检查: `sum(hourly_weights) ≈ 100%`
- 归一化检查: `sum(monthly_weights) ≈ 100%`
- 最终验证: `sum(Load_t) ≈ annualKwh`

### 1.2 光伏发电曲线生成逻辑

**目标**: 根据屋顶坡面信息生成每块板的 8760 小时发电曲线。

**输入**:
- `planes`: 坡面数组 `[{aspect, tilt, max_panels, area}]`
- `panel_power`: 单板功率 (440W)

**数据源**:
- `发电样例.md`: 包含不同方位角坡面的 12月×24小时 发电数据 (kWh/panel)

**算法策略**:

由于前端无法运行完整的太阳辐射模型，我们采用**插值查表法**:

```
1. 预处理发电样例数据:
   - 提取标准方位角的发电模板 (例如 0°, 45°, 90°, ..., 315°)
   - 构建查找表 LUT[aspect][month][hour]

2. 对每个坡面 plane:
   a. 根据 plane.aspect 在 LUT 中查找最近的两个方位角
      例如 aspect=237.6° → 在 225° 和 270° 之间
   
   b. 线性插值获取该坡面的月×小时发电模板
      generation_template[12][24] = interpolate(LUT[225°], LUT[270°], weight)
   
   c. 扩展到 8760 小时:
      对每个月 m (0-11):
        对该月的每一天:
          对每小时 h (0-23):
            index = (累计天数 + d) * 24 + h
            PV_t[plane_id][index] = generation_template[m][h] * plane.max_panels
```

**优化**:
- 考虑倾角影响: 如果有 tilt 数据，应用简单的余弦修正
  `correction_factor = cos(tilt - optimal_tilt)`
- 遮挡系数: 如果 GIS 提供遮挡数据，乘以 `shade_factor`

### 1.3 坡面评分逻辑 (改进版)

**公式** (来自 cankao.md):

```javascript
// 方位角评分 (南半球北向最佳，aspect=0°)
diff = min(|aspect|, 360 - |aspect|)
score_aspect = max(0, 1 - diff/180)

// 倾角评分 (理想倾角 ≈ 纬度 × 0.8)
ideal_tilt = latitude * 0.8  // 例如悉尼 -33.87° → ideal ≈ 27°
score_tilt = 1 - |tilt - ideal_tilt| / 90

// 遮挡评分 (来自 GIS)
score_shade = 1.0  // 默认无遮挡

// 综合评分
score = 100 * (0.6 * score_aspect + 0.3 * score_tilt + 0.1 * score_shade)
```

---

## 2. 小时级仿真器 (HourlySimulator)

### 2.1 核心能量平衡逻辑

**关键策略** (来自 cankao.md 第七节):
> **PV 溢出优先充电电池，只有电池充满或功率受限后才并网导出**

**伪代码**:

```javascript
function simulate(PV_t, Load_t, battery, inverter, policy) {
    const hours = PV_t.length;  // 8760
    const results = {
        grid_import: new Array(hours).fill(0),
        grid_export: new Array(hours).fill(0),
        battery_charge: new Array(hours).fill(0),
        battery_discharge: new Array(hours).fill(0),
        battery_soc: new Array(hours).fill(0),
        clipped: new Array(hours).fill(0)
    };
    
    let SOC = battery.initial_soc;  // 0.5 (50%)
    const C_usable = battery.usable_kwh;
    const eta_chg = Math.sqrt(battery.rte);  // √0.9 ≈ 0.949
    const eta_dis = Math.sqrt(battery.rte);
    
    for (let h = 0; h < hours; h++) {
        const pv = PV_t[h];
        const load = Load_t[h];
        
        if (pv >= load) {
            // 白天: PV 有盈余
            let surplus = pv - load;
            
            // 步骤1: 优先充电池
            const space_available = (1 - SOC) * C_usable;
            const charge_possible = Math.min(
                surplus,
                battery.max_charge_kw,
                inverter.max_ac_kw,  // 逆变器充电功率限制
                space_available / eta_chg
            );
            
            const energy_stored = charge_possible * eta_chg;
            SOC += energy_stored / C_usable;
            results.battery_charge[h] = charge_possible;
            surplus -= charge_possible;
            
            // 步骤2: 剩余才并网
            const export_possible = Math.min(surplus, inverter.export_limit_kw);
            results.grid_export[h] = export_possible;
            surplus -= export_possible;
            
            // 步骤3: 无法导出的部分被裁切
            results.clipped[h] = surplus;
            
        } else {
            // 夜间: PV 不足
            let deficit = load - pv;
            
            // 步骤1: 电池放电
            const energy_available = SOC * C_usable;
            const discharge_possible = Math.min(
                deficit,
                battery.max_discharge_kw,
                inverter.max_ac_kw,
                energy_available * eta_dis
            );
            
            const energy_delivered = discharge_possible / eta_dis;
            SOC -= energy_delivered / C_usable;
            results.battery_discharge[h] = discharge_possible;
            deficit -= discharge_possible;
            
            // 步骤2: 剩余从电网进口
            results.grid_import[h] = deficit;
        }
        
        results.battery_soc[h] = SOC;
    }
    
    return computeKPIs(results, PV_t, Load_t);
}
```

### 2.2 KPI 计算

```javascript
function computeKPIs(results, PV_t, Load_t) {
    const total_pv = sum(PV_t);
    const total_load = sum(Load_t);
    const total_export = sum(results.grid_export);
    const total_import = sum(results.grid_import);
    const total_clipped = sum(results.clipped);
    
    // 自耗率: PV中被自己消耗的比例
    const self_consumed = total_pv - total_export - total_clipped;
    const self_consumption_rate = self_consumed / total_pv;
    
    // 自给率: 负荷中由PV+电池满足的比例
    const autarky_rate = 1 - (total_import / total_load);
    
    // 夜间覆盖率 (18:00-6:00)
    const night_hours = [18,19,20,21,22,23,0,1,2,3,4,5];
    let night_load = 0, night_battery = 0;
    for (let h = 0; h < results.battery_discharge.length; h++) {
        const hour_of_day = h % 24;
        if (night_hours.includes(hour_of_day)) {
            night_load += Load_t[h];
            night_battery += results.battery_discharge[h];
        }
    }
    const night_coverage = night_battery / night_load;
    
    // 电池循环次数
    const total_discharged = sum(results.battery_discharge);
    const avg_cycles = total_discharged / battery.usable_kwh;
    
    return {
        total_pv_kwh: total_pv,
        total_load_kwh: total_load,
        total_import_kwh: total_import,
        total_export_kwh: total_export,
        total_clipped_kwh: total_clipped,
        self_consumption_rate,
        autarky_rate,
        night_coverage_rate: night_coverage,
        avg_battery_cycles: avg_cycles,
        time_series: results
    };
}
```

---

## 3. 方案生成器 (PlanGenerator)

### 3.1 三套方案的差异化策略

根据 `cankao.md` 第九节，明确定义:

#### Plan A - Maximum (高端型)
**目标**: 最大化能源独立性
- **PV**: 使用所有可用坡面 (满铺)
- **Inverter**: 选择能满足 DC/AC ≤ 2.0 的最大规格
- **Battery**: 二分查找最小容量满足:
  - `night_coverage ≥ 0.9` (90%夜间覆盖)
  - `autarky_rate ≥ 0.7` (70%自给率)
- **验收**: 裁切量 < 5%

#### Plan B - Balanced (平衡型)
**目标**: 性价比最优
- **PV**: 根据坡面评分选择 ROI 最高的组合，目标 10-13kW
- **Inverter**: 选择常用档位 (5/8/10kW)，DC/AC 在 1.5-2.0
- **Battery**: 优化容量满足:
  - `night_coverage ≥ 0.8` (80%夜间覆盖)
  - `self_consumption_rate ≥ 0.4` (40%自耗率)
- **验收**: 成本效益比最优

#### Plan C - Economy (经济型)
**目标**: 最小化初期投资
- **PV**: 固定 6.6kW (澳洲常见入门配置)
- **Inverter**: 单相 5kW
- **Battery**: 基础配置 5-6.5kWh
  - `night_coverage ≥ 0.5` (50%夜间覆盖)
- **验收**: 快速回本 (ROI < 7年)

### 3.2 电池容量优化算法 (二分法)

```javascript
function optimizeBatteryCapacity(pv_profile, load_profile, target_kpi, plan_type) {
    const targets = {
        'A': { night_coverage: 0.9, autarky: 0.7 },
        'B': { night_coverage: 0.8, self_consumption: 0.4 },
        'C': { night_coverage: 0.5 }
    };
    
    let min_kwh = 0;
    let max_kwh = 50;  // 上限
    let best_kwh = 0;
    
    while (max_kwh - min_kwh > 0.5) {
        const mid_kwh = (min_kwh + max_kwh) / 2;
        
        const battery = {
            usable_kwh: mid_kwh,
            max_charge_kw: Math.min(mid_kwh * 0.5, inverter.max_ac_kw),
            max_discharge_kw: Math.min(mid_kwh * 0.5, inverter.max_ac_kw),
            rte: 0.9,
            initial_soc: 0.5
        };
        
        const result = simulate(pv_profile, load_profile, battery, inverter, {});
        
        if (meetsTarget(result, targets[plan_type])) {
            max_kwh = mid_kwh;
            best_kwh = mid_kwh;
        } else {
            min_kwh = mid_kwh;
        }
    }
    
    // 标准化到常见规格
    const standards = [5, 6.5, 9.6, 10, 13.5, 16, 20];
    return standards.find(s => s >= best_kwh) || standards[standards.length - 1];
}
```

### 3.3 逆变器选型与坡面裁剪

```javascript
function selectInverterAndTrim(pv_rated_kw, phase, planes) {
    const max_ratio = 2.0;
    const phase_limits = { single: 10, three: 30 };
    const max_inv = phase_limits[phase];
    
    // 计算所需最小逆变器
    const required_inv = Math.ceil(pv_rated_kw / max_ratio);
    
    if (required_inv > max_inv) {
        // 需要裁剪
        const max_allowed_pv = max_inv * max_ratio;
        const excess_kw = pv_rated_kw - max_allowed_pv;
        
        // 从低效坡面开始裁剪
        planes.sort((a, b) => a.score - b.score);
        let trimmed_kw = 0;
        const trimmed_planes = [];
        
        for (let plane of planes) {
            if (trimmed_kw >= excess_kw) break;
            const trim_panels = Math.ceil((excess_kw - trimmed_kw) * 1000 / 440);
            const actual_trim = Math.min(trim_panels, plane.max_panels);
            plane.max_panels -= actual_trim;
            trimmed_kw += actual_trim * 0.44;
            trimmed_planes.push({ plane_id: plane.id, trimmed: actual_trim });
        }
        
        return {
            inverter_kw: max_inv,
            trimmed: trimmed_planes,
            final_pv_kw: pv_rated_kw - trimmed_kw
        };
    }
    
    // 从 catalog 选择
    const catalog = phase === 'single' ? [5, 6, 8, 10] : [5, 8, 10, 15, 20, 30];
    const selected = catalog.find(kw => kw >= required_inv) || max_inv;
    
    return {
        inverter_kw: selected,
        trimmed: [],
        final_pv_kw: pv_rated_kw
    };
}
```

---

## 4. 数据流程总览

```
用户输入 (房屋ID, 州, 相位)
    ↓
[DataSynthesizer]
    ├─ generateLoadProfile() → Load_t[8760]
    └─ generatePVProfile() → PV_t[8760] (per plane)
    ↓
[PlanGenerator]
    ├─ Plan A: 满铺 → selectInverter() → optimizeBattery()
    ├─ Plan B: 优选坡面 → selectInverter() → optimizeBattery()
    └─ Plan C: 固定配置 → 基础电池
    ↓
[HourlySimulator] × 3
    └─ 每个方案运行 8760h 仿真 → KPIs
    ↓
[CostCalculator]
    └─ 计算成本、补贴、ROI
    ↓
输出 JSON + 可视化
```

---

## 5. 性能优化策略

### 5.1 Web Worker 并行计算
由于仿真计算量大，使用 Web Worker 避免阻塞 UI:

```javascript
// main.js
const worker = new Worker('simulator-worker.js');
worker.postMessage({ pv_profile, load_profile, battery, inverter });
worker.onmessage = (e) => {
    const results = e.data;
    updateUI(results);
};
```

### 5.2 数据压缩
8760 小时的 Float32Array 占用 ~35KB，三套方案 × 多个时序 ≈ 300KB。
- 使用 TypedArray 而非普通数组
- 仅在需要时传输 time_series，默认只返回 summary

### 5.3 缓存机制
- 缓存已计算的负荷曲线 (按州+年用电量)
- 缓存 PV 模板 (按方位角)

---

## 6. 验证与测试

### 6.1 能量守恒检查
```javascript
function validateEnergyBalance(results, PV_t, Load_t) {
    const total_pv = sum(PV_t);
    const total_load = sum(Load_t);
    const total_export = sum(results.grid_export);
    const total_import = sum(results.grid_import);
    const total_clipped = sum(results.clipped);
    const battery_loss = sum(results.battery_charge) - sum(results.battery_discharge);
    
    // PV = Load + Export + Clipped + Battery_Loss - Import
    const balance = total_pv + total_import - total_load - total_export - total_clipped - battery_loss;
    
    if (Math.abs(balance) > 0.1) {
        console.error('Energy balance violation:', balance);
    }
}
```

### 6.2 边界测试用例
- 无电池场景 (battery_kwh = 0)
- 超大电池场景 (battery_kwh = 100)
- 极端负荷 (全天恒定 vs 极端峰谷)
- 极端 PV (阴天 vs 晴天)
