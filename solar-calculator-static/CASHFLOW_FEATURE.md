# 20年现金流展示功能说明

## 功能概述

在 `index-amortized-monthly.html` 版本中新增了 **20年现金流明细表** 功能，用于展示详细的现金流数据并支持导出，方便进行 IRR 计算和财务分析。

## 主要功能

### 1. 现金流趋势图表
- **可视化展示**：柱状图显示每年的现金流（正值/负值）
- **累计净收益曲线**：折线图显示累计净收益的增长趋势
- **交互式图表**：鼠标悬停可查看详细数值

### 2. 现金流明细表
展示 20 年的详细财务数据，包括：
- **年份**：第 0 年（初始投资）到第 20 年
- **年度净节省**：每年的净节省额（计提法）
- **累计节省**：简单累计和贴现累计
- **安装前/后成本**：对比分析
- **售电收入**：上网电价收入
- **电池分摊**：前 10 年的电池成本分摊

### 3. 数据导出功能

#### 年度数据导出 (CSV)
- **文件名**：`solar_cashflow_yearly_20years.csv`
- **包含字段**：Year, Net Savings, Cumulative Savings, Cost Without Solar, Cost With Solar, Revenue From Grid, Battery Amortization

#### 月度数据导出 (CSV)
- **文件名**：`solar_cashflow_monthly_240months.csv`
- **包含字段**：240 个月的详细数据，包括月度节省、发电量、自用量等

### 4. 关键指标汇总
- **IRR 现金流**：显示用于 IRR 计算的现金流数组
- **20年净收益**：总累计节省减去初始投资
- **投资回报倍数**：累计节省与初始投资的比率

## 使用方法

1. 打开 `index-amortized-monthly.html`
2. 滚动到 "20年现金流明细" 部分
3. 点击导出按钮下载 CSV 数据
4. 导出的数据可用于 Excel IRR 计算

## 技术实现

- 位置：在 "20年财务预测" 图表之后
- 文件：`ui-amortized-monthly.js` 中的 `updateCashFlowTable()` 函数
- 数据源：`calculator-amortized-monthly.js` 中的 `twentyYearProjection` 和 `monthlyProjection`
