// Calculator functions for Layout-based solar simulation

// Calculate NPV
function calculateNPV(rate, cashFlows) {
    return cashFlows.reduce((acc, cashFlow, i) => acc + cashFlow / Math.pow(1 + rate, i), 0);
}

// Calculate IRR using bisection method
function calculateIRR(cashFlows, maxIterations = 100, tolerance = 1e-6) {
    if (cashFlows.length === 0 || cashFlows[0] >= 0) {
        return null;
    }

    let low = -0.5;
    let high = 1.0;
    let mid = 0.0;

    // First check if IRR exists
    const npvAtLow = calculateNPV(low, cashFlows);
    const npvAtHigh = calculateNPV(high, cashFlows);
    
    if (npvAtLow * npvAtHigh > 0) {
        // Try expanding the range
        high = 2.0;
        if (calculateNPV(low, cashFlows) * calculateNPV(high, cashFlows) > 0) {
            return null;
        }
    }

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

    return mid;
}

// Parse Layout data and extract panel information
function parseLayoutData(layoutJson) {
    try {
        const data = typeof layoutJson === 'string' ? JSON.parse(layoutJson) : layoutJson;
        
        if (!data.panelLocationInfos || !Array.isArray(data.panelLocationInfos)) {
            throw new Error('Invalid layout data: missing panelLocationInfos');
        }
        
        const panels = data.panelLocationInfos.map((panel, index) => {
            // Calculate panel count from positions array (each panel has 3 coordinates: x, y, z)
            const panelCount = panel.positions ? Math.floor(panel.positions.length / 3) : 1;
            
            // Get generation data
            const genData = panel.generationPowerVO || {};
            const monthlyHourlyPower = genData.monthlyHourlyPowerList || [];
            const monthlyDailyPower = genData.monthlyDailyPowerList || [];
            const annualPower = genData.annualGeneratePower || 0;
            
            return {
                index: index + 1,
                aspect: panel.aspect || 0,  // Azimuth angle
                slope: panel.slope ? (panel.slope * 180 / Math.PI) : 0,  // Convert radians to degrees
                panelCount: panelCount,
                singlePanelAnnualPower: annualPower,
                totalAnnualPower: annualPower * panelCount,
                monthlyHourlyPower: monthlyHourlyPower,  // 12 months x 24 hours
                monthlyDailyPower: monthlyDailyPower,    // 12 months daily average
                calStatus: genData.calStatus || false
            };
        });
        
        // Calculate totals
        const totalPanels = panels.reduce((sum, p) => sum + p.panelCount, 0);
        const totalAnnualGeneration = panels.reduce((sum, p) => sum + p.totalAnnualPower, 0);
        
        // Aggregate monthly hourly power across all panels
        const aggregatedMonthlyHourlyPower = aggregateMonthlyHourlyPower(panels);
        
        return {
            projectId: data.projectId,
            gisDate: data.gisDate,
            installPanelCount: data.installPanelCount || totalPanels,
            panels: panels,
            totalPanels: totalPanels,
            totalAnnualGeneration: totalAnnualGeneration,
            aggregatedMonthlyHourlyPower: aggregatedMonthlyHourlyPower,
            isValid: true
        };
    } catch (error) {
        console.error('Error parsing layout data:', error);
        return {
            isValid: false,
            error: error.message
        };
    }
}

// Aggregate monthly hourly power from all panels
function aggregateMonthlyHourlyPower(panels) {
    // Initialize 12 months x 24 hours array
    const aggregated = Array(12).fill(null).map(() => Array(24).fill(0));
    
    panels.forEach(panel => {
        if (panel.monthlyHourlyPower && panel.monthlyHourlyPower.length === 12) {
            for (let month = 0; month < 12; month++) {
                if (panel.monthlyHourlyPower[month] && panel.monthlyHourlyPower[month].length === 24) {
                    for (let hour = 0; hour < 24; hour++) {
                        // Multiply by panel count to get total power for this panel group
                        aggregated[month][hour] += (panel.monthlyHourlyPower[month][hour] || 0) * panel.panelCount;
                    }
                }
            }
        }
    });
    
    return aggregated;
}

// Main simulation function using Layout data
function runLayoutSimulation(config, layoutData) {
    const monthlyConsumptionPercentages = STATE_MONTHLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionPercentages = STATE_HOURLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionFactors = hourlyConsumptionPercentages.map(p => p / 100);

    // Calculate base data using layout's hourly generation data
    const baseData = calculateLayoutBaseData(config, layoutData, monthlyConsumptionPercentages, hourlyConsumptionFactors);
    
    // Calculate N-year projection
    const financialData = calculateNYearData(config, baseData);

    return {
        ...baseData,
        ...financialData,
        layoutData: layoutData,
        monthlyConsumptionFactors: monthlyConsumptionPercentages,
        hourlyConsumptionPercentages: hourlyConsumptionPercentages
    };
}

function calculateLayoutBaseData(config, layoutData, monthlyConsumptionPercentages, hourlyConsumptionFactors) {
    const aggregatedMonthlyHourlyPower = layoutData.aggregatedMonthlyHourlyPower;
    
    let annualData = {
        totalGeneration: 0,
        totalConsumption: config.annualConsumption,
        totalSelfConsumption: 0,
        fromGrid: 0,
        toGrid: 0,
        selfConsumptionRate: 0
    };
    
    const monthlyDailyConsumption = monthlyConsumptionPercentages.map((percentage, month) => {
        const monthlyConsumption = config.annualConsumption * (percentage / 100);
        return monthlyConsumption / DAYS_IN_MONTH[month];
    });

    let avgDayBaseData = {
        hourly: [],
        totalGeneration: 0,
        totalConsumption: 0,
        totalDirectSelfConsumption: 0,
        totalToBatteryPotential: 0,
        nonGenerationConsumption: 0,
        finalEffectiveCharge: 0
    };

    let totalAnnualSelfConsumption = 0;
    let totalAnnualGeneration = 0;
    const monthlyDayBaseData = [];

    // Calculate for each month using layout's hourly data
    for (let month = 0; month < 12; month++) {
        const hourlyGeneration = aggregatedMonthlyHourlyPower[month] || Array(24).fill(0);
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
            const gen = hourlyGeneration[hour] || 0;  // Use layout's hourly generation directly
            const con = dailyConsumption * hourlyConsumptionFactors[hour];
            const directSelfConsumption = Math.min(gen, con);
            const toBattery = Math.max(gen - con, 0);
            
            day.hourly.push({ 
                hour, 
                generation: gen, 
                consumption: con, 
                directSelfConsumption, 
                toBattery, 
                fromGrid: Math.max(0, con - gen) 
            });
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
    
    annualData.totalGeneration = totalAnnualGeneration;
    
    // Calculate average day data
    avgDayBaseData = {
        ...avgDayBaseData,
        totalGeneration: annualData.totalGeneration / 365,
        totalConsumption: annualData.totalConsumption / 365
    };

    const dailyAvgCon = config.annualConsumption / 365;

    // Calculate average hourly data across all months
    for (let hour = 0; hour < 24; hour++) {
        let avgGen = 0;
        for (let month = 0; month < 12; month++) {
            avgGen += (aggregatedMonthlyHourlyPower[month][hour] || 0) * DAYS_IN_MONTH[month];
        }
        avgGen = avgGen / 365;
        
        const con = dailyAvgCon * hourlyConsumptionFactors[hour];
        const directSelfConsumption = Math.min(avgGen, con);
        const toBattery = Math.max(avgGen - con, 0);
        
        avgDayBaseData.hourly.push({ 
            hour, 
            generation: avgGen, 
            consumption: con, 
            directSelfConsumption, 
            toBattery, 
            fromGrid: Math.max(0, con - avgGen)
        });
        avgDayBaseData.totalDirectSelfConsumption += directSelfConsumption;
        avgDayBaseData.totalToBatteryPotential += toBattery;
    }
    
    avgDayBaseData.nonGenerationConsumption = avgDayBaseData.totalConsumption - avgDayBaseData.totalDirectSelfConsumption;
    avgDayBaseData.finalEffectiveCharge = Math.min(avgDayBaseData.totalToBatteryPotential, config.batteryCapacity, avgDayBaseData.nonGenerationConsumption);

    annualData.totalSelfConsumption = totalAnnualSelfConsumption;
    annualData.toGrid = annualData.totalGeneration - annualData.totalSelfConsumption;
    annualData.fromGrid = annualData.totalConsumption - annualData.totalSelfConsumption;
    annualData.selfConsumptionRate = annualData.totalGeneration > 0 ? annualData.totalSelfConsumption / annualData.totalGeneration : 0;

    return { 
        dayBaseData: avgDayBaseData, 
        annualData, 
        monthlyDayBaseData 
    };
}

function calculateNYearData(config, baseData) {
    const totalYears = config.investmentYears || 20;
    const totalMonths = totalYears * 12;
    
    const monthlyProjection = [];
    const yearlyProjection = [];
    const cashFlows = [-config.investmentCost];
    
    // Monthly payback calculation
    let cumulativeSavingsMonthly = 0;
    let paybackPeriodMonthly = null;
    
    let cumulativeDiscountedSavingsMonthly = 0;
    let discountedPaybackPeriodMonthly = null;

    const monthlyPriceInflationFactor = Math.pow(1 + config.priceInflation / 100, 1/12);
    const monthlyDegradationFactor = Math.pow(1 - config.panelDegradation / 100, 1/12);
    const monthlyDiscountFactor = Math.pow(1 + config.discountRate / 100, 1/12);
    
    // Battery replacement settings
    const replaceBattery = config.batteryReplacement !== false;
    const batteryReplacementYear = config.batteryReplacementYear || 10;
    const batteryReplacementMonth = batteryReplacementYear * 12;
    const batteryReplacementCost = replaceBattery ? (config.batteryReplacementCost || 0) : 0;
    
    // Monthly battery amortization (spread over months before replacement)
    const monthlyBatteryAmortization = replaceBattery ? batteryReplacementCost / batteryReplacementMonth : 0;

    // Loop through all months
    for (let month = 1; month <= totalMonths; month++) {
        const year = Math.ceil(month / 12);
        const monthInYear = ((month - 1) % 12);  // 0-11
        
        const currentPriceInflation = Math.pow(monthlyPriceInflationFactor, month - 1);
        const currentDegradation = Math.pow(monthlyDegradationFactor, month - 1);

        const currentElectricityPrice = config.electricityPrice * currentPriceInflation;
        const currentFeedInTariff = config.feedInTariff * currentPriceInflation;
        const currentDailyFixedCost = (config.dailyFixedCost || 0) * currentPriceInflation;
        
        // Get monthly data
        const monthData = baseData.monthlyDayBaseData[monthInYear];
        const daysInMonth = DAYS_IN_MONTH[monthInYear];
        
        // Apply degradation to generation
        const dailyGeneration = monthData.totalGeneration * currentDegradation;
        const dailySelfConsumption = (monthData.totalDirectSelfConsumption + monthData.finalEffectiveCharge) * currentDegradation;
        const dailyToGrid = Math.max(0, dailyGeneration - dailySelfConsumption);
        const dailyFromGrid = Math.max(0, monthData.totalConsumption - dailySelfConsumption);
        
        // Monthly totals
        const monthlyGeneration = dailyGeneration * daysInMonth;
        const monthlySelfConsumption = dailySelfConsumption * daysInMonth;
        const monthlyToGrid = dailyToGrid * daysInMonth;
        const monthlyFromGrid = dailyFromGrid * daysInMonth;
        const monthlyConsumption = monthData.totalConsumption * daysInMonth;
        
        const costWithoutSolar = (monthlyConsumption * currentElectricityPrice) + (daysInMonth * currentDailyFixedCost);
        const costWithSolar = (monthlyFromGrid * currentElectricityPrice) + (daysInMonth * currentDailyFixedCost);
        const revenueFromGrid = monthlyToGrid * currentFeedInTariff;
        
        // Base monthly savings (without battery cost)
        let monthlySavings = costWithoutSolar - (costWithSolar - revenueFromGrid);
        
        // Amortization: spread battery cost over months before replacement
        if (replaceBattery && month <= batteryReplacementMonth) {
            monthlySavings -= monthlyBatteryAmortization;
        }

        // Monthly payback calculation
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
            batteryAmortization: (replaceBattery && month <= batteryReplacementMonth) ? monthlyBatteryAmortization : 0
        });
    }
    
    // Aggregate yearly data (for display and IRR)
    for (let year = 1; year <= totalYears; year++) {
        const yearMonths = monthlyProjection.filter(m => m.year === year);
        
        const netSavings = yearMonths.reduce((sum, m) => sum + m.monthlySavings, 0);
        const costWithoutSolar = yearMonths.reduce((sum, m) => sum + m.costWithoutSolar, 0);
        const costWithSolar = yearMonths.reduce((sum, m) => sum + m.costWithSolar, 0);
        const revenueFromGrid = yearMonths.reduce((sum, m) => sum + m.revenueFromGrid, 0);
        
        // IRR uses yearly cash flows
        cashFlows.push(netSavings);
        
        yearlyProjection.push({
            year,
            netSavings,
            discountedNetSavings: yearMonths.reduce((sum, m) => sum + m.discountedMonthlySavings, 0),
            cumulativeSavings: yearMonths[yearMonths.length - 1].cumulativeSavings,
            cumulativeDiscountedSavings: yearMonths[yearMonths.length - 1].cumulativeDiscountedSavings,
            costWithoutSolar,
            costWithSolar,
            revenueFromGrid,
            batteryAmortization: yearMonths.reduce((sum, m) => sum + m.batteryAmortization, 0)
        });
    }
    
    const irr = calculateIRR(cashFlows);

    // Determine which payback period to use based on config
    const useDiscount = config.useDiscount || false;
    const displayPaybackMonths = useDiscount ? discountedPaybackPeriodMonthly : paybackPeriodMonthly;
    const displayPaybackYears = displayPaybackMonths ? displayPaybackMonths / 12 : null;

    return { 
        yearlyProjection,
        monthlyProjection,
        paybackPeriod: paybackPeriodMonthly ? paybackPeriodMonthly / 12 : null,
        discountedPaybackPeriod: discountedPaybackPeriodMonthly ? discountedPaybackPeriodMonthly / 12 : null,
        paybackPeriodMonths: paybackPeriodMonthly,
        discountedPaybackPeriodMonths: discountedPaybackPeriodMonthly,
        displayPaybackMonths,
        displayPaybackYears,
        irr,
        totalYears
    };
}

// ============================================
// 模拟数据支持 - 当没有 Layout 时使用
// ============================================

// 生成模拟 Layout 数据（基于系统功率和发电系数）
function generateSimulatedLayoutData(config) {
    const systemPower = config.systemPower || 8;  // kWp
    const annualGenerationFactor = config.annualGenerationFactor || 1526;  // kWh/kWp
    const annualGeneration = config.annualGeneration || (systemPower * annualGenerationFactor);
    
    // 使用默认的月度和小时发电分布
    const monthlyGenPercentages = MONTHLY_GENERATION_PERCENTAGES;
    const hourlyGenFactors = HOURLY_GENERATION_FACTORS;
    
    // 生成 12 个月 x 24 小时的发电数据
    const monthlyHourlyPower = [];
    const monthlyDailyPower = [];
    
    for (let month = 0; month < 12; month++) {
        const monthlyGen = annualGeneration * (monthlyGenPercentages[month] / 100);
        const dailyGen = monthlyGen / DAYS_IN_MONTH[month];
        monthlyDailyPower.push(dailyGen);
        
        const hourlyPower = [];
        for (let hour = 0; hour < 24; hour++) {
            hourlyPower.push(dailyGen * hourlyGenFactors[hour]);
        }
        monthlyHourlyPower.push(hourlyPower);
    }
    
    return {
        projectId: 'SIMULATED',
        gisDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        installPanelCount: Math.round(systemPower / 0.4),  // 假设每块面板 400W
        panels: [{
            index: 1,
            aspect: 0,  // 正北
            slope: 30,  // 30度倾角
            panelCount: Math.round(systemPower / 0.4),
            singlePanelAnnualPower: annualGeneration / Math.round(systemPower / 0.4),
            totalAnnualPower: annualGeneration,
            monthlyHourlyPower: monthlyHourlyPower,
            monthlyDailyPower: monthlyDailyPower,
            calStatus: true
        }],
        totalPanels: Math.round(systemPower / 0.4),
        totalAnnualGeneration: annualGeneration,
        aggregatedMonthlyHourlyPower: monthlyHourlyPower,
        isValid: true,
        isSimulated: true
    };
}

// ============================================
// 详细计算过程记录
// ============================================

// 运行带详细计算过程的模拟
function runLayoutSimulationWithDetails(config, layoutData) {
    const details = {
        steps: [],
        baseDataCalc: {},
        financialCalc: {},
        monthlyDetails: [],
        yearlyDetails: []
    };
    
    const monthlyConsumptionPercentages = STATE_MONTHLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionPercentages = STATE_HOURLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionFactors = hourlyConsumptionPercentages.map(p => p / 100);

    // Step 1: 记录输入参数
    details.steps.push({
        step: 1,
        title: '输入参数',
        description: '用户输入的基础参数',
        data: {
            state: config.state,
            annualConsumption: config.annualConsumption,
            batteryCapacity: config.batteryCapacity,
            investmentCost: config.investmentCost,
            electricityPrice: config.electricityPrice,
            feedInTariff: config.feedInTariff,
            priceInflation: config.priceInflation,
            panelDegradation: config.panelDegradation,
            dailyFixedCost: config.dailyFixedCost,
            investmentYears: config.investmentYears,
            batteryReplacement: config.batteryReplacement,
            batteryReplacementYear: config.batteryReplacementYear,
            batteryReplacementCost: config.batteryReplacementCost,
            useDiscount: config.useDiscount,
            discountRate: config.discountRate
        }
    });

    // Step 2: Layout 数据解析
    details.steps.push({
        step: 2,
        title: 'Layout 数据解析',
        description: layoutData.isSimulated ? '使用模拟发电数据' : '解析导入的 Layout 数据',
        data: {
            isSimulated: layoutData.isSimulated || false,
            totalPanels: layoutData.totalPanels,
            totalAnnualGeneration: layoutData.totalAnnualGeneration,
            panelCount: layoutData.panels.length,
            panels: layoutData.panels.map(p => ({
                index: p.index,
                aspect: p.aspect,
                slope: p.slope,
                panelCount: p.panelCount,
                singlePanelAnnualPower: p.singlePanelAnnualPower,
                totalAnnualPower: p.totalAnnualPower
            }))
        }
    });

    // Step 3: 用电量分布计算
    const monthlyDailyConsumption = monthlyConsumptionPercentages.map((percentage, month) => {
        const monthlyConsumption = config.annualConsumption * (percentage / 100);
        return {
            month: month + 1,
            monthName: MONTH_NAMES[month],
            percentage: percentage,
            monthlyConsumption: monthlyConsumption,
            daysInMonth: DAYS_IN_MONTH[month],
            dailyConsumption: monthlyConsumption / DAYS_IN_MONTH[month]
        };
    });
    
    details.steps.push({
        step: 3,
        title: '月度用电量分布',
        description: '根据州用电比例计算每月用电量',
        formula: '月用电量 = 年用电量 × 月比例% / 100',
        data: monthlyDailyConsumption
    });

    // Step 4: 小时用电分布
    details.steps.push({
        step: 4,
        title: '小时用电分布',
        description: config.state + ' 州的 24 小时用电比例',
        data: hourlyConsumptionPercentages.map((p, h) => ({
            hour: h,
            percentage: p,
            factor: (p / 100).toFixed(4)
        }))
    });

    // Step 5-16: 每月详细计算
    const aggregatedMonthlyHourlyPower = layoutData.aggregatedMonthlyHourlyPower;
    let totalAnnualSelfConsumption = 0;
    let totalAnnualGeneration = 0;
    const monthlyDayBaseData = [];

    for (let month = 0; month < 12; month++) {
        const hourlyGeneration = aggregatedMonthlyHourlyPower[month] || Array(24).fill(0);
        const dailyConsumption = monthlyDailyConsumption[month].dailyConsumption;
        
        let dayDetail = {
            month: month + 1,
            monthName: MONTH_NAMES[month],
            daysInMonth: DAYS_IN_MONTH[month],
            dailyConsumption: dailyConsumption,
            hourly: [],
            totalGeneration: 0,
            totalConsumption: 0,
            totalDirectSelfConsumption: 0,
            totalToBatteryPotential: 0
        };
        
        for (let hour = 0; hour < 24; hour++) {
            const gen = hourlyGeneration[hour] || 0;
            const con = dailyConsumption * hourlyConsumptionFactors[hour];
            const directSelfConsumption = Math.min(gen, con);
            const toBattery = Math.max(gen - con, 0);
            const fromGrid = Math.max(0, con - gen);
            
            dayDetail.hourly.push({
                hour: hour,
                generation: gen,
                consumption: con,
                directSelfConsumption: directSelfConsumption,
                surplus: toBattery,
                deficit: fromGrid
            });
            
            dayDetail.totalGeneration += gen;
            dayDetail.totalConsumption += con;
            dayDetail.totalDirectSelfConsumption += directSelfConsumption;
            dayDetail.totalToBatteryPotential += toBattery;
        }
        
        dayDetail.nonGenerationConsumption = dayDetail.totalConsumption - dayDetail.totalDirectSelfConsumption;
        dayDetail.effectiveBatteryCharge = Math.min(
            dayDetail.totalToBatteryPotential, 
            config.batteryCapacity, 
            dayDetail.nonGenerationConsumption
        );
        dayDetail.totalSelfConsumption = dayDetail.totalDirectSelfConsumption + dayDetail.effectiveBatteryCharge;
        dayDetail.toGrid = dayDetail.totalGeneration - dayDetail.totalSelfConsumption;
        dayDetail.fromGrid = dayDetail.totalConsumption - dayDetail.totalSelfConsumption;
        dayDetail.selfConsumptionRate = dayDetail.totalGeneration > 0 ? 
            (dayDetail.totalSelfConsumption / dayDetail.totalGeneration * 100) : 0;
        
        // 月度汇总
        dayDetail.monthlyGeneration = dayDetail.totalGeneration * DAYS_IN_MONTH[month];
        dayDetail.monthlySelfConsumption = dayDetail.totalSelfConsumption * DAYS_IN_MONTH[month];
        dayDetail.monthlyToGrid = dayDetail.toGrid * DAYS_IN_MONTH[month];
        dayDetail.monthlyFromGrid = dayDetail.fromGrid * DAYS_IN_MONTH[month];
        
        details.monthlyDetails.push(dayDetail);
        
        monthlyDayBaseData.push({
            hourly: dayDetail.hourly,
            totalGeneration: dayDetail.totalGeneration,
            totalConsumption: dayDetail.totalConsumption,
            totalDirectSelfConsumption: dayDetail.totalDirectSelfConsumption,
            totalToBatteryPotential: dayDetail.totalToBatteryPotential,
            nonGenerationConsumption: dayDetail.nonGenerationConsumption,
            finalEffectiveCharge: dayDetail.effectiveBatteryCharge
        });
        
        totalAnnualSelfConsumption += dayDetail.monthlySelfConsumption;
        totalAnnualGeneration += dayDetail.monthlyGeneration;
    }

    // Step 17: 年度汇总
    const annualData = {
        totalGeneration: totalAnnualGeneration,
        totalConsumption: config.annualConsumption,
        totalSelfConsumption: totalAnnualSelfConsumption,
        toGrid: totalAnnualGeneration - totalAnnualSelfConsumption,
        fromGrid: config.annualConsumption - totalAnnualSelfConsumption,
        selfConsumptionRate: totalAnnualGeneration > 0 ? totalAnnualSelfConsumption / totalAnnualGeneration : 0
    };
    
    details.steps.push({
        step: 5,
        title: '年度能量汇总',
        description: '汇总 12 个月的能量数据',
        formulas: [
            '年发电量 = Σ(月发电量)',
            '年自用量 = Σ(月自用量)',
            '年馈网量 = 年发电量 - 年自用量',
            '年购电量 = 年用电量 - 年自用量',
            '自用率 = 年自用量 / 年发电量 × 100%'
        ],
        data: annualData
    });

    // 计算平均日数据
    const dailyAvgCon = config.annualConsumption / 365;
    let avgDayBaseData = {
        hourly: [],
        totalGeneration: annualData.totalGeneration / 365,
        totalConsumption: dailyAvgCon,
        totalDirectSelfConsumption: 0,
        totalToBatteryPotential: 0
    };
    
    for (let hour = 0; hour < 24; hour++) {
        let avgGen = 0;
        for (let month = 0; month < 12; month++) {
            avgGen += (aggregatedMonthlyHourlyPower[month][hour] || 0) * DAYS_IN_MONTH[month];
        }
        avgGen = avgGen / 365;
        const con = dailyAvgCon * hourlyConsumptionFactors[hour];
        const directSelfConsumption = Math.min(avgGen, con);
        const toBattery = Math.max(avgGen - con, 0);
        
        avgDayBaseData.hourly.push({
            hour, generation: avgGen, consumption: con, directSelfConsumption, toBattery, fromGrid: Math.max(0, con - avgGen)
        });
        avgDayBaseData.totalDirectSelfConsumption += directSelfConsumption;
        avgDayBaseData.totalToBatteryPotential += toBattery;
    }
    avgDayBaseData.nonGenerationConsumption = avgDayBaseData.totalConsumption - avgDayBaseData.totalDirectSelfConsumption;
    avgDayBaseData.finalEffectiveCharge = Math.min(avgDayBaseData.totalToBatteryPotential, config.batteryCapacity, avgDayBaseData.nonGenerationConsumption);

    const baseData = { dayBaseData: avgDayBaseData, annualData, monthlyDayBaseData };

    // Step 18: 财务计算参数
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

    details.steps.push({
        step: 6,
        title: '财务计算参数',
        description: '用于 ' + totalYears + ' 年财务预测的计算参数',
        formulas: [
            '月度电价通胀因子 = (1 + 年通胀率/100)^(1/12) = ' + monthlyPriceInflationFactor.toFixed(6),
            '月度衰减因子 = (1 - 年衰减率/100)^(1/12) = ' + monthlyDegradationFactor.toFixed(6),
            '月度贴现因子 = (1 + 年贴现率/100)^(1/12) = ' + monthlyDiscountFactor.toFixed(6),
            '电池月分摊 = 电池成本 / 更换月数 = ' + batteryReplacementCost + ' / ' + batteryReplacementMonth + ' = $' + monthlyBatteryAmortization.toFixed(2)
        ],
        data: {
            totalYears, totalMonths, monthlyPriceInflationFactor, monthlyDegradationFactor, monthlyDiscountFactor,
            replaceBattery, batteryReplacementYear, batteryReplacementMonth, batteryReplacementCost, monthlyBatteryAmortization
        }
    });

    // 财务计算
    const monthlyProjection = [];
    const yearlyProjection = [];
    const cashFlows = [-config.investmentCost];
    let cumulativeSavingsMonthly = 0, paybackPeriodMonthly = null;
    let cumulativeDiscountedSavingsMonthly = 0, discountedPaybackPeriodMonthly = null;

    for (let month = 1; month <= totalMonths; month++) {
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
        const batteryAmort = (replaceBattery && month <= batteryReplacementMonth) ? monthlyBatteryAmortization : 0;
        if (batteryAmort > 0) monthlySavings -= batteryAmort;
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
        monthlyProjection.push({
            month, year, monthInYear: monthInYear + 1, monthName: MONTH_NAMES[monthInYear],
            currentPriceInflation, currentDegradation, currentElectricityPrice, currentFeedInTariff, currentDailyFixedCost,
            monthlyGeneration, monthlySelfConsumption, monthlyToGrid, monthlyFromGrid, monthlyConsumption,
            costWithoutSolar, costWithSolar, revenueFromGrid, batteryAmortization: batteryAmort,
            monthlySavings, discountedMonthlySavings, cumulativeSavings: cumulativeSavingsMonthly, cumulativeDiscountedSavings: cumulativeDiscountedSavingsMonthly
        });
    }

    for (let year = 1; year <= totalYears; year++) {
        const yearMonths = monthlyProjection.filter(m => m.year === year);
        const netSavings = yearMonths.reduce((sum, m) => sum + m.monthlySavings, 0);
        cashFlows.push(netSavings);
        yearlyProjection.push({
            year, netSavings,
            discountedNetSavings: yearMonths.reduce((sum, m) => sum + m.discountedMonthlySavings, 0),
            cumulativeSavings: yearMonths[yearMonths.length - 1].cumulativeSavings,
            cumulativeDiscountedSavings: yearMonths[yearMonths.length - 1].cumulativeDiscountedSavings,
            costWithoutSolar: yearMonths.reduce((sum, m) => sum + m.costWithoutSolar, 0),
            costWithSolar: yearMonths.reduce((sum, m) => sum + m.costWithSolar, 0),
            revenueFromGrid: yearMonths.reduce((sum, m) => sum + m.revenueFromGrid, 0),
            batteryAmortization: yearMonths.reduce((sum, m) => sum + m.batteryAmortization, 0)
        });
    }

    const irr = calculateIRR(cashFlows);
    const useDiscount = config.useDiscount || false;
    const displayPaybackMonths = useDiscount ? discountedPaybackPeriodMonthly : paybackPeriodMonthly;
    const displayPaybackYears = displayPaybackMonths ? displayPaybackMonths / 12 : null;

    // Step 19: IRR 计算
    details.steps.push({
        step: 7,
        title: 'IRR 计算',
        description: '内部收益率计算',
        formula: 'NPV = Σ(CFt / (1+IRR)^t) = 0，求解 IRR',
        data: {
            initialInvestment: -config.investmentCost,
            cashFlowsPreview: cashFlows.slice(0, 6).map((cf, i) => ({ year: i, cashFlow: cf.toFixed(2) })),
            irr: irr,
            irrPercent: irr ? (irr * 100).toFixed(2) + '%' : 'N/A'
        }
    });

    // Step 20: 回本周期计算
    details.steps.push({
        step: 8,
        title: '回本周期计算',
        description: '计算投资回本所需时间',
        formulas: [
            '简单回本: 累计节省 >= 投资成本 时的月份',
            '贴现回本: 累计贴现节省 >= 投资成本 时的月份'
        ],
        data: {
            investmentCost: config.investmentCost,
            paybackPeriodMonths: paybackPeriodMonthly,
            paybackPeriodYears: paybackPeriodMonthly ? (paybackPeriodMonthly / 12).toFixed(2) : 'N/A',
            discountedPaybackPeriodMonths: discountedPaybackPeriodMonthly,
            discountedPaybackPeriodYears: discountedPaybackPeriodMonthly ? (discountedPaybackPeriodMonthly / 12).toFixed(2) : 'N/A',
            useDiscount: useDiscount,
            displayPaybackMonths: displayPaybackMonths,
            displayPaybackYears: displayPaybackYears
        }
    });

    details.yearlyDetails = yearlyProjection;
    details.financialCalc = { monthlyProjection, yearlyProjection, cashFlows, irr };

    return {
        dayBaseData: avgDayBaseData,
        annualData,
        monthlyDayBaseData,
        yearlyProjection,
        monthlyProjection,
        paybackPeriod: paybackPeriodMonthly ? paybackPeriodMonthly / 12 : null,
        discountedPaybackPeriod: discountedPaybackPeriodMonthly ? discountedPaybackPeriodMonthly / 12 : null,
        paybackPeriodMonths: paybackPeriodMonthly,
        discountedPaybackPeriodMonths: discountedPaybackPeriodMonthly,
        displayPaybackMonths,
        displayPaybackYears,
        irr,
        totalYears,
        layoutData,
        monthlyConsumptionFactors: monthlyConsumptionPercentages,
        hourlyConsumptionPercentages,
        calculationDetails: details
    };
}
