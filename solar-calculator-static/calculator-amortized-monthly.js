// Calculator functions - Direct translation from useSolarSimulation.ts

// Calculate NPV
function calculateNPV(rate, cashFlows) {
    return cashFlows.reduce((acc, cashFlow, i) => acc + cashFlow / Math.pow(1 + rate, i), 0);
}

// Calculate IRR using bisection method
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

// Main simulation function
function runSolarSimulation(config) {
    const monthlyConsumptionPercentages = STATE_MONTHLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionPercentages = STATE_HOURLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionFactors = hourlyConsumptionPercentages.map(p => p / 100);

    // Calculate base data
    const baseData = calculateBaseData(config, monthlyConsumptionPercentages, hourlyConsumptionFactors);
    
    // Calculate 20-year projection (传入完整 baseData 以访问月度数据)
    const financialData = calculate20YearData(config, baseData);

    return {
        ...baseData,
        ...financialData,
        monthlyGenerationPercentages: MONTHLY_GENERATION_PERCENTAGES,
        monthlyConsumptionFactors: monthlyConsumptionPercentages,
        hourlyGenerationFactors: HOURLY_GENERATION_FACTORS,
        hourlyConsumptionPercentages: hourlyConsumptionPercentages
    };
}

function calculateBaseData(config, monthlyConsumptionPercentages, hourlyConsumptionFactors) {
    // Use user-provided annualGeneration if > 0, otherwise calculate from systemPower * annualGenerationFactor
    const annualSystemProduction = config.annualGeneration || (config.systemPower * config.annualGenerationFactor);
    
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

    // Calculate for each month
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
            const gen = dailyGeneration * HOURLY_GENERATION_FACTORS[hour];
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

    const dailyAvgGen = annualData.totalGeneration / 365;
    const dailyAvgCon = config.annualConsumption / 365;

    for (let hour = 0; hour < 24; hour++) {
        const gen = dailyAvgGen * HOURLY_GENERATION_FACTORS[hour];
        const con = dailyAvgCon * hourlyConsumptionFactors[hour];
        const directSelfConsumption = Math.min(gen, con);
        const toBattery = Math.max(gen - con, 0);
        
        avgDayBaseData.hourly.push({ 
            hour, 
            generation: gen, 
            consumption: con, 
            directSelfConsumption, 
            toBattery, 
            fromGrid: Math.max(0, con - gen)
        });
        avgDayBaseData.totalDirectSelfConsumption += directSelfConsumption;
        avgDayBaseData.totalToBatteryPotential += toBattery;
    }
    
    avgDayBaseData.nonGenerationConsumption = avgDayBaseData.totalConsumption - avgDayBaseData.totalDirectSelfConsumption;
    avgDayBaseData.finalEffectiveCharge = Math.min(avgDayBaseData.totalToBatteryPotential, config.batteryCapacity, avgDayBaseData.nonGenerationConsumption);

    annualData.totalSelfConsumption = totalAnnualSelfConsumption;
    annualData.toGrid = annualData.totalGeneration - annualData.totalSelfConsumption;
    annualData.fromGrid = annualData.totalConsumption - annualData.totalSelfConsumption;
    annualData.selfConsumptionRate = annualData.totalSelfConsumption / annualData.totalGeneration;

    return { 
        dayBaseData: avgDayBaseData, 
        annualData, 
        monthlyDayBaseData 
    };
}

function calculate20YearData(config, baseData) {
    const monthlyProjection = [];
    const yearlyProjection = [];
    const cashFlows = [-config.investmentCost];
    
    // 月度回本周期计算（计提法：前120个月分摊）
    let cumulativeSavingsMonthly = 0;
    let paybackPeriodMonthly = null;
    
    let cumulativeDiscountedSavingsMonthly = 0;
    let discountedPaybackPeriodMonthly = null;

    const monthlyPriceInflationFactor = Math.pow(1 + config.priceInflation / 100, 1/12);
    const monthlyDegradationFactor = Math.pow(1 - config.panelDegradation / 100, 1/12);
    const monthlyDiscountFactor = Math.pow(1 + config.discountRate / 100, 1/12);
    
    // 电池成本月度分摊额（120个月分摊）
    const monthlyBatteryAmortization = config.batteryReplacementCost / 120;

    // 按月循环 240 个月（20年）
    for (let month = 1; month <= 240; month++) {
        const year = Math.ceil(month / 12);
        const monthInYear = ((month - 1) % 12);  // 0-11
        
        const currentPriceInflation = Math.pow(monthlyPriceInflationFactor, month - 1);
        const currentDegradation = Math.pow(monthlyDegradationFactor, month - 1);

        const currentElectricityPrice = config.electricityPrice * currentPriceInflation;
        const currentFeedInTariff = config.feedInTariff * currentPriceInflation;
        const currentDailyFixedCost = (config.dailyFixedCost || 0) * currentPriceInflation;
        
        // 获取当月的每日数据（基于月度模型）
        const monthData = baseData.monthlyDayBaseData[monthInYear];
        const daysInMonth = DAYS_IN_MONTH[monthInYear];
        
        // 应用衰减到当月发电量
        const dailyGeneration = monthData.totalGeneration * currentDegradation;
        const dailySelfConsumption = (monthData.totalDirectSelfConsumption + monthData.finalEffectiveCharge) * currentDegradation;
        const dailyToGrid = Math.max(0, dailyGeneration - dailySelfConsumption);
        const dailyFromGrid = Math.max(0, monthData.totalConsumption - dailySelfConsumption);
        
        // 月度数据
        const monthlyGeneration = dailyGeneration * daysInMonth;
        const monthlySelfConsumption = dailySelfConsumption * daysInMonth;
        const monthlyToGrid = dailyToGrid * daysInMonth;
        const monthlyFromGrid = dailyFromGrid * daysInMonth;
        const monthlyConsumption = monthData.totalConsumption * daysInMonth;
        
        const costWithoutSolar = (monthlyConsumption * currentElectricityPrice) + (daysInMonth * currentDailyFixedCost);
        const costWithSolar = (monthlyFromGrid * currentElectricityPrice) + (daysInMonth * currentDailyFixedCost);
        const revenueFromGrid = monthlyToGrid * currentFeedInTariff;
        
        // 基础月度节省（不含电池成本）
        let monthlySavings = costWithoutSolar - (costWithSolar - revenueFromGrid);
        
        // 计提法：前120个月分摊电池成本
        if (month <= 120) {
            monthlySavings -= monthlyBatteryAmortization;
        }

        // 月度回本周期计算
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
    
    // 汇总年度数据（用于显示和 IRR）
    for (let year = 1; year <= 20; year++) {
        const yearMonths = monthlyProjection.filter(m => m.year === year);
        
        const netSavings = yearMonths.reduce((sum, m) => sum + m.monthlySavings, 0);
        const costWithoutSolar = yearMonths.reduce((sum, m) => sum + m.costWithoutSolar, 0);
        const costWithSolar = yearMonths.reduce((sum, m) => sum + m.costWithSolar, 0);
        const revenueFromGrid = yearMonths.reduce((sum, m) => sum + m.revenueFromGrid, 0);
        
        // IRR 使用年度现金流（但基于月度计提）
        cashFlows.push(netSavings);
        
        yearlyProjection.push({
            year,
            netSavings,
            netSavingsAmortized: netSavings,  // 月度版本都是计提法
            discountedNetSavings: yearMonths.reduce((sum, m) => sum + m.discountedMonthlySavings, 0),
            discountedNetSavingsAmortized: yearMonths.reduce((sum, m) => sum + m.discountedMonthlySavings, 0),
            cumulativeSavings: yearMonths[yearMonths.length - 1].cumulativeSavings,
            cumulativeSavingsAmortized: yearMonths[yearMonths.length - 1].cumulativeSavings,
            cumulativeDiscountedSavings: yearMonths[yearMonths.length - 1].cumulativeDiscountedSavings,
            cumulativeDiscountedSavingsAmortized: yearMonths[yearMonths.length - 1].cumulativeDiscountedSavings,
            costWithoutSolar,
            costWithSolar,
            revenueFromGrid,
            batteryAmortization: yearMonths.reduce((sum, m) => sum + m.batteryAmortization, 0)
        });
    }
    
    const irr = calculateIRR(cashFlows);

    return { 
        twentyYearProjection: yearlyProjection,  // 年度汇总（用于图表显示）
        monthlyProjection,  // 月度详细数据
        paybackPeriod: paybackPeriodMonthly / 12,  // 转换为年
        paybackPeriodAmortized: paybackPeriodMonthly / 12,  // 月度版本都是计提法
        discountedPaybackPeriod: discountedPaybackPeriodMonthly / 12,
        discountedPaybackPeriodAmortized: discountedPaybackPeriodMonthly / 12,
        paybackPeriodMonths: paybackPeriodMonthly,  // 保留月数
        discountedPaybackPeriodMonths: discountedPaybackPeriodMonthly,
        irr
    };
}
