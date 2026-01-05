# V6 电池容量推算逻辑（简化版）

## V6 相对于 V4 的简化

**核心简化**：光伏剩余使用**全年日均**来估算，不再查找对应的 6 月数据。

### 主要变化

1. **V4 方式**：使用 6 月份的逐小时发电和用电数据计算光伏剩余
2. **V6 方式**：使用全年平均的日发电量和日用电量计算光伏剩余

### 优势

- 计算更简单，不需要月度分布参数
- 使用全年平均值更具代表性
- 减少参数依赖，提高可维护性

## 输入与兜底参数来源

### 1) 光伏发电（兜底）

- **各州年发电系数**（`kWh / kW / year`）
  - 来源：`config.pv.annualYieldByState`

### 2) 负载用电（兜底）

- **各州全年用电量**（`kWh / year`）
  - 来源：`config.consumption[state]`
- **各州各时段用电比例**（24小时加总为 100%）
  - 来源：V4 的 `HOURLY_PROFILE_PCT`

### 3) 其它配置

- `DoD`：电池可用放电深度（默认 0.9）
- `RTE`：电池往返效率（默认 0.95）
- `cap_kwh`：电池容量上限（默认 50kWh，补贴上限）
- `kA_surplus`：A 方案的"光伏剩余维度"系数（默认 0.8）
- `kB_surplus`：B 方案的"光伏剩余维度"系数（默认 0.55）

## 时间窗口定义

- **晚高峰窗口（Evening Peak）**：17:00–21:00，共 4 小时（17、18、19、20）
- **整夜窗口（Extended Night）**：17:00–07:00，共 14 小时（17–23 + 0–6）

## 曲线构造与中间量（V6 简化版）

设：
- `pv_kw`：系统光伏装机（kW）
- `state`：州代码（TAS/VIC/NSW/SA/QLD/ACT/NT/WA）

### 1) 全年日均负载曲线（kWh/day 与 kWh/hour）

1. 年用电量：`Load_year = annual_consumption[state]`
2. **日均用电**：`Load_day = Load_year / 365`
3. 逐小时用电（使用各州时段比例）：
   - `Load_hour[h] = Load_day * load_hour_share[state][h]`

得到：
- `E_evening = sum(Load_hour[17..20])`
- `E_night = sum(Load_hour[17..23] + Load_hour[0..6])`

### 2) 全年日均发电曲线（kWh/day 与 kWh/hour）

1. 年发电量：`PV_year = pv_kw * annual_yield[state]`
2. **日均发电**：`PV_day = PV_year / 365`
3. 逐小时发电（使用统一的小时发电比例）：
   - `PV_hour[h] = PV_day * pv_hour_share[h]`

### 3) 全年日均"光伏剩余可充电能量"（kWh/day）

- `E_surplus = sum_h max(0, PV_hour[h] - Load_hour[h])`

> 注：这里用的是"PV - Load"逐小时截断再累加的方式，但使用的是全年日均数据。

## 三方案电池容量推算

统一换算：

- `eff = DoD * RTE`
- `Battery_nominal = min(E_req / eff, cap_kwh)`

### C 方案（削峰）

- 定位：晚高峰削峰。
- 公式：
  - `E_req_C = E_evening`
  - `Battery_C = min(E_req_C / eff, cap_kwh)`

### B 方案（削峰 + 移峰/套利/VPP）

- 定位：
  - 至少覆盖晚高峰（与 C 相同的最低体验）。
  - 额外容量用于移峰/套利（可用光伏剩余或电网谷电充电；当前用"全年日均光伏剩余"作为兜底估计）。
- 公式：
  - `E_req_B = max(E_evening, kB_surplus * E_surplus)`
  - `Battery_B = min(E_req_B / eff, cap_kwh)`

### A 方案（整夜覆盖 + 更强移峰 + 50kWh补贴上限）

- 定位：
  - 整夜覆盖（舒适性/备电叙事）。
  - 更强的移峰能力与更大容量（同时受 50kWh 上限限制）。
- 公式：
  - `E_req_A = max(E_night, kA_surplus * E_surplus)`
  - `Battery_A = min(E_req_A / eff, cap_kwh)`

## V6 与 V4 的对比

| 项目 | V4 | V6 |
|------|----|----|
| 光伏剩余计算基准 | 6 月份数据 | 全年日均数据 |
| 月度分布参数 | 需要 | 不需要 |
| 计算复杂度 | 较高 | 较低 |
| 代表性 | 冬季代表月 | 全年平均 |

## 未来接入真实数据的替换点

当拿到房屋真实数据时，可以用以下方式替换兜底：

- 将 `Load_hour[h]` 替换为用户真实的全年日均逐小时用电。
- 将 `PV_hour[h]` 替换为用户真实的全年日均逐小时发电（或通过 PVGIS/逆推等得到）。

此时：
- `E_evening / E_night / E_surplus` 的计算方式不变。
- A/B/C 的公式与参数保持不变。
