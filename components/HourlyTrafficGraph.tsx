import React, { useMemo, useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { buildingColors, getBuildingColorIndex } from '@/utils/buildingColors';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PlacerDataRow {
  id: string;
  name: string;
  foottraffic: string;
}

interface HourlyTrafficGraphProps {
  data: PlacerDataRow[];
  selectedBuildingId: string | null;
  hoveredBuilding: string | null;
  onHoverBuilding: (buildingName: string | null) => void;
}

const HourlyTrafficGraph: React.FC<HourlyTrafficGraphProps> = ({ 
  data, 
  selectedBuildingId,
  hoveredBuilding,
  onHoverBuilding
}) => {
  const chartData = useMemo(() => {
    // Group data by building
    const buildingsData = data.reduce((acc, row) => {
      if (!acc[row.id]) {
        acc[row.id] = {
          id: row.id,
          name: row.name,
          hourlyTotals: Array(24).fill(0),
          hourlyCount: Array(24).fill(0)
        };
      }
      
      const foottraffic = parseInt(row.foottraffic) || 0;
      const businessHours = 10;
      const hourlyTraffic = foottraffic / businessHours;
      
      // Add traffic to business hours (8am-6pm)
      for (let hour = 8; hour < 18; hour++) {
        acc[row.id].hourlyTotals[hour] += hourlyTraffic;
        acc[row.id].hourlyCount[hour]++;
      }
      
      // Add reduced traffic for early morning and evening hours
      for (let hour = 6; hour < 8; hour++) {
        acc[row.id].hourlyTotals[hour] += hourlyTraffic * 0.5;
        acc[row.id].hourlyCount[hour]++;
      }
      for (let hour = 18; hour < 20; hour++) {
        acc[row.id].hourlyTotals[hour] += hourlyTraffic * 0.3;
        acc[row.id].hourlyCount[hour]++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Filter buildings if a specific one is selected
    const relevantBuildings = selectedBuildingId
      ? [buildingsData[selectedBuildingId]].filter(Boolean)
      : Object.values(buildingsData);

    // Create datasets for each building
    const datasets = relevantBuildings.map((building) => {
      const hourlyAverages = building.hourlyTotals.map((total: number, hour: number) =>
        building.hourlyCount[hour] ? Math.round(total / building.hourlyCount[hour]) : 0
      );

      const isHovered = hoveredBuilding === building.name;
      const isSelected = selectedBuildingId === building.id;
      const isOtherHovered = (hoveredBuilding && hoveredBuilding !== building.name) || 
                            (selectedBuildingId && selectedBuildingId !== building.id);
      const baseOpacity = isOtherHovered ? 0.2 : 0.8;
      const opacity = isHovered || isSelected ? 1 : baseOpacity;
      
      const colorIndex = getBuildingColorIndex(data, building.name);
      const color = buildingColors[colorIndex % buildingColors.length];
      
      return {
        label: building.name,
        data: hourlyAverages,
        borderColor: color,
        backgroundColor: `${color}20`,
        tension: 0.4,
        fill: true,
        borderWidth: isHovered || isSelected ? 3 : 2,
        pointRadius: isHovered || isSelected ? 4 : 3,
        pointHoverRadius: 6,
        hidden: false,
        borderOpacity: opacity,
        pointOpacity: opacity
      };
    });

    return {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets
    };
  }, [data, selectedBuildingId, hoveredBuilding]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        onClick: (_, legendItem) => {
          const clickedBuildingName = legendItem.text;
          onHoverBuilding(hoveredBuilding === clickedBuildingName ? null : clickedBuildingName);
        },
        labels: {
          color: 'white',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 12
          },
          filter: (legendItem, chartData) => {
            const dataset = chartData.datasets[legendItem.datasetIndex!];
            const colorIndex = getBuildingColorIndex(data, dataset.label || '');
            const color = buildingColors[colorIndex % buildingColors.length];
            
            if (hoveredBuilding) {
              dataset.borderColor = dataset.label === hoveredBuilding 
                ? color
                : `${color}33`;
            } else {
              dataset.borderColor = color;
            }
            return true;
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(31, 41, 55, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'white',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    }
  };

  return (
    <div style={{ height: '400px' }}>
      <Line 
        options={options} 
        data={chartData}
        plugins={[{
          id: 'customLegend',
          beforeDraw: (chart) => {
            const datasets = chart.data.datasets;
            datasets.forEach((dataset, i) => {
              const meta = chart.getDatasetMeta(i);
              if (hoveredBuilding) {
                meta.hidden = dataset.label !== hoveredBuilding;
              } else {
                meta.hidden = false;
              }
            });
          }
        }]}
      />
    </div>
  );
};

export default HourlyTrafficGraph; 