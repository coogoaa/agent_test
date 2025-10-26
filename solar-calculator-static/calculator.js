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
    
    // Calculate 20-year projection
    const financialData = calculate20YearData(config, baseData.annualData);

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

function calculate20YearData(config, baseAnnualData) {
    const projection = [];
    const cashFlows = [-config.investmentCost];
    
    // 原有回本周期计算（第10年一次性扣除）
    let cumulativeSavings = 0;
    let paybackPeriod = null;
    
    let cumulativeDiscountedSavings = 0;
    let discountedPaybackPeriod = null;

    // 新增：计提法回本周期计算（前10年分摊）
    let cumulativeSavingsAmortized = 0;
    let paybackPeriodAmortized = null;
    
    let cumulativeDiscountedSavingsAmortized = 0;
    let discountedPaybackPeriodAmortized = null;

    const priceInflationFactor = 1 + config.priceInflation / 100;
    const degradationFactor = 1 - config.panelDegradation / 100;
    const discountFactor = 1 + config.discountRate / 100;
    
    // 电池成本年度分摊额（10年分摊）
    const annualBatteryAmortization = config.batteryReplacementCost / 10;

    for (let year = 1; year <= 20; year++) {
        const currentPriceInflation = Math.pow(priceInflationFactor, year - 1);
        const currentDegradation = Math.pow(degradationFactor, year - 1);

        const currentElectricityPrice = config.electricityPrice * currentPriceInflation;
        const currentFeedInTariff = config.feedInTariff * currentPriceInflation;
        const currentDailyFixedCost = (config.dailyFixedCost || 0) * currentPriceInflation;

        const annualGeneration = baseAnnualData.totalGeneration * currentDegradation;
        const annualSelfConsumption = (baseAnnualData.totalSelfConsumption / baseAnnualData.totalGeneration) * annualGeneration;
        const annualToGrid = annualGeneration - annualSelfConsumption;
        const annualFromGrid = config.annualConsumption - annualSelfConsumption;
        
        const costWithoutSolar = (config.annualConsumption * currentElectricityPrice) + (365 * currentDailyFixedCost);
        const costWithSolar = (annualFromGrid * currentElectricityPrice) + (365 * currentDailyFixedCost);
        const revenueFromGrid = annualToGrid * currentFeedInTariff;
        
        // 基础节省（不含电池成本）
        let netSavings = costWithoutSolar - (costWithSolar - revenueFromGrid);
        
        // IRR 使用实际现金流：第10年一次性扣除
        if (year === 10) {
            netSavings -= config.batteryReplacementCost;
        }

        // 计提法：前10年每年分摊电池成本
        let netSavingsAmortized = costWithoutSolar - (costWithSolar - revenueFromGrid);
        if (year <= 10) {
            netSavingsAmortized -= annualBatteryAmortization;
        }

        // ===== 原有回本周期计算（第10年一次性扣除）=====
        const prevCumulativeSavings = cumulativeSavings;
        cumulativeSavings += netSavings;

        if (paybackPeriod === null && cumulativeSavings >= config.investmentCost) {
            const remainingCost = config.investmentCost - prevCumulativeSavings;
            if (netSavings > 0) {
                paybackPeriod = (year - 1) + (remainingCost / netSavings);
            }
        }
        
        const discountedNetSavings = netSavings / Math.pow(discountFactor, year);
        const prevCumulativeDiscountedSavings = cumulativeDiscountedSavings;
        cumulativeDiscountedSavings += discountedNetSavings;

        if (discountedPaybackPeriod === null && cumulativeDiscountedSavings >= config.investmentCost) {
            const remainingDiscountedCost = config.investmentCost - prevCumulativeDiscountedSavings;
            if (discountedNetSavings > 0) {
                const fractionOfYear = remainingDiscountedCost / discountedNetSavings;
                discountedPaybackPeriod = (year - 1) + fractionOfYear;
            }
        }

        // ===== 新增：计提法回本周期计算 =====
        const prevCumulativeSavingsAmortized = cumulativeSavingsAmortized;
        cumulativeSavingsAmortized += netSavingsAmortized;

        if (paybackPeriodAmortized === null && cumulativeSavingsAmortized >= config.investmentCost) {
            const remainingCost = config.investmentCost - prevCumulativeSavingsAmortized;
            if (netSavingsAmortized > 0) {
                paybackPeriodAmortized = (year - 1) + (remainingCost / netSavingsAmortized);
            }
        }
        
        const discountedNetSavingsAmortized = netSavingsAmortized / Math.pow(discountFactor, year);
        const prevCumulativeDiscountedSavingsAmortized = cumulativeDiscountedSavingsAmortized;
        cumulativeDiscountedSavingsAmortized += discountedNetSavingsAmortized;

        if (discountedPaybackPeriodAmortized === null && cumulativeDiscountedSavingsAmortized >= config.investmentCost) {
            const remainingDiscountedCost = config.investmentCost - prevCumulativeDiscountedSavingsAmortized;
            if (discountedNetSavingsAmortized > 0) {
                const fractionOfYear = remainingDiscountedCost / discountedNetSavingsAmortized;
                discountedPaybackPeriodAmortized = (year - 1) + fractionOfYear;
            }
        }

        projection.push({
            year,
            netSavings,  // 第10年一次性扣除（用于 IRR）
            netSavingsAmortized,  // 前10年分摊（用于回本周期）
            discountedNetSavings,
            discountedNetSavingsAmortized,
            cumulativeSavings,  // 原有累计
            cumulativeSavingsAmortized,  // 计提法累计
            cumulativeDiscountedSavings,
            cumulativeDiscountedSavingsAmortized,
            costWithoutSolar,
            costWithSolar,
            revenueFromGrid,
            batteryAmortization: year <= 10 ? annualBatteryAmortization : 0
        });
        
        // IRR 使用实际现金流（第10年一次性扣除）
        cashFlows.push(netSavings);
    }
    
    const irr = calculateIRR(cashFlows);

    return { 
        twentyYearProjection: projection, 
        paybackPeriod,  // 原有回本周期
        paybackPeriodAmortized,  // 计提法回本周期
        discountedPaybackPeriod,  // 原有贴现回本周期
        discountedPaybackPeriodAmortized,  // 计提法贴现回本周期
        irr  // 继续使用实际现金流
    };
}
