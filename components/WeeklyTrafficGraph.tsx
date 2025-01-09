import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { buildingColors, getBuildingColorIndex } from '@/utils/buildingColors';

interface BuildingDataPoint {
  date: Date;
  value: number;
}

interface BuildingData {
  id: string;
  name: string;
  data: BuildingDataPoint[];
}

interface WeeklyTrafficGraphProps {
  data: BuildingData[];
  selectedBuildingId: string | null;
  hoveredBuilding: string | null;
  onHoverBuilding: (buildingName: string | null) => void;
}

const WeeklyTrafficGraph: React.FC<WeeklyTrafficGraphProps> = ({
  data,
  selectedBuildingId,
  hoveredBuilding,
  onHoverBuilding
}) => {
  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data[0]?.data}
          margin={{ top: 10, right: 10, left: 40, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            tickFormatter={(date: Date) => date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            })}
            type="category"
            allowDuplicatedCategory={false}
          />
          <YAxis
            tickFormatter={(value) => value.toLocaleString()}
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#F3F4F6',
              padding: '8px 12px'
            }}
            labelFormatter={(date: Date) => date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
            formatter={(value: number, name: string, props: any) => {
              return [
                `${props.payload.name}: ${value.toLocaleString()} visitors`,
                ''
              ];
            }}
          />
          <Legend 
            onClick={(e) => {
              onHoverBuilding(hoveredBuilding === e.value ? null : e.value);
            }}
          />
          {data.map((building: BuildingData) => {
            const isHovered = hoveredBuilding === building.name;
            const isSelected = selectedBuildingId === building.id;
            const isOtherHovered = hoveredBuilding && hoveredBuilding !== building.name;
            const baseOpacity = isOtherHovered ? 0.1 : 0.8;
            const opacity = isHovered || isSelected ? 1 : baseOpacity;
            const colorIndex = getBuildingColorIndex(data, building.name);

            return (
              <Line 
                key={building.id}
                data={building.data}
                type="monotone"
                dataKey="value"
                name={building.name}
                stroke={buildingColors[colorIndex % buildingColors.length]}
                strokeWidth={isHovered || isSelected ? 3 : 2}
                strokeOpacity={opacity}
                dot={{ 
                  fill: buildingColors[colorIndex % buildingColors.length],
                  r: isHovered || isSelected ? 5 : 4,
                  opacity: opacity
                }}
                connectNulls={true}
                onMouseEnter={() => onHoverBuilding(building.name)}
                onMouseLeave={() => onHoverBuilding(null)}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyTrafficGraph; 