// components/Stats.tsx
import React from 'react';
import { Building2, Database, Table, Users, Clock, MapPin, Calendar, Home, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface CategoryConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  progressColor: string;
  fields: string[];
}

type CategoryConfigType = {
  [key in 'identification' | 'location' | 'timeframe' | 'totalVisits' | 'homeBasedVisits' | 'workBasedVisits']: CategoryConfig;
}

interface StatsProps {
  data: Record<string, any>[];
}

const CATEGORY_CONFIG: CategoryConfigType = {
  identification: {
    title: "Basic Properties",
    description: "Core identifiers and metadata",
    icon: Database,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-500",
    progressColor: "bg-blue-500",
    fields: [
      'id', 
      'name', 
      'type',
      'publication_date',
      'version_code',
      'ticker_symbol',
      'company_name'
    ]
  },
  location: {
    title: "Geographic Data",
    description: "Location coordinates and regions",
    icon: MapPin,
    bgColor: "bg-green-50",
    iconColor: "text-green-500",
    progressColor: "bg-green-500",
    fields: [
      'lat',
      'lng',
      'region_type',
      'region_name',
      'region_code',
      'state_code',
      'address',
      'zipcode',
      'country',
      'country_code'
    ]
  },
  timeframe: {
    title: "Time Period",
    description: "Date ranges and time periods",
    icon: Calendar,
    bgColor: "bg-yellow-50",
    iconColor: "text-yellow-500",
    progressColor: "bg-yellow-500",
    fields: [
      'time_frame',
      'start_date',
      'end_date'
    ]
  },
  totalVisits: {
    title: "Total Visits",
    description: "Overall foot traffic metrics",
    icon: Users,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-500",
    progressColor: "bg-purple-500",
    fields: [
      'foottraffic',
      'visit_duration_segmentation'
    ]
  },
  homeBasedVisits: {
    title: "Home-Based Visits",
    description: "Visit patterns based on home distance",
    icon: Home,
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-500",
    progressColor: "bg-indigo-500",
    fields: [
      'home_distance_estimated_foottraffic_0.3',
      'home_distance_estimated_foottraffic_0.5',
      'home_distance_estimated_foottraffic_0.7',
      'home_distance_estimated_foottraffic_1',
      'home_distance_estimated_foottraffic_2',
      'home_distance_estimated_foottraffic_3',
      'home_distance_estimated_foottraffic_5',
      'home_distance_estimated_foottraffic_7',
      'home_distance_estimated_foottraffic_10',
      'home_distance_estimated_foottraffic_30',
      'home_distance_estimated_foottraffic_50',
      'home_distance_estimated_foottraffic_100',
      'home_distance_estimated_foottraffic_250',
      'home_distance_estimated_foottraffic_250+',
      'home_distance_percentage_0.3',
      'home_distance_percentage_0.5',
      'home_distance_percentage_0.7',
      'home_distance_percentage_1',
      'home_distance_percentage_2',
      'home_distance_percentage_3',
      'home_distance_percentage_5',
      'home_distance_percentage_7',
      'home_distance_percentage_10',
      'home_distance_percentage_30',
      'home_distance_percentage_50',
      'home_distance_percentage_100',
      'home_distance_percentage_250',
      'home_distance_percentage_250+'
    ]
  },
  workBasedVisits: {
    title: "Work-Based Visits",
    description: "Visit patterns based on work distance",
    icon: Briefcase,
    bgColor: "bg-rose-50",
    iconColor: "text-rose-500",
    progressColor: "bg-rose-500",
    fields: [
      'work_distance_estimated_foottraffic_0.3',
      'work_distance_estimated_foottraffic_0.5',
      'work_distance_estimated_foottraffic_0.7',
      'work_distance_estimated_foottraffic_1',
      'work_distance_estimated_foottraffic_2',
      'work_distance_estimated_foottraffic_3',
      'work_distance_estimated_foottraffic_5',
      'work_distance_estimated_foottraffic_7',
      'work_distance_estimated_foottraffic_10',
      'work_distance_estimated_foottraffic_30',
      'work_distance_estimated_foottraffic_50',
      'work_distance_estimated_foottraffic_100',
      'work_distance_estimated_foottraffic_250',
      'work_distance_estimated_foottraffic_250+',
      'work_distance_percentage_0.3',
      'work_distance_percentage_0.5',
      'work_distance_percentage_0.7',
      'work_distance_percentage_1',
      'work_distance_percentage_2',
      'work_distance_percentage_3',
      'work_distance_percentage_5',
      'work_distance_percentage_7',
      'work_distance_percentage_10',
      'work_distance_percentage_30',
      'work_distance_percentage_50',
      'work_distance_percentage_100',
      'work_distance_percentage_250',
      'work_distance_percentage_250+'
    ]
  }
};

const Stats: React.FC<StatsProps> = ({ data }) => {
  const stats = React.useMemo(() => {
    if (!data?.length) return null;

    const uniqueBuildings = new Set(data.map(d => d.name));
    const totalVisits = data.length;

    // Get the full date range of the dataset
    const dates = data.flatMap(d => [new Date(d.start_date), new Date(d.end_date)]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const dateRange = {
      start: minDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      end: maxDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };

    // Categorize columns by their data type/purpose
    const columnCategories = (Object.keys(CATEGORY_CONFIG) as Array<keyof CategoryConfigType>).reduce((acc, category) => {
      acc[category] = CATEGORY_CONFIG[category].fields.filter((field: string) => data[0].hasOwnProperty(field));
      return acc;
    }, {} as Record<keyof CategoryConfigType, string[]>);

    // Count how many columns from each category are present in the data
    const categoryPresence = Object.entries(columnCategories).reduce((acc, [category, columns]) => {
      const presentColumns = columns.filter(col => data[0].hasOwnProperty(col));
      acc[category as keyof CategoryConfigType] = {
        present: presentColumns.length,
        total: CATEGORY_CONFIG[category as keyof CategoryConfigType].fields.length,
        columns: presentColumns
      };
      return acc;
    }, {} as Record<keyof CategoryConfigType, { present: number, total: number, columns: string[] }>);

    // Calculate total available fields
    const totalFields = Object.values(categoryPresence).reduce(
      (sum, category) => sum + category.present,
      0
    );

    return {
      uniqueBuildings: uniqueBuildings.size,
      totalVisits,
      dateRange,
      totalFields,
      dataStructure: categoryPresence
    };
  }, [data]);

  if (!stats) return null;

  return (
    <div className="space-y-8 mb-16">
      {/* Basic Stats */}
      <div className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Building Stats Card */}
          <Card className="bg-gray-800/50 border-0">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  <span className="text-[10px] sm:text-xs font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                    Buildings
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white">{stats.uniqueBuildings.toLocaleString()}</p>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400">Unique buildings</p>
            </CardContent>
          </Card>

          {/* Records Stats Card */}
          <Card className="bg-gray-800/50 border-0">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  <span className="text-[10px] sm:text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                    Records
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalVisits.toLocaleString()}</p>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400">Total data points</p>
            </CardContent>
          </Card>

          {/* Fields Stats Card */}
          <Card className="bg-gray-800/50 border-0">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Table className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                  <span className="text-[10px] sm:text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                    Fields
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalFields.toLocaleString()}</p>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400">Available data fields</p>
            </CardContent>
          </Card>

          {/* Time Range Stats Card */}
          <Card className="bg-gray-800/50 border-0">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                  <span className="text-[10px] sm:text-xs font-medium text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">
                    Time Range
                  </span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {stats.dateRange.start} - {stats.dateRange.end}
                </p>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400">Data coverage period</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Data Structure */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-300">Data Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(stats.dataStructure).map(([category, info]: [string, any]) => (
            <div key={category} className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  {React.createElement(CATEGORY_CONFIG[category as keyof CategoryConfigType].icon, { 
                    className: `w-4 h-4 sm:w-5 sm:h-5 ${CATEGORY_CONFIG[category as keyof CategoryConfigType].iconColor}` 
                  })}
                  <h4 className="text-sm sm:text-md font-semibold capitalize">
                    {CATEGORY_CONFIG[category as keyof CategoryConfigType].title}
                  </h4>
                </div>
                <span className="text-xs sm:text-sm text-gray-400">
                  {info.present}/{info.total} fields
                </span>
              </div>
              <div className="text-xs sm:text-sm text-gray-400 flex flex-wrap gap-2">
                {info.columns.map((col: string) => (
                  <span key={col} className="inline-block bg-gray-700/50 px-2 py-1 rounded">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Section Header */}
      <div className="pt-8 border-t border-gray-800">
        <h2 className="text-xl font-semibold text-gray-200">Detailed Analysis</h2>
        <p className="text-gray-400 mt-2">
          Explore comprehensive building analytics through interactive visualizations:
        </p>
        <ul className="mt-3 text-gray-400 space-y-1 list-disc list-inside ml-4">
          <li>Hourly traffic patterns and peak times</li>
          <li>Weekly visitor distribution trends</li>
          <li>Geographic heat map of building activity</li>
          <li>Detailed building-specific metrics and comparisons</li>
        </ul>
      </div>
    </div>
  );
};

export default Stats;