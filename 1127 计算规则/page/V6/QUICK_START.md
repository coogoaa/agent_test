# V6 快速开始指南

## 一分钟了解 V6

V6 是基于 V4 的简化版本，**核心简化**：光伏剩余使用全年日均估算，不再使用 6 月数据。

## 快速运行

### 1. 批量计算（默认参数）

```bash
cd "1127 计算规则/page/V6"
node run_v6_batch_export.js
```

默认使用：
- CSV：`../../验证数据/agent_sample_data - 坡面信息.csv`
- 州：NSW
- 相位：单相

### 2. 自定义参数运行

```bash
# 指定州和相位
node run_v6_batch_export.js --state=VIC,NSW,TAS --phase=single,three

# 指定 CSV 文件
node run_v6_batch_export.js --csv=/path/to/your/data.csv --state=SA
```

### 3. 查看边界案例分析

```bash
node analyze_boundary_cases.js --file=out/v6_full_YYYYMMDDTHHMMSS.tsv
```

### 4. 查看典型案例

```bash
node show_examples.js
```

## 输出文件

运行后会在 `out/` 目录生成：

1. **`v6_full_YYYYMMDDTHHMMSS.tsv`** - 完整计算结果
   - 包含所有房屋的 A/B/C 三种方案
   - 包含 new 和 expansion 两种模式
   - TSV 格式，可用 Excel 打开

2. **`boundary_cases_detail.txt`** - 边界案例详细分析
   - 按屋顶规模分类
   - 每类展示代表性案例

## 核心计算公式

### 全年日均计算

```
年发电量 = PV_kW × 年发电系数
日均发电 = 年发电量 / 365
逐小时发电 = 日均发电 × 小时发电占比
光伏剩余 = Σ max(0, PV_hour - Load_hour)
```

### A 方案电池容量

```
E_req = max(整夜需求, 0.8 × 光伏剩余)
Battery = min(E_req / 0.855, 50kWh)
```

其中：
- 整夜需求：17:00-07:00（14小时）
- 效率：0.855 = RTE(0.95) × DOD(0.9)
- 上限：50kWh（补贴上限）

### B 方案电池容量

```
E_req = max(晚高峰需求, 0.55 × 光伏剩余)
Battery = min(E_req / 0.855, 50kWh)
```

### C 方案电池容量

```
E_req = 晚高峰需求
Battery = min(E_req / 0.855, 50kWh)
```

其中：
- 晚高峰需求：17:00-21:00（4小时）

## 验证结果摘要

基于 4,937 个房屋测试（NSW州，单相）：

| 屋顶规模 | 数量 | 平均PV | 平均电池 | 主导因素 |
|---------|------|--------|----------|----------|
| ≤1.76kW | 401 | 1.11kW | 16kWh | 整夜需求 |
| 1.76-6.6kW | 1,222 | 4.44kW | 16kWh | 整夜需求 |
| 6.6-10kW | 969 | 8.03kW | 23.36kWh | 光伏剩余 |
| 10-14kW | 763 | 11.82kW | 38.91kWh | 光伏剩余 |
| 14-20kW | 793 | 16.48kW | 50kWh | 上限 |
| ≥20kW | 595 | 20.00kW | 50kWh | 上限 |

✅ 所有边界案例验证通过

## 关键文档

- `README.md` - 详细使用说明
- `battery_calc_logic_v6.md` - 计算逻辑文档
- `V6_SUMMARY.md` - 版本总结
- `VERIFICATION_REPORT.md` - 验证报告

## 下一步

1. 查看验证报告了解详细测试结果
2. 根据业务需求调整系数（aSurplus, bSurplus）
3. 开发用户界面
4. 接入真实房屋数据

## 技术支持

如有问题，请查看：
1. `VERIFICATION_REPORT.md` - 完整验证报告
2. `out/boundary_cases_detail.txt` - 边界案例详情
3. 运行 `node show_examples.js` 查看典型案例
