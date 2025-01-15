import React, { useReducer, useMemo, useState } from 'react';
import { Building2, Users, Clock, MapPin, BarChart3, Calendar, ChevronLeft, ChevronRight, TrendingUp, CalendarDays } from 'lucide-react';
import WeeklyTrafficGraph from './WeeklyTrafficGraph';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ResponsiveLine } from '@nivo/line';

interface PopupProps {
  buildingData: any;
  locations: any[];
  rankings: any;
  totalBuildings: number;
  onBuildingNameClick: (name: string) => void;
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

const CalendarView: React.FC<{
  weekdayData: Record<string, number>;
}> = ({ weekdayData }) => {
  const initialState: CalendarState = {
    selectedMonth: new Date().getMonth(),
    daysInMonth: new Date(2024, new Date().getMonth() + 1, 0).getDate(),
    firstDayOfMonth: new Date(2024, new Date().getMonth(), 1).getDay(),
    days: []
  };

  const [state, dispatch] = useReducer(calendarReducer, initialState);

  // Initial calculation and recalculation when weekdayData changes
  React.useEffect(() => {
    dispatch({ type: 'RECALCULATE', payload: { weekdayData } });
  }, [weekdayData]);

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(event.target.value);
    dispatch({ type: 'SET_MONTH', payload: newMonth });
    dispatch({ type: 'RECALCULATE', payload: { weekdayData } });
  };

  // Add this state at the top of CalendarView component
  const [selectedView, setSelectedView] = useState<'visitors' | 'employees'>('visitors');

  return (
    <div className="bg-gray-800/50 p-2 rounded-lg mb-6">
      {/* View Toggle Buttons with increased bottom margin */}
      <div className="flex space-x-2 mb-8">
        <button
          onClick={() => setSelectedView('visitors')}
          className={`text-xs px-3 py-1 rounded-md transition-colors ${
            selectedView === 'visitors'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Visitors
        </button>
        <button
          onClick={() => setSelectedView('employees')}
          className={`text-xs px-3 py-1 rounded-md transition-colors ${
            selectedView === 'employees'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Employees
        </button>
      </div>

      {/* Header and Month Selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Visit Pattern</span>
          </div>
          
          <select 
            value={state.selectedMonth}
            onChange={handleMonthChange}
            aria-label="Select month"
            className="bg-gray-700 text-gray-300 text-sm rounded-md px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            {[
              'January', 'February', 'March', 'April',
              'May', 'June', 'July', 'August',
              'September', 'October', 'November', 'December'
            ].map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-xs text-gray-400 text-center py-1">
            {day}
          </div>
        ))}
        
        {Array.from({ length: state.firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {state.days.map(({ day, value, intensity }) => (
          <div
            key={`${state.selectedMonth}-${day}`}
            className="aspect-square relative group"
            style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[8px] text-white/70">{day}</span>
            </div>
            <div className="absolute hidden group-hover:block bg-gray-900 text-white p-2 rounded-md text-[10px] whitespace-nowrap z-10 -translate-y-full left-1/2 -translate-x-1/2">
              {`${value.toLocaleString()} visits`}
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
          yearMap.set(year, Array(12).fill(0).map((_, i) => ({
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
            {months.map((month: MonthData) => (
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

// Add these constants near the top of the file
const TIME_BLOCKS = [
  '12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a',
  '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p'
];

interface HourlyData {
  [key: string]: number; // e.g. "visits_by_hour_of_day_13:00_14:00": 123
}

interface HourlyMovementChartProps {
  buildingData: any;
}

const HourlyMovementChart: React.FC<{ buildingData: any }> = ({ buildingData }) => {
  const chartData = useMemo(() => {
    const hourlyData = buildingData.rankings?.statistics?.hourlyDistribution;
    if (!hourlyData) return [];

    const data = Object.entries(hourlyData)
      .map(([key, value]) => {
        const startTime = key.match(/(\d{2}):00_\d{2}:00/)?.[1];
        const hour = startTime ? parseInt(startTime, 10) : 0;
        return {
          hour,
          visits: Number(value)
        };
      })
      .sort((a, b) => a.hour - b.hour);

    return data;
  }, [buildingData]);

  const formatHour = (hour: number) => {
    const h = hour % 24;
    if (h === 0) return '12a';
    if (h === 12) return '12p';
    return h > 12 ? `${h-12}p` : `${h}a`;
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl mb-8">
      <h2 className="text-xl font-bold mb-2 text-white">Hourly Movement Patterns</h2>
      <p className="text-sm text-gray-400 mb-6">
        *Showing business hours (9a-6p) and after-hours activity patterns
      </p>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis 
              dataKey="hour"
              stroke="#9CA3AF"
              tickFormatter={formatHour}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
              tick={{ 
                fontSize: 9,
                fill: '#9CA3AF',
                dy: 10
              }}
              axisLine={{ stroke: '#374151' }}
              minTickGap={15}
              height={40}
            />
            <YAxis
              stroke="#9CA3AF"
              tickFormatter={(value) => `${value}`}
              tick={{ 
                fontSize: 9,
                fill: '#9CA3AF',
                dx: -5
              }}
              width={25}
              axisLine={{ stroke: '#374151' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                borderColor: '#374151',
                borderRadius: '0.375rem',
                padding: '8px 12px'
              }}
              formatter={(value: number) => [`${value.toLocaleString()} visits`, 'Visits']}
              labelFormatter={formatHour}
            />
            <Line
              type="monotone"
              dataKey="visits"
              stroke="#60A5FA"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: '#60A5FA' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Add near the top with other interfaces
interface MonthData {
  date: Date;
  endDate?: Date;
  value: number;
  intensity: number;
}

const Popup: React.FC<PopupProps> = ({ 
  buildingData, 
  locations, 
  rankings, 
  totalBuildings,
  onBuildingNameClick 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!buildingData) return null;

  // Create weekly traffic data for the building
  const weeklyTrafficData = useMemo(() => {
    const weekData: BuildingDataPoint[] = [];
    const baseDate = new Date();
    const dayVisits: { [key: number]: number } = {
      0: parseFloat(buildingData.visits_by_day_of_week_sunday || '0'),
      1: parseFloat(buildingData.visits_by_day_of_week_monday || '0'),
      2: parseFloat(buildingData.visits_by_day_of_week_tuesday || '0'),
      3: parseFloat(buildingData.visits_by_day_of_week_wednesday || '0'),
      4: parseFloat(buildingData.visits_by_day_of_week_thursday || '0'),
      5: parseFloat(buildingData.visits_by_day_of_week_friday || '0'),
      6: parseFloat(buildingData.visits_by_day_of_week_saturday || '0'),
    };

    // Calculate daily traffic based on total monthly traffic
    const monthlyTraffic = parseInt(buildingData.foottraffic || '0');
    const avgDailyTraffic = monthlyTraffic / 30; // approximate days in month

    // Create data points for each day of the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() - baseDate.getDay() + i);
      weekData.push({
        date,
        value: Math.round(avgDailyTraffic * (dayVisits[i] / 100))
      });
    }

    return [{
      id: buildingData.id || '1',
      name: buildingData.name,
      data: weekData
    }];
  }, [buildingData]);

  // Memoize weekday data
  const weekdayData = useMemo(() => ({
    sunday: parseFloat(buildingData.visits_by_day_of_week_sunday || '0'),
    monday: parseFloat(buildingData.visits_by_day_of_week_monday || '0'),
    tuesday: parseFloat(buildingData.visits_by_day_of_week_tuesday || '0'),
    wednesday: parseFloat(buildingData.visits_by_day_of_week_wednesday || '0'),
    thursday: parseFloat(buildingData.visits_by_day_of_week_thursday || '0'),
    friday: parseFloat(buildingData.visits_by_day_of_week_friday || '0'),
    saturday: parseFloat(buildingData.visits_by_day_of_week_saturday || '0')
  }), [buildingData]);

  // Generate metrics based on building ID
  const metrics = generateBuildingMetrics(buildingData.id);

  // Split the metrics into main and secondary metrics
  const mainMetric = {
    label: 'Utilization Score',
    value: `${metrics.utilization}%`,
    icon: Building2,
    color: 'text-blue-400'
  };

  const secondaryMetrics = [
    {
      label: 'Monthly Visits',
      value: buildingData.foottraffic ? parseInt(buildingData.foottraffic).toLocaleString() : 'N/A',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      label: 'Avg Duration',
      value: buildingData.visit_duration ? 
        buildingData.visit_duration === '10_min_or_longer' ? '> 10 Minutes' : `${buildingData.visit_duration} min` 
        : 'N/A',
      icon: Clock,
      color: 'text-green-500'
    }
  ];

  // Add full object logging
  console.log('Full building data:', JSON.stringify(buildingData, null, 2));

  // Add calendar data processing
  console.log('Raw weekday values:', {
    monday: buildingData.visits_by_day_of_week_monday,
    tuesday: buildingData.visits_by_day_of_week_tuesday,
    wednesday: buildingData.visits_by_day_of_week_wednesday,
    thursday: buildingData.visits_by_day_of_week_thursday,
    friday: buildingData.visits_by_day_of_week_friday,
    saturday: buildingData.visits_by_day_of_week_saturday,
    sunday: buildingData.visits_by_day_of_week_sunday
  });
  console.log('Parsed weekday data:', weekdayData);

  // Add this interface near the top with other interfaces
  const tenants: Tenant[] = [
    { name: 'Audacy', sqft: 25000, color: 'bg-blue-500' },
    { name: 'Google', sqft: 35000, color: 'bg-blue-400' },
    { name: 'Kirkland & Ellis', sqft: 20000, color: 'bg-blue-300' },
    { name: 'Lerer Hippeau', sqft: 15000, color: 'bg-blue-200' },
    { name: 'Salesforce', sqft: 30000, color: 'bg-blue-100' },
  ];

  // Calculate total sqft
  const totalSqft = tenants.reduce((sum, tenant) => sum + tenant.sqft, 0);

  return (
    <div className="fixed left-6 top-6 w-[400px] max-h-[95vh] overflow-y-auto bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-700 shadow-lg z-[9999]">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <Building2 className="w-6 h-6 text-blue-400" />
          <div>
            <h3 
              className="text-lg font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
              onClick={() => onBuildingNameClick(buildingData.name)}
            >
              {buildingData.name}
            </h3>
            {buildingData.address && (
              <p className="text-sm text-gray-400 flex items-center mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {buildingData.address}
              </p>
            )}
          </div>
        </div>

        {/* Rankings Section */}
        {rankings && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Overall Ranking</span>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-white">
                <span>{rankings.overall}</span>
                <span className="opacity-60">/{totalBuildings}</span>
              </div>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Market Ranking</span>
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-white">
                <span>{rankings.market.position}</span>
                <span className="opacity-60">/{rankings.market.total}</span>
              </div>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Peak <br /> Day</span>
                <CalendarDays className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-white">{rankings.peakDay}</div>
            </div>
          </div>
        )}

        {/* Top metrics row - side by side cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Utilization Score Card */}
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <mainMetric.icon className={`w-4 h-4 ${mainMetric.color}`} />
              <span className="text-sm text-gray-400">{mainMetric.label}</span>
            </div>
            <div className="text-xl font-bold text-white">{mainMetric.value}</div>
          </div>

          {/* Weekly Visits Card */}
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">Weekly Visits</span>
            </div>
            <div className="text-xl font-bold text-white">
              {metrics.weeklyVisits.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tenant Mix Card */}
        <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Tenant Mix</span>
          </div>
          
          {/* Tenant Distribution Bar */}
          <div className="space-y-6">
            <div className="h-3 w-full flex rounded-full overflow-hidden">
              {tenants.map((tenant, index) => (
                <div
                  key={tenant.name}
                  className={`${tenant.color} hover:opacity-80 transition-opacity relative group`}
                  style={{ width: `${(tenant.sqft / totalSqft) * 100}%` }}
                >
                  {/* Tooltip */}
                  <div className="absolute hidden group-hover:block bg-gray-900 text-white p-1.5 rounded-md text-[10px] whitespace-nowrap z-10 -translate-y-full left-1/2 -translate-x-1/2 bottom-full mb-1">
                    {`${tenant.name}: ${tenant.sqft.toLocaleString()} sqft`}
                    <br />
                    {`${Math.round((tenant.sqft / totalSqft) * 100)}% of total space`}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Legend with increased top spacing */}
            <div className="grid grid-cols-2 gap-2">
              {tenants.map((tenant) => (
                <div key={tenant.name} className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${tenant.color}`}></div>
                  <span className="text-xs text-gray-400">{tenant.name}</span>
                  <span className="text-xs text-gray-500">
                    ({Math.round((tenant.sqft / totalSqft) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {secondaryMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="bg-gray-800/50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-sm text-gray-400">{metric.label}</span>
                </div>
                <div className="text-xl font-bold text-white">{metric.value}</div>
              </div>
            );
          })}
        </div>

        {/* Add Monthly Activity before Visit Pattern */}
        <MonthlyActivity 
          buildingData={buildingData} 
          locations={locations}
        />

        {/* Weekly Traffic Pattern Section */}
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Weekly Traffic Pattern</span>
          </div>
          
          {/* Graph container with fixed height and positioning */}
          <div className="h-[300px] w-full flex items-center justify-center mb-6 -ml-6">
            <WeeklyTrafficGraph 
              data={weeklyTrafficData}
              selectedBuildingId={buildingData.id || null}
              hoveredBuilding={null}
              onHoverBuilding={() => {}}
            />
          </div>

          {/* Clear separation after graph */}
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-400">Visit Distribution</span>
            </div>
            
            {/* Stats */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-white">
                <span className="text-sm text-gray-400">Weekday Peak</span>
                <span className="text-sm font-medium">12pm - 2pm</span>
              </div>
              <div className="flex justify-between items-center text-white">
                <span className="text-sm text-gray-400">Weekend Peak</span>
                <span className="text-sm font-medium">2pm - 4pm</span>
              </div>
              <div className="flex justify-between items-center text-white">
                <span className="text-sm text-gray-400">Avg Weekly Visits</span>
                <span className="text-sm font-medium">2,345</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <CalendarView weekdayData={weekdayData} />
        </div>

        {/* Add the Hourly Movement Chart at the bottom */}
        <HourlyMovementChart buildingData={buildingData} />
      </div>
    </div>
  );
};

export default Popup;