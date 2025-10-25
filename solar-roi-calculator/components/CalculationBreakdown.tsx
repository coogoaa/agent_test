import React from 'react';
import type { SimulationResult, SystemConfig } from '../types';
import MonthlyGenerationChart from './MonthlyGenerationChart';
import MonthlyConsumptionChart from './MonthlyConsumptionChart';
import HourlyDistributionChart from './HourlyDistributionChart';
import { exportSimulationDataToCsv } from '../utils/exportToCsv';
import { DownloadIcon } from '../App';

interface CalculationBreakdownProps {
  simulation: SimulationResult;
  config: SystemConfig;
}

const ValueDisplay: React.FC<{ label: string; value: string; unit?: string; className?: string }> = ({ label, value, unit, className }) => (
  <div className={`flex justify-between items-baseline py-2 border-b border-gray-700 ${className}`}>
    <span className="text-gray-400">{label}</span>
    <span className="font-mono text-white font-bold">{value} <span className="text-sm font-normal text-gray-400">{unit}</span></span>
  </div>
);

const FormulaBox: React.FC<{ title: string; formula: string; children: React.ReactNode }> = ({ title, formula, children }) => (
    <div className="bg-gray-900/50 p-4 rounded-md mt-2">
        <p className="font-semibold text-brand-accent">{title}</p>
        <p className="text-sm text-gray-400 italic my-1 font-mono">{formula}</p>
        <div className="mt-2 text-sm space-y-1">
            {children}
        </div>
    </div>
);


const CalculationBreakdown: React.FC<CalculationBreakdownProps> = ({ simulation, config }) => {
  const { dayBaseData, annualData, twentyYearProjection, paybackPeriod, discountedPaybackPeriod, irr, monthlyGenerationPercentages, monthlyConsumptionFactors, hourlyGenerationFactors, hourlyConsumptionPercentages } = simulation;
  const year1 = twentyYearProjection[0];

  const formatNumber = (num: number | null, digits = 2) => num ? num.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '0.00';
  const formatCurrency = (num: number) => num ? num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '$0';

  const handleDownload = () => {
    exportSimulationDataToCsv(simulation, config);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">详细计算分解</h2>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center px-4 py-2 bg-brand-secondary text-white font-semibold rounded-lg hover:bg-blue-500 transition-colors duration-300"
        >
          <DownloadIcon />
          下载CSV报告
        </button>
      </div>
      
      {/* Core Model Assumptions */}
      <section className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 border-b-2 border-brand-secondary pb-2">核心模型假设</h3>
          <p className="text-sm text-gray-400 mb-4">模拟结果基于以下典型的季节性和每日能量分布模型。这些系数决定了年度发电量和用电量如何分配到每个月和每一天。</p>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div>
                <h4 className="text-lg font-semibold text-center text-white mb-2">季节性发电模型</h4>
                <MonthlyGenerationChart percentages={monthlyGenerationPercentages} />
            </div>
            <div>
                <h4 className="text-lg font-semibold text-center text-white mb-2">季节性用电模型</h4>
                <MonthlyConsumptionChart factors={monthlyConsumptionFactors} />
            </div>
            <div>
                <h4 className="text-lg font-semibold text-center text-white mb-2">小时能量分布模型</h4>
                <HourlyDistributionChart generationFactors={hourlyGenerationFactors} consumptionPercentages={hourlyConsumptionPercentages} />
            </div>
          </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Energy Flow */}
        <section>
          <h3 className="text-xl font-semibold text-white mb-4 border-b-2 border-brand-secondary pb-2">第1步：年度到每日能量流模拟</h3>
          
          <FormulaBox title="年总发电量" formula="光伏系统功率 × 年发电系数">
            <p className="text-xs text-gray-400">这是模拟的第一步，计算出系统在一年内预计能产生的总电量。</p>
            <ValueDisplay label="1. 光伏系统功率" value={formatNumber(config.systemPower, 1)} unit="kWp" className="border-t border-gray-700" />
            <ValueDisplay label="2. 年发电系数" value={formatNumber(config.annualGenerationFactor, 0)} unit="kWh/kWp" />
            <ValueDisplay label="= 年总发电量" value={formatNumber(annualData.totalGeneration)} unit="kWh" className="text-green-400 font-bold border-0" />
          </FormulaBox>

          <h4 className="text-lg font-semibold mt-6 mb-2">日均数据分解</h4>
          <div className="space-y-3">
            <ValueDisplay label="日均发电量" value={formatNumber(dayBaseData.totalGeneration)} unit="kWh" />
            <ValueDisplay label="日均用电量" value={formatNumber(dayBaseData.totalConsumption)} unit="kWh" />

            <FormulaBox title="日直接自用电量" formula="Σ min(每小时发电量, 每小时用电量)">
                <p>光伏发电产生时立即被消耗的部分。</p>
                <ValueDisplay label="结果" value={formatNumber(dayBaseData.totalDirectSelfConsumption)} unit="kWh" className="border-0 text-green-400" />
            </FormulaBox>
            
            <FormulaBox title="日可充电量" formula="Σ max(每小时发电量 - 每小时用电量, 0)">
                <p>可用于给电池充电的剩余光伏电量。</p>
                <ValueDisplay label="结果" value={formatNumber(dayBaseData.totalToBatteryPotential)} unit="kWh" className="border-0 text-yellow-400" />
            </FormulaBox>

            <FormulaBox title="日有效充电量" formula="min(日可充电量, 电池容量, 非发电时段用电量)">
                <p>实际储存的有效电量。它受限于可充电量、电池容量以及非发电时段的用电需求。</p>
                <ValueDisplay label="1. 可充电量" value={formatNumber(dayBaseData.totalToBatteryPotential)} unit="kWh" className="border-t border-gray-700" />
                <ValueDisplay label="2. 电池容量" value={formatNumber(config.batteryCapacity)} unit="kWh" />
                <ValueDisplay label="3. 非发电时段用电量" value={formatNumber(dayBaseData.nonGenerationConsumption)} unit="kWh" />
                <ValueDisplay label="最终结果" value={formatNumber(dayBaseData.finalEffectiveCharge)} unit="kWh" className="text-green-400 font-bold" />
            </FormulaBox>

            <h4 className="text-lg font-semibold pt-4">年度总结</h4>
            <ValueDisplay label="年总自用电量" value={formatNumber(annualData.totalSelfConsumption)} unit="kWh" />
            <ValueDisplay label="年总发电量" value={formatNumber(annualData.totalGeneration)} unit="kWh" />
            <ValueDisplay label="售电量 (上网)" value={formatNumber(annualData.toGrid)} unit="kWh" />
            <ValueDisplay label="购电量 (下网)" value={formatNumber(annualData.fromGrid)} unit="kWh" />
            
            <FormulaBox title="自用率" formula="年总自用电量 / 年总发电量">
                <ValueDisplay label="结果" value={`${formatNumber(annualData.selfConsumptionRate * 100)}%`} className="border-0 text-xl text-brand-accent"/>
            </FormulaBox>
          </div>
        </section>

        {/* Step 2: 20-Year ROI */}
        <section>
          <h3 className="text-xl font-semibold text-white mb-4 border-b-2 border-brand-secondary pb-2">第2步：20年财务分析</h3>
          <div className="space-y-3">
             <ValueDisplay label="初始投资" value={formatCurrency(config.investmentCost)} className="text-red-400"/>
             <ValueDisplay label="电池更换成本 (第10年)" value={formatCurrency(config.batteryReplacementCost)} className="text-yellow-400"/>
            
            <FormulaBox title="年度净节省" formula="安装前成本 - (安装后成本 - 售电收入)">
                <p>此处以第一年的计算为例。</p>
                <ValueDisplay label="安装前成本" value={formatCurrency(year1.costWithoutSolar)} />
                <ValueDisplay label="安装后成本" value={formatCurrency(year1.costWithSolar)} />
                <ValueDisplay label="售电收入" value={formatCurrency(year1.revenueFromGrid)} />
                <ValueDisplay label="净节省 (第一年)" value={formatCurrency(year1.netSavings)} className="text-green-400 font-bold" />
            </FormulaBox>

            <FormulaBox title="投资回收期 (简单)" formula="累计节省 > 投资成本的年份">
                <p>累计节省的名义金额等于初始投资额的时间点。未考虑资金的时间价值。</p>
                <ValueDisplay label="结果" value={paybackPeriod ? `${formatNumber(paybackPeriod)} 年` : 'N/A'} className="border-0 text-xl text-brand-accent"/>
            </FormulaBox>

            <FormulaBox title="投资回收期 (贴现)" formula="累计贴现节省 > 投资成本的年份">
                <p>将未来的节省额折算成今天的价值后，累计节省额等于初始投资额的时间点。这是一个更保守的财务指标。</p>
                <p className="text-gray-400 text-xs">使用的贴现率: {config.discountRate}%</p>
                <ValueDisplay label="结果" value={discountedPaybackPeriod ? `${formatNumber(discountedPaybackPeriod)} 年` : 'N/A'} className="border-0 text-xl text-brand-accent"/>
            </FormulaBox>

            <FormulaBox title="内部收益率 (IRR)" formula="使现金流净现值(NPV)为零的贴现率">
                 <p>衡量投资盈利能力的指标。越高越好。</p>
                 <p className="text-gray-400 text-xs">现金流示例: [{formatCurrency(-config.investmentCost)}, {formatCurrency(year1.netSavings)}, {formatCurrency(twentyYearProjection[1].netSavings)}, ...]</p>
                 <ValueDisplay label="结果" value={irr ? `${formatNumber(irr * 100)}%` : 'N/A'} className="border-0 text-xl text-brand-accent"/>
            </FormulaBox>

          </div>
        </section>
      </div>
    </div>
  );
};

export default CalculationBreakdown;