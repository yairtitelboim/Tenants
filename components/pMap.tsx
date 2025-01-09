import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import Popup from './popup';
import Admin from './admin';
import Papa from 'papaparse';

// Set the access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

const BUILDING_COLORS = {
  DEFAULT: '#666',
  SELECTED: '#60A5FA',
};

const CUSTOM_BUILDINGS = {
  'texas_tower': {
    coordinates: [-95.363548, 29.761152],
    height: 147, // 482 feet in meters
    baseHeight: 0,
    name: 'Texas Tower',
    footprint: [
      [-95.363748, 29.760952], // Rotated Southwest
      [-95.363348, 29.760852], // Rotated Southeast
      [-95.363348, 29.761352], // Rotated Northeast
      [-95.363748, 29.761252], // Rotated Northwest
      [-95.363748, 29.760952], // Close the polygon (back to start)
    ]
  }
};

// First, define the coordinates as a constant at the top level or in a config file
const TEXAS_TOWER_COORDINATES = [[
  [-95.36324456334114, 29.761400526984772],
  [-95.36321237683296, 29.761280612983754],
  [-95.36316812038422, 29.7612899266977],
  [-95.36313727498055, 29.761181654719465],
  [-95.3631828725338, 29.761172340995444],
  [-95.36314934492111, 29.76105242672132],
  [-95.36341086030006, 29.760997708509734],
  [-95.36340147256851, 29.760960453540036],
  [-95.3635074198246, 29.76093833339523],
  [-95.36351814866066, 29.760975588373142],
  [-95.36383867263794, 29.760908063715505],
  [-95.36387354135513, 29.761031470814004],
  [-95.36391913890839, 29.76102215707604],
  [-95.36394730210304, 29.76112926501058],
  [-95.3639030456543, 29.761137414522636],
  [-95.36393657326698, 29.761256164480486],
  [-95.36370724439621, 29.761303897267013],
  [-95.36371797323227, 29.761344644749727],
  [-95.36360800266266, 29.76136560059153],
  [-95.3635986149311, 29.76132718154487],
  [-95.36324456334114, 29.761400526984772] // Close the polygon
]];

// Add this constant at the top with other constants
const MARKER_COLOR = '#4ade80'; // This is the Tailwind green-400 color that matches admin.tsx

// Add these constants
const HIGHLIGHT_CIRCLE_ID = 'highlight-circle';
const HIGHLIGHT_CIRCLE_SOURCE = 'highlight-circle-source';
const HIGHLIGHT_CIRCLE_OUTER_ID = 'highlight-circle-outer';
const HIGHLIGHT_CIRCLE_OUTER_SOURCE = 'highlight-circle-outer-source';
const HIGHLIGHT_RADIUS = 400; // Inner circle radius (feet)
const HIGHLIGHT_RADIUS_OUTER = 800; // Outer circle radius (feet)

// Add these constants at the top of the file
const MIN_GREEN = 100; // Minimum green intensity (darker)
const MAX_GREEN = 800; // Maximum green intensity (brighter)

// Add this interface at the top of the file with your other types
interface BuildingEntry {
  name: string;
  foottraffic: number;
  lat: number;
  lng: number;
  id: string;
  start_date: string;
  end_date: string;
  visits_by_day_of_week_sunday: number;
  visits_by_day_of_week_monday: number;
  visits_by_day_of_week_tuesday: number;
  visits_by_day_of_week_wednesday: number;
  visits_by_day_of_week_thursday: number;
  visits_by_day_of_week_friday: number;
  visits_by_day_of_week_saturday: number;
  address?: string;
  state?: string;
  visit_duration?: string;
  properties?: Record<string, any>;
}

// Add this helper function to calculate marker color based on foottraffic
const getMarkerColor = (foottraffic: number, maxFoottraffic: number): string => {
  // Normalize foottraffic to a value between 0 and 1
  const normalized = Math.min(foottraffic / maxFoottraffic, 1);
  // Map to a green intensity between MIN_GREEN and MAX_GREEN
  const greenIntensity = Math.round(MIN_GREEN + (normalized * (MAX_GREEN - MIN_GREEN)));
  return `rgb(0, ${greenIntensity}, 0)`;
};

// Add this helper function at the top of your component
const cleanupMapResources = (map: mapboxgl.Map | null) => {
  if (!map || !map.loaded()) return;

  try {
    if (map.getLayer(HIGHLIGHT_CIRCLE_ID)) {
      map.removeLayer(HIGHLIGHT_CIRCLE_ID);
    }
    if (map.getLayer(HIGHLIGHT_CIRCLE_OUTER_ID)) {
      map.removeLayer(HIGHLIGHT_CIRCLE_OUTER_ID);
    }
    if (map.getSource(HIGHLIGHT_CIRCLE_SOURCE)) {
      map.removeSource(HIGHLIGHT_CIRCLE_SOURCE);
    }
    if (map.getSource(HIGHLIGHT_CIRCLE_OUTER_SOURCE)) {
      map.removeSource(HIGHLIGHT_CIRCLE_OUTER_SOURCE);
    }
  } catch (error) {
    console.log('Cleanup error:', error);
  }
};

// Add this function to process buildings for admin panel
const processBuildings = (locations: any[]) => {
  const uniqueBuildings = new Map();
  
  locations.forEach(location => {
    if (!uniqueBuildings.has(location.name)) {
      uniqueBuildings.set(location.name, {
        name: location.name,
        rank: location.rank || 0,
        foottraffic: parseInt(location.foottraffic) || 0,
        id: location.id,
        lng: parseFloat(location.lng),
        lat: parseFloat(location.lat),
        // Add any other required fields
      });
    }
  });

  return Array.from(uniqueBuildings.values())
    .sort((a, b) => b.foottraffic - a.foottraffic)
    .map((building, index) => ({
      ...building,
      rank: index + 1
    }));
};

// Add this helper function
const getHourlyDistributionFactor = (hour: number) => {
  // Early morning (midnight to 6am)
  if (hour >= 0 && hour < 6) {
    return 0.01;
  }
  // Morning ramp-up (6am to 9am)
  if (hour >= 6 && hour < 9) {
    return 0.02 + (hour - 6) * 0.02; // Gradually increases
  }
  // Peak morning (9am to 11am)
  if (hour >= 9 && hour < 11) {
    return 0.09;
  }
  // Lunch dip (11am to 2pm)
  if (hour >= 11 && hour < 14) {
    return 0.07;
  }
  // Afternoon peak (2pm to 5pm)
  if (hour >= 14 && hour < 17) {
    return 0.08;
  }
  // Evening ramp-down (5pm to 8pm)
  if (hour >= 17 && hour < 20) {
    return 0.06 - (hour - 17) * 0.015; // Gradually decreases
  }
  // Night (8pm to midnight)
  return 0.02;
};

// Add this type at the top of your file
type GeoJSONFeature = {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
};

export default function PMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const selectedBuildingId = useRef<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [adminData, setAdminData] = useState({
    totalBuildings: 0,
    selectedBuildings: 0,
    lastUpdate: '12/18/2024',
    buildingsList: [] as Array<{
      name: string;
      rank: number;
      foottraffic: number;
      id: string;
    }>
  });
  const [highlightedBuilding, setHighlightedBuilding] = useState<string | undefined>();
  const [showAdmin, setShowAdmin] = useState(true);
  const [buildingRankings, setBuildingRankings] = useState<Map<string, number>>(new Map());
  const [csvData, setCsvData] = useState<BuildingEntry[]>([]);

  useEffect(() => {
    // Create timestamp once at the start of data loading
    const timestamp = new Date().toISOString();
    
    fetch('/data/Hines_monthly_2024-12-18.csv')
      .then(response => response.text())
      .then(text => {
        const lines = text.split('\n').slice(1);
        const parsedData = lines
          .filter(line => line.trim().length > 0)
          .map(line => {
            const columns = line.split(',');
            
            if (columns[11] && columns[12] && !isNaN(parseFloat(columns[11])) && !isNaN(parseFloat(columns[12]))) {
              return {
                name: columns[3]?.trim(),
                lat: parseFloat(columns[11]),
                lng: parseFloat(columns[12]),
                state: columns[9]?.trim(),
                id: columns[2],
                foottraffic: parseInt(columns[16]) || 0,
                visit_duration: columns[15],
                start_date: columns[6],
                end_date: columns[7],
                // Weekly visits from the correct columns
                visits_by_day_of_week_sunday: parseInt(columns[161]) || 0,
                visits_by_day_of_week_monday: parseInt(columns[162]) || 0,
                visits_by_day_of_week_tuesday: parseInt(columns[163]) || 0,
                visits_by_day_of_week_wednesday: parseInt(columns[164]) || 0,
                visits_by_day_of_week_thursday: parseInt(columns[165]) || 0,
                visits_by_day_of_week_friday: parseInt(columns[166]) || 0,
                visits_by_day_of_week_saturday: parseInt(columns[167]) || 0,
                address: `${columns[8]}, ${columns[9]}, ${columns[10]}`
              };
            }
            return null;
          })
          .filter(entry => entry !== null);

        // Group data by building name
        const buildingsMap: Record<string, BuildingEntry> = {};
        
        parsedData.forEach(entry => {
          if (!buildingsMap[entry.name]) {
            buildingsMap[entry.name] = entry;
          } else {
            // Update if this entry has higher foottraffic
            if ((entry.foottraffic || 0) > (buildingsMap[entry.name].foottraffic || 0)) {
              buildingsMap[entry.name] = entry;
            }
          }
        });

        // Convert back to array for locations
        const uniqueLocations = Object.values(buildingsMap);

        // Set locations with full data for popups
        setLocations(parsedData);

        // Create buildingsList for admin panel using unique buildings
        const buildingsList = uniqueLocations.map((building: any, index) => ({
          name: building.name,
          rank: index + 1,
          foottraffic: building.foottraffic,
          id: `building-${building.id}-${index}`
        }));

        // After processing the buildings list:
        const processedBuildings = processBuildings(uniqueLocations);
        
        // Create a Map of building names to their rankings
        const rankingsMap = new Map(
          processedBuildings.map(building => [building.name, building.rank])
        );
        
        setBuildingRankings(rankingsMap);
        
        setAdminData({
          totalBuildings: processedBuildings.length,
          selectedBuildings: 0,
          lastUpdate: new Date().toISOString(),
          buildingsList: processedBuildings
        });
      })
      .catch(error => {
        console.error('Error loading building data:', error);
      });
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [-98.5795, 39.8283],
      zoom: 3,
      antialias: true
    });

    // Add navigation controls with default settings
    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on('load', () => {
      if (!map.current) return;

      // Add the default buildings layer first
      map.current.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            BUILDING_COLORS.SELECTED,
            BUILDING_COLORS.DEFAULT
          ],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15, 0,
            15.05, ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.8
        }
      });

      // Add a custom source for Texas Tower
      map.current.addSource('texas-tower-source', {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'geometry': {
            'type': 'Polygon',
            'coordinates': TEXAS_TOWER_COORDINATES
          },
          'properties': {
            'height': 147,
            'base_height': 0,
            'name': 'Texas Tower'
          }
        }
      });

      // Add Texas Tower layer using the custom source
      map.current.addLayer({
        'id': 'texas-tower',
        'source': 'texas-tower-source',
        'type': 'fill-extrusion',
        'paint': {
          'fill-extrusion-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            BUILDING_COLORS.SELECTED,
            BUILDING_COLORS.DEFAULT
          ],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'base_height'],
          'fill-extrusion-opacity': 0.8
        }
      });

      // Add the inner circle source and layer
      map.current.addSource(HIGHLIGHT_CIRCLE_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        } as GeoJSONFeature
      });

      // Add the outer circle source and layer
      map.current.addSource(HIGHLIGHT_CIRCLE_OUTER_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        } as GeoJSONFeature
      });

      // Inner circle layer
      map.current.addLayer({
        id: HIGHLIGHT_CIRCLE_ID,
        type: 'line',
        source: HIGHLIGHT_CIRCLE_SOURCE,
        paint: {
          'line-color': '#FFEB3B',
          'line-width': 1,
          'line-opacity': 0.3
        }
      });

      // Outer circle layer
      map.current.addLayer({
        id: HIGHLIGHT_CIRCLE_OUTER_ID,
        type: 'line',
        source: HIGHLIGHT_CIRCLE_OUTER_SOURCE,
        paint: {
          'line-color': '#FFEB3B',
          'line-width': 2,
          'line-opacity': 0.2
        }
      });

      // Add a debug click handler
      map.current.on('click', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, {
          layers: ['3d-buildings', 'texas-tower']
        });
        
        if (features && 
            features.length > 0 && 
            features[0].properties && 
            'lon' in features[0].properties && 
            'lat' in features[0].properties && 
            'height' in features[0].properties && 
            features[0].layer) {
          console.log('Building clicked:', {
            lon: features[0].properties.lon,
            lat: features[0].properties.lat,
            height: features[0].properties.height,
            layer: features[0].layer.id,
            properties: features[0].properties
          });
        }
      });

      map.current.on('click', '3d-buildings', (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          console.log('Building footprint:', {
            type: 'Feature',
            geometry: feature.geometry,
            properties: feature.properties
          });
        }
      });
    });

    return () => {
      if (map.current) {
        cleanupMapResources(map.current);
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || locations.length === 0) return;

    // Find maximum foottraffic for normalization
    const maxFoottraffic = Math.max(...locations.map(loc => parseInt(loc.foottraffic) || 0));

    // Sort locations by foottraffic (ascending) so busier locations are added last
    const sortedLocations = [...locations].sort((a, b) => {
      const aTraffic = parseInt(a.foottraffic) || 0;
      const bTraffic = parseInt(b.foottraffic) || 0;
      return aTraffic - bTraffic;
    });

    // Create new markers
    sortedLocations.forEach(location => {
      if (location.lat && location.lng && !isNaN(location.lat) && !isNaN(location.lng)) {
        const marker = new mapboxgl.Marker({
          color: getMarkerColor(parseInt(location.foottraffic) || 0, maxFoottraffic)
        })
          .setLngLat([location.lng, location.lat])
          .addTo(map.current!);

        // Set z-index based on foottraffic
        const el = marker.getElement();
        const zIndex = Math.floor((parseInt(location.foottraffic) || 0) / maxFoottraffic * 900);
        el.style.zIndex = String(zIndex + 100); // Base z-index of 100

        // Add click handler
        el.addEventListener('click', () => {
          handleMarkerClick({
            ...location,
            // Add these fields for the visit pattern visualization
            visits_by_day_of_week_sunday: location.visits_by_day_of_week_sunday,
            visits_by_day_of_week_monday: location.visits_by_day_of_week_monday,
            visits_by_day_of_week_tuesday: location.visits_by_day_of_week_tuesday,
            visits_by_day_of_week_wednesday: location.visits_by_day_of_week_wednesday,
            visits_by_day_of_week_thursday: location.visits_by_day_of_week_thursday,
            visits_by_day_of_week_friday: location.visits_by_day_of_week_friday,
            visits_by_day_of_week_saturday: location.visits_by_day_of_week_saturday
          });
        });

        markers.current.push(marker);
      }
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
    };
  }, [locations]);

  // Helper function to find building data in CSV
  const findBuildingInCSV = (buildingName: string) => {
    // Only log if debugging is needed
    // console.log('Looking for building in CSV:', buildingName);
    
    const matches = csvData.filter(row => row.name === buildingName);
    
    if (matches.length > 0) {
      return matches.sort((a, b) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )[0];
    }
    return null;
  };

  // Restore the handleMarkerClick function with building highlight and correct pitch
  const handleMarkerClick = (location: any) => {
    console.log('=== Building Marker Click Debug ===');
    console.log('1. Location data:', location);
    console.log('================================');
    
    const BUFFER_SIZE = 20;
    const point = map.current?.project([location.lng, location.lat]);
    
    if (!point) return;

    const boundingBox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
      [point.x - BUFFER_SIZE, point.y - BUFFER_SIZE],
      [point.x + BUFFER_SIZE, point.y + BUFFER_SIZE]
    ];

    const features = map.current?.queryRenderedFeatures(boundingBox, {
      layers: ['3d-buildings', 'texas-tower']
    });

    // Reset all buildings to default color first
    if (map.current) {
      // Reset 3d-buildings layer
      map.current.setPaintProperty('3d-buildings', 'fill-extrusion-color', BUILDING_COLORS.DEFAULT);
      // Reset texas-tower layer
      map.current.setPaintProperty('texas-tower', 'fill-extrusion-color', BUILDING_COLORS.DEFAULT);
    }

    // If we found any buildings, highlight them
    if (features && features.length > 0) {
      const buildingFeatures = features.filter(f => f.layer.id === '3d-buildings');
      
      if (buildingFeatures.length > 0) {
        // Create a Set of unique building IDs
        const uniqueBuildingIds = [...new Set(buildingFeatures.map(f => f.id))];
        
        // Log the IDs for debugging
        console.log('Building IDs to highlight:', uniqueBuildingIds);
        
        // Update the paint property with unique IDs
        map.current?.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
          'match',
          ['id'],
          uniqueBuildingIds,
          BUILDING_COLORS.SELECTED,
          BUILDING_COLORS.DEFAULT
        ]);
      }

      // Handle Texas Tower separately
      if (features.some(f => f.layer.id === 'texas-tower')) {
        map.current?.setPaintProperty('texas-tower', 'fill-extrusion-color', BUILDING_COLORS.SELECTED);
      }
    }

    // Fly to the location
    map.current?.flyTo({
      center: [location.lng, location.lat],
      zoom: 16,
      pitch: 5,
      bearing: -17.6,
      duration: 1000
    });

    const calculateRankings = (location: any) => {
      const overallRanking = buildingRankings.get(location.name) || adminData.buildingsList.length;
      
      // Find market ranking (buildings in same state)
      const marketBuildings = locations
        .filter(l => l.state === location.state)  // Filter to same state
        .filter((building, index, self) =>  // Remove duplicates
          index === self.findIndex(b => b.name === building.name)
        );
      
      // Sort by foot traffic (highest to lowest)
      const sortedMarketBuildings = marketBuildings.sort((a, b) => {
        const aTraffic = parseInt(a.foottraffic) || 0;
        const bTraffic = parseInt(b.foottraffic) || 0;
        return bTraffic - aTraffic;
      });
      
      // Find this building's position in the sorted list
      const marketPosition = sortedMarketBuildings.findIndex(b => b.name === location.name) + 1;
      const totalInMarket = sortedMarketBuildings.length;

      // If ranking wasn't found, set to the last position
      const finalOverallRanking = overallRanking <= 0 ? adminData.buildingsList.length : overallRanking;
      const finalMarketRanking = {
        position: marketPosition <= 0 ? totalInMarket : marketPosition,
        total: totalInMarket
      };

      // Get the daily visits directly from the location object
      const dailyVisits = [
        {
          day: 'Sun',
          visits: parseInt(location.visits_by_day_of_week_sunday) || 0,
          weekdayType: 'weekend'
        },
        {
          day: 'Mon',
          visits: parseInt(location.visits_by_day_of_week_monday) || 0,
          weekdayType: 'weekday'
        },
        {
          day: 'Tue',
          visits: parseInt(location.visits_by_day_of_week_tuesday) || 0,
          weekdayType: 'weekday'
        },
        {
          day: 'Wed',
          visits: parseInt(location.visits_by_day_of_week_wednesday) || 0,
          weekdayType: 'weekday'
        },
        {
          day: 'Thu',
          visits: parseInt(location.visits_by_day_of_week_thursday) || 0,
          weekdayType: 'weekday'
        },
        {
          day: 'Fri',
          visits: parseInt(location.visits_by_day_of_week_friday) || 0,
          weekdayType: 'weekday'
        },
        {
          day: 'Sat',
          visits: parseInt(location.visits_by_day_of_week_saturday) || 0,
          weekdayType: 'weekend'
        }
      ];

      // Calculate total weekly visits (sum of all days)
      const weeklyVisits = dailyVisits.reduce((acc, curr) => acc + curr.visits, 0);

      // Calculate monthly visits and then derive weekly average
      const monthlyVisits = parseInt(location.foottraffic) || 0;
      const averageWeeklyVisits = Math.round(monthlyVisits / 4.345); // 4.345 weeks in a month on average

      // Calculate weekend and weekday averages
      const weekendVisits = dailyVisits
        .filter(d => d.weekdayType === 'weekend')
        .reduce((acc, curr) => acc + curr.visits, 0);
      
      const weekdayVisits = dailyVisits
        .filter(d => d.weekdayType === 'weekday')
        .reduce((acc, curr) => acc + curr.visits, 0);

      const weekendAverage = Math.round(weekendVisits / 2);
      const weekdayAverage = Math.round(weekdayVisits / 5);

      // Find peak day (excluding Sunday)
      const peakDay = dailyVisits
        .filter(d => d.day !== 'Sun')
        .reduce((max, curr) => 
          curr.visits > max.visits ? curr : max
        ).day;

      // Add hourly distribution calculation
      const hourlyData = {};
      for (let hour = 0; hour < 24; hour++) {
        const startHour = hour.toString().padStart(2, '0');
        const endHour = ((hour + 1) % 24).toString().padStart(2, '0');
        const key = `visits_by_hour_of_day_${startHour}:00_${endHour}:00`;
        
        // Add some randomness to make it more realistic
        const baseFactor = getHourlyDistributionFactor(hour);
        const randomVariation = (Math.random() * 0.02) - 0.01; // ±1% random variation
        const factor = Math.max(0, baseFactor + randomVariation);
        
        hourlyData[key] = Math.round(averageWeeklyVisits * factor);
      }

      return {
        overall: finalOverallRanking,
        market: finalMarketRanking,
        peakDay,
        statistics: {
          dailyVisits,
          weekendAverage,
          weekdayAverage,
          weekendToWeekdayRatio: Math.round((weekendAverage / weekdayAverage) * 100) / 100,
          weeklyVisits: averageWeeklyVisits,
          hourlyDistribution: hourlyData
        }
      };
    };

    setSelectedBuilding({
      ...location,
      rankings: calculateRankings(location)
    });

    // Create inner circle using Turf.js
    const center = [location.lng, location.lat];
    const innerCircle = turf.circle(center, HIGHLIGHT_RADIUS, {
      units: 'feet',
      steps: 64
    });

    // Create outer circle using Turf.js
    const outerCircle = turf.circle(center, HIGHLIGHT_RADIUS_OUTER, {
      units: 'feet',
      steps: 64
    });

    // Update both circles
    if (map.current?.getSource(HIGHLIGHT_CIRCLE_SOURCE)) {
      (map.current.getSource(HIGHLIGHT_CIRCLE_SOURCE) as mapboxgl.GeoJSONSource)
        .setData(innerCircle);
    }
    if (map.current?.getSource(HIGHLIGHT_CIRCLE_OUTER_SOURCE)) {
      (map.current.getSource(HIGHLIGHT_CIRCLE_OUTER_SOURCE) as mapboxgl.GeoJSONSource)
        .setData(outerCircle);
    }
  };

  // Add this function inside the PMap component
  const handleAdminBuildingClick = (building: any) => {
    // Use the building data directly since we now have it
    handleMarkerClick(building);
    setShowAdmin(false);  // Hide the admin panel
  };

  // Update the cleanup effect
  useEffect(() => {
    return () => {
      if (map.current) {
        cleanupMapResources(map.current);
      }
    };
  }, []);

  const handleBuildingClick = (building: any) => {
    setSelectedBuilding(building);
    setHighlightedBuilding(undefined);
    setShowAdmin(false);
  };

  const handleBuildingNameClick = (name: string) => {
    setSelectedBuilding(null);
    setHighlightedBuilding(name);
    setShowAdmin(true);
  };

  const processData = (text: string) => {
    Papa.parse(text, {
      header: true,
      complete: (results) => {
        const parsedData = results.data
          .filter((entry: any): entry is BuildingEntry => entry !== null);

        if (parsedData.length > 0) {
          setCsvData(parsedData); // Store the parsed data
          
          const buildingsMap: Record<string, BuildingEntry> = {};
          // ... rest of your processing code ...
        }
      }
    });
  };

  const findBuildingData = (buildingName: string) => {
    const matches = csvData.filter(row => row.name === buildingName);
    
    if (matches.length > 0) {
      return matches.sort((a, b) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )[0];
    }
    return null;
  };

  return (
    <div className="fixed inset-0 w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      
      {/* Admin Panel */}
      {showAdmin && (
        <Admin 
          totalBuildings={adminData.totalBuildings}
          selectedBuildings={adminData.selectedBuildings}
          lastUpdate={adminData.lastUpdate}
          buildingsList={adminData.buildingsList}
          onBuildingClick={handleAdminBuildingClick}
          highlightedBuilding={highlightedBuilding}
        />
      )}

      {/* Building Popup */}
      {selectedBuilding && (
        <Popup 
          buildingData={selectedBuilding}
          locations={locations}
          rankings={selectedBuilding.rankings}
          totalBuildings={adminData.totalBuildings}
          onBuildingNameClick={handleBuildingNameClick}
        />
      )}
    </div>
  );
} 