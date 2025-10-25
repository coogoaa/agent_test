export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';

export interface SystemConfig {
  state: AustralianState;
  annualConsumption: number; // kWh
  systemPower: number; // kWp
  annualGenerationFactor: number; // kWh/kWp
  batteryCapacity: number; // kWh
  investmentCost: number; // $
  electricityPrice: number; // $/kWh
  feedInTariff: number; // $/kWh
  priceInflation: number; // %
  panelDegradation: number; // %
  dailyFixedCost: number; // $
  batteryReplacementCost: number; // $
  discountRate: number; // %
}

export interface HourlyData {
  hour: number;
  generation: number;
  consumption: number;
  directSelfConsumption: number;
  toBattery: number;
  fromGrid: number;
}

export interface DayBaseData {
  hourly: HourlyData[];
  totalGeneration: number;
  totalConsumption: number;
  totalDirectSelfConsumption: number;
  totalToBatteryPotential: number;
  nonGenerationConsumption: number;
  finalEffectiveCharge: number;
}

export interface AnnualData {
  totalGeneration: number;
  totalConsumption: number;
  totalSelfConsumption: number;
  fromGrid: number;
  toGrid: number;
  selfConsumptionRate: number;
}

export interface YearFinancialData {
  year: number;
  netSavings: number;
  discountedNetSavings: number;
  cumulativeSavings: number;
  cumulativeDiscountedSavings: number;
  costWithoutSolar: number;
  costWithSolar: number;
  revenueFromGrid: number;
}

export interface SimulationResult {
  annualData: AnnualData;
  twentyYearProjection: YearFinancialData[];
  paybackPeriod: number | null;
  discountedPaybackPeriod: number | null;
  irr: number | null;
  dayBaseData: DayBaseData;
  monthlyDayBaseData: DayBaseData[];
  monthlyGenerationPercentages: number[];
  monthlyConsumptionFactors: number[];
  hourlyGenerationFactors: number[];
  hourlyConsumptionPercentages: number[];
}
