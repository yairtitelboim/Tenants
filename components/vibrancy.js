import Papa from 'papaparse';

// Constants for vibrancy score calculation
const WORKING_HOURS_START = 8;  // 8 AM
const WORKING_HOURS_END = 18;   // 6 PM

const calculateDwellScore = (buildingData) => {
  // Get dwell time distribution
  const dwellTimes = {
    '10-15': parseInt(buildingData.visits_by_dwell_time_10_15) || 0,
    '15-30': parseInt(buildingData.visits_by_dwell_time_15_30) || 0,
    '30-45': parseInt(buildingData.visits_by_dwell_time_30_45) || 0,
    '45-60': parseInt(buildingData.visits_by_dwell_time_45_60) || 0,
    '60-75': parseInt(buildingData.visits_by_dwell_time_60_75) || 0,
    '75-90': parseInt(buildingData.visits_by_dwell_time_75_90) || 0,
    '90-105': parseInt(buildingData.visits_by_dwell_time_90_105) || 0,
    '105-120': parseInt(buildingData.visits_by_dwell_time_105_120) || 0
  };

  // Calculate total visits with dwell time data
  const totalVisits = Object.values(dwellTimes).reduce((sum, count) => sum + count, 0);
  if (totalVisits === 0) return 0;

  // Weight longer stays more heavily
  const weightedSum = (
    dwellTimes['10-15'] * 0.1 +
    dwellTimes['15-30'] * 0.2 +
    dwellTimes['30-45'] * 0.4 +
    dwellTimes['45-60'] * 0.6 +
    dwellTimes['60-75'] * 0.8 +
    dwellTimes['75-90'] * 0.9 +
    dwellTimes['90-105'] * 1.0 +
    dwellTimes['105-120'] * 1.0
  );

  return weightedSum / (totalVisits * 1.0);
};

const calculateSpreadScore = (buildingData) => {
  // Get weekday distribution
  const weekdayVisits = {
    monday: parseInt(buildingData.visits_by_day_of_week_monday) || 0,
    tuesday: parseInt(buildingData.visits_by_day_of_week_tuesday) || 0,
    wednesday: parseInt(buildingData.visits_by_day_of_week_wednesday) || 0,
    thursday: parseInt(buildingData.visits_by_day_of_week_thursday) || 0,
    friday: parseInt(buildingData.visits_by_day_of_week_friday) || 0,
    saturday: parseInt(buildingData.visits_by_day_of_week_saturday) || 0,
    sunday: parseInt(buildingData.visits_by_day_of_week_sunday) || 0
  };

  // Calculate total visits
  const totalVisits = Object.values(weekdayVisits).reduce((sum, count) => sum + count, 0);
  if (totalVisits === 0) return 0;

  // Calculate average visits per day
  const avgVisits = totalVisits / 7;
  
  // Calculate variance from average
  const variance = Object.values(weekdayVisits).reduce((sum, count) => {
    const diff = count - avgVisits;
    return sum + (diff * diff);
  }, 0) / 7;

  // Convert variance to a 0-1 score (higher variance = lower score)
  const maxVariance = avgVisits * avgVisits; // theoretical maximum variance
  const varianceScore = Math.max(0, 1 - (variance / maxVariance));

  return varianceScore;
};

export const calculateVibrancyScore = (buildingData, allLocations) => {
  // Filter locations to only include those from the same region and time frame type
  const comparableLocations = allLocations.filter(l => 
    l.time_frame === buildingData.time_frame && 
    l.region_code === buildingData.region_code
  );
  
  // Calculate traffic score
  const currentFoottraffic = parseInt(buildingData.foottraffic) || 0;
  const maxFoottraffic = Math.max(...comparableLocations
    .map(l => parseInt(l.foottraffic) || 0)
    .filter(v => !isNaN(v) && v > 0));
  const trafficScore = maxFoottraffic > 0 ? currentFoottraffic / maxFoottraffic : 0;

  // Calculate dwell and spread scores
  const dwellScore = calculateDwellScore(buildingData);
  const spreadScore = calculateSpreadScore(buildingData);

  return {
    score: Math.round((trafficScore * 0.4 + dwellScore * 0.3 + spreadScore * 0.3) * 100),
    components: {
      trafficScore: Math.round(trafficScore * 100),
      dwellScore: Math.round(dwellScore * 100),
      spreadScore: Math.round(spreadScore * 100)
    }
  };
};
