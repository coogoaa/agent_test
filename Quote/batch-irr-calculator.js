// 批量IRR计算脚本 - 基于 solar-calculator-static 的计算逻辑
// 读取 Quote/output/jisuan 中的CSV，计算所有州/领地的IRR等关键指标

const fs = require('fs');
const path = require('path');

// ========== 从 data.js 复制的常量 ==========
const AUSTRALIAN_STATES_CONSUMPTION = {
    TAS: 10148,
    NT: 10008,
    ACT: 8632,
    SA: 7129,
    NSW: 7778,
    QLD: 7270,
    WA: 7634,
    VIC: 6778
};

const defaultConsumptionProfile = [8.55, 7.78, 7.51, 7.14, 8.47, 10.55, 10.67, 9.45, 7.36, 7.21, 7.30, 8.03];
const qldConsumptionProfile = [9.27, 9.22, 8.69, 8.14, 7.90, 8.23, 8.19, 7.93, 7.60, 7.67, 8.19, 8.96];

const STATE_MONTHLY_CONSUMPTION_PERCENTAGES = {
    TAS: defaultConsumptionProfile,
    NT: defaultConsumptionProfile,
    ACT: defaultConsumptionProfile,
    SA: defaultConsumptionProfile,
    NSW: defaultConsumptionProfile,
    QLD: qldConsumptionProfile,
    WA: defaultConsumptionProfile,
    VIC: defaultConsumptionProfile
};

const tasVicHourly = [3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 3.941, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 4.714, 3.941, 3.941];
const ntQldWaHourly = [2.990, 2.638, 2.405, 2.319, 2.396, 2.745, 3.486, 4.163, 4.270, 4.255, 4.252, 4.348, 4.421, 4.440, 4.486, 4.667, 5.074, 5.727, 6.229, 5.996, 5.621, 4.970, 4.421, 3.679];
const actHourly = [3.400, 3.031, 2.876, 2.867, 3.055, 3.643, 4.493, 4.904, 4.317, 3.792, 3.615, 3.118, 3.053, 2.937, 3.003, 3.369, 4.434, 5.901, 6.693, 6.550, 6.142, 5.416, 5.178, 4.208];
const saHourly = [4.850, 5.185, 3.814, 2.956, 2.568, 2.654, 3.142, 3.655, 3.563, 3.624, 4.103, 4.366, 4.188, 3.980, 3.997, 4.111, 4.525, 5.442, 5.990, 5.715, 5.315, 4.739, 3.905, 3.607];
const nswHourly = [4.427, 3.912, 3.176, 2.706, 2.583, 2.805, 3.427, 3.939, 4.089, 4.050, 3.986, 3.936, 3.948, 3.908, 3.920, 4.105, 4.569, 5.328, 5.846, 5.634, 5.329, 4.947, 4.804, 4.630];

const STATE_HOURLY_CONSUMPTION_PERCENTAGES = {
    TAS: tasVicHourly,
    NT: ntQldWaHourly,
    ACT: actHourly,
    SA: saHourly,
    NSW: nswHourly,
    QLD: ntQldWaHourly,
    WA: ntQldWaHourly,
    VIC: tasVicHourly
};

const HOURLY_GENERATION_FACTORS = [0, 0, 0, 0, 0, 0, 0.01, 0.05, 0.1, 0.12, 0.13, 0.14, 0.14, 0.12, 0.1, 0.05, 0.01, 0, 0, 0, 0, 0, 0, 0];
const MONTHLY_GENERATION_PERCENTAGES = [10, 9, 9, 8, 7, 6, 7, 8, 9, 9, 9, 9];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// ========== 从 calculator-amortized-monthly.js 复制的计算函数 ==========

function calculateNPV(rate, cashFlows) {
    return cashFlows.reduce((acc, cashFlow, i) => acc + cashFlow / Math.pow(1 + rate, i), 0);
}

function calculateIRR(cashFlows, maxIterations = 100, tolerance = 1e-6) {
    if (cashFlows.length === 0 || cashFlows[0] >= 0) {
        return null;
    }

    let low = 0.0;
    let high = 1.0;
    let mid = 0.0;

    for (let i = 0; i < maxIterations; i++) {
        mid = (low + high) / 2;
        const npv = calculateNPV(mid, cashFlows);

        if (Math.abs(npv) < tolerance) {
            return mid;
        } else if (calculateNPV(low, cashFlows) * npv < 0) {
            high = mid;
        } else {
            low = mid;
        }
    }

    return null;
}

function calculateBaseData(config, monthlyConsumptionPercentages, hourlyConsumptionFactors) {
    const annualSystemProduction = config.annualGeneration || (config.systemPower * config.annualGenerationFactor);
    
    const monthlyDailyConsumption = monthlyConsumptionPercentages.map((percentage, month) => {
        const monthlyConsumption = config.annualConsumption * (percentage / 100);
        return monthlyConsumption / DAYS_IN_MONTH[month];
    });

    let totalAnnualSelfConsumption = 0;
    let totalAnnualGeneration = 0;
    const monthlyDayBaseData = [];

    for (let month = 0; month < 12; month++) {
        const monthlyGeneration = annualSystemProduction * (MONTHLY_GENERATION_PERCENTAGES[month] / 100);
        const dailyGeneration = monthlyGeneration / DAYS_IN_MONTH[month];
        const dailyConsumption = monthlyDailyConsumption[month];

        let day = {
            hourly: [],
            totalGeneration: 0,
            totalConsumption: 0,
            totalDirectSelfConsumption: 0,
            totalToBatteryPotential: 0,
            nonGenerationConsumption: 0,
            finalEffectiveCharge: 0
        };

        for (let hour = 0; hour < 24; hour++) {
            const hourlyGeneration = dailyGeneration * HOURLY_GENERATION_FACTORS[hour];
            const hourlyConsumption = dailyConsumption * hourlyConsumptionFactors[hour];
            const directSelfConsumption = Math.min(hourlyGeneration, hourlyConsumption);
            const surplus = Math.max(0, hourlyGeneration - hourlyConsumption);
            const deficit = Math.max(0, hourlyConsumption - hourlyGeneration);

            day.hourly.push({
                hour,
                generation: hourlyGeneration,
                consumption: hourlyConsumption,
                directSelfConsumption,
                surplus,
                deficit
            });

            day.totalGeneration += hourlyGeneration;
            day.totalConsumption += hourlyConsumption;
            day.totalDirectSelfConsumption += directSelfConsumption;
            day.totalToBatteryPotential += surplus;

            if (hourlyGeneration === 0) {
                day.nonGenerationConsumption += hourlyConsumption;
            }
        }

        const maxChargeCapacity = config.batteryCapacity * config.batteryDod;
        const effectiveCharge = Math.min(day.totalToBatteryPotential * config.batteryRte, maxChargeCapacity);
        const effectiveDischarge = Math.min(effectiveCharge, day.nonGenerationConsumption);
        day.finalEffectiveCharge = effectiveDischarge;

        monthlyDayBaseData.push(day);

        const monthSelfConsumption = (day.totalDirectSelfConsumption + day.finalEffectiveCharge) * DAYS_IN_MONTH[month];
        totalAnnualSelfConsumption += monthSelfConsumption;
        totalAnnualGeneration += monthlyGeneration;
    }

    const selfConsumptionRate = totalAnnualGeneration > 0 ? (totalAnnualSelfConsumption / totalAnnualGeneration) * 100 : 0;

    return {
        monthlyDayBaseData,
        selfConsumptionRate,
        totalAnnualGeneration,
        totalAnnualSelfConsumption
    };
}

function calculate20YearData(config, baseData) {
    const monthlyPriceInflationFactor = Math.pow(1 + config.priceInflation, 1/12);
    const monthlyDegradationFactor = 1 - (config.degradation / 12);
    const monthlyDiscountFactor = Math.pow(1 + config.discountRate, 1/12);
    
    const monthlyBatteryAmortization = config.batteryReplacementCost / 120;
    
    const cashFlows = [-config.investmentCost];
    const yearlyProjection = [];
    const monthlyProjection = [];
    
    let cumulativeSavingsMonthly = 0;
    let cumulativeDiscountedSavingsMonthly = 0;
    let paybackPeriodMonthly = null;
    let discountedPaybackPeriodMonthly = null;

    for (let month = 1; month <= 240; month++) {
        const year = Math.ceil(month / 12);
        const monthInYear = ((month - 1) % 12);
        
        const currentPriceInflation = Math.pow(monthlyPriceInflationFactor, month - 1);
        const currentDegradation = Math.pow(monthlyDegradationFactor, month - 1);

        const currentElectricityPrice = config.electricityPrice * currentPriceInflation;
        const currentFeedInTariff = config.feedInTariff * currentPriceInflation;
        const currentDailyFixedCost = (config.dailyFixedCost || 0) * currentPriceInflation;
        
        const monthData = baseData.monthlyDayBaseData[monthInYear];
        const daysInMonth = DAYS_IN_MONTH[monthInYear];
        
        const dailyGeneration = monthData.totalGeneration * currentDegradation;
        const dailySelfConsumption = (monthData.totalDirectSelfConsumption + monthData.finalEffectiveCharge) * currentDegradation;
        const dailyToGrid = Math.max(0, dailyGeneration - dailySelfConsumption);
        const dailyFromGrid = Math.max(0, monthData.totalConsumption - dailySelfConsumption);
        
        const monthlyGeneration = dailyGeneration * daysInMonth;
        const monthlySelfConsumption = dailySelfConsumption * daysInMonth;
        const monthlyToGrid = dailyToGrid * daysInMonth;
        const monthlyFromGrid = dailyFromGrid * daysInMonth;
        const monthlyConsumption = monthData.totalConsumption * daysInMonth;
        
        const costWithoutSolar = (monthlyConsumption * currentElectricityPrice) + (daysInMonth * currentDailyFixedCost);
        const costWithSolar = (monthlyFromGrid * currentElectricityPrice) + (daysInMonth * currentDailyFixedCost);
        const revenueFromGrid = monthlyToGrid * currentFeedInTariff;
        
        let monthlySavings = costWithoutSolar - (costWithSolar - revenueFromGrid);
        
        if (month <= 120) {
            monthlySavings -= monthlyBatteryAmortization;
        }

        const prevCumulativeSavingsMonthly = cumulativeSavingsMonthly;
        cumulativeSavingsMonthly += monthlySavings;

        if (paybackPeriodMonthly === null && cumulativeSavingsMonthly >= config.investmentCost) {
            const remainingCost = config.investmentCost - prevCumulativeSavingsMonthly;
            if (monthlySavings > 0) {
                paybackPeriodMonthly = (month - 1) + (remainingCost / monthlySavings);
            }
        }
        
        const discountedMonthlySavings = monthlySavings / Math.pow(monthlyDiscountFactor, month);
        const prevCumulativeDiscountedSavingsMonthly = cumulativeDiscountedSavingsMonthly;
        cumulativeDiscountedSavingsMonthly += discountedMonthlySavings;

        if (discountedPaybackPeriodMonthly === null && cumulativeDiscountedSavingsMonthly >= config.investmentCost) {
            const remainingDiscountedCost = config.investmentCost - prevCumulativeDiscountedSavingsMonthly;
            if (discountedMonthlySavings > 0) {
                const fractionOfMonth = remainingDiscountedCost / discountedMonthlySavings;
                discountedPaybackPeriodMonthly = (month - 1) + fractionOfMonth;
            }
        }

        monthlyProjection.push({
            month,
            year,
            monthInYear: monthInYear + 1,
            monthlySavings,
            discountedMonthlySavings,
            cumulativeSavings: cumulativeSavingsMonthly,
            cumulativeDiscountedSavings: cumulativeDiscountedSavingsMonthly,
            costWithoutSolar,
            costWithSolar,
            revenueFromGrid,
            monthlyGeneration,
            monthlySelfConsumption,
            monthlyToGrid,
            monthlyFromGrid,
            batteryAmortization: month <= 120 ? monthlyBatteryAmortization : 0
        });
    }
    
    for (let year = 1; year <= 20; year++) {
        const yearMonths = monthlyProjection.filter(m => m.year === year);
        const netSavings = yearMonths.reduce((sum, m) => sum + m.monthlySavings, 0);
        cashFlows.push(netSavings);
        
        yearlyProjection.push({
            year,
            netSavings
        });
    }
    
    const irr = calculateIRR(cashFlows);

    return { 
        twentyYearProjection: yearlyProjection,
        monthlyProjection,
        paybackPeriodMonths: paybackPeriodMonthly,
        discountedPaybackPeriodMonths: discountedPaybackPeriodMonthly,
        irr
    };
}

function runSolarSimulation(config) {
    const monthlyConsumptionPercentages = STATE_MONTHLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionPercentages = STATE_HOURLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionFactors = hourlyConsumptionPercentages.map(p => p / 100);

    const baseData = calculateBaseData(config, monthlyConsumptionPercentages, hourlyConsumptionFactors);
    const financialData = calculate20YearData(config, baseData);

    return {
        ...baseData,
        ...financialData
    };
}

// ========== CSV 读取和处理 ==========

function parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].replace(/"/g, '') : '';
        });
        data.push(row);
    }
    
    return data;
}

// ========== 主批量计算函数 ==========

function batchCalculateIRR() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // 读取CSV文件
    const jisuanDir = path.join(__dirname, 'output', 'jisuan');
    const newSystemFile = fs.readdirSync(jisuanDir).find(f => f.startsWith('新建系统_'));
    const expansionFile = fs.readdirSync(jisuanDir).find(f => f.startsWith('储能扩容_'));
    
    if (!newSystemFile || !expansionFile) {
        console.error('未找到CSV文件');
        return;
    }
    
    console.log('读取CSV文件...');
    const newSystemCsv = fs.readFileSync(path.join(jisuanDir, newSystemFile), 'utf8');
    const expansionCsv = fs.readFileSync(path.join(jisuanDir, expansionFile), 'utf8');
    
    const newSystemData = parseCSV(newSystemCsv);
    const expansionData = parseCSV(expansionCsv);
    
    console.log(`新建系统记录: ${newSystemData.length} 条`);
    console.log(`储能扩容记录: ${expansionData.length} 条`);
    
    const states = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];
    
    // 默认参数
    const defaultParams = {
        annualGenerationFactor: 1526,  // kWh/kW/year
        electricityPrice: 0.30,  // AUD/kWh
        feedInTariff: 0.05,  // AUD/kWh
        dailyFixedCost: 1.20,  // AUD/day
        priceInflation: 0.03,  // 3% per year
        degradation: 0.005,  // 0.5% per year
        discountRate: 0.05,  // 5% per year
        batteryDod: 0.9,  // 90% depth of discharge
        batteryRte: 0.95  // 95% round-trip efficiency
    };
    
    const results = [];
    let processedCount = 0;
    const totalRecords = (newSystemData.length + expansionData.length) * states.length;
    
    console.log('\n开始批量计算IRR...');
    
    // 处理新建系统
    for (const row of newSystemData) {
        const systemPower = parseFloat(row['光伏容量kW']);
        const batteryCapacity = parseFloat(row['电池标称容量kWh']);
        const investmentCost = parseFloat(row['最终报价AUD']);
        const batteryReplacementCost = parseFloat(row['电池报价AUD']);
        
        if (systemPower === 0 || isNaN(systemPower)) continue;
        
        for (const state of states) {
            const config = {
                ...defaultParams,
                state,
                systemPower,
                batteryCapacity,
                investmentCost,
                batteryReplacementCost,
                annualConsumption: AUSTRALIAN_STATES_CONSUMPTION[state],
                annualGeneration: 0  // 使用 systemPower * annualGenerationFactor
            };
            
            const result = runSolarSimulation(config);
            
            results.push({
                项目类型: row['项目类型'],
                屋顶理论最大面板数量: row['屋顶理论最大面板数量'],
                方案: row['方案'],
                州领地: state,
                实际面板数量: row['实际面板数量'],
                光伏容量kW: systemPower.toFixed(2),
                逆变器功率kW: row['逆变器功率kW'],
                电池标称容量kWh: batteryCapacity.toFixed(2),
                总投资成本AUD: investmentCost.toFixed(2),
                电池更换成本AUD: batteryReplacementCost.toFixed(2),
                年度用电量kWh: config.annualConsumption,
                自用率百分比: result.selfConsumptionRate.toFixed(2),
                回本周期月数: result.paybackPeriodMonths ? result.paybackPeriodMonths.toFixed(1) : 'N/A',
                回本周期年数: result.paybackPeriodMonths ? (result.paybackPeriodMonths / 12).toFixed(2) : 'N/A',
                贴现回本周期月数: result.discountedPaybackPeriodMonths ? result.discountedPaybackPeriodMonths.toFixed(1) : 'N/A',
                贴现回本周期年数: result.discountedPaybackPeriodMonths ? (result.discountedPaybackPeriodMonths / 12).toFixed(2) : 'N/A',
                IRR_20年: result.irr ? (result.irr * 100).toFixed(2) + '%' : 'N/A'
            });
            
            processedCount++;
            if (processedCount % 100 === 0) {
                console.log(`已处理 ${processedCount}/${totalRecords} 条记录`);
            }
        }
    }
    
    // 处理储能扩容
    for (const row of expansionData) {
        const systemPower = parseFloat(row['光伏容量kW']);
        const batteryCapacity = parseFloat(row['电池标称容量kWh']);
        const investmentCost = parseFloat(row['最终报价AUD']);
        const batteryReplacementCost = parseFloat(row['电池报价AUD']);
        
        if (systemPower === 0 || isNaN(systemPower)) continue;
        
        for (const state of states) {
            const config = {
                ...defaultParams,
                state,
                systemPower,
                batteryCapacity,
                investmentCost,
                batteryReplacementCost,
                annualConsumption: AUSTRALIAN_STATES_CONSUMPTION[state],
                annualGeneration: 0
            };
            
            const result = runSolarSimulation(config);
            
            results.push({
                项目类型: row['项目类型'],
                屋顶理论最大面板数量: row['屋顶理论最大面板数量'],
                方案: row['方案'],
                州领地: state,
                实际面板数量: row['实际面板数量'],
                光伏容量kW: systemPower.toFixed(2),
                逆变器功率kW: row['逆变器功率kW'],
                电池标称容量kWh: batteryCapacity.toFixed(2),
                总投资成本AUD: investmentCost.toFixed(2),
                电池更换成本AUD: batteryReplacementCost.toFixed(2),
                年度用电量kWh: config.annualConsumption,
                自用率百分比: result.selfConsumptionRate.toFixed(2),
                回本周期月数: result.paybackPeriodMonths ? result.paybackPeriodMonths.toFixed(1) : 'N/A',
                回本周期年数: result.paybackPeriodMonths ? (result.paybackPeriodMonths / 12).toFixed(2) : 'N/A',
                贴现回本周期月数: result.discountedPaybackPeriodMonths ? result.discountedPaybackPeriodMonths.toFixed(1) : 'N/A',
                贴现回本周期年数: result.discountedPaybackPeriodMonths ? (result.discountedPaybackPeriodMonths / 12).toFixed(2) : 'N/A',
                IRR_20年: result.irr ? (result.irr * 100).toFixed(2) + '%' : 'N/A'
            });
            
            processedCount++;
            if (processedCount % 100 === 0) {
                console.log(`已处理 ${processedCount}/${totalRecords} 条记录`);
            }
        }
    }
    
    console.log(`\n计算完成！总记录数: ${results.length}`);
    
    // 输出CSV
    const outputDir = path.join(__dirname, 'output', 'IRR');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `IRR分析_${timestamp}.csv`);
    const csv = convertToCSV(results);
    fs.writeFileSync(outputFile, '\ufeff' + csv, 'utf8');
    
    console.log(`\nIRR分析数据已保存: ${outputFile}`);
    console.log(`文件大小: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            return `"${value}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// 执行批量计算
batchCalculateIRR();
