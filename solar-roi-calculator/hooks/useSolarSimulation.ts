import { useMemo } from 'react';
import type { SystemConfig, SimulationResult, DayBaseData, AnnualData, YearFinancialData } from '../types';
import { calculateIRR } from '../utils/financial';
import { STATE_MONTHLY_CONSUMPTION_PERCENTAGES, STATE_HOURLY_CONSUMPTION_PERCENTAGES } from '../data/consumptionProfiles';

// Mock data representing typical daily and seasonal patterns
const HOURLY_GENERATION_FACTORS = [0, 0, 0, 0, 0, 0, 0.01, 0.05, 0.1, 0.12, 0.13, 0.14, 0.14, 0.12, 0.1, 0.05, 0.01, 0, 0, 0, 0, 0, 0, 0];
// Data provided by the user, representing the percentage of annual generation per month.
const MONTHLY_GENERATION_PERCENTAGES = [10, 9, 9, 8, 7, 6, 7, 8, 9, 9, 9, 9];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const useSolarSimulation = (config: SystemConfig): SimulationResult => {
  return useMemo(() => {
    const monthlyConsumptionPercentages = STATE_MONTHLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionPercentages = STATE_HOURLY_CONSUMPTION_PERCENTAGES[config.state];
    const hourlyConsumptionFactors = hourlyConsumptionPercentages.map(p => p / 100);

    // Step 6 Logic: Energy Flow Simulation & Self-Consumption Rate
    const calBaseData = (): { dayBaseData: DayBaseData, annualData: AnnualData, monthlyDayBaseData: DayBaseData[] } => {
      const annualSystemProduction = config.systemPower * config.annualGenerationFactor;
      
      let annualData: AnnualData = {
        totalGeneration: 0,
        totalConsumption: config.annualConsumption,
        totalSelfConsumption: 0,
        fromGrid: 0,
        toGrid: 0,
        selfConsumptionRate: 0,
      };
      
      const monthlyDailyConsumption = monthlyConsumptionPercentages.map((percentage, month) => {
          const monthlyConsumption = config.annualConsumption * (percentage / 100);
          return monthlyConsumption / DAYS_IN_MONTH[month];
      });


      let avgDayBaseData: DayBaseData = {
        hourly: [],
        totalGeneration: 0,
        totalConsumption: 0,
        totalDirectSelfConsumption: 0,
        totalToBatteryPotential: 0,
        nonGenerationConsumption: 0,
        finalEffectiveCharge: 0,
      };

      let totalAnnualSelfConsumption = 0;
      let totalAnnualGeneration = 0;
      const monthlyDayBaseData: DayBaseData[] = [];

      for (let month = 0; month < 12; month++) {
        const monthlyGeneration = annualSystemProduction * (MONTHLY_GENERATION_PERCENTAGES[month] / 100);
        const dailyGeneration = monthlyGeneration / DAYS_IN_MONTH[month];
        const dailyConsumption = monthlyDailyConsumption[month];

        let day: DayBaseData = {
            hourly: [],
            totalGeneration: 0,
            totalConsumption: 0,
            totalDirectSelfConsumption: 0,
            totalToBatteryPotential: 0,
            nonGenerationConsumption: 0,
            finalEffectiveCharge: 0,
        };
        
        for (let hour = 0; hour < 24; hour++) {
          const gen = dailyGeneration * HOURLY_GENERATION_FACTORS[hour];
          const con = dailyConsumption * hourlyConsumptionFactors[hour];
          const directSelfConsumption = Math.min(gen, con);
          const toBattery = Math.max(gen - con, 0);
          
          day.hourly.push({ hour, generation: gen, consumption: con, directSelfConsumption, toBattery, fromGrid: Math.max(0, con - gen) });
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
      
      avgDayBaseData = {
          ...avgDayBaseData,
          totalGeneration: annualData.totalGeneration / 365,
          totalConsumption: annualData.totalConsumption / 365
      };

      const dailyAvgGen = annualData.totalGeneration/365;
      const dailyAvgCon = config.annualConsumption/365;

      for(let hour = 0; hour < 24; hour++) {
        const gen = dailyAvgGen * HOURLY_GENERATION_FACTORS[hour];
        const con = dailyAvgCon * hourlyConsumptionFactors[hour];
        const directSelfConsumption = Math.min(gen, con);
        const toBattery = Math.max(gen - con, 0);
        avgDayBaseData.hourly.push({ hour, generation: gen, consumption: con, directSelfConsumption, toBattery, fromGrid: Math.max(0, con-gen)});
        avgDayBaseData.totalDirectSelfConsumption += directSelfConsumption;
        avgDayBaseData.totalToBatteryPotential += toBattery;
      }
      avgDayBaseData.nonGenerationConsumption = avgDayBaseData.totalConsumption - avgDayBaseData.totalDirectSelfConsumption;
      avgDayBaseData.finalEffectiveCharge = Math.min(avgDayBaseData.totalToBatteryPotential, config.batteryCapacity, avgDayBaseData.nonGenerationConsumption);


      annualData.totalSelfConsumption = totalAnnualSelfConsumption;
      annualData.toGrid = annualData.totalGeneration - annualData.totalSelfConsumption;
      annualData.fromGrid = annualData.totalConsumption - annualData.totalSelfConsumption;
      annualData.selfConsumptionRate = annualData.totalSelfConsumption / annualData.totalGeneration;

      return { dayBaseData: avgDayBaseData, annualData, monthlyDayBaseData };
    };

    // Step 7 Logic: 20-Year Investment Return Analysis
    const calculate20YearData = (baseAnnualData: AnnualData): { projection: YearFinancialData[], payback: number | null, discountedPayback: number | null, irr: number | null } => {
      const projection: YearFinancialData[] = [];
      const cashFlows: number[] = [-config.investmentCost];
      
      let cumulativeSavings = 0;
      let paybackPeriod: number | null = null;
      
      let cumulativeDiscountedSavings = 0;
      let discountedPaybackPeriod: number | null = null;

      const priceInflationFactor = 1 + config.priceInflation / 100;
      const degradationFactor = 1 - config.panelDegradation / 100;
      const discountFactor = 1 + config.discountRate / 100;

      for (let year = 1; year <= 20; year++) {
        const currentPriceInflation = Math.pow(priceInflationFactor, year - 1);
        const currentDegradation = Math.pow(degradationFactor, year - 1);

        const currentElectricityPrice = config.electricityPrice * currentPriceInflation;
        const currentFeedInTariff = config.feedInTariff * currentPriceInflation;
        const currentDailyFixedCost = config.dailyFixedCost * currentPriceInflation;

        const annualGeneration = baseAnnualData.totalGeneration * currentDegradation;
        const annualSelfConsumption = (baseAnnualData.totalSelfConsumption / baseAnnualData.totalGeneration) * annualGeneration;
        const annualToGrid = annualGeneration - annualSelfConsumption;
        const annualFromGrid = config.annualConsumption - annualSelfConsumption;
        
        const costWithoutSolar = (config.annualConsumption * currentElectricityPrice) + (365 * currentDailyFixedCost);
        const costWithSolar = (annualFromGrid * currentElectricityPrice) + (365 * currentDailyFixedCost);
        const revenueFromGrid = annualToGrid * currentFeedInTariff;
        
        let netSavings = costWithoutSolar - (costWithSolar - revenueFromGrid);
        
        if (year === 10) {
            netSavings -= config.batteryReplacementCost;
        }

        // --- Simple Payback Period ---
        const prevCumulativeSavings = cumulativeSavings;
        cumulativeSavings += netSavings;

        if (paybackPeriod === null && cumulativeSavings >= config.investmentCost) {
          const remainingCost = config.investmentCost - prevCumulativeSavings;
          if (netSavings > 0) {
            paybackPeriod = (year - 1) + (remainingCost / netSavings);
          }
        }
        
        // --- Discounted Payback Period ---
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

        projection.push({
          year,
          netSavings,
          discountedNetSavings,
          cumulativeSavings,
          cumulativeDiscountedSavings,
          costWithoutSolar,
          costWithSolar,
          revenueFromGrid,
        });
        cashFlows.push(netSavings);
      }
      
      const irr = calculateIRR(cashFlows);

      return { projection, payback: paybackPeriod, discountedPayback: discountedPaybackPeriod, irr };
    };

    const { dayBaseData, annualData, monthlyDayBaseData } = calBaseData();
    const { projection, payback, discountedPayback, irr } = calculate20YearData(annualData);

    return {
      annualData,
      twentyYearProjection: projection,
      paybackPeriod: payback,
      discountedPaybackPeriod: discountedPayback,
      irr,
      dayBaseData,
      monthlyDayBaseData,
      monthlyGenerationPercentages: MONTHLY_GENERATION_PERCENTAGES,
      monthlyConsumptionFactors: monthlyConsumptionPercentages,
      hourlyGenerationFactors: HOURLY_GENERATION_FACTORS,
      hourlyConsumptionPercentages: hourlyConsumptionPercentages,
    };
  }, [config]);
};

export default useSolarSimulation;
