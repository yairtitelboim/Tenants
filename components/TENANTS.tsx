import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Calendar, Filter, Activity, Users, BarChart2, Building2, Square, FileText } from 'lucide-react';
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
  value: string | number;
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
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {trend !== undefined && (
        <span className={`ml-2 text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  </div>
);

// Add this CSS to your global styles or component
const chartStyle = {
  backgroundColor: '#1F2937',
  '.recharts-surface, .recharts-default-tooltip': {
    backgroundColor: '#1F2937 !important',
  }
};

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
            
            // Initialize with 0 and ensure we're adding numbers
            data[tenant] = tenantEvents.reduce((sum, d) => sum + (d.total_events || 0), 0);
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
    
    const tenantList = tenants.filter(t => t !== "All Tenants");
    
    interface DayData {
      day: string;
      [key: string]: string | number;
    }
    
    const weekdayData = rawData.filter(d => {
      const date = new Date(d.event_date);
      return date >= startDate && date <= endDate;
    }).reduce((acc, curr) => {
      const date = new Date(curr.event_date);
      const weekday = date.getDay();
      
      if (weekday === 0 || weekday === 6) return acc;
      
      const adjustedDay = weekday - 1;
      const normalizedTenant = normalizeTenantName(curr.tenant);
      
      if (!acc[adjustedDay]) {
        acc[adjustedDay] = {
          day: WEEKDAYS[adjustedDay],
          ...Object.fromEntries(tenantList.map(tenant => [tenant, 0]))
        };
      }
      
      if (tenantList.includes(normalizedTenant)) {
        const currentValue = acc[adjustedDay][normalizedTenant];
        acc[adjustedDay][normalizedTenant] = (typeof currentValue === 'number' ? currentValue : 0) + curr.total_events;
      }
      
      return acc;
    }, {} as Record<number, DayData>);

    return WEEKDAYS.map((day, index) => ({
      day,
      ...Object.fromEntries(tenantList.map(tenant => [
        tenant, 
        weekdayData[index]?.[tenant] || 0
      ]))
    }));
  }, [tenants, rawData, filters.dateRange]);

  // Add this near the top with other interfaces
  interface RawDataItem {
    PropertyName: string;
    reader_category: string;
    total_events: number;
  }

  // Add this near other data processing functions
  const formatReaderData = (rawData: RawDataItem[]) => {
    const categories = Array.from(new Set(rawData.map(d => d.reader_category))).sort((a, b) => {
      const totalA = rawData.filter(d => d.reader_category === a).reduce((sum, d) => sum + d.total_events, 0);
      const totalB = rawData.filter(d => d.reader_category === b).reduce((sum, d) => sum + d.total_events, 0);
      return totalB - totalA;
    });
    
    return categories.map(category => ({
      category: category.replace(/_/g, ' '),
      "CIBC Square": rawData.find(d => d.PropertyName.includes('CIBC') && d.reader_category === category)?.total_events || 0,
      "Wolf Point": rawData.find(d => d.PropertyName.includes('Wolf') && d.reader_category === category)?.total_events || 0
    }));
  };

  // Inside the TenantDashboard component, add this with other useMemo hooks
  const readerCategoryData = useMemo(() => formatReaderData([
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Primary_Entry","total_events":305960},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Secondary_Entry","total_events":220823},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Vertical_Transport","total_events":128865},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Floor_Access","total_events":75878},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Other","total_events":74239},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Common_Areas","total_events":33918},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Amenities","total_events":32947},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Tenant_Space","total_events":16798},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Parking_Transport","total_events":15160},
    {"PropertyName":"CIBC Square - 81 Bay - Owned (CONFIDENTIAL) Office","reader_category":"Building_Operations","total_events":3637},
    {"PropertyName":"CIBC Square - 81 Bay t- Owned (CONFIDENTIAL) Office","reader_category":"Security_BOH","total_events":1618},
    {"PropertyName":"Wolf Point South","reader_category":"Secondary_Entry","total_events":527399},
    {"PropertyName":"Wolf Point South","reader_category":"Floor_Access","total_events":119858},
    {"PropertyName":"Wolf Point South","reader_category":"Vertical_Transport","total_events":89793},
    {"PropertyName":"Wolf Point South","reader_category":"Other","total_events":84548},
    {"PropertyName":"Wolf Point South","reader_category":"Parking_Transport","total_events":57510},
    {"PropertyName":"Wolf Point South","reader_category":"Security_BOH","total_events":44595},
    {"PropertyName":"Wolf Point South","reader_category":"Common_Areas","total_events":27700},
    {"PropertyName":"Wolf Point South","reader_category":"Building_Operations","total_events":16383},
    {"PropertyName":"Wolf Point South","reader_category":"Amenities","total_events":14005},
    {"PropertyName":"Wolf Point South","reader_category":"Tenant_Space","total_events":281}
  ]), []);

  // Add this interface near the top with other interfaces
  interface LeaseInfo {
    buildingName: string;
    buildingCount?: number;
    leaseArea: number;
    leaseEndDate: string;
    leaseType: string;
    latestEndDate?: string;
    totalLeaseArea?: number;
  }

  // Update the lease data with the correct information
  const LEASE_DATA: { [key: string]: LeaseInfo } = {
    "Lerer Hippeau Management, LLC": {
      buildingName: "555 Greenwich",
      leaseArea: 12084,
      leaseEndDate: "2033-09-30",
      leaseType: "Office"
    },
    "Audacy New York, LLC.": {
      buildingName: "345 Hudson Street",
      leaseArea: 109047,
      leaseEndDate: "2027-08-31",
      leaseType: "Office"
    },
    "Google, LLC": {
      buildingName: "345 Hudson Street",
      leaseArea: 348645,
      leaseEndDate: "2029-04-30",
      leaseType: "Office"
    },
    "Salesforce.com, Inc": {
      buildingName: "Wolf Point South Owner LLC",
      leaseArea: 429263,
      leaseEndDate: "2040-05-31",
      leaseType: "Office"
    },
    "Kirkland & Ellis LLP": {
      buildingName: "Wolf Point South Owner LLC",
      leaseArea: 677821,
      leaseEndDate: "2043-02-28",
      leaseType: "Office"
    }
  };

  // Ensure the selectedTenant matches the keys in LEASE_DATA
  const selectedTenantInfo = useMemo(() => {
    if (selectedTenant === "All Tenants") {
      return {
        buildingCount: new Set(Object.values(LEASE_DATA).map(d => d.buildingName)).size,
        totalLeaseArea: Object.values(LEASE_DATA).reduce((sum, d) => sum + d.leaseArea, 0),
        latestEndDate: Object.values(LEASE_DATA)
          .map(d => new Date(d.leaseEndDate))
          .reduce((latest, date) => date > latest ? date : latest, new Date(0))
          .toISOString().split('T')[0],
        leaseType: "Mixed"
      } as LeaseInfo;
    }

    // Find the matching tenant data using normalized names
    const tenantData = Object.entries(LEASE_DATA).find(([key]) => 
      normalizeTenantName(key) === normalizeTenantName(selectedTenant)
    );

    return tenantData ? tenantData[1] : {
      buildingName: "N/A",
      leaseArea: 0,
      leaseEndDate: "N/A",
      leaseType: "N/A"
    } as LeaseInfo;
  }, [selectedTenant]);

  // Add these new interfaces
  interface DayActivity {
    date: string;
    value: number;
  }

  interface MonthData {
    month: string;
    days: DayActivity[];
  }

  // Replace the previous heatMapData with this new calendar data preparation
  const calendarData = useMemo(() => {
    const dailyTotals: Record<string, number> = {};

    // Aggregate events by date for the selected tenant
    rawData.forEach((entry) => {
      const normalizedTenant = normalizeTenantName(entry.tenant);
      if (selectedTenant === "All Tenants" || normalizedTenant === selectedTenant) {
        if (!dailyTotals[entry.event_date]) {
          dailyTotals[entry.event_date] = 0;
        }
        dailyTotals[entry.event_date] += entry.total_events;
      }
    });

    const maxValue = Math.max(...Object.values(dailyTotals));

    const getColor = (value: number) => {
      const intensity = value / maxValue;
      // Get tenant color or default to a blue shade for "All Tenants"
      const baseColor = TENANT_COLORS[selectedTenant as keyof typeof TENANT_COLORS] || '#08589e';
      
      // Convert hex to RGB
      const hex = baseColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      // Calculate darker version of the tenant color for low activity
      const darkR = Math.floor(r * 0.2); // 20% of the original color
      const darkG = Math.floor(g * 0.2);
      const darkB = Math.floor(b * 0.2);

      // Interpolate between dark and bright versions based on intensity
      const finalR = Math.floor(darkR + (intensity * (r - darkR)));
      const finalG = Math.floor(darkG + (intensity * (g - darkG)));
      const finalB = Math.floor(darkB + (intensity * (b - darkB)));

      return `rgb(${finalR}, ${finalG}, ${finalB})`;
    };

    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const date = new Date(2024, monthIndex, 1);
          const monthName = date.toLocaleString('default', { month: 'long' });
          
          // Check if month has any activity
          const monthHasActivity = Object.keys(dailyTotals).some(dateStr => 
            dateStr.startsWith(`2024-${String(monthIndex + 1).padStart(2, '0')}`)
          );

          if (!monthHasActivity) {
            return (
              <div key={monthName} className="bg-gray-800 p-4 rounded-lg flex flex-col items-center justify-center min-h-[200px]">
                <h3 className="text-lg font-semibold mb-2 text-gray-300">
                  {monthName}
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  NO ACTIVITY RECORDED
                </p>
              </div>
            );
          }

          const daysInMonth = new Date(2024, monthIndex + 1, 0).getDate();
          const firstDayOfMonth = new Date(2024, monthIndex, 1).getDay();

          return (
            <div key={monthName} className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-semibold mb-2 text-center text-gray-300">
                {monthName}
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-xs text-gray-500 text-center">
                    {day}
                  </div>
                ))}
                
                {Array.from({ length: firstDayOfMonth }, (_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `2024-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const value = dailyTotals[dateStr] || 0;
                  
                  return (
                    <div
                      key={dateStr}
                      className="aspect-square relative group"
                      style={{
                        backgroundColor: value ? getColor(value) : 'rgb(31, 41, 55)', // Very dark gray for no activity
                        transition: 'all 150ms ease'
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-gray-300">
                          {day}
                        </span>
                      </div>
                      
                      {value > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                            {value.toLocaleString()} events
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [rawData, selectedTenant]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen w-full">
      {/* Header and Controls */}
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

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Events"
          value={totalEventsMetric}
          trend={5.2}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Unique Credentials"
          value={wolfPointMetrics.uniqueCredentials}
          trend={-1.3}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Peak Hour Activity"
          value={567}
          trend={8.7}
          icon={<BarChart2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Another Metric"
          value={1234}
          trend={2.5}
          icon={<Building2 className="h-5 w-5" />}
        />
      </div>

      {/* Weekly Movement Patterns */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl mb-8">
        <h2 className="text-xl font-bold mb-6">Weekly Movement Patterns</h2>
        <div className="h-[400px] bg-gray-900">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={weeklyMovementData}
              margin={{ top: 20, right: 30, left: 20, bottom: 35 }}
              style={chartStyle}
            >
              <defs>
                <linearGradient id="chartBackground" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F2937" />
                  <stop offset="100%" stopColor="#1F2937" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#chartBackground)" />
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                label={{ 
                  value: 'Day of Week', 
                  position: 'bottom', 
                  offset: 20,
                  fill: '#9CA3AF'
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
                cursor={{ fill: '#1F2937' }} // Dark background for hover area
                contentStyle={{
                  backgroundColor: '#1F2937',
                  borderColor: '#374151',
                  borderRadius: '0.375rem',
                  color: '#fff',
                  opacity: 0.95
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

      {/* Hourly Movement Patterns - Moved here */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl mb-8">
        <h2 className="text-xl font-bold mb-6">Hourly Movement Patterns</h2>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
              <XAxis 
                dataKey="timeBlock" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                label={{ 
                  value: 'Hour of Day', 
                  position: 'bottom', 
                  offset: 20,
                  fill: '#9CA3AF'
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
                formatter={(value: any) => {
                  if (typeof value === 'number') {
                    return [new Intl.NumberFormat().format(value), 'Events'];
                  }
                  return [value, 'Events'];
                }}
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

      {/* Monthly Activity Heat Map */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl mb-8">
        <h2 className="text-xl font-bold mb-6">Month-over-Month Activity Heat Map</h2>
        {calendarData}
      </div>

      {/* First row - Lease Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Building"
          value={selectedTenant === "All Tenants" ? 
            `${selectedTenantInfo.buildingCount} Buildings` : 
            selectedTenantInfo.buildingName}
          icon={<Building2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Lease Area (sq ft)"
          value={selectedTenantInfo.leaseArea}
          icon={<Square className="h-5 w-5" />}
        />
        <MetricCard
          title="Lease End Date"
          value={selectedTenant === "All Tenants" ? 
            `Latest: ${selectedTenantInfo.latestEndDate}` : 
            selectedTenantInfo.leaseEndDate}
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Lease Type"
          value={selectedTenantInfo.leaseType}
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      {/* Second row - Movement Metrics Cards (moved here) */}
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

      {/* Bottom Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-6">Movement Types</h2>
          <div className="h-[400px] bg-gray-900">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={movementTypeData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                style={chartStyle}
              >
                <defs>
                  <linearGradient id="chartBackground2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1F2937" />
                    <stop offset="100%" stopColor="#1F2937" />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#chartBackground2)" />
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis 
                  type="number" 
                  tick={{ fill: '#fff', fontSize: 12 }}
                  label={{ 
                    value: "Number of Events", 
                    position: "bottom", 
                    fill: "#fff",
                    fontSize: 14,
                    offset: 0
                  }}
                  tickFormatter={value => new Intl.NumberFormat().format(value)}
                />
                <YAxis 
                  type="category" 
                  dataKey="category" 
                  tick={{ fill: '#fff', fontSize: 12 }}
                  width={140}
                />
                <Tooltip
                  cursor={{ fill: '#1F2937' }}
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    borderColor: '#374151',
                    borderRadius: '0.375rem',
                    color: '#fff',
                    opacity: 0.95
                  }}
                />
                <Legend 
                  wrapperStyle={{
                    fontSize: '14px',
                    paddingTop: '20px'
                  }}
                />
                <Bar dataKey="CIBC Square" fill="#60a5fa" />
                <Bar dataKey="Wolf Point" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-6">Key Insights</h2>
          {/* ... insights content ... */}
        </div>
      </div>

      {/* Reader Category Distribution Chart */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl mb-8 mt-8">
        <h2 className="text-xl font-bold mb-6">Access Control Events by Category</h2>
        <div className="h-[600px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={readerCategoryData} 
              layout="vertical" 
              margin={{ top: 20, right: 30, left: 150, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                type="number" 
                tick={{ fill: '#fff', fontSize: 12 }}
                label={{ 
                  value: "Number of Events", 
                  position: "bottom", 
                  fill: "#fff",
                  fontSize: 14,
                  offset: 0
                }}
                tickFormatter={value => new Intl.NumberFormat().format(value)}
              />
              <YAxis 
                type="category" 
                dataKey="category" 
                tick={{ fill: '#fff', fontSize: 12 }}
                width={140}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  borderColor: '#374151',
                  color: '#fff',
                  fontSize: 12
                }}
                formatter={(value: any) => {
                  if (typeof value === 'number') {
                    return [new Intl.NumberFormat().format(value), ''];
                  }
                  return [value, ''];
                }}
              />
              <Legend 
                wrapperStyle={{
                  fontSize: '14px',
                  paddingTop: '20px'
                }}
              />
              <Bar dataKey="CIBC Square" fill="#60a5fa" />
              <Bar dataKey="Wolf Point" fill="#f97316" />
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
