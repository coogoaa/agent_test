# 1130 新版光伏计算系统规划文档

## 1. 概述

本系统旨在基于 `1127 计算规则` 的现有 UI 框架，全面升级内核算法，以匹配 `1130_计算/cankao.md` 中定义的增强版逻辑。核心转变是从**基于经验系数的静态估算**转向**基于小时级时序数据的动态仿真**。

## 2. 核心架构变更

### 2.1 计算引擎升级
原系统使用简单的乘法系数（如 `日用电量 * 0.5`）来估算电池容量。新系统将引入一个纯 JavaScript 实现的仿真引擎，在浏览器端执行 8760 小时（365天 x 24小时）或代表日的高频模拟。

**新模块结构 (建议在 `page/js/core/` 下实现):**
1.  **`HourlySimulator` (核心仿真器)**
    *   输入：`PV_t` (光伏时序产出), `Load_t` (负荷时序), `Battery_Specs` (电池参数), `Inverter_Specs` (逆变器参数), `Policy` (充电策略)
    *   逻辑：执行逐小时能量平衡计算，优先执行“PV溢出充电”策略。
    *   输出：`SelfConsumption`, `Autarky`, `NightCoverage`, `Export`, `Clipped` 等 KPI。

2.  **`PlanGenerator` (方案生成器)**
    *   逻辑：根据 A/B/C 三套策略的定义，调用 Simulator 进行迭代寻优（如二分法寻找满足自给率的最小电池容量）。
    *   集成：坡面裁剪 (Trimmer) 与 逆变器选型 (InverterSelector)。

3.  **`DataSynthesizer` (数据合成器)**
    *   功能：将输入的 GIS 坡面数据、州级负荷曲线、年用电量，合成为仿真所需的 `PV_t[8760]` 和 `Load_t[8760]` 数组。

### 2.2 数据流向
1.  **用户输入**: 房屋 GIS 数据, 州/Region, 年用电量, 偏好设置。
2.  **预处理**: 
    *   `Load Profile` 生成: 年用电量 -> 应用州级月度/小时分布 -> 8760 负荷曲线。
    *   `PV Profile` 生成: 坡面(方位/倾角) -> 应用简化的太阳几何模型或查表 -> 8760 发电曲线。
3.  **策略计算 (并行)**: 
    *   Plan A (Max): 满铺 -> 逆变器适配 -> 仿真求最大自给电池。
    *   Plan B (Balanced): 均衡 -> 仿真求性价比电池。
    *   Plan C (Economy): 经济 -> 最小化配置。
4.  **结果输出**: JSON 结构化数据 + 图表渲染。

## 3. 页面功能规划

### 3.1 `equipment-recommender.html` (新建系统)
*   **UI 调整**:
    *   增加“仿真参数”高级设置折叠面板（如：是否允许电网充电、目标夜间覆盖率）。
    *   结果展示区增加“典型日能源流向图”（展示 PV 曲线、负荷曲线、电池充放动作）。
    *   增加 KPI 展示：自给率 (Self-sufficiency)、自耗率 (Self-consumption)、ROI 估算。
*   **逻辑对接**:
    *   移除旧的 `calculatePlanA/B/C` 简单函数。
    *   接入 `PlanGenerator`，前端显示“正在进行小时级仿真...”进度条。

### 3.2 `storage-expansion.html` (储能扩容)
*   **逻辑差异**:
    *   输入不仅仅是屋顶，还需考虑**现有系统**（如有）。或者假设完全新建储能+扩容PV。
    *   根据 `cankao.md`，扩容逻辑需明确是 AC-Coupled 还是 Hybrid 替换。新版默认按 **Hybrid 替换** 或 **新增 AC 耦合电池** 处理（需在 Config 中可配）。

### 3.3 `config-editor.html` (配置编辑器)
*   **新增字段**:
    *   `Simulation`: `time_step` (默认 1h), `default_export_limit` (5kW/15kW).
    *   `Policy`: A/B/C 方案的具体目标阈值（如 Plan B 目标夜间覆盖率 80%）。
    *   `Inverter Catalog`: 允许录入逆变器型号库（品牌、额定功率 AC、最大 DC 输入）。

### 3.4 `batch-processor.html` (批量处理)
*   **性能优化**:
    *   由于引入小时级仿真，单条计算量增加。需使用 `Web Worker` 将计算放入后台线程，避免阻塞 UI。
    *   支持结果分批导出。

## 4. 数据结构定义 (参考 cankao.md)

### 4.1 方案输出 JSON
```json
{
  "houseId": "xxx",
  "planA": {
    "name": "Max Performance",
    "panels": { "total": 20, "layout": [...] },
    "inverter": { "ac_kw": 8.0, "dc_ratio": 1.3 },
    "battery": { "kwh": 13.5, "power_kw": 5.0 },
    "simulation_results": {
      "self_consumption_rate": 0.45,
      "grid_export_kwh": 3000,
      "night_coverage": 0.92
    }
  },
  "logs": ["Trimmed 2 panels due to shade", "Inverter limit reached"]
}
```

## 5. 实施步骤建议

1.  **Step 1: 核心算法库开发 (`js/core/`)**
    *   实现 `SolarGeometry` (生成 PV 曲线)。
    *   实现 `HourlySimulator` (电池充放电逻辑)。
    *   编写单元测试（用简单的输入验证输出是否符合能量守恒）。

2.  **Step 2: 配置中心改造**
    *   修改 `config-loader.js` 支持新参数。
    *   更新 `config-editor.html`。

3.  **Step 3: 页面集成**
    *   改造 `equipment-recommender.html` 调用新算法库。
    *   实现图表可视化（使用 Chart.js 或 ECharts 展示仿真结果）。

4.  **Step 4: 批量与扩容适配**
    *   将核心算法封装进 Web Worker 供 `batch-processor` 使用。

## 6. 待确认项
*   **PV 生成模型**: 前端是否内置简化的太阳辐射模型（Clear Sky Model + 简单云量衰减），还是继续使用预设的 `g_s[h]` 系数？
    *   *建议*: 初期使用预设的标准化 `normalized_generation_profile[24]` (按月/季节区分) 扩展到 8760，以保持前端轻量化，后续可对接 API。
*   **负荷曲线**: 同样建议使用 `normalized_load_profile[24]` * 年用电量 / 365 进行合成。
    按照建议执行。
    
