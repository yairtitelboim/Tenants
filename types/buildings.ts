export interface ProcessedBuildingEntry {
  id: string;
  name: string;
  foottraffic: number;
  lat: number;
  lng: number;
  start_date: string;
  end_date: string;
  visits_by_day_of_week_sunday: number;
  visits_by_day_of_week_monday: number;
  visits_by_day_of_week_tuesday: number;
  visits_by_day_of_week_wednesday: number;
  visits_by_day_of_week_thursday: number;
  visits_by_day_of_week_friday: number;
  visits_by_day_of_week_saturday: number;
}

export interface BuildingListItem {
  id: string;
  name: string;
  rank: number;
  lat: number;
  lng: number;
  foottraffic: number;
  start_date: string;
  end_date: string;
  visits_by_day_of_week_sunday: number;
  visits_by_day_of_week_monday: number;
  visits_by_day_of_week_tuesday: number;
  visits_by_day_of_week_wednesday: number;
  visits_by_day_of_week_thursday: number;
  visits_by_day_of_week_friday: number;
  visits_by_day_of_week_saturday: number;
} 