import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSelectedBuildingColor } from '@/utils/buildingColors';

interface WorkerDistanceGraphProps {
  data: { distance: string; count: number }[];
  selectedBuildingId: string | null;
  buildingName: string | null;
  allBuildings: any[];
}

const WorkerDistanceGraph: React.FC<WorkerDistanceGraphProps> = ({ 
  data, 
  selectedBuildingId, 
  buildingName,
  allBuildings,
}) => {
  const getColor = () => {
    if (selectedBuildingId) {
      return getSelectedBuildingColor(allBuildings, selectedBuildingId);
    }
    return '#60a5fa';
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">
          {selectedBuildingId 
            ? `Employee Distance Distribution - ${buildingName}`
            : 'Overall Employee Distance Distribution'
          }
        </h2>
        <div className="text-sm text-gray-400">
          Based on visits longer than 2 hours
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis type="number" stroke="#fff" />
          <YAxis 
            dataKey="distance" 
            type="category" 
            stroke="#fff"
            tick={{ fill: '#fff' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: 'none', 
              borderRadius: '0.5rem', 
              color: '#F3F4F6' 
            }} 
          />
          <Bar 
            dataKey="count" 
            fill={getColor()}
            radius={[0, 4, 4, 0]}
            name="Employee Visits"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WorkerDistanceGraph; 