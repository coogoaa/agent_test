import type { SimulationResult, SystemConfig, YearFinancialData } from '../types';

const formatNumber = (num: number | null | undefined, digits = 2) => {
  if (num === null || typeof num === 'undefined') return 'N/A';
  return num.toFixed(digits);
};

const formatCurrency = (num: number | null | undefined) => {
    if (num === null || typeof num === 'undefined') return 'N/A';
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Helper to safely format a row for CSV
const formatRow = (row: (string | number | undefined | null)[]): string => {
    return row.map(cell => {
        const str = String(cell ?? '');
        // Escape quotes by doubling them and wrap the whole cell in quotes if it contains a comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }).join(',') + '\r\n';
};


export const exportSimulationDataToCsv = (simulation: SimulationResult, config: SystemConfig) => {
  const { annualData, twentyYearProjection, paybackPeriod, discountedPaybackPeriod, irr, dayBaseData, monthlyDayBaseData } = simulation;
  
  let csvContent = '';

  // --- Report Header ---
  csvContent += formatRow(['太阳能投资回报与能量流模拟报告']);
  csvContent += formatRow(['生成于:', new Date().toLocaleString('zh-CN')]);
  csvContent += formatRow([]); // Spacer

  // --- Input Parameters ---
  csvContent += formatRow(['输入参数']);
  csvContent += formatRow(['参数', '值', '单位']);
  csvContent += formatRow(['州/领地', config.state, '']);
  csvContent += formatRow(['年用电量', config.annualConsumption, 'kWh']);
  csvContent += formatRow(['光伏系统功率', config.systemPower, 'kWp']);
  csvContent += formatRow(['年发电系数', config.annualGenerationFactor, 'kWh/kWp']);
  csvContent += formatRow(['电池容量', config.batteryCapacity, 'kWh']);
  csvContent += formatRow(['总投资成本', config.investmentCost, '$']);
  csvContent += formatRow(['电价', config.electricityPrice, '$/kWh']);
  csvContent += formatRow(['上网电价', config.feedInTariff, '$/kWh']);
  csvContent += formatRow(['价格通胀率', config.priceInflation, '%']);
  csvContent += formatRow(['光伏板年衰减率', config.panelDegradation, '%/年']);
  csvContent += formatRow(['电池更换成本 (第10年)', config.batteryReplacementCost, '$']);
  csvContent += formatRow(['贴现率', config.discountRate, '%']);
  csvContent += formatRow([]); // Spacer

  // --- KPIs ---
  csvContent += formatRow(['关键绩效指标 (KPI)']);
  csvContent += formatRow(['指标', '值', '单位']);
  csvContent += formatRow(['自用率', formatNumber(annualData.selfConsumptionRate * 100), '%']);
  csvContent += formatRow(['投资回收期 (简单)', formatNumber(paybackPeriod), '年']);
  csvContent += formatRow(['投资回收期 (贴现)', formatNumber(discountedPaybackPeriod), '年']);
  csvContent += formatRow(['20年内部收益率 (IRR)', formatNumber(irr ? irr * 100 : null), '%']);
  csvContent += formatRow(['年发电量', formatNumber(annualData.totalGeneration), 'kWh']);
  csvContent += formatRow([]); // Spacer

  // --- 20 Year Projection ---
  csvContent += formatRow(['20年财务预测']);
  csvContent += formatRow(['年份', '年度净节省', '贴现净节省', '累计节省 (简单)', '累计节省 (贴现)', '安装前成本', '安装后成本', '售电收入']);
  twentyYearProjection.forEach((year: YearFinancialData) => {
    csvContent += formatRow([
        year.year,
        formatCurrency(year.netSavings),
        formatCurrency(year.discountedNetSavings),
        formatCurrency(year.cumulativeSavings),
        formatCurrency(year.cumulativeDiscountedSavings),
        formatCurrency(year.costWithoutSolar),
        formatCurrency(year.costWithSolar),
        formatCurrency(year.revenueFromGrid)
    ]);
  });
  csvContent += formatRow([]); // Spacer

  // --- Monthly Breakdown ---
  csvContent += formatRow(['月度日均能量流分解']);
  csvContent += formatRow(['月份', '日均发电量 (kWh)', '日均用电量 (kWh)', '日直接自用电量 (kWh)', '日可充电量 (kWh)', '日有效充电量 (kWh)', '日非发电时段用电量 (kWh)']);
  monthlyDayBaseData.forEach((monthData, index) => {
      csvContent += formatRow([
          `${index + 1}月`,
          formatNumber(monthData.totalGeneration),
          formatNumber(monthData.totalConsumption),
          formatNumber(monthData.totalDirectSelfConsumption),
          formatNumber(monthData.totalToBatteryPotential),
          formatNumber(monthData.finalEffectiveCharge),
          formatNumber(monthData.nonGenerationConsumption),
      ]);
  });
  csvContent += formatRow([]); // Spacer
  
  // --- Hourly Breakdown ---
  csvContent += formatRow(['小时能量流分解 (年平均)']);
  csvContent += formatRow(['小时', '发电量 (kWh)', '用电量 (kWh)', '直接自用 (kWh)', '可充电量 (kWh)', '从电网购电 (kWh)']);
  dayBaseData.hourly.forEach(hour => {
      csvContent += formatRow([
          `${hour.hour}:00`,
          formatNumber(hour.generation),
          formatNumber(hour.consumption),
          formatNumber(hour.directSelfConsumption),
          formatNumber(hour.toBattery),
          formatNumber(hour.fromGrid),
      ]);
  });
  csvContent += formatRow([]); // Spacer

  // --- Formula Explanations ---
  csvContent += formatRow(['公式说明']);
  csvContent += formatRow(['名称', '公式', '说明']);
  csvContent += formatRow(['年总发电量', '光伏系统功率 × 年发电系数', '计算出系统在一年内预计能产生的总电量。']);
  csvContent += formatRow(['日直接自用电量', 'Σ min(每小时发电量, 每小时用电量)', '光伏发电产生时立即被消耗的部分。这是对一天24小时中，每个小时的发电量和用电量取较小值，然后累加。']);
  csvContent += formatRow(['日可充电量', 'Σ max(每小时发电量 - 每小时用电量, 0)', '可用于给电池充电的剩余光伏电量。这是对一天24小时中，每个小时的发电量减去用电量的正值部分进行累加。']);
  csvContent += formatRow(['日非发电时段用电量', '日总用电量 - 日直接自用电量', '在没有光伏发电或发电不足的时段内，家庭的总用电需求。']);
  csvContent += formatRow(['日有效充电量', 'min(日可充电量, 电池容量, 非发电时段用电量)', '实际储存的有效电量。它不能超过当天的可充电总量，不能超过电池的物理容量，也不能超过夜间及无光时段的用电需求（因为超出这部分需求充电就没有意义）。']);
  csvContent += formatRow(['年总自用电量', 'Σ (日直接自用电量 + 日有效充电量) × 每月天数', '一年中所有被家庭直接使用或通过电池存储后使用的光伏电量总和。']);
  csvContent += formatRow(['自用率', '年总自用电量 / 年总发电量', '衡量光伏系统发电量被家庭自身消耗比例的关键指标。']);
  csvContent += formatRow(['年度净节省', '安装前成本 - (安装后成本 - 售电收入)', '安装光伏系统后，一年内节省的净金额。']);
  csvContent += formatRow(['投资回收期 (简单)', '累计节省首次 ≥ 投资成本的年份', '累计节省的名义金额等于初始投资额所需要的时间。未考虑资金的时间价值。']);
  csvContent += formatRow(['投资回收期 (贴现)', '累计贴现节省首次 ≥ 投资成本的年份', '将未来的节省额按照贴现率折算成今天的价值后，累计节省额等于初始投资额所需的时间。它考虑了资金的时间价值，是更保守的评估方法。']);
  csvContent += formatRow(['内部收益率 (IRR)', '使现金流净现值(NPV)为零的贴现率', '一个衡量投资盈利能力的财务指标，综合考虑了投资的全部现金流（包括初始投资和未来每年的节省）。IRR越高，投资回报越好。']);
  
  // --- Download Logic ---
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for BOM to ensure Excel opens UTF-8 correctly
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'solar_simulation_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
