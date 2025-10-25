import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import type { YearFinancialData } from '../types';

interface RoiVizProps {
  data: YearFinancialData[];
  investmentCost: number;
}

const RoiViz: React.FC<RoiVizProps> = ({ data, investmentCost }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">20年财务预测</h2>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
            <XAxis dataKey="year" stroke="#a0aec0" label={{ value: '年份', position: 'insideBottom', offset: -5, fill: '#a0aec0' }} />
            <YAxis stroke="#a0aec0" tickFormatter={formatCurrency} />
             <Tooltip
                contentStyle={{ 
                    backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                    borderColor: '#4a5568',
                    borderRadius: '0.5rem'
                }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => formatCurrency(value)}
            />
            <Legend wrapperStyle={{ color: '#a0aec0' }} />
            <ReferenceLine y={investmentCost} label={{ value: '投资额', position: 'insideTopLeft', fill: '#f87171' }} stroke="#f87171" strokeDasharray="3 3" />
            <Bar dataKey="netSavings" name="年度净节省" fill="#3b82f6" />
            <Line type="monotone" dataKey="cumulativeSavings" name="累计节省 (简单)" stroke="#f59e0b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cumulativeDiscountedSavings" name="累计节省 (贴现)" stroke="#0d9488" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RoiViz;
