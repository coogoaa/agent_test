import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { DayBaseData, SystemConfig } from '../types';

// --- Helper Icons for the Diagram ---
const SolarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const HouseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const BatteryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 1h8v8H6V6z" clipRule="evenodd" /><path d="M8 3.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" /></svg>;
const GridIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

// --- Sub-component for the Diagram ---
const EnergyFlowDiagram: React.FC<{ data: DayBaseData; config: SystemConfig }> = ({ data }) => {
    const { totalGeneration, totalConsumption, totalDirectSelfConsumption, finalEffectiveCharge } = data;
    const toGrid = Math.max(0, totalGeneration - totalDirectSelfConsumption - finalEffectiveCharge);
    const fromGrid = Math.max(0, totalConsumption - totalDirectSelfConsumption - finalEffectiveCharge);
    
    const FlowCard: React.FC<{icon: React.ReactNode, title: string, value: number, bgColor: string, children?: React.ReactNode}> = ({icon, title, value, bgColor, children}) => (
        <div className="flex flex-col items-center">
            <div className={`relative w-48 rounded-lg p-3 shadow-lg flex flex-col items-center justify-center ${bgColor}`}>
                {icon}
                <p className="font-bold text-white mt-1">{title}</p>
                <p className="text-xl font-mono font-extrabold text-white">{value.toFixed(2)} kWh</p>
            </div>
            {children}
        </div>
    );
    
    const Arrow: React.FC<{value: number, label: string, color: string}> = ({value, label, color}) => (
        <div className="flex flex-col items-center mx-4 flex-1 min-w-0">
            <div className="text-lg font-mono font-bold" style={{color}}>{value.toFixed(2)} kWh</div>
            <div className={`w-full h-1 rounded-full ${color}`}></div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
        </div>
    );

    return (
        <div className="space-y-12 py-4">
            {/* Generation Flow */}
            <div>
                <h3 className="text-lg font-semibold text-center text-white mb-4">发电去向</h3>
                <div className="flex items-center justify-center">
                    <FlowCard icon={<SolarIcon />} title="光伏总发电" value={totalGeneration} bgColor="bg-gray-700" />
                    <div className="flex flex-col space-y-3 mx-4">
                        <Arrow value={totalDirectSelfConsumption} label="直接自用" color="bg-green-500" />
                        <Arrow value={finalEffectiveCharge} label="充电" color="bg-yellow-500" />
                        <Arrow value={toGrid} label="上网" color="bg-blue-500" />
                    </div>
                     <div className="flex flex-col space-y-4">
                        <FlowCard icon={<HouseIcon />} title="家庭" value={totalDirectSelfConsumption} bgColor="bg-green-600/50" />
                        <FlowCard icon={<BatteryIcon />} title="电池" value={finalEffectiveCharge} bgColor="bg-yellow-600/50" />
                        <FlowCard icon={<GridIcon />} title="电网" value={toGrid} bgColor="bg-blue-600/50" />
                    </div>
                </div>
            </div>
             {/* Consumption Flow */}
            <div>
                <h3 className="text-lg font-semibold text-center text-white mb-4">用电来源</h3>
                 <div className="flex items-center justify-center">
                     <div className="flex flex-col space-y-4">
                        <FlowCard icon={<SolarIcon />} title="光伏" value={totalDirectSelfConsumption} bgColor="bg-green-600/50" />
                        <FlowCard icon={<BatteryIcon />} title="电池" value={finalEffectiveCharge} bgColor="bg-yellow-600/50" />
                        <FlowCard icon={<GridIcon />} title="电网" value={fromGrid} bgColor="bg-red-600/50" />
                    </div>
                    <div className="flex flex-col space-y-3 mx-4">
                        <Arrow value={totalDirectSelfConsumption} label="光伏直供" color="bg-green-500" />
                        <Arrow value={finalEffectiveCharge} label="电池放电" color="bg-yellow-500" />
                        <Arrow value={fromGrid} label="电网购电" color="bg-red-500" />
                    </div>
                    <FlowCard icon={<HouseIcon />} title="家庭总用电" value={totalConsumption} bgColor="bg-gray-700" />
                </div>
            </div>
        </div>
    );
};


interface EnergyFlowVizProps {
  data: DayBaseData;
  config: SystemConfig;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
}

const EnergyFlowViz: React.FC<EnergyFlowVizProps> = ({ data, config, selectedMonth, onMonthChange }) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'diagram'>('chart');

  const chartData = data.hourly.map(h => ({
    name: `${h.hour}:00`,
    '发电量': parseFloat(h.generation.toFixed(2)),
    '用电量': parseFloat(h.consumption.toFixed(2)),
  }));

  const title = selectedMonth === -1 ? '日均能量流' : `${selectedMonth + 1}月能量流`;

  const getTabClass = (tabName: 'chart' | 'diagram') => {
    return `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 ${
      activeTab === tabName
        ? 'text-white bg-brand-secondary'
        : 'text-gray-400 hover:text-white hover:bg-gray-700'
    }`;
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(parseInt(e.target.value, 10))}
          className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-brand-secondary focus:border-brand-secondary"
          aria-label="选择能量流显示月份"
        >
          <option value={-1}>年度平均</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {`${i + 1}月`}
            </option>
          ))}
        </select>
      </div>

      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-2" aria-label="Tabs">
          <button onClick={() => setActiveTab('chart')} className={getTabClass('chart')}>
            小时图表
          </button>
          <button onClick={() => setActiveTab('diagram')} className={getTabClass('diagram')}>
            能量流向图
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'chart' && (
            <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                    <XAxis dataKey="name" stroke="#a0aec0" />
                    <YAxis stroke="#a0aec0" unit=" kWh"/>
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                            borderColor: '#4a5568',
                            borderRadius: '0.5rem'
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ color: '#a0aec0' }} />
                    <Area type="monotone" dataKey="发电量" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="用电量" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                </AreaChart>
                </ResponsiveContainer>
            </div>
        )}
        {activeTab === 'diagram' && (
          <EnergyFlowDiagram data={data} config={config} />
        )}
      </div>

    </div>
  );
};

export default EnergyFlowViz;