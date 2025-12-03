/**
 * 批量计算太阳能投资回报
 * 读取坡面信息和方案数据，计算不同组合的投资回报
 */

const fs = require('fs');
const path = require('path');

// ============================================
// 从 data.js 复制的常量
// ============================================
const AUSTRALIAN_STATES_CONSUMPTION = {
    TAS: 10148, NT: 10008, ACT: 8632, SA: 7129,
    NSW: 7778, QLD: 7270, WA: 7634, VIC: 6778
};

const defaultConsumptionProfile = [8.55, 7.78, 7.51, 7.14, 8.47, 10.55, 10.67, 9.45, 7.36, 7.21, 7.30, 8.03];
const qldConsumptionProfile = [9.27, 9.22, 8.69, 8.14, 7.90, 8.23, 8.19, 7.93, 7.60, 7.67, 8.19, 8.96];

const STATE_MONTHLY_CONSUMPTION_PERCENTAGES = {
    TAS: defaultConsumptionProfile, NT: defaultConsumptionProfile, ACT: defaultConsumptionProfile,
    SA: defaultConsumptionProfile, NSW: defaultConsumptionProfile, QLD: qldConsumptionProfile,
    WA: defaultConsumptionProfile, VIC: defaultConsumptionProfile
};

const tasVicHourly = [3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 3.941, 3.941];
const ntQldWaHourly = [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679];
const actHourly = [3.400, 3.031, 2.876, 2.867, 3.055, 3.643, 4.493, 4.904, 4.317, 3.792, 3.615, 3.118, 3.053, 2.937, 3.003, 3.369, 4.434, 5.901, 6.693, 6.550, 6.142, 5.416, 5.178, 4.208];
const saHourly = [4.850, 5.185, 3.814, 2.956, 2.568, 2.654, 3.142, 3.655, 3.563, 3.624, 4.103, 4.366, 4.188, 3.980, 3.997, 4.111, 4.525, 5.442, 5.990, 5.715, 5.315, 4.739, 3.905, 3.607];
const nswHourly = [4.427, 3.912, 3.176, 2.706, 2.583, 2.805, 3.427, 3.939, 4.089, 4.050, 3.986, 3.936, 3.948, 3.908, 3.920, 4.105, 4.569, 5.328, 5.846, 5.634, 5.329, 4.947, 4.804, 4.630];

const STATE_HOURLY_CONSUMPTION_PERCENTAGES = {
    TAS: tasVicHourly, NT: ntQldWaHourly, ACT: actHourly, SA: saHourly,
    NSW: nswHourly, QLD: ntQldWaHourly, WA: ntQldWaHourly, VIC: tasVicHourly
};

const HOURLY_GENERATION_FACTORS = [0, 0, 0, 0, 0, 0, 0.01, 0.05, 0.1, 0.12, 0.13, 0.14, 0.14, 0.12, 0.1, 0.05, 0.01, 0, 0, 0, 0, 0, 0, 0];
const MONTHLY_GENERATION_PERCENTAGES = [10, 9, 9, 8, 7, 6, 7, 8, 9, 9, 9, 9];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// ============================================
// 从 calculator-layout.js 复制的计算函数
// ============================================
function calculateNPV(rate, cashFlows) {
    return cashFlows.reduce((acc, cashFlow, i) => acc + cashFlow / Math.pow(1 + rate, i), 0);
}

function calculateIRR(cashFlows, maxIterations = 100, tolerance = 1e-6) {
    if (cashFlows.length === 0 || cashFlows[0] >= 0) return null;
    let low = -0.5, high = 1.0, mid = 0.0;
    const npvAtLow = calculateNPV(low, cashFlows);
    const npvAtHigh = calculateNPV(high, cashFlows);
    if (npvAtLow * npvAtHigh > 0) {
        high = 2.0;
        if (calculateNPV(low, cashFlows) * calculateNPV(high, cashFlows) > 0) return null;
    }
    for (let i = 0; i < maxIterations; i++) {
        mid = (low + high) / 2;
        const npv = calculateNPV(mid, cashFlows);
        if (Math.abs(npv) < tolerance) return mid;
        else if (calculateNPV(low, cashFlows) * npv < 0) high = mid;
        else low = mid;
    }
    return mid;
}

function generateSimulatedLayoutData(config) {
    const systemPower = config.systemPower || 8;
    const annualGenerationFactor = config.annualGenerationFactor || 1526;
    const annualGeneration = config.annualGeneration || (systemPower * annualGenerationFactor);
    
    const monthlyHourlyPower = [];
    for (let month = 0; month < 12; month++) {
        const monthlyGen = annualGeneration * (MONTHLY_GENERATION_PERCENTAGES[month] / 100);
        const dailyGen = monthlyGen / DAYS_IN_MONTH[month];
        const hourlyPower = [];
        for (let hour = 0; hour < 24; hour++) {
            hourlyPower.push(dailyGen * HOURLY_GENERATION_FACTORS[hour]);
        }
        monthlyHourlyPower.push(hourlyPower);
    }
    
    return {
        totalPanels: Math.round(systemPower / 0.44),
        totalAnnualGeneration: annualGeneration,
        aggregatedMonthlyHourlyPower: monthlyHourlyPower,
        isValid: true,
        isSimulated: true
    };
}

function runLayoutSimulation(config, layoutData) {
    const monthlyConsumptionPercentages = STATE_MONTHLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionPercentages = STATE_HOURLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionFactors = hourlyConsumptionPercentages.map(p => p / 100);
    const aggregatedMonthlyHourlyPower = layoutData.aggregatedMonthlyHourlyPower;

    // 计算月度日用电量
    const monthlyDailyConsumption = monthlyConsumptionPercentages.map((percentage, month) => {
        const monthlyConsumption = config.annualConsumption * (percentage / 100);
        return monthlyConsumption / DAYS_IN_MONTH[month];
    });

    let totalAnnualSelfConsumption = 0;
    let totalAnnualGeneration = 0;
    const monthlyDayBaseData = [];

    for (let month = 0; month < 12; month++) {
        const hourlyGeneration = aggregatedMonthlyHourlyPower[month] || Array(24).fill(0);
        const dailyConsumption = monthlyDailyConsumption[month];
        
        let day = {
            totalGeneration: 0, totalConsumption: 0,
            totalDirectSelfConsumption: 0, totalToBatteryPotential: 0,
            nonGenerationConsumption: 0, finalEffectiveCharge: 0
        };
        
        for (let hour = 0; hour < 24; hour++) {
            const gen = hourlyGeneration[hour] || 0;
            const con = dailyConsumption * hourlyConsumptionFactors[hour];
            const directSelfConsumption = Math.min(gen, con);
            const toBattery = Math.max(gen - con, 0);
            day.totalGeneration += gen;
            day.totalConsumption += con;
            day.totalDirectSelfConsumption += directSelfConsumption;
            day.totalToBatteryPotential += toBattery;
        }
        
        day.nonGenerationConsumption = day.totalConsumption - day.totalDirectSelfConsumption;
        day.finalEffectiveCharge = Math.min(day.totalToBatteryPotential, config.batteryCapacity, day.nonGenerationConsumption);
        monthlyDayBaseData.push(day);
        
        const monthlySelfConsumption = (day.totalDirectSelfConsumption + day.finalEffectiveCharge) * DAYS_IN_MONTH[month];
        totalAnnualSelfConsumption += monthlySelfConsumption;
        totalAnnualGeneration += day.totalGeneration * DAYS_IN_MONTH[month];
    }

    const annualData = {
        totalGeneration: totalAnnualGeneration,
        totalConsumption: config.annualConsumption,
        totalSelfConsumption: totalAnnualSelfConsumption,
        toGrid: totalAnnualGeneration - totalAnnualSelfConsumption,
        fromGrid: config.annualConsumption - totalAnnualSelfConsumption,
        selfConsumptionRate: totalAnnualGeneration > 0 ? totalAnnualSelfConsumption / totalAnnualGeneration : 0
    };

    // 财务计算
    const totalYears = config.investmentYears || 20;
    const totalMonths = totalYears * 12;
    const monthlyPriceInflationFactor = Math.pow(1 + config.priceInflation / 100, 1/12);
    const monthlyDegradationFactor = Math.pow(1 - config.panelDegradation / 100, 1/12);
    const monthlyDiscountFactor = Math.pow(1 + config.discountRate / 100, 1/12);
    const replaceBattery = config.batteryReplacement !== false;
    const batteryReplacementYear = config.batteryReplacementYear || 10;
    const batteryReplacementMonth = batteryReplacementYear * 12;
    const batteryReplacementCost = replaceBattery ? (config.batteryReplacementCost || 0) : 0;
    const monthlyBatteryAmortization = replaceBattery ? batteryReplacementCost / batteryReplacementMonth : 0;

    const cashFlows = [-config.investmentCost];
    let cumulativeSavingsMonthly = 0, paybackPeriodMonthly = null;
    let cumulativeDiscountedSavingsMonthly = 0, discountedPaybackPeriodMonthly = null;
    const yearlyProjection = [];
    let yearSavings = 0;

    for (let month = 1; month <= totalMonths; month++) {
        const year = Math.ceil(month / 12);
        const monthInYear = ((month - 1) % 12);
        const currentPriceInflation = Math.pow(monthlyPriceInflationFactor, month - 1);
        const currentDegradation = Math.pow(monthlyDegradationFactor, month - 1);
        const currentElectricityPrice = config.electricityPrice * currentPriceInflation;
        const currentFeedInTariff = config.feedInTariff * currentPriceInflation;
        const currentDailyFixedCost = (config.dailyFixedCost || 0) * currentPriceInflation;
        const monthData = monthlyDayBaseData[monthInYear];
        const daysInMonth = DAYS_IN_MONTH[monthInYear];
        const dailyGeneration = monthData.totalGeneration * currentDegradation;
        const dailySelfConsumption = (monthData.totalDirectSelfConsumption + monthData.finalEffectiveCharge) * currentDegradation;
        const dailyToGrid = Math.max(0, dailyGeneration - dailySelfConsumption);
        const dailyFromGrid = Math.max(0, monthData.totalConsumption - dailySelfConsumption);
        const monthlyFromGrid = dailyFromGrid * daysInMonth;
        const monthlyToGrid = dailyToGrid * daysInMonth;
        const monthlyConsumption = monthData.totalConsumption * daysInMonth;
        const costWithoutSolar = (monthlyConsumption * currentElectricityPrice) + (daysInMonth * currentDailyFixedCost);
        const costWithSolar = (monthlyFromGrid * currentElectricityPrice) + (daysInMonth * currentDailyFixedCost);
        const revenueFromGrid = monthlyToGrid * currentFeedInTariff;
        let monthlySavings = costWithoutSolar - (costWithSolar - revenueFromGrid);
        if (replaceBattery && month <= batteryReplacementMonth) monthlySavings -= monthlyBatteryAmortization;

        const prevCumulativeSavingsMonthly = cumulativeSavingsMonthly;
        cumulativeSavingsMonthly += monthlySavings;
        if (paybackPeriodMonthly === null && cumulativeSavingsMonthly >= config.investmentCost) {
            const remainingCost = config.investmentCost - prevCumulativeSavingsMonthly;
            if (monthlySavings > 0) paybackPeriodMonthly = (month - 1) + (remainingCost / monthlySavings);
        }

        const discountedMonthlySavings = monthlySavings / Math.pow(monthlyDiscountFactor, month);
        const prevCumulativeDiscountedSavingsMonthly = cumulativeDiscountedSavingsMonthly;
        cumulativeDiscountedSavingsMonthly += discountedMonthlySavings;
        if (discountedPaybackPeriodMonthly === null && cumulativeDiscountedSavingsMonthly >= config.investmentCost) {
            const remainingDiscountedCost = config.investmentCost - prevCumulativeDiscountedSavingsMonthly;
            if (discountedMonthlySavings > 0) discountedPaybackPeriodMonthly = (month - 1) + (remainingDiscountedCost / discountedMonthlySavings);
        }

        yearSavings += monthlySavings;
        if (month % 12 === 0) {
            cashFlows.push(yearSavings);
            yearlyProjection.push({
                year, netSavings: yearSavings,
                cumulativeSavings: cumulativeSavingsMonthly,
                cumulativeDiscountedSavings: cumulativeDiscountedSavingsMonthly
            });
            yearSavings = 0;
        }
    }

    const irr = calculateIRR(cashFlows);
    const useDiscount = config.useDiscount || false;
    const displayPaybackMonths = useDiscount ? discountedPaybackPeriodMonthly : paybackPeriodMonthly;

    return {
        annualData,
        yearlyProjection,
        paybackPeriod: paybackPeriodMonthly ? paybackPeriodMonthly / 12 : null,
        discountedPaybackPeriod: discountedPaybackPeriodMonthly ? discountedPaybackPeriodMonthly / 12 : null,
        displayPaybackYears: displayPaybackMonths ? displayPaybackMonths / 12 : null,
        irr,
        totalSavings20Years: cumulativeSavingsMonthly
    };
}

// ============================================
// CSV 解析和处理
// ============================================
function parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    const headers = parseCSVLine(lines[0]);
    return lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => obj[h.trim()] = values[i] ? values[i].trim() : '');
        return obj;
    });
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// ============================================
// 主程序
// ============================================
async function main() {
    const baseDir = __dirname;
    const dataDir = path.join(baseDir, '计算数据', '测试数据');
    const outputDir = path.join(baseDir, 'output');
    
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    console.log('读取数据文件...');
    
    // 读取方案数据
    const proposalsContent = fs.readFileSync(
        path.join(dataDir, 'solar_proposals_complete_1764669253974.csv'), 'utf-8'
    );
    const proposals = parseCSV(proposalsContent);
    console.log(`读取到 ${proposals.length} 条方案数据`);

    // 过滤有效方案（PV容量 > 0）
    const validProposals = proposals.filter(p => parseFloat(p['PV容量(数值)']) > 0);
    console.log(`有效方案数: ${validProposals.length}`);

    // 8种组合配置 (20年 x 4 + 25年 x 4)
    const investmentYearsList = [20, 25];
    const baseComboOptions = [
        { name: '更换电池_贴现', batteryReplacement: true, useDiscount: true },
        { name: '更换电池_不贴现', batteryReplacement: true, useDiscount: false },
        { name: '不更换电池_贴现', batteryReplacement: false, useDiscount: true },
        { name: '不更换电池_不贴现', batteryReplacement: false, useDiscount: false }
    ];
    
    // 生成所有组合
    const combinations = [];
    for (const years of investmentYearsList) {
        for (const opt of baseComboOptions) {
            combinations.push({
                ...opt,
                investmentYears: years,
                fullName: `${years}年_${opt.name}`
            });
        }
    }

    const allStates = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
    const summaryData = [];

    for (const combo of combinations) {
        console.log(`\n处理组合: ${combo.fullName}`);
        const results = [];

        for (const proposal of validProposals) {
            const houseId = proposal['房屋ID'];
            const originalState = proposal['州'];
            const planType = proposal['方案类型'];
            const pvCapacity = parseFloat(proposal['PV容量(数值)']) || 0;
            const batteryCapacity = parseFloat(proposal['电池容量(数值)']) || 0;
            const investmentCost = parseFloat(proposal['定价A最终报价']) || 0;
            const panelCount = parseInt(proposal['面板数量']) || 0;

            if (pvCapacity <= 0 || investmentCost <= 0) continue;

            // 计算电池更换成本（假设 $500/kWh）
            const batteryReplacementCost = batteryCapacity * 500;

            // 对每个州进行计算
            for (const state of allStates) {
                const config = {
                    state: state,
                    annualConsumption: AUSTRALIAN_STATES_CONSUMPTION[state],
                    batteryCapacity: batteryCapacity,
                    investmentCost: investmentCost,
                    electricityPrice: 0.35,
                    feedInTariff: 0.07,
                    priceInflation: 3.97,
                    panelDegradation: 0.4,
                    dailyFixedCost: 0.35,
                    investmentYears: combo.investmentYears,
                    batteryReplacement: combo.batteryReplacement,
                    batteryReplacementYear: 10,
                    batteryReplacementCost: batteryReplacementCost,
                    useDiscount: combo.useDiscount,
                    discountRate: 1.36,
                    systemPower: pvCapacity,
                    annualGenerationFactor: 1526
                };

                const layoutData = generateSimulatedLayoutData(config);
                const result = runLayoutSimulation(config, layoutData);

                results.push({
                    房屋ID: houseId,
                    原始州: originalState,
                    计算州: state,
                    方案类型: planType,
                    PV容量_kW: pvCapacity,
                    面板数量: panelCount,
                    电池容量_kWh: batteryCapacity,
                    投资成本: investmentCost,
                    年用电量_kWh: config.annualConsumption,
                    年发电量_kWh: result.annualData.totalGeneration.toFixed(2),
                    年自用量_kWh: result.annualData.totalSelfConsumption.toFixed(2),
                    自用率: (result.annualData.selfConsumptionRate * 100).toFixed(2) + '%',
                    回本周期_年: result.displayPaybackYears ? result.displayPaybackYears.toFixed(2) : 'N/A',
                    简单回本_年: result.paybackPeriod ? result.paybackPeriod.toFixed(2) : 'N/A',
                    贴现回本_年: result.discountedPaybackPeriod ? result.discountedPaybackPeriod.toFixed(2) : 'N/A',
                    IRR: result.irr ? (result.irr * 100).toFixed(2) + '%' : 'N/A',
                    投资年限: combo.investmentYears,
                    总节省: result.totalSavings20Years.toFixed(2)
                });
            }
        }

        // 输出CSV
        const csvHeaders = Object.keys(results[0]).join(',');
        const csvRows = results.map(r => Object.values(r).join(','));
        const csvContent = [csvHeaders, ...csvRows].join('\n');
        const outputFile = path.join(outputDir, `ROI_${combo.fullName}.csv`);
        fs.writeFileSync(outputFile, '\ufeff' + csvContent, 'utf-8');
        console.log(`已输出: ${outputFile} (${results.length} 条记录)`);

        // 汇总统计
        for (const state of allStates) {
            const stateResults = results.filter(r => r.计算州 === state);
            const validSavings = stateResults
                .map(r => parseFloat(r.总节省))
                .filter(v => !isNaN(v));
            const validPaybacks = stateResults
                .map(r => parseFloat(r.回本周期_年))
                .filter(v => !isNaN(v));
            const validIRRs = stateResults
                .map(r => parseFloat(r.IRR))
                .filter(v => !isNaN(v));

            summaryData.push({
                组合: combo.fullName,
                投资年限: combo.investmentYears,
                州: state,
                样本数: stateResults.length,
                平均回本周期_年: validPaybacks.length > 0 ? (validPaybacks.reduce((a,b)=>a+b,0)/validPaybacks.length).toFixed(2) : 'N/A',
                最短回本_年: validPaybacks.length > 0 ? Math.min(...validPaybacks).toFixed(2) : 'N/A',
                最长回本_年: validPaybacks.length > 0 ? Math.max(...validPaybacks).toFixed(2) : 'N/A',
                平均IRR: validIRRs.length > 0 ? (validIRRs.reduce((a,b)=>a+b,0)/validIRRs.length).toFixed(2) + '%' : 'N/A',
                平均总节省: validSavings.length > 0 ? (validSavings.reduce((a,b)=>a+b,0)/validSavings.length).toFixed(2) : 'N/A'
            });
        }
    }

    // 输出汇总报告
    console.log('\n生成汇总报告...');
    const summaryHeaders = Object.keys(summaryData[0]).join(',');
    const summaryRows = summaryData.map(r => Object.values(r).join(','));
    const summaryContent = [summaryHeaders, ...summaryRows].join('\n');
    const summaryFile = path.join(outputDir, '汇总报告.csv');
    fs.writeFileSync(summaryFile, '\ufeff' + summaryContent, 'utf-8');
    console.log(`已输出汇总报告: ${summaryFile}`);

    // 生成 Markdown 报告
    let mdReport = `# 太阳能投资回报批量计算报告

生成时间: ${new Date().toLocaleString('zh-CN')}

## 计算参数
- 投资年限: 20年
- 电价: $0.35/kWh
- 上网电价: $0.07/kWh
- 电价通胀率: 3.97%/年
- 光伏衰减率: 0.4%/年
- 贴现率: 1.36%
- 电池更换年份: 第10年
- 电池更换成本: $500/kWh

## 8种组合说明
| 组合 | 投资年限 | 电池更换 | 回本计算方式 |
|------|---------|---------|-------------|
| 20年_更换电池_贴现 | 20年 | ✓ 第10年更换 | 贴现回本周期 |
| 20年_更换电池_不贴现 | 20年 | ✓ 第10年更换 | 简单回本周期 |
| 20年_不更换电池_贴现 | 20年 | ✗ 不更换 | 贴现回本周期 |
| 20年_不更换电池_不贴现 | 20年 | ✗ 不更换 | 简单回本周期 |
| 25年_更换电池_贴现 | 25年 | ✓ 第10年更换 | 贴现回本周期 |
| 25年_更换电池_不贴现 | 25年 | ✓ 第10年更换 | 简单回本周期 |
| 25年_不更换电池_贴现 | 25年 | ✗ 不更换 | 贴现回本周期 |
| 25年_不更换电池_不贴现 | 25年 | ✗ 不更换 | 简单回本周期 |

## 各州汇总统计

`;

    for (const combo of combinations) {
        mdReport += `### ${combo.fullName}\n\n`;
        mdReport += `| 州 | 样本数 | 平均回本(年) | 最短回本 | 最长回本 | 平均IRR | 平均总节省 |\n`;
        mdReport += `|----|--------|-------------|---------|---------|--------|----------|\n`;
        
        const comboSummary = summaryData.filter(s => s.组合 === combo.fullName);
        for (const s of comboSummary) {
            mdReport += `| ${s.州} | ${s.样本数} | ${s.平均回本周期_年} | ${s.最短回本_年} | ${s.最长回本_年} | ${s.平均IRR} | $${s.平均总节省} |\n`;
        }
        mdReport += '\n';
    }

    mdReport += `## 输出文件\n`;
    for (const combo of combinations) {
        mdReport += `- ROI_${combo.fullName}.csv\n`;
    }
    mdReport += `- 汇总报告.csv\n`;

    const mdFile = path.join(outputDir, '计算报告.md');
    fs.writeFileSync(mdFile, mdReport, 'utf-8');
    console.log(`已输出 Markdown 报告: ${mdFile}`);

    console.log('\n✅ 批量计算完成!');
}

main().catch(console.error);
