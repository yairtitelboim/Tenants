import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Calendar, Filter, Activity, Users, BarChart2, Building2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import rawJsonData from './data/Tue_03.json';

// Assert the type of the imported data
const rawData: RawDataEntry[] = rawJsonData as RawDataEntry[];

interface RawDataEntry {
  tenant: string;
  PropertyName: string;
  event_date: string;
  month_year: string;
  hour_of_day: number;
  time_block: string;
  reader_category: string;
  access_category: string;
  business_hours: string;
  day_of_week: string;
  total_events: number;
  unique_credentials: number;
  business_hours_events: number;
  weekend_events: number;
  historical_events: number;
}

interface FilterState {
  dateRange: [Date, Date];
  areas: string[];
  showWeekend: boolean;
  compareMode: 'historical' | 'tenants' | 'none';
}

interface MovementMetric {
  type: string;
  value: number;
}

interface TimeBlockData {
  timeBlock: string;
  Audacy: number;
  Google: number;
  'Kirkland & Ellis': number;
  'Lerer Hippeau': number;
  Salesforce: number;
}

// Add this new interface for the line chart data
interface HourlyMovementData {
  timeBlock: string;
  current: number;
  historical?: number;
  [key: string]: number | string | undefined;
}

// Update the tenant name mapping
const TENANT_NAME_MAP: Record<string, string> = {
  'GOOGLE': 'Google',
  'Google': 'Google',
  'Audacy': 'Audacy',
  'AUDACY': 'Audacy',
  'Kirkland & Ellis': 'Kirkland & Ellis',
  'Kirkland and Ellis': 'Kirkland & Ellis',
  'KIRKLAND': 'Kirkland & Ellis',
  'Kirkland and ellis': 'Kirkland & Ellis',
  'Lerer Hippeau': 'Lerer Hippeau',
  'Lerer hippeau': 'Lerer Hippeau',
  'LererHippeau': 'Lerer Hippeau',
  'Lerer': 'Lerer Hippeau',
  'LERER': 'Lerer Hippeau',
  'LERER HIPPEAU': 'Lerer Hippeau',
  'Salesforce': 'Salesforce',
  'SalesForce': 'Salesforce',
  'SALESFORCE': 'Salesforce',
  'salesforce': 'Salesforce'
};

const normalizeTenantName = (tenant: string): string => {
  const normalized = TENANT_NAME_MAP[tenant] || tenant;
  return normalized.trim(); // Ensure no whitespace issues
};

// Add tenant colors map
const TENANT_COLORS = {
  'Audacy': '#60A5FA',      // Blue
  'Google': '#34D399',      // Green
  'Kirkland & Ellis': '#818CF8', // Indigo
  'Lerer Hippeau': '#F472B6',    // Pink
  'Salesforce': '#FBBF24'   // Yellow
};

// Update time blocks to hourly intervals
const TIME_BLOCKS = [
  '12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a',
  '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p'
];

// Helper function to parse month_year string into Date
const parseMonthYear = (monthYear: string): Date => {
  try {
    const [month, year] = monthYear.split(' ');
    const monthIndex = new Date(Date.parse(month + " 1, 2000")).getMonth();
    return new Date(parseInt(year), monthIndex, 1);
  } catch (error) {
    console.error('Error parsing month_year:', monthYear, error);
    return new Date(); // Return current date as fallback
  }
};

// Helper function to convert Date to YYYY-MM format
const getYearMonth = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Helper function to convert month_year to YYYY-MM format
const formatMonthYear = (monthYear: string): string => {
  const months: { [key: string]: string } = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };
  
  const [month, year] = monthYear.split(' ');
  return `${year}-${months[month]}`;
};

// Add a debug flag to control logging
const DEBUG_MODE = false;

// Helper function for controlled logging
const debugLog = (message: string, data: any) => {
  if (DEBUG_MODE) {
    console.log(`[DEBUG] ${message}:`, data);
  }
};

// Add a debug function to show exact date comparisons
const debugDateComparison = (eventDate: string, startDate: Date, endDate: Date) => {
  const date = new Date(eventDate);
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
  
  return {
    eventDate: date.toISOString().split('T')[0],
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    isInRange: date >= start && date <= end
  };
};

// Update isWithinRange to handle the data mapping
const isWithinRange = (eventDate: string, startDate: Date, endDate: Date): boolean => {
  try {
    const [year, month, day] = eventDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Map the selected date to November 2024 (where we have data)
    const selectedMonth = startDate.getMonth();
    const mappedStart = new Date(2024, 10, 1); // Always November 2024
    const mappedEnd = new Date(2024, 10 + 1, 0);
    
    // For debugging
    if (Math.random() < 0.001) {
      console.log('Date mapping:', {
        original: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        mapped: {
          start: mappedStart.toISOString().split('T')[0],
          end: mappedEnd.toISOString().split('T')[0]
        },
        eventDate: date.toISOString().split('T')[0]
      });
    }
    
    return date >= mappedStart && date <= mappedEnd;
  } catch (error) {
    console.error('Date comparison error:', { eventDate, error });
    return false;
  }
};

// Update the getDateRange function to handle the data range properly
const getDateRange = (data: RawDataEntry[]) => {
  const dates = data.map(d => new Date(d.event_date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  
  // Set to first and last day of the respective months
  return [
    new Date(minDate.getFullYear(), minDate.getMonth(), 1),
    new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
  ];
};

interface MetricCardProps {
  title: string;
  value: number;
  trend?: number;
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, icon }) => (
  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
    <div className="flex items-center justify-between">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      {icon && <div className="text-gray-400">{icon}</div>}
    </div>
    <div className="mt-2 flex items-baseline">
      <p className="text-2xl font-semibold text-white">
        {value.toLocaleString()}
      </p>
      {trend !== undefined && (
        <span className={`ml-2 text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  </div>
);

const TenantDashboard = ({ onBack }: { onBack: () => void }) => {
  // Enhanced state management
  const [selectedTenant, setSelectedTenant] = useState<string>("All Tenants");
  const [filters, setFilters] = useState<FilterState>(() => {
    // Set initial date to November 2024 to match the data
    const startOfMonth = new Date(2024, 10, 1);  // Month is 0-based, so 10 = November
    const endOfMonth = new Date(2024, 10 + 1, 0); // Last day of November
    
    return {
      dateRange: [startOfMonth, endOfMonth],
      areas: [],
      showWeekend: true,
      compareMode: 'historical'
    };
  });
  const [visibleTenants, setVisibleTenants] = useState<Set<string>>(new Set(['Audacy', 'Salesforce']));

  // Update the tenants derivation
  const tenants = useMemo(() => {
    // Create a Set of normalized tenant names
    const uniqueTenantsSet = new Set<string>();
    
    // Process each tenant name and add to Set
    rawData.forEach(d => {
      const normalizedName = normalizeTenantName(d.tenant);
      if (normalizedName) {
        uniqueTenantsSet.add(normalizedName);
      }
    });

    // Convert Set to sorted array
    const uniqueTenants = Array.from(uniqueTenantsSet).sort();
    
    // console.log('Unique tenants:', uniqueTenants); // Remove debug log
    
    return ["All Tenants", ...uniqueTenants];
  }, []);

  const accessCategories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(rawData.map((d: RawDataEntry) => d.access_category)));
    return ["All Categories", ...uniqueCategories];
  }, []);

  // Process movement type data
  const movementTypeData = useMemo<MovementMetric[]>(() => {
    const filteredData = rawData.filter(d => {
      const matchesTenant = selectedTenant === "All Tenants" || 
                           normalizeTenantName(d.tenant) === selectedTenant;
      const eventDate = new Date(d.event_date);
      const startDate = new Date(filters.dateRange[0]);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(filters.dateRange[1]);
      endDate.setHours(23, 59, 59, 999);
      
      const withinDateRange = eventDate >= startDate && eventDate <= endDate;
      return matchesTenant && withinDateRange;
    });

    // Adjust the aggregation logic to use available fields
    const aggregated = filteredData.reduce((acc: Record<string, number>, curr) => {
      const type = curr.reader_category; // Example: use reader_category instead
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type] += curr.total_events;
      return acc;
    }, {});

    return Object.entries(aggregated).map(([type, value]) => ({
      type,
      value
    }));
  }, [selectedTenant, filters.dateRange]);

  // Update hourlyMovementData with better date handling
  const hourlyMovementData = useMemo(() => {
    const startDate = filters.dateRange[0];
    const endDate = filters.dateRange[1];
    
    // Filter data for the selected date range
    const filteredData = rawData.filter(d => {
      const comparison = debugDateComparison(d.event_date, startDate, endDate);
      if (Math.random() < 0.001) { // Log only 0.1% of comparisons to avoid spam
        console.log('Date Check:', comparison);
      }
      return comparison.isInRange;
    });

    console.log('Date Filter:', {
      range: [
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ],
      filtered: filteredData.length,
      total: rawData.length,
      sample: filteredData.slice(0, 3).map(d => ({
        date: d.event_date,
        hour: d.hour_of_day,
        events: d.total_events
      }))
    });

    // Process into hourly buckets
    const hourBuckets = TIME_BLOCKS.map((timeBlock, hour) => ({
      timeBlock,
      hour: hour
    }));

    if (selectedTenant === "All Tenants") {
      return hourBuckets.map(({ hour, timeBlock }) => {
        const data: { [key: string]: any } = { timeBlock };
        
        tenants.forEach(tenant => {
          if (tenant !== "All Tenants") {
            const tenantEvents = filteredData.filter(d => 
              normalizeTenantName(d.tenant) === tenant && 
              d.hour_of_day === hour
            );
            
            const totalEvents = tenantEvents.reduce((sum, d) => sum + d.total_events, 0);
            data[tenant] = totalEvents;
          }
        });
        
        return data;
      });
    } else {
      return hourBuckets.map(({ hour, timeBlock }) => {
        const tenantEvents = filteredData.filter(d => 
          normalizeTenantName(d.tenant) === selectedTenant && 
          d.hour_of_day === hour
        );

        return {
          timeBlock,
          current: tenantEvents.reduce((sum, d) => sum + d.total_events, 0),
          historical: tenantEvents.reduce((sum, d) => sum + d.historical_events, 0)
        };
      });
    }
  }, [selectedTenant, tenants, rawData, filters.dateRange]);

  // Remove the debug useEffect
  // useEffect(() => {
  //   if (DEBUG_MODE) {
  //     debugLog('Date range changed', {
  //       start: getYearMonth(filters.dateRange[0]),
  //       end: getYearMonth(filters.dateRange[1]),
  //       filteredCount: rawData.filter(d => 
  //         isWithinRange(d.month_year, filters.dateRange[0], filters.dateRange[1])
  //       ).length
  //     });
  //   }
  // }, [filters.dateRange]);

  // Remove debugging useEffect
  // useEffect(() => {
  //   console.log('Date format check:', {
  //     sampleDates: rawData.slice(0, 3).map(d => ({
  //       event_date: d.event_date,
  //       parsed: new Date(d.event_date)
  //     })),
  //     filterDates: {
  //       start: filters.dateRange[0],
  //       end: filters.dateRange[1]
  //     }
  //   });
  // }, [rawData, filters.dateRange]);

  // Remove more detailed debug logging
  // useEffect(() => {
  //   console.log('Date Range Changed:', {
  //     start: filters.dateRange[0],
  //     end: filters.dateRange[1],
  //     startFormatted: filters.dateRange[0].toISOString(),
  //     endFormatted: filters.dateRange[1].toISOString(),
  //     sampleData: hourlyMovementData.slice(8, 12), // Log 8am-12pm data
  //     totalDataPoints: rawData.length,
  //     filteredDataPoints: rawData.filter(d => {
  //       const date = new Date(d.event_date);
  //       return date >= filters.dateRange[0] && date <= filters.dateRange[1];
  //     }).length
  //   });
  // }, [filters.dateRange, hourlyMovementData, rawData]);

  // Remove data validation logging
  // const validateData = (data: any[]) => {
  //   console.log('Processed data sample:', data.slice(7, 10)); // Show 7am-9am data
    
  //   let maxValue = 0;
  //   data.forEach(point => {
  //     Object.entries(point).forEach(([key, value]) => {
  //       if (key !== 'timeBlock' && typeof value === 'number') {
  //         maxValue = Math.max(maxValue, value);
  //       }
  //     });
  //   });
    
  //   console.log('Maximum value in dataset:', maxValue);
    
  //   return data;
  // };

  // Use the validation in the chart data
  const chartData = useMemo(() => hourlyMovementData, [hourlyMovementData]);
  const yAxisConfig = useMemo(() => {
    const uniqueTicks = Array.from(new Set(chartData.flatMap(data => Object.values(data).filter(value => typeof value === 'number'))));
    uniqueTicks.sort((a, b) => a - b); // Sort the ticks for better display

    return {
      max: Math.max(...uniqueTicks),
      ticks: uniqueTicks
    };
  }, [chartData]);

  // Calculate movement type percentages
  const movementPercentages = useMemo(() => {
    const total = movementTypeData.reduce((sum, d) => sum + d.value, 0);
    return {
      quickMovement: (movementTypeData.find(d => d.type === 'Quick Movement')?.value || 0) / total * 100,
      normalTransit: (movementTypeData.find(d => d.type === 'Normal Transit')?.value || 0) / total * 100,
      activityBreak: (movementTypeData.find(d => d.type === 'Activity Break')?.value || 0) / total * 100,
      newSession: (movementTypeData.find(d => d.type === 'New Session')?.value || 0) / total * 100,
    };
  }, [movementTypeData]);

  // Custom tooltip component to ensure normalized names
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const normalizedName = normalizeTenantName(entry.name);
            return (
              <p key={index} className="text-gray-300">
                {`${normalizedName} : ${entry.value}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Now let's fix the Total Events card calculation
  const totalEventsMetric = useMemo(() => {
    const relevantData = rawData.filter(d => 
      selectedTenant === "All Tenants" || 
      normalizeTenantName(d.tenant) === selectedTenant
    );
    
    const total = relevantData.reduce((sum, d) => sum + d.total_events, 0);
    
    // console.log('Total Events Calculation:', {
    //   tenant: selectedTenant,
    //   eventCount: relevantData.length,
    //   total
    // });
    
    return total;
  }, [selectedTenant, rawData]);

  // Add this object for the date picker styles
  const datePickerStyles = {
    input: {
      backgroundColor: '#1F2937',
      color: '#F3F4F6',
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      border: '1px solid #374151',
      cursor: 'pointer',
    },
    calendarContainer: {
      backgroundColor: '#1F2937',
      border: '1px solid #374151',
    }
  };

  // Update the metrics calculation to include tenant filtering
  const wolfPointMetrics = useMemo(() => {
    const wolfPointData = rawData.filter(d => {
      const matchesTenant = selectedTenant === "All Tenants" || 
                           normalizeTenantName(d.tenant) === selectedTenant;
      return d.PropertyName === "Wolf Point South" && matchesTenant;
    });
    
    return {
      totalEvents: wolfPointData.reduce((sum, d) => sum + d.total_events, 0),
      uniqueCredentials: wolfPointData.reduce((sum, d) => sum + d.unique_credentials, 0),
      businessHoursEvents: wolfPointData.reduce((sum, d) => sum + d.business_hours_events, 0),
      propertyName: wolfPointData[0]?.PropertyName || "Wolf Point South"
    };
  }, [rawData, selectedTenant]);

  // Add these constants near the top with other constants
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Update the weekly movement data calculation
  const weeklyMovementData = useMemo(() => {
    const startDate = filters.dateRange[0];
    const endDate = filters.dateRange[1];
    
    // Get list of tenants (excluding "All Tenants")
    const tenantList = tenants.filter(t => t !== "All Tenants");
    
    // Filter and aggregate data by weekday and tenant
    const weekdayData = rawData.filter(d => {
      const date = new Date(d.event_date);
      return date >= startDate && date <= endDate;
    }).reduce((acc, curr) => {
      const date = new Date(curr.event_date);
      const weekday = date.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Skip weekends
      if (weekday === 0 || weekday === 6) return acc;
      
      // Adjust to Mon-Fri (0-4)
      const adjustedDay = weekday - 1;
      const normalizedTenant = normalizeTenantName(curr.tenant);
      
      if (!acc[adjustedDay]) {
        acc[adjustedDay] = {
          day: WEEKDAYS[adjustedDay],
          // Initialize each tenant's count
          ...Object.fromEntries(tenantList.map(tenant => [tenant, 0]))
        };
      }
      
      if (tenantList.includes(normalizedTenant)) {
        acc[adjustedDay][normalizedTenant] += curr.total_events;
      }
      
      return acc;
    }, {} as Record<number, { 
      day: string; 
      [key: string]: string | number; 
    }>);

    // Convert to array and ensure all weekdays are represented
    return WEEKDAYS.map((day, index) => ({
      day,
      ...Object.fromEntries(tenantList.map(tenant => [
        tenant, 
        weekdayData[index]?.[tenant] || 0
      ]))
    }));
  }, [tenants, rawData, filters.dateRange]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen w-full">
      {/* Enhanced Header with Controls */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center px-3 py-2 text-sm bg-gray-800 rounded-lg hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <h1 className="text-2xl font-bold">Tenant Movement Analysis</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Date Range Picker */}
          <div className="flex items-center space-x-4">
            <div className="relative flex items-center space-x-2">
              <span className="text-gray-400">From:</span>
              <DatePicker
                selected={filters.dateRange[0]}
                onChange={(date: Date | null) => {
                  if (date) {
                    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
                    setFilters(prev => ({
                      ...prev,
                      dateRange: [startDate, prev.dateRange[1]]
                    }));
                  }
                }}
                dateFormat="MMMM yyyy"
                showMonthYearPicker
                minDate={new Date(2024, 0, 1)}   // January 2024
                maxDate={filters.dateRange[1]}    // Can't be after end date
                className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 w-36"
              />
              
              <span className="text-gray-400">To:</span>
              <DatePicker
                selected={filters.dateRange[1]}
                onChange={(date: Date | null) => {
                  if (date) {
                    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0); // Last day of selected month
                    setFilters(prev => ({
                      ...prev,
                      dateRange: [prev.dateRange[0], endDate]
                    }));
                  }
                }}
                dateFormat="MMMM yyyy"
                showMonthYearPicker
                minDate={filters.dateRange[0]}    // Can't be before start date
                maxDate={new Date(2024, 11, 31)}  // December 2024
                className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 w-36"
              />
            </div>
          </div>

          {/* Tenant Selector */}
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
            aria-label="Select Tenant"
            title="Select Tenant"
            id="tenant-selector"
          >
            {tenants.map(tenant => (
              <option key={tenant} value={tenant}>
                {tenant}
              </option>
            ))}
          </select>

          {/* View Controls */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              className={`px-3 py-1 rounded ${filters.showWeekend ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              onClick={() => setFilters(prev => ({ ...prev, showWeekend: true }))}
            >
              All
            </button>
            <button
              className={`px-3 py-1 rounded ${!filters.showWeekend ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              onClick={() => setFilters(prev => ({ ...prev, showWeekend: false }))}
            >
              Weekday
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Events"
          value={totalEventsMetric}
          trend={5.2}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Average Daily Traffic"
          value={1234}
          trend={-2.1}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Peak Hour Activity"
          value={567}
          trend={8.7}
          icon={<BarChart2 className="h-5 w-5" />}
        />
        <MetricCard
          title={selectedTenant === "All Tenants" 
            ? "Wolf Point South Events" 
            : `${selectedTenant} Building Events`}
          value={wolfPointMetrics.totalEvents}
          trend={3.4}
          icon={<Building2 className="h-5 w-5" />}
        />
      </div>

      {/* Updated Movement Pattern Chart with taller height */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl mb-8">
        <h2 className="text-xl font-bold mb-6">Hourly Movement Patterns</h2>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis 
                dataKey="timeBlock" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                label={{ 
                  value: 'Hour of Day', 
                  position: 'bottom', 
                  offset: 0,
                  fill: '#9CA3AF',
                  dy: 10
                }}
                padding={{ left: 30, right: 30 }}
                tickFormatter={(value) => value}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={({ x, y, payload, index }) => (
                  <g transform={`translate(${x},${y})`} key={`ytick-${index}`}>
                    <text
                      x={0}
                      y={0}
                      dy={4}
                      textAnchor="end"
                      fill="#9CA3AF"
                      className="text-sm"
                    >
                      {payload.value === 0 ? '' : payload.value}
                    </text>
                  </g>
                )}
                domain={[0, yAxisConfig.max]}
                ticks={yAxisConfig.ticks}
                allowDecimals={false}
                label={{ 
                  value: 'Movement Events', 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: '#9CA3AF',
                  dx: -10
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  borderColor: '#374151',
                  borderRadius: '0.375rem'
                }}
                labelFormatter={(label) => `Time: ${label}`}
                formatter={(value: number) => [`${value} events`, 'Events']}
              />
              <Legend 
                verticalAlign="top"
                height={36}
              />
              
              {selectedTenant === "All Tenants" ? (
                // Show all tenant lines with unique keys
                tenants.map((tenant, index) => {
                  if (tenant !== "All Tenants") {
                    return (
                      <Line
                        key={`line-${tenant}-${index}`}
                        type="monotone"
                        dataKey={tenant}
                        name={tenant}
                        stroke={TENANT_COLORS[tenant as keyof typeof TENANT_COLORS]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 8 }}
                      />
                    );
                  }
                  return null;
                })
              ) : (
                // Show selected tenant with historical
                [
                  <Line
                    key="current-line"
                    type="monotone"
                    dataKey="current"
                    name="Current"
                    stroke={TENANT_COLORS[selectedTenant as keyof typeof TENANT_COLORS]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />,
                  <Line
                    key="historical-line"
                    type="monotone"
                    dataKey="historical"
                    name="Historical"
                    stroke={TENANT_COLORS[selectedTenant as keyof typeof TENANT_COLORS]}
                    strokeDasharray="5 5"
                    opacity={0.5}
                    dot={false}
                  />
                ]
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid with Enhanced Styling */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-6">Movement Types</h2>
          {/* ... movement types content ... */}
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-6">Key Insights</h2>
          {/* ... insights content ... */}
        </div>
      </div>

      {/* Update the weekly movement chart JSX */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl mb-8 mt-8">
        <h2 className="text-xl font-bold mb-6">Weekly Movement Patterns</h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyMovementData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                label={{ 
                  value: 'Day of Week', 
                  position: 'bottom', 
                  offset: 0,
                  fill: '#9CA3AF',
                  dy: 10
                }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                label={{ 
                  value: 'Movement Events', 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: '#9CA3AF',
                  dx: -10
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  borderColor: '#374151',
                  borderRadius: '0.375rem'
                }}
                formatter={(value: number, name: string) => [
                  `${value} events`,
                  normalizeTenantName(name)
                ]}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => normalizeTenantName(value)}
              />
              {tenants
                .filter(t => t !== "All Tenants")
                .map((tenant, index) => (
                  <Bar 
                    key={tenant}
                    dataKey={tenant}
                    name={tenant}
                    fill={TENANT_COLORS[tenant as keyof typeof TENANT_COLORS]}
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                    hide={selectedTenant !== "All Tenants" && selectedTenant !== tenant}
                  />
                ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricsCard = ({ title, value }: { title: string; value: string }) => (
  <div className="bg-gray-800 p-4 rounded-lg">
    <h3 className="text-sm text-gray-400 mb-1">{title}</h3>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const MovementTypeRow = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-400">{label}</span>
    <span className="font-bold">{value.toFixed(0)}%</span>
  </div>
);

const InsightRow = ({ title, description }: { title: string; description: string }) => (
  <div>
    <h3 className="font-bold text-gray-200">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

// Helper function to get tenant colors
const getTenantColor = (index: number): string => {
  const colors = [
    '#60A5FA', // Blue
    '#34D399', // Green
    '#818CF8', // Indigo
    '#F472B6', // Pink
    '#FBBF24', // Yellow
  ];
  return colors[index % colors.length];
};

// Update the Y-axis calculation function to provide unique tick values
const calculateYAxisDomain = (data: any[]) => {
  let maxValue = 0;
  data.forEach(point => {
    Object.entries(point).forEach(([key, value]) => {
      if (key !== 'timeBlock' && typeof value === 'number') {
        maxValue = Math.max(maxValue, value);
      }
    });
  });
  
  // Round up to nearest nice number and add some padding
  const niceMax = Math.ceil(maxValue * 1.1 / 100) * 100;
  const tickCount = 5;
  const tickSize = Math.ceil(niceMax / (tickCount - 1));
  
  // Generate tick values as simple numbers
  const ticks = Array.from({ length: tickCount }, (_, i) => ({
    value: tickSize * i
  }));
  
  return {
    max: niceMax,
    ticks: ticks
  };
};

export default TenantDashboard;
