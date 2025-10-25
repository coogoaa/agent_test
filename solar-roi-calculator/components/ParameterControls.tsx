import React from 'react';
import type { SystemConfig, AustralianState } from '../types';
import { stateOptions } from '../data/consumptionProfiles';

interface ParameterControlsProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  onStateChange: (newState: AustralianState) => void;
}

const NumberInput: React.FC<{
  label: string;
  id: keyof SystemConfig;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (id: keyof SystemConfig, value: number) => void;
}> = ({ label, id, value, min, max, step, unit, onChange }) => (
  <div className="space-y-2">
    <label htmlFor={id} className="block text-sm font-medium text-gray-300">
      {label}
    </label>
    <div className="flex items-center space-x-2 bg-gray-700 rounded-lg border border-transparent focus-within:border-brand-secondary focus-within:ring-1 focus-within:ring-brand-secondary">
      <input
        type="number"
        id={id}
        name={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
            const val = e.target.value;
            // Allow empty input for typing, but don't pass NaN up
            if (val === '') {
              // Or you could set a default, like 0
              onChange(id, 0);
              return;
            }
            const num = parseFloat(val);
            if (!isNaN(num)) {
                onChange(id, num);
            }
        }}
        className="w-full bg-transparent p-2.5 text-white focus:outline-none"
        aria-label={label}
      />
      <span className="text-sm text-gray-400 font-semibold pr-3 shrink-0">
        {unit}
      </span>
    </div>
  </div>
);


const ParameterControls: React.FC<ParameterControlsProps> = ({ config, setConfig, onStateChange }) => {
  const handleChange = (id: keyof SystemConfig, value: number) => {
    setConfig((prevConfig) => ({ ...prevConfig, [id]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStateChange(e.target.value as AustralianState);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">模拟参数</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
        <div className="space-y-2 lg:col-span-1">
          <label htmlFor="state-select" className="block text-sm font-medium text-gray-300">
            州/领地 (自动更新年用电量)
          </label>
          <select
            id="state-select"
            value={config.state}
            onChange={handleSelectChange}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-brand-secondary focus:border-brand-secondary"
          >
            {stateOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <NumberInput label="年用电量" id="annualConsumption" value={config.annualConsumption} min={1000} max={20000} step={100} unit="kWh" onChange={handleChange} />
        <NumberInput label="光伏系统功率" id="systemPower" value={config.systemPower} min={1} max={100} step={0.5} unit="kWp" onChange={handleChange} />
        <NumberInput label="年发电系数" id="annualGenerationFactor" value={config.annualGenerationFactor} min={1000} max={2000} step={1} unit="kWh/kWp" onChange={handleChange} />
        <NumberInput label="电池容量" id="batteryCapacity" value={config.batteryCapacity} min={0} max={55} step={0.5} unit="kWh" onChange={handleChange} />
        <NumberInput label="总投资成本" id="investmentCost" value={config.investmentCost} min={1000} max={50000} step={500} unit="$" onChange={handleChange} />
        <NumberInput label="电价" id="electricityPrice" value={config.electricityPrice} min={0.1} max={1} step={0.01} unit="$/kWh" onChange={handleChange} />
        <NumberInput label="上网电价" id="feedInTariff" value={config.feedInTariff} min={0} max={0.5} step={0.01} unit="$/kWh" onChange={handleChange} />
        <NumberInput label="价格通胀率" id="priceInflation" value={config.priceInflation} min={0} max={10} step={0.1} unit="%" onChange={handleChange} />
        <NumberInput label="光伏板年衰减率" id="panelDegradation" value={config.panelDegradation} min={0} max={5} step={0.05} unit="%/年" onChange={handleChange} />
        <NumberInput label="电池更换成本 (第10年)" id="batteryReplacementCost" value={config.batteryReplacementCost} min={0} max={20000} step={500} unit="$" onChange={handleChange} />
        <NumberInput label="贴现率 (用于贴现回收期)" id="discountRate" value={config.discountRate} min={0} max={15} step={0.1} unit="%" onChange={handleChange} />
      </div>
    </div>
  );
};

export default ParameterControls;