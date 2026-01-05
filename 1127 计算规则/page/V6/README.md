# V6 简化版计算逻辑

## 概述

V6 是基于 V4 的简化版本，主要简化点是：**光伏剩余使用全年日均来估算，不再使用 6 月数据**。

## 核心变化

### V4 方式
- 使用 6 月份的逐小时发电和用电数据
- 需要月度分布参数（`PV_MONTHLY_SHARE` 和 `LOAD_MONTHLY_SHARE`）
- 计算 6 月日均光伏剩余

### V6 方式
- 使用全年平均的日发电量和日用电量
- 不需要月度分布参数
- 计算全年日均光伏剩余

## 优势

1. **更简单**：减少参数依赖，不需要月度分布数据
2. **更具代表性**：全年平均比单一月份更能反映整体情况
3. **更易维护**：参数更少，逻辑更清晰

## 文件说明

- `battery_calc_logic_v6.md` - V6 计算逻辑详细文档
- `run_v6_batch_export.js` - V6 批量计算脚本
- `analyze_boundary_cases.js` - 边界案例分析脚本
- `out/` - 输出目录

## 使用方法

### 1. 批量计算

```bash
node run_v6_batch_export.js --state=NSW --phase=single
```

参数：
- `--state` 或 `--states`: 州代码，逗号分隔（如 NSW,VIC,TAS）
- `--phase` 或 `--phases`: 相位类型，逗号分隔（single,three）
- `--csv`: CSV 文件路径（默认使用 `../../验证数据/agent_sample_data - 坡面信息.csv`）

### 2. 边界案例分析

```bash
node analyze_boundary_cases.js --file=out/v6_full_YYYYMMDDTHHMMSS.tsv
```

## 边界案例测试结果

基于 4937 个房屋的测试数据（NSW州，单相），V6 版本在各种屋顶规模下都能正常工作：

### 极小屋顶（≤1.76kW, ≤4块板）
- 数量：401 个
- 平均 PV：1.11 kW
- 平均电池：16.00 kWh
- 特点：电池容量主要由整夜需求决定（12.69 kWh），光伏剩余几乎为 0

### 很小屋顶（1.76kW-6.6kW）
- 数量：1222 个
- 平均 PV：4.44 kW
- 平均电池：16.00 kWh
- 特点：光伏剩余开始增加，但仍以整夜需求为主

### 小屋顶（6.6kW-10kW）
- 数量：969 个
- 平均 PV：8.03 kW
- 平均电池：23.36 kWh
- 特点：光伏剩余显著增加，电池容量开始由光伏剩余驱动

### 中等屋顶（10kW-14kW）
- 数量：763 个
- 平均 PV：11.82 kW
- 平均电池：38.91 kWh
- 特点：光伏剩余充足，电池容量主要由 0.8×剩余决定

### 大屋顶（14kW-20kW）
- 数量：793 个
- 平均 PV：16.48 kW
- 平均电池：50.00 kWh
- 特点：达到 50kWh 补贴上限

### 超大屋顶（≥20kW）
- 数量：595 个
- 平均屋顶：36.40 kW
- 平均 PV：20.00 kW（受单相 10kW 逆变器限制）
- 平均电池：50.00 kWh

## 计算逻辑验证

V6 的计算逻辑在各种边界情况下都表现正常：

1. **极小屋顶**：能正确处理只能铺 1-4 块板的情况
2. **铺不满 6.6kW**：能正确计算小于 6.6kW 的系统
3. **6.6-10kW**：能正确推荐合适的电池容量
4. **10-14kW**：电池容量随光伏剩余合理增长
5. **大屋顶**：正确达到 50kWh 上限
6. **超大屋顶**：正确受逆变器容配比限制

## 输出字段说明

TSV 输出文件包含以下字段：

- `house_id`: 房屋 ID
- `calc_mode`: 计算模式（new/expansion）
- `state`: 州代码
- `phase`: 相位类型（single/three）
- `plan`: 方案标识（A/B/C）
- `plan_name`: 方案名称（高端型/平衡型/经济型）
- `roof_max_kw`: 屋顶最大容量（kW）
- `pv_model`: 光伏面板型号
- `pv_watt`: 单块面板功率（W）
- `pv_kw`: 光伏系统容量（kW）
- `panel_count`: 面板数量
- `inverter_kw`: 逆变器容量（kW）
- `ratio_percent`: 容配比（%）
- `battery_nominal_kwh`: 标准化电池容量（kWh）
- `battery_calculated_nominal_kwh`: 计算得到的电池容量（kWh）
- `battery_method`: 电池计算方法
- `pv_day_kwh`: 日均发电量（kWh）
- `load_day_kwh`: 日均用电量（kWh）
- `evening_kwh`: 晚高峰需求（kWh）
- `night_kwh`: 整夜需求（kWh）
- `surplus_kwh`: 光伏剩余（kWh）
- `tax_total_aud`: 含税总价（AUD）
- `subsidy_aud`: 补贴金额（AUD）
- `final_price_aud`: 最终价格（AUD）

## 与 V4 的对比

| 项目 | V4 | V6 |
|------|----|----|
| 光伏剩余计算基准 | 6 月份数据 | 全年日均数据 |
| 月度分布参数 | 需要 | 不需要 |
| 计算复杂度 | 较高 | 较低 |
| 代表性 | 冬季代表月 | 全年平均 |
| 参数数量 | 更多 | 更少 |

## 下一步

- 可以对比 V4 和 V6 的计算结果差异
- 可以根据实际业务需求调整 `aSurplus` 和 `bSurplus` 系数
- 可以接入真实的房屋发电和用电数据
