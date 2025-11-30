# 核心算法模块接口定义 (JavaScript)

本文档定义了 `1130_计算/page/js/core/` 目录下各核心模块的 API 接口。

## 1. `Simulator` 模块

负责执行小时级能量仿真。

### Class: `HourlySimulator`

#### Constructor
```javascript
/**
 * @param {Object} config - 仿真配置
 * @param {number} config.timeStep - 时间步长(小时), default 1
 * @param {number} config.days - 仿真天数, default 365
 */
constructor(config)
```

#### Methods

**`simulate(inputs)`**

执行一次完整的仿真。

*   **Input `inputs`**:
    ```javascript
    {
        pv_generation: Float32Array, // length 8760, kW
        load_profile: Float32Array,  // length 8760, kW
        battery: {
            usable_kwh: number,      // 可用容量
            max_charge_kw: number,   // 最大充电功率
            max_discharge_kw: number,// 最大放电功率
            rte: number,             // Round-trip efficiency (e.g., 0.9)
            initial_soc: number      // 0.0 - 1.0
        },
        inverter: {
            max_ac_kw: number,       // 逆变器最大 AC 输出
            export_limit_kw: number  // 上网功率限制
        },
        policy: {
            charge_first: boolean    // true: PV优先充电池, false: PV优先供负载(通常总是true)
        }
    }
    ```

*   **Output**:
    ```javascript
    {
        summary: {
            total_pv_kwh: number,
            total_load_kwh: number,
            total_import_kwh: number,
            total_export_kwh: number,
            total_self_consumed_kwh: number,
            total_battery_charged_kwh: number,
            total_battery_discharged_kwh: number,
            self_consumption_rate: number, // 0-1
            autarky_rate: number,          // 0-1
            night_coverage_rate: number,   // 0-1 (夜间负载被电池覆盖的比例)
            avg_battery_cycles: number
        },
        time_series: { // Optional, if requested
            battery_soc: Float32Array,
            grid_import: Float32Array,
            grid_export: Float32Array,
            // ...
        }
    }
    ```

## 2. `PlanGenerator` 模块

负责生成 A/B/C 三套方案。

### Class: `PlanGenerator`

#### Methods

**`generateAllPlans(houseData, userConfig)`**

*   **Input**:
    *   `houseData`: 包含屋顶坡面信息 `[{aspect, slope, max_panels, efficiency_factor}]`。
    *   `userConfig`: 包含州、年用电量、成本参数、偏好。

*   **Logic**:
    1.  调用 `DataSynthesizer` 生成 `load_profile` 和 `pv_profile_full`。
    2.  **Plan A (Max)**:
        *   使用所有可用坡面。
        *   `InverterSelector` 选型 (check DC/AC < 2.0)。
        *   二分查找 `battery_kwh` 使得 `autarky_rate` >= 0.95 (或配置值)。
    3.  **Plan B (Balanced)**:
        *   根据 `efficiency_factor` 排序坡面，选取 ROI 最高的前 N 个，目标覆盖 ~120% 年用电量或固定kW。
        *   `InverterSelector` 选型。
        *   优化 `battery_kwh` 使得性价比最高 (e.g., `night_coverage` >= 0.8)。
    4.  **Plan C (Economy)**:
        *   最小化配置 (e.g. 6.6kW + 5kWh battery)。

*   **Output**:
    *   返回 `batch-processor` 或 `recommender` 需要的标准 JSON 结构 (见 planning.md)。

## 3. `DataSynthesizer` 模块

负责数据生成与标准化。

#### Methods

**`generateLoadProfile(annualKwh, stateCode)`**

*   基于内置的 `STATE_HOURLY_PROFILE` (24h) 和 季节性系数，合成 8760 小时数据。
*   简单实现：`hourly_load = (annualKwh / 365) * daily_profile[h]`。
*   高级实现：引入月度系数 `monthly_weights[12]`。

**`generatePVProfile(planes, location)`**

*   `planes`: List of `{aspect, tilt, capacity_kw}`
*   基于简化的辐射模型 (CSM) 或 预置的查找表 (LUT) 生成 8760 小时发电曲线。
*   *注*: 前端实现可能需要一个预计算的 `SolarRadiationTable` (按纬度/方位角/倾角)。

## 4. `InverterSelector` 模块

#### Methods

**`select(pv_capacity_kw, phase_type)`**

*   根据 `pv_capacity_kw` 和 `phase_type` (single/three)，从配置的 Catalog 中选择最小满足 `DC/AC <= max_ratio` 的逆变器。
*   如果 Catalog 中最大的逆变器仍不满足，返回 `recommend_trim` (建议裁剪 PV) 或 `recommend_parallel` (建议并机)。
