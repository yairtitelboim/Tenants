import React, { useMemo } from 'react';
import { Building2, Users, Clock, MapPin, BarChart3, Calendar } from 'lucide-react';
import { buildingColors, getBuildingColorIndex, getSelectedBuildingColor } from '../utils/buildingColors';

interface PopupProps {
  buildingData: {
    name: string;
    foottraffic?: string;
    visit_duration?: string;
    address?: string;
    visits_by_day_of_week_monday?: string;
    visits_by_day_of_week_tuesday?: string;
    visits_by_day_of_week_wednesday?: string;
    visits_by_day_of_week_thursday?: string;
    visits_by_day_of_week_friday?: string;
    visits_by_day_of_week_saturday?: string;
    visits_by_day_of_week_sunday?: string;
    start_date?: string;
    end_date?: string;
  } | null;
}

const Popup: React.FC<PopupProps> = ({ buildingData }) => {
  if (!buildingData) return null;

  // Calculate daily totals for the calendar view
  const { monthData, mostActiveMonth } = useMemo(() => {
    console.log('Calculating calendar data for:', buildingData.name);
    
    const dailyTotals: { [date: string]: number } = {};
    const monthTotals: { [month: string]: number } = {};
    
    // Initialize all days of 2024 with 0
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(2024, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `2024-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        dailyTotals[dateStr] = 0;
      }
    }
    
    if (buildingData.start_date && buildingData.end_date && buildingData.foottraffic) {
      const startDate = new Date(buildingData.start_date);
      const endDate = new Date(buildingData.end_date);
      const totalTraffic = parseInt(buildingData.foottraffic);
      
      // Get day percentages and normalize them
      const dayPercentages = {
        'Monday': Math.min(100, parseFloat(buildingData.visits_by_day_of_week_monday?.toString() || '0')),
        'Tuesday': Math.min(100, parseFloat(buildingData.visits_by_day_of_week_tuesday?.toString() || '0')),
        'Wednesday': Math.min(100, parseFloat(buildingData.visits_by_day_of_week_wednesday?.toString() || '0')),
        'Thursday': Math.min(100, parseFloat(buildingData.visits_by_day_of_week_thursday?.toString() || '0')),
        'Friday': Math.min(100, parseFloat(buildingData.visits_by_day_of_week_friday?.toString() || '0')),
        'Saturday': Math.min(100, parseFloat(buildingData.visits_by_day_of_week_saturday?.toString() || '0')),
        'Sunday': Math.min(100, parseFloat(buildingData.visits_by_day_of_week_sunday?.toString() || '0'))
      };

      console.log('Total traffic:', totalTraffic);
      console.log('Day percentages:', dayPercentages);

      // Calculate daily traffic with normalized percentages
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }) as keyof typeof dayPercentages;
        const monthStr = currentDate.toISOString().slice(0, 7);

        if (dailyTotals[dateStr] !== undefined) {
          const dayPercentage = dayPercentages[dayName];
          const dayTraffic = (totalTraffic * dayPercentage) / 100;
          dailyTotals[dateStr] = Math.round(dayTraffic);
          monthTotals[monthStr] = (monthTotals[monthStr] || 0) + Math.round(dayTraffic);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Find the most active month
    let maxTotal = 0;
    let maxMonth = '2024-01';
    Object.entries(monthTotals).forEach(([month, total]) => {
      if (total > maxTotal) {
        maxTotal = total;
        maxMonth = month;
      }
    });

    return { monthData: dailyTotals, mostActiveMonth: maxMonth };
  }, [buildingData]);

  const getColor = (value: number) => {
    if (value === 0) return '#1F2937';
    
    // Get the maximum value for the current month being displayed
    const currentMonthValues = Object.entries(monthData)
      .filter(([date]) => date.startsWith(mostActiveMonth))
      .map(([_, value]) => value);
    
    const maxValue = Math.max(...currentMonthValues, 1);
    const intensity = Math.pow(value / maxValue, 0.5); // Square root for better distribution
    
    // Use a more dramatic color scale
    const baseColor = [96, 165, 250]; // rgb(96, 165, 250) - #60A5FA
    const minColor = [31, 41, 55];    // rgb(31, 41, 55)  - #1F2937
    
    const r = Math.round(minColor[0] + (baseColor[0] - minColor[0]) * intensity);
    const g = Math.round(minColor[1] + (baseColor[1] - minColor[1]) * intensity);
    const b = Math.round(minColor[2] + (baseColor[2] - minColor[2]) * intensity);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Calendar view for the most active month
  const renderCalendar = () => {
    if (!mostActiveMonth) return null;

    const [year, month] = mostActiveMonth.split('-');
    const currentDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const firstDayOfMonth = currentDate.getDay();

    return (
      <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-gray-400">Peak Activity Month: {monthName}</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-[10px] text-center text-gray-500">{day}</div>
          ))}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = (i + 1).toString().padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const value = monthData[dateStr] || 0;

            return (
              <div
                key={dateStr}
                className="aspect-square relative group cursor-pointer transition-colors duration-200"
                style={{ backgroundColor: getColor(value) }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-white/70">{i + 1}</span>
                </div>
                <div className="absolute hidden group-hover:block bg-gray-900 text-white p-2 rounded-md text-[10px] whitespace-nowrap z-10 -translate-y-full left-1/2 -translate-x-1/2">
                  {`${monthName} ${i + 1}: ${value.toLocaleString()} visits`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const metrics = [
    {
      label: 'Total Visits',
      value: buildingData.foottraffic ? parseInt(buildingData.foottraffic).toLocaleString() : 'N/A',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      label: 'Avg Duration',
      value: buildingData.visit_duration ? `${buildingData.visit_duration} min` : 'N/A',
      icon: Clock,
      color: 'text-green-500'
    }
  ];

  return (
    <div className="fixed left-8 top-24 w-96 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 p-6 text-white z-[1000] animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <Building2 className="w-6 h-6 text-blue-400" />
        <div>
          <h3 className="text-lg font-semibold text-blue-400">{buildingData.name}</h3>
          {buildingData.address && (
            <p className="text-sm text-gray-400 flex items-center mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {buildingData.address}
            </p>
          )}
        </div>
      </div>

      {/* Calendar View */}
      {renderCalendar()}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Icon className={`w-4 h-4 ${metric.color}`} />
                <span className="text-sm text-gray-400">{metric.label}</span>
              </div>
              <div className="text-xl font-bold">{metric.value}</div>
            </div>
          );
        })}
      </div>

      {/* Stats Section */}
      <div className="bg-gray-800/50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-400">Visit Distribution</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Weekday Peak</span>
            <span className="text-sm font-medium">12pm - 2pm</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Weekend Peak</span>
            <span className="text-sm font-medium">2pm - 4pm</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Avg Weekly Visits</span>
            <span className="text-sm font-medium">2,345</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup; 