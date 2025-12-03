# `batch-calculator.js` 使用说明

本文档说明如何使用 `solar-calculator-static/batch-calculator.js` 批量计算太阳能 ROI，并输出 20 年与 25 年的组合结果。

## 1. 环境准备
- **运行环境**：Node.js ≥ 18（支持 ES2020+ 语法即可）。
- **工作目录**：`/Users/paulgao/Documents/augment-projects/Sales_Agent_测试/solar-calculator-static/`
- **脚本位置**：`solar-calculator-static/batch-calculator.js`

## 2. 输入数据
脚本默认读取 `计算数据/测试数据/` 目录下的两份 CSV：

| 文件名 | 说明 | 必填字段 |
|--------|------|----------|
| `agent_sample_data - 坡面信息.csv` | 坡面信息（当前脚本未直接使用但可保留） | `id_0`, `slope`, `aspect`, `nums` 等 |
| `solar_proposals_complete_1764669253974.csv` | 方案清单 | `房屋ID`, `州`, `PV容量(数值)`, `面板数量`, `电池容量(数值)`, `定价A最终报价`, `方案类型` |

> ⚠️ 若使用不同文件名，请在脚本第 277 行附近修改 `fs.readFileSync` 中的文件名。

## 3. 计算组合
脚本会自动生成 **8 种组合**（20 年 / 25 年 × 是否更换电池 × 回本计算方式）：

| 组合名示例 | 投资年限 | 电池策略 | 回本计算 |
|------------|----------|----------|-----------|
| `20年_更换电池_贴现` | 20 年 | 第 10 年按 $500/kWh 更换 | 贴现回本周期 |
| `20年_更换电池_不贴现` | 20 年 | 更换 | 简单回本周期 |
| `20年_不更换电池_贴现` | 20 年 | 不更换 | 贴现回本周期 |
| `20年_不更换电池_不贴现` | 20 年 | 不更换 | 简单回本周期 |
| `25年_更换电池_贴现` | 25 年 | 更换 | 贴现回本周期 |
| `25年_更换电池_不贴现` | 25 年 | 更换 | 简单回本周期 |
| `25年_不更换电池_贴现` | 25 年 | 不更换 | 贴现回本周期 |
| `25年_不更换电池_不贴现` | 25 年 | 不更换 | 简单回本周期 |

每个方案会在 8 个州（NSW/VIC/QLD/SA/WA/TAS/NT/ACT）下重复计算。

## 4. 默认财务参数
可在脚本第 330 行附近调整：
- `electricityPrice`: $0.35/kWh
- `feedInTariff`: $0.07/kWh
- `priceInflation`: 3.97%/年
- `panelDegradation`: 0.4%/年
- `dailyFixedCost`: $0.35/天
- `discountRate`: 1.36%
- `batteryReplacementYear`: 第 10 年
- `batteryReplacementCost`: `电池容量 × 500`
- `annualGenerationFactor`: 1526 kWh/kW（生成模拟发电曲线使用）

## 5. 运行步骤
1. 打开终端，切换到脚本目录：
   ```bash
   cd /Users/paulgao/Documents/augment-projects/Sales_Agent_测试/solar-calculator-static
   ```
2. 执行脚本：
   ```bash
   node batch-calculator.js
   ```
3. 终端会输出各组合的处理进度以及生成文件路径。

## 6. 输出结果
所有结果写入 `solar-calculator-static/output/`：

| 文件名 | 说明 |
|--------|------|
| `ROI_20年_更换电池_贴现.csv` 等 8 个文件 | 每个组合 × 8 州 × 全部方案的详细结果（113,832 行） |
| `汇总报告.csv` | 按组合 × 州的统计（平均回本、IRR、平均总节省等） |
| `计算报告.md` | Markdown 版报告，包含计算参数、组合说明与各州汇总表 |

> CSV 文件默认以 UTF-8 BOM 编码，方便 Excel 直接打开。

## 7. 常见定制
- **更换输入数据**：将新 CSV 覆盖到 `计算数据/测试数据/` 下并按“运行步骤”执行。
- **修改电价或贴现率**：直接编辑脚本中的对应配置值。
- **调整州列表**：在 `allStates` 数组中增删州代码。
- **追加新的组合**：在 `investmentYearsList` 或 `baseComboOptions` 中添加条目。

如需进一步自动化（例如只处理特定房屋、输出精简字段等），可以在 `results.push` 段落中调整列字段或过滤逻辑。
