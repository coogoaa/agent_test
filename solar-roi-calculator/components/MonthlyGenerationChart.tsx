import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface MonthlyGenerationChartProps {
  percentages: number[];
}

const MonthlyGenerationChart: React.FC<MonthlyGenerationChartProps> = ({ percentages }) => {
  const chartData = percentages.map((percentage, index) => ({
    name: `${index + 1}月`,
    '发电量占比 (%)': percentage,
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
          <YAxis stroke="#a0aec0" fontSize={12} unit="%" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(31, 41, 55, 0.8)',
              borderColor: '#4a5568',
              borderRadius: '0.5rem'
            }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, '发电量占比']}
          />
          <Bar dataKey="发电量占比 (%)" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyGenerationChart;