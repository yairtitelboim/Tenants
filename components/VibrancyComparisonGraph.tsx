import { ResponsiveLine } from '@nivo/line';
import { useMemo } from 'react';
import { calculateVibrancyScore } from './vibrancy';

interface VibrancyComparisonGraphProps {
  selectedBuilding: any;
  allBuildings: any[];
  timeFrame: string;
}

interface DataPoint {
  x: string;
  y: number;
}

const VibrancyComparisonGraph: React.FC<VibrancyComparisonGraphProps> = ({
  selectedBuilding,
  allBuildings,
  timeFrame
}) => {
  const graphData = useMemo(() => {
    // Group buildings by date first
    const buildingsByDate = allBuildings.reduce((acc, building) => {
      const date = building.start_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(building);
      return acc;
    }, {});

    // Group buildings by ID and calculate scores for each date
    const buildingsById = allBuildings.reduce((acc: Record<string, DataPoint[]>, building) => {
      if (!acc[building.id]) {
        acc[building.id] = [];
      }
      
      const date = new Date(building.start_date);
      if (isNaN(date.getTime())) return acc;
      
      // Calculate score using only buildings from the same date
      const buildingsFromSameDate = buildingsByDate[building.start_date] || [];
      const score = calculateVibrancyScore(building, buildingsFromSameDate).score;
      
      acc[building.id].push({
        x: date.toISOString().split('T')[0],
        y: score
      });
      return acc;
    }, {});

    // Create line data for other buildings
    const otherBuildingsData = Object.entries(buildingsById)
      .filter(([id]) => id !== selectedBuilding.id)
      .map(([id, dataPoints]) => ({
        id,
        data: dataPoints.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime()),
        color: '#37415120'
      }));

    // Create line data for selected building
    const selectedBuildingPoints = buildingsById[selectedBuilding.id] || [];
    const selectedBuildingData = {
      id: selectedBuilding.id,
      data: selectedBuildingPoints.sort((a, b) => 
        new Date(a.x).getTime() - new Date(b.x).getTime()
      ),
      color: '#3B82F6',
      lineWidth: 15
    };

    return [...otherBuildingsData, selectedBuildingData];
  }, [selectedBuilding, allBuildings]);

  // Don't render if we don't have any data
  if (graphData.length === 0 || graphData.every(d => d.data.length === 0)) {
    return (
      <div className="h-[200px] w-full flex items-center justify-center text-gray-400">
        No time series data available
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveLine
        data={[...graphData.slice(0, -1), graphData[graphData.length - 1]]}
        margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
        xScale={{
          type: 'time',
          format: '%Y-%m-%d',
          useUTC: false,
          precision: 'day'
        }}
        yScale={{
          type: 'linear',
          min: 0,
          max: 100,
          stacked: false
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Vibrancy Score',
          legendOffset: -35
        }}
        axisBottom={{
          format: '%b %d',
          tickRotation: -45,
          legend: 'Date',
          legendOffset: 36,
          tickValues: 'every month'
        }}
        enablePoints={false}
        enableGridX={false}
        enableGridY={true}
        curve="monotoneX"
        theme={{
          axis: {
            ticks: {
              text: {
                fill: '#9CA3AF',
                fontSize: 8
              }
            },
            legend: {
              text: {
                fill: '#9CA3AF',
                fontSize: 8
              }
            }
          },
          grid: {
            line: {
              stroke: '#374151',
              strokeWidth: 0.1
            }
          },
          crosshair: {
            line: {
              stroke: '#374151',
              strokeWidth: 0.25
            }
          }
        }}
        colors={d => d.color}
        animate={false}
      />
    </div>
  );
};

export default VibrancyComparisonGraph; 