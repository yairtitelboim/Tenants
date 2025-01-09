import React, { useReducer, useMemo, useState } from 'react';
import { Building2, Users, Clock, MapPin, BarChart3, Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import WeeklyTrafficGraph from './WeeklyTrafficGraph';

interface PopupProps {
  buildingData: any;
  locations: any[];
}

type CalendarState = {
  selectedMonth: number;
  daysInMonth: number;
  firstDayOfMonth: number;
  days: Array<{ day: number; value: number; intensity: number }>;
};

type CalendarAction = 
  | { type: 'SET_MONTH'; payload: number }
  | { type: 'RECALCULATE'; payload: { weekdayData: Record<string, number> } };

function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'SET_MONTH':
      return {
        ...state,
        selectedMonth: action.payload,
        daysInMonth: new Date(2024, action.payload + 1, 0).getDate(),
        firstDayOfMonth: new Date(2024, action.payload, 1).getDay(),
      };
    case 'RECALCULATE': {
      const { weekdayData } = action.payload;
      const maxValue = Math.max(...Object.values(weekdayData));
      const days = Array.from({ length: state.daysInMonth }, (_, index) => {
        const date = new Date(2024, state.selectedMonth, index + 1);
        const dayOfWeek = date.getDay();
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek] as keyof typeof weekdayData;
        const value = weekdayData[dayName];
        return {
          day: index + 1,
          value,
          intensity: value / maxValue
        };
      });
      return { ...state, days };
    }
    default:
      return state;
  }
}

const CalendarView: React.FC<{ weekdayData: Record<string, number> }> = ({ weekdayData }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[i];
    const value = weekdayData[dayName] || 0;
    const maxValue = Math.max(...Object.values(weekdayData || {}).map(v => Number(v) || 0));
    const intensity = maxValue > 0 ? (value / maxValue) : 0;
    
    return {
      day: dayName.slice(0, 3).toUpperCase(),
      value,
      intensity
    };
  });

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg">
      <div className="flex items-center space-x-2 mb-4">
        <Calendar className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-gray-400">Weekly Pattern</span>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {days.map(({ day, value, intensity }) => (
          <div key={day} className="relative group">
            <div 
              className="h-8 rounded-md flex items-center justify-center"
              style={{
                backgroundColor: `rgba(96, 165, 250, ${intensity})`
              }}
            >
              <span className="text-[8px] text-white/70">{day}</span>
            </div>
            <div className="absolute hidden group-hover:block bg-gray-900 text-white p-2 rounded-md text-[10px] whitespace-nowrap z-10 -translate-y-full left-1/2 -translate-x-1/2">
              {`${(value || 0).toLocaleString()} visits`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MonthlyActivity: React.FC<{
  buildingData: any;
  locations: any[];
}> = ({ buildingData, locations = [] }) => {
  const yearlyData = useMemo(() => {
    if (!buildingData) return [];
    
    // Find the maximum foottraffic for this building's data points
    const maxFoottraffic = Math.max(
      ...locations
        .filter(loc => loc.id === buildingData.id)
        .map(loc => parseInt(loc.foottraffic) || 0)
    );

    // Create a map of yearly data
    const yearMap = new Map();
    
    // Only process locations for this building
    locations
      .filter(location => location.id === buildingData.id)
      .forEach(location => {
        const startDate = new Date(location.start_date);
        const endDate = new Date(location.end_date);
        const year = startDate.getFullYear();
        const month = startDate.getMonth();
        const value = parseInt(location.foottraffic) || 0;
        
        // Initialize year if it doesn't exist
        if (!yearMap.has(year)) {
          yearMap.set(year, Array(12).fill().map((_, i) => ({
            date: new Date(year, i, 1),
            value: 0,
            intensity: 0
          })));
        }
        
        // Update the month data
        const yearData = yearMap.get(year);
        yearData[month] = {
          date: startDate,
          endDate: endDate,
          value,
          intensity: value / maxFoottraffic
        };
      });

    console.log('Building data processing:', {
      buildingId: buildingData.id,
      maxFoottraffic,
      yearMap: Object.fromEntries(yearMap)
    });

    // Convert to array format, sorted by year
    return Array.from(yearMap.entries())
      .sort(([yearA], [yearB]) => yearB - yearA) // Sort descending
      .map(([year, months]) => ({
        year,
        months
      }));
  }, [buildingData, locations]);

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
      <div className="flex items-center space-x-2 mb-3">
        <Calendar className="w-3 h-3 text-blue-400" />
        <span className="text-xs text-gray-400">Monthly Activity</span>
      </div>

      <div className="space-y-2 pr-4">
        {/* Month labels */}
        <div className="grid grid-cols-[30px_repeat(12,minmax(16px,1fr))] gap-1">
          <div className="text-[10px] text-gray-400"></div>
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
            <div key={month} className="text-[10px] text-gray-400 text-center">
              {month}
            </div>
          ))}
        </div>

        {/* Year rows */}
        {yearlyData.map(({ year, months }) => (
          <div key={year} className="grid grid-cols-[30px_repeat(12,minmax(16px,1fr))] gap-1 items-center">
            <div className="text-[10px] text-gray-400 pr-2 text-right">{year}</div>
            {months.map((month) => (
              <div
                key={month.date.toISOString()}
                className="aspect-square relative group cursor-pointer"
                style={{ 
                  backgroundColor: month.value > 0 
                    ? `rgba(96, 165, 250, ${Math.max(0.2, month.intensity)})` 
                    : 'rgba(75, 85, 99, 0.2)',
                  minWidth: '16px',
                  minHeight: '16px',
                  border: month.value > 0 ? '1px solid rgba(96, 165, 250, 0.3)' : 'none'
                }}
              >
                {month.value > 0 && (
                  <div className="absolute hidden group-hover:block bg-gray-900 text-white p-1.5 rounded-md text-[10px] whitespace-nowrap z-10 -translate-y-full left-1/2 -translate-x-1/2">
                    {`${month.value.toLocaleString()} visits in ${month.date.toLocaleString('default', { month: 'long' })} ${month.date.getFullYear()}`}
                    <br />
                    {`${Math.round(month.intensity * 100)}% of peak traffic`}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

interface BuildingDataPoint {
  date: Date;
  value: number;
}

interface BuildingData {
  id: string;
  name: string;
  data: BuildingDataPoint[];
}

interface Tenant {
  name: string;
  sqft: number;
  color: string;
}

// Add this helper function at the top of the file
const generateBuildingMetrics = (buildingId: string) => {
  // Use buildingId as seed for pseudo-random but consistent values
  const seed = parseInt(buildingId.replace(/\D/g, '') || '0');
  
  const rand = (offset = 0) => {
    // Simple pseudo-random generator using the seed and offset
    const x = Math.sin(seed + offset) * 10000;
    return Math.floor((x - Math.floor(x)) * 100);
  };

  return {
    utilization: Math.max(20, Math.min(95, rand())), // Between 20-95%
    weeklyVisits: Math.floor(1000 + rand(1) * 30), // Between 1000-4000
  };
};

const Popup: React.FC<{ buildingData: any, locations: any[] }> = ({ buildingData, locations }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get rank using the same sorting logic as Admin component
  const rank = useMemo(() => {
    const sortedLocations = [...locations]
      .sort((a, b) => (b.foottraffic || 0) - (a.foottraffic || 0));
    return sortedLocations.findIndex(b => b.id === buildingData.id) + 1;
  }, [locations, buildingData.id]);

  // Parse weekday data
  const weekdayData = useMemo(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days.reduce((acc, day) => {
      acc[day] = buildingData[`visits_by_day_of_week_${day}`] || 0;
      return acc;
    }, {} as Record<string, number>);
  }, [buildingData]);

  return (
    <div className={`bg-gray-900/95 backdrop-blur rounded-lg w-[420px] ${isCollapsed ? 'h-auto' : ''}`}>
      {/* Header section */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <Building2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg text-white font-medium">{buildingData.name}</h2>
        </div>
        <div className="flex items-center space-x-4">
          {/* Only show rank if it's valid */}
          {rank > 0 && (
            <span className="text-blue-400 font-medium">
              #{rank}
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-300"
          >
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Content section */}
      {!isCollapsed && (
        <div className="p-6 space-y-6">
          {/* Calendar View */}
          <CalendarView weekdayData={weekdayData} />

          {/* Building Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Foot Traffic</span>
              </div>
              <div className="text-xl text-white font-medium">
                {buildingData.foottraffic?.toLocaleString() || '0'}
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">Visit Duration</span>
              </div>
              <div className="text-xl text-white font-medium">
                {buildingData.visit_duration?.replace(/_/g, ' ') || 'N/A'}
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">Location</span>
            </div>
            <div className="text-white">
              {buildingData.address || 'N/A'}
            </div>
          </div>

          {/* Traffic Graph */}
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">Weekly Traffic</span>
            </div>
            <WeeklyTrafficGraph data={weekdayData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Popup;
