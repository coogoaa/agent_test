import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface MonthlyConsumptionChartProps {
  factors: number[];
}

const MonthlyConsumptionChart: React.FC<MonthlyConsumptionChartProps> = ({ factors }) => {
  const chartData = factors.map((factor, index) => ({
    name: `${index + 1}月`,
    '用电比例 (%)': factor,
  }));

  return (
    <div className="h-60 bg-gray-900/50 p-4 rounded-md">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
          <XAxis dataKey="name" stroke="#a0aec0" fontSize={12} />
          <YAxis stroke="#a0aec0" fontSize={12} unit="%"/>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(31, 41, 55, 0.8)',
              borderColor: '#4a5568',
              borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, '用电比例']}
          />
          <Bar dataKey="用电比例 (%)" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyConsumptionChart;