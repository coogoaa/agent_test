
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  colorClass: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit, icon, colorClass }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex items-center space-x-4">
      <div className={`p-3 rounded-full ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">
          {value} <span className="text-lg font-normal text-gray-300">{unit}</span>
        </p>
      </div>
    </div>
  );
};

export default KpiCard;
