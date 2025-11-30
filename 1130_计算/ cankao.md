下面是基于你原始文档 **全面完善后的生产级“光伏设备推荐系统 — 完整推导逻辑文档”**。我把原有思路保留，同时做了多处改进与工程化细化：更严谨的坡面打分、DC/AC 与逆变器选型规则澄清、**优先把 PV 溢出先充电再并网**、小时仿真的必要性与实现细节、三套差异化方案 A/B/C 的具体目标与判定阈值、坡面裁剪策略、校验步骤与验收指标，以及最终输出结构。文档已足够直接实现成服务或代码模块。

---

# # 光伏设备推荐系统 — 完整推导逻辑（增强版）

## 一、总体概述（目标）

基于 GIS 屋顶坡面、每坡面可装板数、已计算的每块板小时发电量（12×24 或 365×24）、用户负荷（或州级预设）与电网相位，自动生成并校验 **三套差异化方案**：

* **A（Max）**：最大化装机与产能（优先保留屋顶能装数），追求最大自给/发电；
* **B（Balanced）**：均衡推荐，性价比/合规兼顾；
* **C（Economy）**：经济型，优先成本效率与最低保守储能。

所有方案均经过 **日均快速筛选 → 小时级仿真精校**，并保证符合澳洲常见接入约束（**export cap 默认 单相 5kW / 三相 15kW**，**混合逆变器 DC:AC 上限默认 200%**，但最终以 DNSP/设备厂商数据为准）。

---

## 二、核心输入与默认参数（必须明确）

### 必需输入

* 屋顶坡面数组 `planes = [{id, aspect(deg), tilt(deg) optional, max_panels}]`
* 每坡面每块板的小时发电量 `g_s[h]`（kWh/小时/板） — 支持 12×24/月×小时或 365×24
* 单板标称功率 `P_panel_stc` (W)（例如 440 W）
* 用户负荷 `L[h]`（优先 365×24；若无可合成：年用电 × 月分配 × 24h profile）
* 电网信息：`phase` ∈ {single, three}
* 用户偏好（可选）：目标夜间覆盖 `s_night`、是否优先储能（true/false）等

### 默认工程参数（可配置）

* `ExportLimit`: single=5 kW, three=15 kW
* `DCAC_max` = 2.0 (200%)（用于选逆变器与裁板检查）
* `eta_rt` = 0.90（round-trip）→ `eta_chg = eta_dis = sqrt(eta_rt)`
* `DoD` = 0.90
* `SOC_init` = 0.50（仿真中默认）
* `charge_window_hours` = default hours PV>0 (approx 07:00–18:00)
* `inverter_catalog`: list of available AC ratings per phase（由安装商维护）
* `battery_power_default`：建议取 `min(inverter_ac, battery_nominal * 0.5~1.0)`（0.5C~1C）

---

## 三、预处理（把输入转成易用的小时矩阵）

1. **将所有 `g_s[h]` 转为统一时序长度**（若 12×24 按月份扩展到 365×24 或用代表日模式，或直接用 12×24 做月级仿真）。
2. 计算 **每坡面单板日/年产能**：
   [
   e_s = \sum_{h} g_s[h]  \quad (\text{day或year})
   ]
3. 计算 **满配 PV**（屋顶物理极限）：

   * `N_s_max` 为每坡面最大板数
   * `PV_rated_full_kW = \sum_s N_s_max × P_panel_stc / 1000`
   * `PV_t_full[h] = \sum_s N_s_max × g_s[h]`（kWh/h）

---

## 四、坡面评分（改进版 — 考虑方位 + 倾角 +遮挡系数）

原方案只用方位，建议改为综合评分：

### 4.1 评分组成

* `score_aspect`：方位得分（你原公式，南半球北向最佳）
  [
  diff = \min(|aspect|, 360-|aspect|),\quad score_aspect = \max(0, 1 - \frac{diff}{180})
  ]
* `score_tilt`：（理想倾角依据纬度，平差）
  [
  ideal_tilt = \text{lat} \times 0.8 \text{ (经验)}; \quad score_tilt = 1 - \frac{|tilt - ideal_tilt|}{90}
  ]
* `score_shade`：遮挡因子（来自 GIS/影像评估，0..1，1表示无遮挡）

### 4.2 综合得分（0..100）

[
score_s = 100 × ( w_a × score_aspect + w_t × score_tilt + w_sh × score_shade )
]
默认权重：`w_a=0.6, w_t=0.3, w_sh=0.1`（可调）

> 说明：若你没有 tilt 或 shade 数据，可以退化回原 aspect-only 评分。

---

## 五、日均初筛（用于生成 A/B/C 初版）

计算重要日均量（代表日或年平均）：

* `PV_day = sum_{h in day} PV_t_full[h]`
* `Load_day = sum_{h in day} L[h]`
* `E_surplus_day = sum_{h in day} max(0, PV_t_full[h] - L[h])`
* `E_night_day = sum_{h in night} L[h]`

日均法初步计算 battery usable need：
[
Battery_{usable_est} = \max( E_{night_day} × s_{night_target},, E_{surplus_day} )
]
名义容量：
[
C_{nom_est} = \dfrac{Battery_{usable_est}}{DoD}
]

备注：日均法用于快速出三套候选；小时仿真用于精校并产生最终方案。

---

## 六、逆变器选型规则（澄清 DC:AC）

**容配比定义（准确）**：
[
DC/AC = \dfrac{PV_{rated_DC_kW}}{Inverter_AC_kW}
]

* DC/AC ≤ `DCAC_max`（default 2.0）为合规性检查。
* 安装商可选择逆变器档位（catalog），常见单相上限 5–10 kW，三相上限可更大。最终以设备厂家与 DNSP 规则为准。

**选型优先级**：

1. 计算 `Inverter_AC_min = ceil(PV_rated / DCAC_max)`（向上到可选的逆变器档位）
2. 如果 `Inverter_AC_min` 在 catalog 中存在，选择最接近但不小于它的档位（考虑成本/availability）。
3. 若 catalog 最大档位仍无法满足 DCAC_max，**两种选择**：

   * 增加逆变器并机（并联）或选更大设备（若用户接受 & DNSP 允许）；
   * 否则按“坡面裁剪”规则减板，直到 `PV_rated_new ≤ DCAC_max × max_inv_ac`。

**注意**：不要把 DC:AC 误写为 PV_kWh vs battery_kWh 的约束；DC:AC 与电池容量没有直接规范关系，但业务上常用经验上限（例如不建议 battery_nominal > 2×PV_kWp）作为保守上限——**但不是规范**。

---

## 七、电池尺寸与功率的推荐逻辑（优先充电策略）

### 7.1 设计原则（你要求的）

* **PV 溢出优先充电电池，只有电池充满或功率受限后才并网导出**（符合你要求）。
* 电池要满足两个目的：**覆盖夜间负荷**与**吸收白天溢出**，最终取二者的合理合成（按小时仿真确认）。

### 7.2 日均法（初估）

[
Battery_{usable_need} = \max( E_{night} × s_{night},; E_{surplus_day} )
]
[
C_{nom_est} = \dfrac{Battery_{usable_need}}{DoD}
]

校核充电能力：
[
MaxChargeDaily \approx P_{charge} × T_{charge} × \eta_{chg}
]
若 `Battery_usable_need > MaxChargeDaily` 则：

* 方案 a) 提高 `P_charge`（更大 inverter 或并机）；
* 方案 b) 接受跨日充电（但在经济上不佳）；
* 方案 c) 缩小电池容量至可被 PV 在 1 日或短时窗内填满。

### 7.3 小时仿真法（精校 — 必做）

**输入**：`PV_t`（最终按坡面分配后的小时产出），`L_t`，`Inverter_AC`，`ExportCap`，battery candidate C_nom, `P_inv_chg/dis`, `P_bat_chg/dis`，`SOC_init`。
**步骤**：

1. 对每小时：优先满足负荷；若 PV 剩余，**先充电池**（受 `P_inv_chg_max`, `P_bat_chg_max`, SOC 上限 控制）；剩余再允许导网（受 `ExportCap`）；若 PV 小于负荷，电池可放电（受 `P_inv_dis_max`, `P_bat_dis_max`, SOC 下限），剩余由 grid 进口。
2. 记录每小时的 `stored`, `discharged`, `grid_import`, `grid_export`, `clipped`（裁切）与 `SOC`。
3. 指标：年/日自耗率、自给率、夜间覆盖率、溢出吸收率、平均循环次数、裁切量。
4. 用二分（或更高阶优化）搜索最小 `C_nom` 满足：`night_coverage ≥ s_night` 且 `surplus_absorb_fraction ≥ p_absorb_target`（或目标自给率）。

**放电/充电效率处理**：用 `eta_chg = eta_dis = sqrt(eta_rt)`。

### 7.4 电池功率（kW）推荐

* 充电功率 `P_bat_chg` ≈ `min(P_inv_chg_max, PV_peak_when_surplus, battery_spec_charge_limit)`
* 放电功率 `P_bat_dis` ≥ `desired_backup_power`（用户备电需求）或 ≥ `household_peak_fraction`（例如保障 3–5 kW）
* 常见经验：`P_bat` 选择为 `0.5C ~ 1C`（battery_kW = battery_kWh × 0.5~1.0），但必须 ≤ inverter AC 或 manufacturer PCS limits。

---

## 八、坡面裁剪（当逆变器不能撑住 PV）

当 `PV_rated > DCAC_max × max_available_inv_ac` 时，采取裁剪：

### 裁剪策略（从发电贡献小的坡面开始，保留产能最大坡面）

1. 计算每坡面**每块板的年产能** `e_s`（或代表月）
2. 生成候选移除列表：按 `e_s` 升序（最小产出优先删）
3. 需要删减的功率:
   [
   excess_kW = PV_{rated} - DCAC_{max} × max_inv_ac
   ]
   [
   panels_to_remove = ceil(excess_kW × 1000 / P_{panel_stc})
   ]
4. 循环从低产能坡面每次删 1 板（或按模块包）直至满足约束；更新 `PV_t`、`PV_rated`、并重新运行小时仿真校验（确保仍满足用户目标或提示用户调整逆变器）。

**备注**：删板时优先考虑同一坡面连续删（便于施工/美观）并把位置建议传给布局工具。

---

## 九、三套方案的工程化定义与阈值（A/B/C 详细）

每套方案包含：`PV (panels + per-slope allocation)`, `Inverter (AC rating, model)`, `Battery (kWh nominal, kW charge/discharge)`, `仿真指标 summary`。下面给出生成逻辑与接受阈值。

### 9.1 方案 A — Maximum（保留满配优先）

* **PV**：尽可能使用 `N_s_max`（只有在 DC:AC 合规性失败且用户拒绝更大 inverter 时才裁板）
* **Inverter**：优先选 larger AC rating，使 `DC/AC ≤ 2.0`（可并机）；若最大档位仍不足，裁板（按裁剪策略）
* **Battery sizing**：`C_nom` 取小时仿真最小满足 `night_coverage ≥ 0.9` 且 `surplus_absorb_fraction ≥ 0.95`（若不可达则提示并建议增逆变器）
* **Battery power**：选 `P_bat_dis` ≥ `max(backup demand, peak load fraction)`；`P_bat_chg` ≈ `inverter_ac`（若可行）或 PV_peak
* **Acceptance**：夜间覆盖 ≥ 90%，溢出吸收 ≥ 95%，裁切量最小化（尽量 0）

### 9.2 方案 B — Balanced（默认推荐）

* **PV**：优先保留产能高的坡面，目标 `PV_rated ≈ min( PV_rated_full, 12~14 kW 或屋顶规模参考值)`（可根据屋顶大小自适应）
* **Inverter**：选常用档位（5/6/8/10/15kW）使 `DC/AC` 在 1.5–2.0 区间（优先 1.6~1.9）
* **Battery sizing**：小时仿真使 `night_coverage ≥ 0.8` 且 `surplus_absorb_fraction ≥ 0.8`
* **Battery power**：`P_bat_dis` ≈ `min(inverter_ac, 0.8×battery_kWh/day_peak_hours)`
* **Acceptance**：夜间覆盖 ≥ 80%，自耗提升显著（例如自耗率 ≥ 40%）

### 9.3 方案 C — Economy（低成本）

* **PV**：目标固定（例如 6.6 kW）或按屋顶小型化配置（避免逆变器升级）
* **Inverter**：常见小档位（single:5kW）确保成本低且 DC/AC 在 1.0–1.6
* **Battery sizing**：`C_nom` 小，目标 `night_coverage ≥ 0.5` 或日均节电目标（例如网购电费节省率）
* **Battery power**：低功率（例如 3–5 kW）
* **Acceptance**：成本优先、性能可接受（夜间覆盖 50–60%）

---

## 十、小时仿真实现要点（详尽步骤）

1. **Initialize** `SOC = SOC_init`， `C_usable = C_nom × DoD`。
2. For each hour `t`:

   * `pv = PV_t[t]`, `load = L_t[t]`
   * If `pv >= load`:

     * `surplus = pv - load`
     * `charge_possible = min(surplus, P_inv_chg_max, P_bat_chg_max, (1-SOC)*C_usable)`
     * `stored = charge_possible × eta_chg` → `SOC += stored / C_usable`
     * `surplus_after_charge = surplus - charge_possible`
     * `export = min(surplus_after_charge, ExportLimit)`
     * `clipped = surplus_after_charge - export`
   * Else (`pv < load`):

     * `deficit = load - pv`
     * `discharge_possible = min(deficit, P_inv_dis_max, P_bat_dis_max, SOC*C_usable)`
     * `delivered = discharge_possible × eta_dis` → `SOC -= discharge_possible / C_usable`
     * `grid_import += (deficit - delivered)`
   * Record hour metrics (stored, discharged, export, clipped, SOC).
3. After simulation:

   * Compute `night_coverage = (battery_discharge_during_night) / (night_load)`
   * Compute `surplus_absorbed = total_battery_charged / total_surplus`（限定 total_surplus>0）
   * Compute self-consumption `= (total_pv - total_export - total_clipped) / total_pv`
   * Estimate annual cycles `= total_battery_discharged_year / C_usable`

**Notes**:

* For **phase-aware** simulation, split PV and load into three phases and apply export cap per phase (especially for single-phase large PV).
* For DC-coupled hybrids，若 PV 可直接给 battery（no AC round-trip），需用厂商效率数据来替代 generic η_chg/η_dis。

---

## 十一、裁验与验收（各方案必须满足的 checks）

在输出最终方案时应逐项验证并将结果写入 `推导日志`：

1. `DC/AC ≤ DCAC_max`（或说明由于并机/upgrade 需要的操作）
2. `Export cap` 未被持续超限（若短时超限，必须说明如何处理）
3. 夜间覆盖率与溢出吸收率达到方案目标
4. SOC 曲线在合理区间（SOC_min..SOC_max 不越界）
5. 平均电池循环次数合理（建议 < 1.0 日循环/天 平均，依电池寿命）
6. 裁切（clipping）量小（尤其 A 方案应尽量小）
7. 如果电池若跨日充满（MaxChargeDaily不足），需在输出中明确标注并提示可能的行为（跨日充电、不足充电或升级逆变器）

---

## 十二、输出结构（标准 JSON 模板）

`result = { planA: {...}, planB: {...}, planC: {...}, logs: [...] }`

每个 plan 包含：

```
{
  "name": "A/B/C",
  "policy": "max/balanced/economy",
  "panels": { "total": int, "per_slope": [{id, used_panels}] },
  "pv_rated_kw": float,
  "inverter": { "selected_model": "XXkW Hybrid", "ac_kw": float, "dcac_ratio": float },
  "battery": { "nominal_kwh": float, "usable_kwh": float, "dod": float, "p_charge_kw": float, "p_discharge_kw": float, "standardized_kwh": float },
  "simulation": { "self_consumption": 0..1, "autarky": 0..1, "night_coverage": 0..1, "daily_surplus_absorbed": 0..1, "clipped_kwh_day": float },
  "compliance": { "dcac_ok": bool, "export_ok": bool, "notes": [] }
}
```

`logs` 存放步骤详情、警告、裁剪记录。

---

## 十三、边界情况与建议处理（补充）

* **无可用屋顶**：返回 `no_roof` error。
* **PV_rated tiny < inverter minimum**：提示可使用 micro-inverter 或建议合并。
* **用户提供真实账单**：先解析账单构造 365×24 `L[h]`（按月/日分配/TOU），小时仿真给出 ROI 与账单节省。
* **DNSP 特殊限制**：在 final stage 要校验 DNSP 接入表；若 DNSP 强制更低 export／特殊接入规则，提示并重新优化。
* **并机逆变器**：如需并机，记录并机方案（每台逆变器对应哪些坡面/MPPT），并进行相平衡分配。

---

## 十四、工程实现建议（模块化）

建议系统按模块实现并在 API 层对外暴露：

1. `preprocess_module`：把 GIS & panel data → `g_s[h]`、`e_s`、`PV_t_full`
2. `score_module`：坡面综合评分（aspect/tilt/shade）
3. `candidate_generator`：用日均法快速生成 A/B/C 初稿
4. `inverter_selector`：从 catalog 选档位、并支持并机逻辑
5. `trimmer`：坡面裁剪器（根据 e_s 升序删板）
6. `hourly_simulator`：小时仿真引擎（可接入不同 topology：AC-coupled / DC-coupled）
7. `optimizer`：在 candidate 上做 battery kWh / kW 二分或多目标搜索
8. `reporter`：将 plan 输出到 JSON/可下载 PDF，并给出 logs/warnings

---

## 十五、验收测试要点（建议实现后自动化测试）

实现后要有一组自动化测试：

* Case1：满屋顶 20kW、single phase，catalog 最大 10kW → 需裁板 1 板（验证裁剪算法）
* Case2：8kWp PV, 16.5 kWh/day load → Balanced 方案 battery≈9–13 kWh（与经验一致）
* Case3：提供真实 365×24 load + TOU rate → 校验 ROI 输出（账单节省）
* Case4：三相大屋顶 30kWp → verify DCAC, inverter paralleled, phase balance
* Case5：edge-case no roof (max_panels=0) → returns error

---

## 十六、示例（快速示范：TAS，屋顶 46 片 440W）

（这是你原来给的例子，我在增强逻辑后给出简短结果示范）

* `PV_rated_full = 46 × 0.44 = 20.24 kW`
* single-phase → catalog max 10kW → DCAC_max * max_inv = 2 × 10 = 20 kW → 超出 0.24 kW → `panels_to_remove = ceil(240/440)=1` → 最终 45 片 → 19.8 kW → DC/AC = 198% → 合规
* 日均法估算 `E_surplus_day`、`E_night` → `C_nom_est ≈ max(E_night*0.8, E_surplus_day) / DoD` → 得到 20kWh 左右 → 标准化 20 kWh（A）
* 小时仿真：基于 PV_t (per-hour from g_s[h] × used panels) 与 L[h] 得到夜间覆盖、自耗率和裁切指标；若 A 方案未满足 `surplus_absorb >= 0.95` 可能建议逆变器并机或改为 2 台 10 kW 并机以减少裁切/提高充电速率。

（上面仅为流程示例，实际数值由小时仿真得出）

---

## 十七、交付项（开发/产品交付清单）

* 完整算法模块的伪代码/实现接口（见上模块化建议）
* 三套方案生成 API：`/recommend(plans, inputs)` → 返回 JSON `result`（结构如第十二节）
* 日志 & 报告（包含裁剪原因、合规说明、仿真 KPI）
* 单元测试用例清单（见第十五节）

---


