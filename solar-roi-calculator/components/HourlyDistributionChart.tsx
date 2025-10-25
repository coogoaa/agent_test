import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface HourlyDistributionChartProps {
  generationFactors: number[];
  consumptionPercentages: number[];
}

const HourlyDistributionChart: React.FC<HourlyDistributionChartProps> = ({ generationFactors, consumptionPercentages }) => {
  const chartData = generationFactors.map((genFactor, index) => ({
    name: `${index}:00`,
    '发电系数': genFactor,
    '用电比例 (%)': consumptionPercentages[index],
  }));

  return (
    <div className="h-60 bg-gray-900/50 p-4 rounded-md">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
          <XAxis dataKey="name" stroke="#a0aec0" fontSize={12} interval={3} />
          <YAxis stroke="#a0aec0" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(31, 41, 55, 0.8)',
              borderColor: '#4a5568',
              borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number, name: string) => {
              if (name === '用电比例 (%)') {
                return [`${value.toFixed(2)}%`, '用电比例'];
              }
              return [value, name];
            }}
          />
          <Legend wrapperStyle={{ top: -5, color: '#a0aec0' }} />
          <Bar dataKey="发电系数" fill="#f59e0b" />
          <Bar dataKey="用电比例 (%)" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HourlyDistributionChart;