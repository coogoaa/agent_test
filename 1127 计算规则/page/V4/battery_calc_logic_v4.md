# V4 电池容量推算逻辑（A/B/C 三方案）

## 目标与原则

- 使用统一的、可解释的口径推算电池容量。
- 参数可配置：核心仅依赖少量系数（`k_surplus`、`DoD`、`RTE`、`cap`）。
- 允许电池通过电网充电（峰谷套利/VPP/未来策略），因此 B 方案不强制以“整夜覆盖”为目标。
- 当前使用兜底参数构造负载与发电曲线；未来可用房屋的真实发电/用电数据替代兜底数据，推算公式不变。

## 输入与兜底参数来源

### 1) 光伏发电（兜底）

- **各州年发电系数**（`kWh / kW / year`）
  - 来源：`1127 计算规则/参数：/兜底用的各州年发电系数.md`
- **月度发电占比**（12个月加总为 100%）
  - 来源：`1127 计算规则/参数：/兜底用的小时发电量比例.md`（其中“发电量占比”一行）
- **小时发电占比**（24小时加总为 100%）
  - 来源：`1127 计算规则/参数：/兜底用的小时发电量比例.md`（其中“时间(小时)”表格对应的24小时比例）

### 2) 负载用电（兜底）

- **各州全年用电量**（`kWh / year`）
  - 来源：`1127 计算规则/参数：/各州全年用电量.md`
- **各州月用电比例**（12个月加总为 100%）
  - 来源：`1127 计算规则/参数：/各州月用电比例.md`
- **各州各时段用电比例**（24小时加总为 100%）
  - 来源：`1127 计算规则/参数：/各州各时段用电比例.md`

### 3) 其它配置

- `DoD`：电池可用放电深度（默认 0.9）
- `RTE`：电池往返效率（默认 0.95）
- `cap_kwh`：电池容量上限（默认 50kWh，补贴上限）
- `kA_surplus`：A 方案的“光伏剩余维度”系数（默认 0.8）
- `kB_surplus`：B 方案的“光伏剩余维度”系数（默认 0.5）

## 时间窗口定义

- **晚高峰窗口（Evening Peak）**：17:00–21:00，共 4 小时（17、18、19、20）
- **整夜窗口（Extended Night）**：17:00–07:00，共 14 小时（17–23 + 0–6）
- **光伏剩余计算月份**：6 月（June）

## 曲线构造与中间量

设：
- `pv_kw`：系统光伏装机（kW）
- `state`：州代码（TAS/VIC/NSW/SA/QLD/ACT/NT/WA）

### 1) 6月负载曲线（kWh/day 与 kWh/hour）

1. 年用电量：`Load_year = annual_consumption[state]`
2. 6月用电量：`Load_june = Load_year * load_month_share[state][June]`
3. 6月日均用电：`Load_day = Load_june / days_in_June`
4. 6月逐小时用电：
   - `Load_hour[h] = Load_day * load_hour_share[state][h]`

得到：
- `E_evening = sum(Load_hour[17..20])`
- `E_night = sum(Load_hour[17..23] + Load_hour[0..6])`

### 2) 6月发电曲线（kWh/day 与 kWh/hour）

1. 年发电量：`PV_year = pv_kw * annual_yield[state]`
2. 6月发电量：`PV_june = PV_year * pv_month_share[June]`
3. 6月日均发电：`PV_day = PV_june / days_in_June`
4. 6月逐小时发电：
   - `PV_hour[h] = PV_day * pv_hour_share[h]`

### 3) 6月日均“光伏剩余可充电能量”（kWh/day）

- `E_surplus = sum_h max(0, PV_hour[h] - Load_hour[h])`

> 注：这里用的是“PV - Load”逐小时截断再累加的方式。

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
  - 额外容量用于移峰/套利（可用光伏剩余或电网谷电充电；当前用“6月光伏剩余”作为兜底估计）。
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

## 为什么 B 不使用“整夜覆盖”

- 电池允许电网充电，B 的价值主要体现在“削峰 + 移峰/套利/VPP”，而不是对标备电。
- 若 B 强制整夜覆盖，会导致小屋顶或小光伏也被推到较大电池容量，产品解释与用户感知不匹配。

## 未来接入真实数据的替换点

当拿到房屋真实数据时，可以用以下方式替换兜底：

- 将 `Load_hour[h]` 替换为用户真实的 6 月（或代表月）逐小时用电。
- 将 `PV_hour[h]` 替换为用户真实的 6 月逐小时发电（或通过 PVGIS/逆推等得到）。

此时：
- `E_evening / E_night / E_surplus` 的计算方式不变。
- A/B/C 的公式与参数保持不变。
