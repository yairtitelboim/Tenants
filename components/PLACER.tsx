import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Users, Clock, MapPin, BarChart3, Database, ArrowLeft, Calendar } from 'lucide-react';
import Papa from 'papaparse';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BuildingHeatMap from '@/components/BuildingHeatMap';
import WeeklyTrafficGraph from '@/components/WeeklyTrafficGraph';
import DatePicker from 'react-datepicker';
import HourlyTrafficGraph from '@/components/HourlyTrafficGraph';
import Stats from '@/components/stats';
import { buildingColors, getBuildingColorIndex, getSelectedBuildingColor } from '../utils/buildingColors';
import DistanceDistributionGraph from './DistanceDistributionGraph';
import WorkerDistanceGraph from './WorkerDistanceGraph';

interface PlacerDataRow {
  // Basic info
  id: string;
  name: string;
  type: string;
  foottraffic: string;
  visit_duration_segmentation: string;
  
  // Dates
  publication_date: string;
  start_date: string;
  end_date: string;
  
  // Location info
  lat: string;
  lng: string;
  region_name: string;
  region_type: string;
  region_code: string;
  
  // Weekly visits
  visits_by_day_of_week_monday: string;
  visits_by_day_of_week_tuesday: string;
  visits_by_day_of_week_wednesday: string;
  visits_by_day_of_week_thursday: string;
  visits_by_day_of_week_friday: string;
  visits_by_day_of_week_saturday: string;
  visits_by_day_of_week_sunday: string;
  
  // Home distance fields
  home_distance_estimated_foottraffic_1: string;
  home_distance_estimated_foottraffic_2: string;
  home_distance_estimated_foottraffic_5: string;
  home_distance_estimated_foottraffic_10: string;
  home_distance_estimated_foottraffic_30: string;
  
  // Work distance fields
  work_distance_estimated_foottraffic_1: string;
  work_distance_estimated_foottraffic_2: string;
  work_distance_estimated_foottraffic_5: string;
  work_distance_estimated_foottraffic_10: string;
  work_distance_estimated_foottraffic_30: string;
  
  // Optional fields (add ? if not always present)
  city?: string;
  state_code?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, change }) => (
  <div className="bg-gray-800 p-4 rounded-xl h-full">
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-blue-500">{icon}</div>
      </div>
      {change && (
        <p className="text-sm text-green-400 mt-auto pt-2">{change}</p>
      )}
    </div>
  </div>
);

interface DistanceData {
  distance: string;
  count: number;
}

interface BuildingDataPoint {
  date: Date;
  value: number;
}

interface BuildingData {
  data: BuildingDataPoint[];
  name: string;
  id: string;
}

interface BuildingDataMap {
  [key: string]: BuildingData;
}

interface PlacerProps {
  onBack: () => void;
}

const PLACER: React.FC<PlacerProps> = ({ onBack }) => {
  // 1. All useState hooks
  const [placerData, setPlacerData] = useState<PlacerDataRow[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState(() => {
    // Set date range to include all of 2023-2024
    const startDate = new Date(2023, 0, 1);  // January 1, 2023
    const endDate = new Date(2024, 11, 31);  // December 31, 2024
    return {
      dateRange: [startDate, endDate],
      showWeekend: true
    };
  });
  const [resetKey, setResetKey] = useState(0);
  const [hoveredBuildingName, setHoveredBuildingName] = useState<string | null>(null);
  const [distanceData, setDistanceData] = useState<DistanceData[]>([]);
  const [distanceType, setDistanceType] = useState<'home' | 'work'>('home');
  const [workerDistanceData, setWorkerDistanceData] = useState<DistanceData[]>([]);
  const [buildingData, setBuildingData] = useState<BuildingDataMap>({});

  // 2. Calculate filtered data
  const filteredData = React.useMemo(() => {
    return placerData.filter(row => {
      const rowDate = new Date(row.start_date);
      const isInDateRange = rowDate >= filters.dateRange[0] && rowDate <= filters.dateRange[1];
      
      if (!filters.showWeekend) {
        const dayOfWeek = rowDate.getDay();
        return isInDateRange && dayOfWeek !== 0 && dayOfWeek !== 6;
      }
      
      return isInDateRange;
    });
  }, [placerData, filters]);

  // Add metrics calculation
  const metrics = React.useMemo(() => {
    if (!filteredData?.length) return null;

    const uniqueProperties = new Set(filteredData.map(row => row.id));
    const totalVisitors = filteredData.reduce((sum, row) => sum + (parseInt(row.foottraffic) || 0), 0);
    
    // Calculate average duration
    const avgDuration = Math.round(
      filteredData.reduce((sum, row) => {
        const duration = parseInt(row.visit_duration_segmentation.split('_')[0]) || 0;
        return sum + duration;
      }, 0) / filteredData.length
    );

    // Find peak region (most traffic)
    const regionTraffic = filteredData.reduce((acc, row) => {
      const region = row.region_name;
      acc[region] = (acc[region] || 0) + (parseInt(row.foottraffic) || 0);
      return acc;
    }, {} as { [key: string]: number });

    const peakRegion = Object.entries(regionTraffic)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return {
      propertyCount: uniqueProperties.size,
      totalVisitors,
      avgDuration,
      peakRegion
    };
  }, [filteredData]);

  // 2. All useEffect hooks
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/data/Hines_monthly_2024-12-06.csv');
        const csvText = await response.text();
        
        Papa.parse<PlacerDataRow>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results: Papa.ParseResult<PlacerDataRow>) => {
            setPlacerData(results.data);
            setIsLoading(false);
          },
          error: () => {
            setIsLoading(false);
          }
        });
      } catch {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle building selection
  const handleBuildingSelect = (buildingId: string) => {
    setSelectedBuildingId(selectedBuildingId === buildingId ? null : buildingId);
  };

  // Add this effect at the component level
  useEffect(() => {
    if (selectedBuildingId) {
      const element = document.getElementById(`building-row-${selectedBuildingId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedBuildingId]);

  const calculateDistanceData = (buildingId: string | null, type: 'home' | 'work'): DistanceData[] => {
    if (!placerData.length) return [];

    // If no building is selected, aggregate data from all buildings
    if (!buildingId) {
      const aggregatedData = {
        '0-1 km': 0,
        '1-2 km': 0,
        '2-5 km': 0,
        '5-10 km': 0,
        '10+ km': 0
      };

      placerData.forEach(building => {
        // Sum up the values for each distance range
        aggregatedData['0-1 km'] += parseInt(type === 'home' 
          ? building.home_distance_estimated_foottraffic_1 
          : building.work_distance_estimated_foottraffic_1) || 0;
        aggregatedData['1-2 km'] += parseInt(type === 'home'
          ? building.home_distance_estimated_foottraffic_2
          : building.work_distance_estimated_foottraffic_2) || 0;
        aggregatedData['2-5 km'] += parseInt(type === 'home'
          ? building.home_distance_estimated_foottraffic_5
          : building.work_distance_estimated_foottraffic_5) || 0;
        aggregatedData['5-10 km'] += parseInt(type === 'home'
          ? building.home_distance_estimated_foottraffic_10
          : building.work_distance_estimated_foottraffic_10) || 0;
        aggregatedData['10+ km'] += parseInt(type === 'home'
          ? building.home_distance_estimated_foottraffic_30
          : building.work_distance_estimated_foottraffic_30) || 0;
      });

      return Object.entries(aggregatedData).map(([distance, count]) => ({
        distance,
        count
      }));
    }

    // Original single building logic
    const building = placerData.find(b => b.id === buildingId);
    if (!building) return [];

    return [
      { 
        distance: '0-1 km', 
        count: parseInt(type === 'home' 
          ? building.home_distance_estimated_foottraffic_1 
          : building.work_distance_estimated_foottraffic_1) || 0
      },
      { 
        distance: '1-2 km', 
        count: parseInt(type === 'home'
          ? building.home_distance_estimated_foottraffic_2
          : building.work_distance_estimated_foottraffic_2) || 0
      },
      { 
        distance: '2-5 km', 
        count: parseInt(type === 'home'
          ? building.home_distance_estimated_foottraffic_5
          : building.work_distance_estimated_foottraffic_5) || 0
      },
      { 
        distance: '5-10 km', 
        count: parseInt(type === 'home'
          ? building.home_distance_estimated_foottraffic_10
          : building.work_distance_estimated_foottraffic_10) || 0
      },
      { 
        distance: '10+ km', 
        count: parseInt(type === 'home'
          ? building.home_distance_estimated_foottraffic_30
          : building.work_distance_estimated_foottraffic_30) || 0
      }
    ];
  };

  const calculateWorkerDistanceData = (buildingId: string | null): DistanceData[] => {
    if (!placerData.length) return [];

    // If no building is selected, aggregate worker data from all buildings
    if (!buildingId) {
      const aggregatedData = {
        '0-1 km': 0,
        '1-2 km': 0,
        '2-5 km': 0,
        '5-10 km': 0,
        '10+ km': 0
      };

      placerData.forEach(building => {
        // Get long duration visits (>2 hours) ratio
        const longVisits = parseInt(building.visit_duration_segmentation) || 0;
        const totalVisits = parseInt(building.foottraffic) || 1;
        const ratio = longVisits / totalVisits;

        // Apply ratio to each distance range
        aggregatedData['0-1 km'] += Math.round((parseInt(building.home_distance_estimated_foottraffic_1) || 0) * ratio);
        aggregatedData['1-2 km'] += Math.round((parseInt(building.home_distance_estimated_foottraffic_2) || 0) * ratio);
        aggregatedData['2-5 km'] += Math.round((parseInt(building.home_distance_estimated_foottraffic_5) || 0) * ratio);
        aggregatedData['5-10 km'] += Math.round((parseInt(building.home_distance_estimated_foottraffic_10) || 0) * ratio);
        aggregatedData['10+ km'] += Math.round((parseInt(building.home_distance_estimated_foottraffic_30) || 0) * ratio);
      });

      return Object.entries(aggregatedData).map(([distance, count]) => ({
        distance,
        count
      }));
    }

    // Original single building logic
    const building = placerData.find(b => b.id === buildingId);
    if (!building) return [];

    const longVisits = parseInt(building.visit_duration_segmentation) || 0;
    const totalVisits = parseInt(building.foottraffic) || 1;
    const ratio = longVisits / totalVisits;

    return [
      { 
        distance: '0-1 km', 
        count: Math.round((parseInt(building.home_distance_estimated_foottraffic_1) || 0) * ratio)
      },
      { 
        distance: '1-2 km', 
        count: Math.round((parseInt(building.home_distance_estimated_foottraffic_2) || 0) * ratio)
      },
      { 
        distance: '2-5 km', 
        count: Math.round((parseInt(building.home_distance_estimated_foottraffic_5) || 0) * ratio)
      },
      { 
        distance: '5-10 km', 
        count: Math.round((parseInt(building.home_distance_estimated_foottraffic_10) || 0) * ratio)
      },
      { 
        distance: '10+ km', 
        count: Math.round((parseInt(building.home_distance_estimated_foottraffic_30) || 0) * ratio)
      }
    ];
  };

  useEffect(() => {
    const newDistanceData = calculateDistanceData(selectedBuildingId, distanceType);
    const newWorkerDistanceData = calculateWorkerDistanceData(selectedBuildingId);
    setDistanceData(newDistanceData);
    setWorkerDistanceData(newWorkerDistanceData);
  }, [selectedBuildingId, placerData, distanceType]);

  const sortedPlacerData = useMemo(() => 
    [...placerData].sort((a, b) => a.name.localeCompare(b.name)),
    [placerData]
  );

  const processData = (data: PlacerDataRow[]): BuildingDataMap => {
    const buildingData: BuildingDataMap = data.reduce((acc, row) => {
      const date = new Date(row.start_date);
      const value = parseInt(row.foottraffic) || 0;
      
      if (!acc[row.id]) {
        acc[row.id] = {
          data: [],
          name: row.name,
          id: row.id
        };
      }
      
      acc[row.id].data.push({ date, value });
      return acc;
    }, {} as BuildingDataMap);

    // Now TypeScript knows the structure of buildingData
    Object.values(buildingData).forEach(building => {
      building.data.sort((a, b) => a.date.getTime() - b.date.getTime());
    });

    return buildingData;
  };

  // Add this helper function
  const transformToWeeklyData = (data: PlacerDataRow[]): BuildingData[] => {
    // Group data by building
    const buildingData = data.reduce((acc, row) => {
      if (!row.start_date) return acc;

      const id = row.id;
      if (!acc[id]) {
        acc[id] = {
          id: id,
          name: row.name,
          data: []
        };
      }
      
      const date = new Date(row.start_date);
      if (!isNaN(date.getTime())) {
        acc[id].data.push({
          date: date,
          value: parseInt(row.foottraffic) || 0
        });
      }

      return acc;
    }, {} as Record<string, BuildingData>);

    // Sort data by date for each building
    Object.values(buildingData).forEach(building => {
      building.data.sort((a, b) => a.date.getTime() - b.date.getTime());
    });
    
    return Object.values(buildingData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-xl">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white px-3 py-4 sm:p-8">
      {/* Dashboard Header */}
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <h1 className="text-xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 leading-tight">
            Hines Placer POC - 
            <br className="sm:hidden" />
            Foottraffic Analysis
          </h1>
          <button
            onClick={onBack}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
        <div className="text-gray-400 mb-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span>v0.1</span>
          <span>•</span>
          <span>{new Date().toLocaleDateString('en-US', { 
            month: 'long',
            day: 'numeric', 
            year: 'numeric'
          })}</span>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="text-gray-400 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-200 mb-2">This Analysis Includes:</h2>
        <p className="text-sm sm:text-base">
          A comprehensive overview of building traffic patterns, visitor behavior, and geographic distribution analysis. 
          The dashboard is divided into four main sections to help analyze and visualize the Placer.ai data effectively.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <h3 className="font-semibold text-sm sm:text-base">Data Overview</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-400">
            Comprehensive statistics and data field analysis
          </p>
        </div>
        <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold">Traffic Analysis</h3>
          </div>
          <p className="text-sm text-gray-400">
            Hourly and weekly visitor patterns
          </p>
        </div>
        <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-rose-400" />
            <h3 className="font-semibold">Geographic View</h3>
          </div>
          <p className="text-sm text-gray-400">
            Building locations and heat map visualization
          </p>
        </div>
        <div className="bg-gray-800/40 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold">Building Details</h3>
          </div>
          <p className="text-sm text-gray-400">
            Individual building metrics and comparisons
          </p>
        </div>
      </div>

      {/* Data Overview Section */}
      <div className="mb-12">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-200 mb-2">Data Overview</h2>
          <p className="text-gray-400">
            Explore key metrics and data field distributions across all buildings. This overview provides insights into the scope and completeness of the dataset, helping identify patterns and potential areas for analysis.
          </p>
        </div>
        
        {/* Stats Component */}
        <div className="px-2 sm:px-0">
          <Stats data={filteredData} />
        </div>

        {/* Date Range Filter with Reset */}
        <div className="mt-8 bg-gray-800/40 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Clock className="w-5 h-5 text-gray-400" />
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">From:</span>
                <DatePicker
                  selected={filters.dateRange[0]}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setFilters(prev => ({
                        ...prev,
                        dateRange: [date, prev.dateRange[1]]
                      }));
                    }
                  }}
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 w-36"
                />
                
                <span className="text-gray-400">To:</span>
                <DatePicker
                  selected={filters.dateRange[1]}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setFilters(prev => ({
                        ...prev,
                        dateRange: [prev.dateRange[0], date]
                      }));
                    }
                  }}
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 w-36"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-700 rounded-lg p-1">
                <button
                  className={`px-3 py-1 rounded ${filters.showWeekend ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                  onClick={() => setFilters(prev => ({ ...prev, showWeekend: true }))}
                >
                  All Days
                </button>
                <button
                  className={`px-3 py-1 rounded ${!filters.showWeekend ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
                  onClick={() => setFilters(prev => ({ ...prev, showWeekend: false }))}
                >
                  Weekdays Only
                </button>
              </div>
              <button
                onClick={() => {
                  setSelectedBuildingId(null);
                  setResetKey(prev => prev + 1);
                  // Reset filters to default
                  setFilters({
                    dateRange: [new Date(2023, 0, 1), new Date(2024, 11, 31)],
                    showWeekend: true
                  });
                }}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Properties"
          value={metrics?.propertyCount || 0}
          icon={<Building2 className="h-5 w-5" />}
          change={selectedBuildingId ? "Individual Building View" : `${metrics?.propertyCount || 0} Active Buildings`}
        />
        <MetricCard
          title="Monthly Visitors"
          value={(metrics?.totalVisitors || 0).toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          change={selectedBuildingId 
            ? "Building Total" 
            : `Avg ${Math.round((metrics?.totalVisitors || 0) / (metrics?.propertyCount || 1)).toLocaleString()} per building`}
        />
        <MetricCard
          title="Avg Visit Duration"
          value={`${metrics?.avgDuration || 0} min`}
          icon={<Clock className="h-5 w-5" />}
          change={selectedBuildingId ? "Building Average" : "Average across all visits"}
        />
        <MetricCard
          title="Peak Activity Region"
          value={metrics?.peakRegion || 'N/A'}
          icon={<MapPin className="h-5 w-5" />}
          change={selectedBuildingId ? "Building Location" : "Highest traffic region"}
        />
      </div>

      {/* Hourly Traffic Graph */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl mb-8">
        <h2 className="text-xl font-bold mb-6">Hourly Traffic Distribution</h2>
        <HourlyTrafficGraph 
          key={`hourly-${resetKey}`}
          data={filteredData}
          selectedBuildingId={selectedBuildingId}
          hoveredBuilding={hoveredBuildingName}
          onHoverBuilding={setHoveredBuildingName}
        />
      </div>

      {/* Weekly Traffic Graph */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl mb-8">
        <h2 className="text-xl font-bold mb-6">Weekly Traffic Patterns</h2>
        <WeeklyTrafficGraph 
          key={`weekly-${resetKey}`}
          data={transformToWeeklyData(filteredData)}
          selectedBuildingId={selectedBuildingId}
          hoveredBuilding={hoveredBuildingName}
          onHoverBuilding={setHoveredBuildingName}
        />
      </div>

      {/* Table and Heat Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Buildings Table - 3 columns (30%) */}
        <div className="col-span-3 bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl h-full">
          <h2 className="text-xl font-bold mb-6">Building Details</h2>
          <div className="overflow-y-auto h-[calc(100%-4rem)]">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-800 z-10">
                <TableRow>
                  <TableHead>Building Name</TableHead>
                  <TableHead>Total Traffic</TableHead>
                  <TableHead>Avg. Visit Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placerData
                  .filter((row, index, self) => 
                    index === self.findIndex((t) => t.id === row.id)
                  )
                  .map((building) => {
                    const isSelected = selectedBuildingId === building.id;
                    const colorIndex = getBuildingColorIndex(sortedPlacerData, building.name);
                    const baseColor = isSelected 
                      ? getSelectedBuildingColor(sortedPlacerData, selectedBuildingId)
                      : buildingColors[colorIndex % buildingColors.length];
                    
                    const isHovered = hoveredBuildingName === building.name;
                    const isOtherHovered = hoveredBuildingName && hoveredBuildingName !== building.name;
                    const opacity = isHovered || isSelected ? 1 : (isOtherHovered ? 0.2 : 0.8);
                    
                    return (
                      <TableRow 
                        key={building.id}
                        id={`building-row-${building.id}`}
                        className={`cursor-pointer hover:bg-gray-700 transition-colors duration-200 ${
                          isSelected ? 'bg-gray-700' : ''
                        }`}
                        onClick={() => {
                          handleBuildingSelect(building.id);
                          console.log('Building Selected:', {
                            buildingName: building.name,
                            colorIndex,
                            baseColor,
                            isSelected: true,
                            selectedBuildingId: building.id
                          });
                        }}
                        onMouseEnter={() => setHoveredBuildingName(building.name)}
                        onMouseLeave={() => setHoveredBuildingName(null)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full transition-opacity duration-200"
                              style={{ 
                                backgroundColor: baseColor,
                                opacity: opacity
                              }} 
                            />
                            {building.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {parseInt(building.foottraffic).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {`${parseInt(building.visit_duration_segmentation.split('_')[0])} min`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Building Activity Heat Map - 7 columns (70%) */}
        <div className="col-span-7 bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-6">Building Activity Heat Map</h2>
          <div className="px-2 sm:px-0">
            <BuildingHeatMap 
              key={`heatmap-${resetKey}`}
              data={filteredData} 
              selectedBuildingId={selectedBuildingId} 
              hoveredBuilding={hoveredBuildingName}
              onHoverBuilding={setHoveredBuildingName}
            />
          </div>
        </div>
      </div>

      <DistanceDistributionGraph 
        data={distanceData}
        selectedBuildingId={selectedBuildingId}
        buildingName={placerData.find(b => b.id === selectedBuildingId)?.name || null}
        allBuildings={placerData}
        distanceType={distanceType}
        onDistanceTypeChange={setDistanceType}
      />
      <WorkerDistanceGraph 
        data={workerDistanceData}
        selectedBuildingId={selectedBuildingId}
        buildingName={placerData.find(b => b.id === selectedBuildingId)?.name || null}
        allBuildings={placerData}
      />

      {/* Future Development Ideas */}
      <div className="mt-12 p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Potential Future Visualizations</h2>
        <div className="text-gray-300 space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
            <p>
              <span className="font-semibold text-blue-400">Visit Duration Analysis:</span> Break down visits by duration 
              categories (short: &lt;30min, medium: 30min-2hrs, long: &gt;2hrs) to better understand building usage patterns
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 mt-2 rounded-full bg-emerald-400" />
            <p>
              <span className="font-semibold text-emerald-400">Cross-Building Traffic:</span> Analyze visitor overlap 
              between buildings to identify common visitor patterns and building relationships
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 mt-2 rounded-full bg-purple-400" />
            <p>
              <span className="font-semibold text-purple-400">Time-Based Worker Patterns:</span> Visualize when long-duration 
              visitors (employees) typically arrive and depart, helping understand peak office hours
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 mt-2 rounded-full bg-rose-400" />
            <p>
              <span className="font-semibold text-rose-400">Regional Impact Analysis:</span> Map the geographic spread of 
              visitors to understand each building's regional influence and catchment area
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 mt-2 rounded-full bg-amber-400" />
            <p>
              <span className="font-semibold text-amber-400">Comparative Building Analysis:</span> Side-by-side comparison 
              of similar buildings to benchmark performance and identify optimization opportunities
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PLACER;
