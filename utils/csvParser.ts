import Papa from 'papaparse';

export async function loadMonthlyData(buildingId: string) {
  try {
    const response = await fetch('/data/Hines_monthly_2024-12-06.csv');
    const csvText = await response.text();
    
    const results = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true
    });

    // Filter for this building's records
    const buildingRecords = results.data.filter((record: any) => 
      record.id === buildingId
    );

    // Extract the visits by day of week data
    return buildingRecords.map((record: any) => ({
      start_date: record.start_date,
      end_date: record.end_date,
      visits_by_day_of_week_sunday: record.visits_by_day_of_week_sunday,
      visits_by_day_of_week_monday: record.visits_by_day_of_week_monday,
      visits_by_day_of_week_tuesday: record.visits_by_day_of_week_tuesday,
      visits_by_day_of_week_wednesday: record.visits_by_day_of_week_wednesday,
      visits_by_day_of_week_thursday: record.visits_by_day_of_week_thursday,
      visits_by_day_of_week_friday: record.visits_by_day_of_week_friday,
      visits_by_day_of_week_saturday: record.visits_by_day_of_week_saturday
    }));
  } catch (error) {
    console.error('Error loading monthly data:', error);
    return [];
  }
} 