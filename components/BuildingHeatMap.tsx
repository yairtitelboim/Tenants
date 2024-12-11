import React, { useMemo } from 'react';

// Import the building colors utility
import { buildingColors, getBuildingColorIndex, getSelectedBuildingColor } from '../utils/buildingColors';

interface PlacerDataRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  foottraffic: string;
  visits_by_day_of_week_monday: string;
  visits_by_day_of_week_tuesday: string;
  visits_by_day_of_week_wednesday: string;
  visits_by_day_of_week_thursday: string;
  visits_by_day_of_week_friday: string;
  visits_by_day_of_week_saturday: string;
  visits_by_day_of_week_sunday: string;
}

interface BuildingHeatMapProps {
  data: PlacerDataRow[];
  selectedBuildingId: string | null;
  hoveredBuilding: string | null;
  onHoverBuilding: (buildingName: string | null) => void;
}

type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

const BuildingHeatMap: React.FC<BuildingHeatMapProps> = ({ 
  data, 
  selectedBuildingId, 
  hoveredBuilding,
  onHoverBuilding 
}) => {
  const sortedData = useMemo(() => 
    [...data].sort((a, b) => a.name.localeCompare(b.name)),
    [data]
  );

  const dailyTotals = useMemo(() => {
    const totals: { [date: string]: number } = {};
    
    // Initialize all days of 2024 with 0
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(2024, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `2024-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        totals[dateStr] = 0;
      }
    }

    // Process the data differently based on whether a building is selected
    if (selectedBuildingId) {
      // Single building view - use existing logic
      const buildingData = data.filter(row => row.id === selectedBuildingId);
      buildingData.forEach(row => {
        const dayPercentages: Record<DayOfWeek, number> = {
          'Monday': parseFloat(row.visits_by_day_of_week_monday) || 0,
          'Tuesday': parseFloat(row.visits_by_day_of_week_tuesday) || 0,
          'Wednesday': parseFloat(row.visits_by_day_of_week_wednesday) || 0,
          'Thursday': parseFloat(row.visits_by_day_of_week_thursday) || 0,
          'Friday': parseFloat(row.visits_by_day_of_week_friday) || 0,
          'Saturday': parseFloat(row.visits_by_day_of_week_saturday) || 0,
          'Sunday': parseFloat(row.visits_by_day_of_week_sunday) || 0
        };

        const startDate = new Date(row.start_date);
        const endDate = new Date(row.end_date);
        const totalTraffic = parseInt(row.foottraffic) || 0;

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
            
            if (totals[dateStr] !== undefined) {
              const dayPercentage = dayPercentages[dayName];
              const dayTraffic = totalTraffic * (dayPercentage / 100);
              totals[dateStr] += dayTraffic;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
    } else {
      // Aggregate view - sum up all buildings
      data.forEach(row => {
        const dayPercentages: Record<DayOfWeek, number> = {
          'Monday': parseFloat(row.visits_by_day_of_week_monday) || 0,
          'Tuesday': parseFloat(row.visits_by_day_of_week_tuesday) || 0,
          'Wednesday': parseFloat(row.visits_by_day_of_week_wednesday) || 0,
          'Thursday': parseFloat(row.visits_by_day_of_week_thursday) || 0,
          'Friday': parseFloat(row.visits_by_day_of_week_friday) || 0,
          'Saturday': parseFloat(row.visits_by_day_of_week_saturday) || 0,
          'Sunday': parseFloat(row.visits_by_day_of_week_sunday) || 0
        };

        const startDate = new Date(row.start_date);
        const endDate = new Date(row.end_date);
        const totalTraffic = parseInt(row.foottraffic) || 0;

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
            
            if (totals[dateStr] !== undefined) {
              const dayPercentage = dayPercentages[dayName];
              const dayTraffic = totalTraffic * (dayPercentage / 100);
              totals[dateStr] += dayTraffic;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
    }

    // Round all values
    Object.keys(totals).forEach(date => {
      totals[date] = Math.round(totals[date]);
    });

    return totals;
  }, [data, selectedBuildingId]);

  // Replace the getColor function
  const getColor = (value: number) => {
    if (value === 0) return '#1F2937';
    const intensity = value / Math.max(...Object.values(dailyTotals));
    
    if (selectedBuildingId) {
      const baseColor = getSelectedBuildingColor(data, selectedBuildingId);
      return `${baseColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
    }
    
    return `#60A5FA${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const currentDate = new Date(2024, monthIndex, 1);
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        const daysInMonth = new Date(2024, monthIndex + 1, 0).getDate();
        const firstDayOfMonth = currentDate.getDay();
        const monthStr = (monthIndex + 1).toString().padStart(2, '0');

        return (
          <div key={monthName} className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm font-semibold mb-2 text-center text-gray-300">
              {monthName}
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-xs text-center text-gray-500">
                  {day}
                </div>
              ))}
              {Array.from({ length: firstDayOfMonth }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = (i + 1).toString().padStart(2, '0');
                const dateStr = `2024-${monthStr}-${day}`;
                const value = dailyTotals[dateStr];

                return ( 
                  <div
                    key={dateStr}
                    className="aspect-square relative group cursor-pointer transition-colors duration-200"
                    style={{ backgroundColor: getColor(value) }}
                    onMouseEnter={() => {
                      if (selectedBuildingId) {
                        const building = data.find(row => row.id === selectedBuildingId);
                        if (building) {
                          onHoverBuilding(building.name);
                        }
                      }
                    }}
                    onMouseLeave={() => onHoverBuilding(null)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-white/70">{i + 1}</span>
                    </div>
                    <div className="absolute hidden group-hover:block bg-gray-900 text-white p-2 rounded-md text-xs whitespace-nowrap z-10 -translate-y-full left-1/2 -translate-x-1/2">
                      {`${monthName} ${i + 1}: ${value.toLocaleString()} visits`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BuildingHeatMap; 