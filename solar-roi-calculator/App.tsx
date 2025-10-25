import React, { useState } from 'react';
import type { SystemConfig, AustralianState } from './types';
import useSolarSimulation from './hooks/useSolarSimulation';
import ParameterControls from './components/ParameterControls';
import KpiCard from './components/KpiCard';
import EnergyFlowViz from './components/EnergyFlowViz';
import RoiViz from './components/RoiViz';
import CalculationBreakdown from './components/CalculationBreakdown';
import { AUSTRALIAN_STATES_CONSUMPTION } from './data/consumptionProfiles';

// Icon Components
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const BoltIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const ChartBarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const DiscountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v1h.01M12 7v1m0 4v1m0-6V4m0 6v2" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13l-3 3m0 0l-3-3m3 3V8" /><circle cx="12" cy="12" r="10" /></svg>;
export const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;


const App: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>({
    state: 'NSW',
    annualConsumption: AUSTRALIAN_STATES_CONSUMPTION.NSW,
    systemPower: 8,
    batteryCapacity: 10,
    investmentCost: 15000,
    electricityPrice: 0.35,
    feedInTariff: 0.08,
    priceInflation: 3,
    panelDegradation: 0.5,
    dailyFixedCost: 1,
    batteryReplacementCost: 5000,
    annualGenerationFactor: 1526,
    discountRate: 5,
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(-1); // -1 for annual average

  const handleStateChange = (newState: AustralianState) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      state: newState,
      annualConsumption: AUSTRALIAN_STATES_CONSUMPTION[newState],
    }));
  };

  const simulation = useSolarSimulation(config);
  const { annualData, twentyYearProjection, paybackPeriod, discountedPaybackPeriod, irr, dayBaseData, monthlyDayBaseData } = simulation;

  const energyFlowDataForViz = selectedMonth === -1 || !monthlyDayBaseData?.[selectedMonth]
    ? dayBaseData
    : monthlyDayBaseData[selectedMonth];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-blue-400">
            太阳能投资回报(ROI)与能量流模拟器
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            可视化您的太阳能投资表现并理解其背后的计算原理。
          </p>
        </header>

        <main className="space-y-8">
          <ParameterControls 
            config={config} 
            setConfig={setConfig}
            onStateChange={handleStateChange}
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <KpiCard 
              title="自用率" 
              value={annualData.selfConsumptionRate ? (annualData.selfConsumptionRate * 100).toFixed(1) : '0.0'}
              unit="%" 
              icon={<BoltIcon />}
              colorClass="bg-green-600"
            />
            <KpiCard 
              title="投资回收期 (简单)" 
              value={paybackPeriod ? paybackPeriod.toFixed(1) : 'N/A'}
              unit="年" 
              icon={<CalendarIcon />}
              colorClass="bg-blue-600"
            />
             <KpiCard 
              title="投资回收期 (贴现)" 
              value={discountedPaybackPeriod ? discountedPaybackPeriod.toFixed(1) : 'N/A'}
              unit="年" 
              icon={<DiscountIcon />}
              colorClass="bg-teal-600"
            />
            <KpiCard 
              title="20年内部收益率 (IRR)" 
              value={irr ? (irr * 100).toFixed(1) : 'N/A'}
              unit="%" 
              icon={<ChartBarIcon />}
              colorClass="bg-purple-600"
            />
             <KpiCard 
              title="年发电量" 
              value={annualData.totalGeneration ? (annualData.totalGeneration / 1000).toFixed(1) : '0.0'}
              unit="MWh" 
              icon={<SunIcon />}
              colorClass="bg-yellow-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <EnergyFlowViz 
                data={energyFlowDataForViz} 
                config={config}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
              />
              <RoiViz data={twentyYearProjection} investmentCost={config.investmentCost} />
          </div>

          <CalculationBreakdown simulation={simulation} config={config} />
        </main>
        <footer className="text-center text-gray-500 text-sm pt-4">
          <p>此为基于典型数据和所提供参数的模拟。实际结果可能有所不同。</p>
          <p>由 React, TypeScript, 和 Tailwind CSS 构建。</p>
        </footer>
      </div>
    </div>
  );
};

export default App;