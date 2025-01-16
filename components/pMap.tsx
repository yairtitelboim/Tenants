import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import Popup from './popup';
import Admin from './admin';
import Papa, { ParseResult, ParseError } from 'papaparse';
import { calculateVibrancyScore } from './vibrancy';

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
  foottraffic: string;
  lat: string;
  lng: string;
  id: string;
  start_date: string;
  end_date: string;
  visits_by_day_of_week_sunday: string;
  visits_by_day_of_week_monday: string;
  visits_by_day_of_week_tuesday: string;
  visits_by_day_of_week_wednesday: string;
  visits_by_day_of_week_thursday: string;
  visits_by_day_of_week_friday: string;
  visits_by_day_of_week_saturday: string;
  address?: string;
  state?: string;
  visit_duration?: string;
  properties?: Record<string, any>;
}

// New interface for processed data
interface ProcessedBuildingEntry {
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

// Add this interface at the top with your other interfaces
interface HourlyData {
  [key: string]: number;
}

// Add this interface for building list items
interface BuildingListItem extends ProcessedBuildingEntry {
  rank: number;
}

// Add this interface for admin data
interface AdminData {
  totalBuildings: number;
  selectedBuildings: number;
  lastUpdate: string;
  buildingsList: BuildingListItem[];
}

// Add this interface near the top of pMap.tsx
interface VibrancyScoreData {
  score: number;
  components: {
    trafficScore: number;
    dwellScore: number;
    spreadScore: number;
  };
}

// Add this interface for building data if not already defined
interface BuildingData {
  id: string;
  name: string;
  // Add other properties your building data has
  coordinates?: number[];
  // ... other properties
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
const processBuildings = (data: ProcessedBuildingEntry[]): BuildingListItem[] => {
  const buildingMap = new Map<string, ProcessedBuildingEntry>();
  
  data.forEach(entry => {
    buildingMap.set(entry.id, entry);
  });

  const sortedBuildings = Array.from(buildingMap.values())
    .sort((a, b) => b.foottraffic - a.foottraffic);

  return sortedBuildings.map((building, index) => ({
    id: building.id,
    name: building.name,
    rank: index + 1,
    lat: building.lat,
    lng: building.lng,
    foottraffic: building.foottraffic,
    start_date: building.start_date,
    end_date: building.end_date,
    visits_by_day_of_week_sunday: building.visits_by_day_of_week_sunday,
    visits_by_day_of_week_monday: building.visits_by_day_of_week_monday,
    visits_by_day_of_week_tuesday: building.visits_by_day_of_week_tuesday,
    visits_by_day_of_week_wednesday: building.visits_by_day_of_week_wednesday,
    visits_by_day_of_week_thursday: building.visits_by_day_of_week_thursday,
    visits_by_day_of_week_friday: building.visits_by_day_of_week_friday,
    visits_by_day_of_week_saturday: building.visits_by_day_of_week_saturday
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

// Replace console.log statements with a debug flag
const DEBUG = false;

// Add this helper function to find buildings by coordinates
const findBuildingByCoordinates = (lat: number, lng: number, locations: any[], threshold = 0.0001) => {
  return locations.find(loc => 
    Math.abs(loc.lat - lat) < threshold && 
    Math.abs(loc.lng - lng) < threshold
  );
};

export default function PMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [locations, setLocations] = useState<ProcessedBuildingEntry[]>([]);
  const selectedBuildingId = useRef<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [adminData, setAdminData] = useState<AdminData>({
    totalBuildings: 0,
    selectedBuildings: 0,
    lastUpdate: new Date().toISOString(),
    buildingsList: []
  });
  const [highlightedBuilding, setHighlightedBuilding] = useState<string | undefined>();
  const [showAdmin, setShowAdmin] = useState(true);
  const [buildingRankings, setBuildingRankings] = useState<Map<string, number>>(new Map());
  const [csvData, setCsvData] = useState<BuildingEntry[]>([]);
  const [buildingVibrancyScores, setBuildingVibrancyScores] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      try {
        console.log('Attempting to fetch CSV from:', '/data/Hines_monthly_2024-12-18.csv');
        const response = await fetch('/data/Hines_monthly_2024-12-18.csv');
        
        if (!isMounted) return;
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        if (!isMounted) return;
        
        console.log('CSV data received, first 100 chars:', text.substring(0, 100));
        if (!text.trim()) {
          throw new Error('Received empty CSV data');
        }
        
        processData(text);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching or processing CSV:', error);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
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
    console.log('[Markers] Locations length:', locations.length);
    if (!map.current || locations.length === 0) {
      console.log('[Markers] Skipping marker creation - no map or locations');
      return;
    }

    // Find maximum foottraffic for normalization
    const maxFoottraffic = Math.max(...locations.map(loc => loc.foottraffic));
    console.log('[Markers] Max foottraffic:', maxFoottraffic);

    // Sort locations by foottraffic (ascending) so busier locations are added last
    const sortedLocations = [...locations].sort((a, b) => a.foottraffic - b.foottraffic);

    // Create new markers
    sortedLocations.forEach(location => {
      if (location.lat && location.lng && !isNaN(location.lat) && !isNaN(location.lng)) {
        const marker = new mapboxgl.Marker({
          color: getMarkerColor(location.foottraffic, maxFoottraffic)
        })
          .setLngLat([location.lng, location.lat])
          .addTo(map.current!);

        // Set z-index based on foottraffic
        const el = marker.getElement();
        const zIndex = Math.floor(location.foottraffic / maxFoottraffic * 900);
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

  // Add this effect to calculate vibrancy scores when locations change
  useEffect(() => {
    if (locations.length === 0) return;
    
    const scores = new Map();
    locations.forEach(location => {
      if (!scores.has(location.id)) {
        scores.set(location.id, calculateVibrancyScore(location, locations));
      }
    });
    
    setBuildingVibrancyScores(scores);
  }, [locations]);

  // Restore the handleMarkerClick function with building highlight and correct pitch
  const handleMarkerClick = async (location: any) => {
    if (DEBUG) console.log('=== Building Marker Click Debug ===');
    
    if (!map.current) return;
    
    // Get building IDs first
    const features = map.current.queryRenderedFeatures(
      [location.lng, location.lat],
      { layers: ['3d-buildings'] }
    );
    
    const buildingIdsToHighlight = features.map(f => f.properties?.id).filter(Boolean);
    
    // Now log the buildings
    console.log("Buildings near click:", buildingIdsToHighlight.map(id => {
      const feature = map.current?.querySourceFeatures('composite', {
        sourceLayer: 'building',
        filter: ['==', 'id', id]
      })[0];
      
      if (!feature?.geometry || 
          feature.geometry.type !== 'MultiPolygon' || 
          !feature.geometry.coordinates?.[0]?.[0]) {
        return { id, name: 'Unknown' };
      }
      
      const [lng, lat] = feature.geometry.coordinates[0][0];
      const building = findBuildingByCoordinates(
        Number(lat), 
        Number(lng), 
        locations
      );
      
      return {
        id,
        name: building?.name || 'Unknown',
        address: building?.address || 'No address',
        coordinates: [lat, lng]
      };
    }));
    
    const BUFFER_SIZE = 20;
    const point = map.current?.project([location.lng, location.lat]);
    
    if (!point) return;

    const boundingBox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
      [point.x - BUFFER_SIZE, point.y - BUFFER_SIZE],
      [point.x + BUFFER_SIZE, point.y + BUFFER_SIZE]
    ];

    const nearbyFeatures = map.current?.queryRenderedFeatures(boundingBox, {
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
    if (nearbyFeatures && nearbyFeatures.length > 0) {
      const buildingFeatures = nearbyFeatures.filter(f => 
        f.layer && 
        'id' in f.layer && 
        f.layer.id === '3d-buildings'
      );
      
      if (buildingFeatures.length > 0) {
        // Create array of unique building IDs using Array.from instead of spread
        const uniqueBuildingIds = Array.from(
          new Set(
            buildingFeatures
              .map(f => f.id)
              .filter((id): id is string => id !== undefined)
          )
        );
        
        // Log the IDs for debugging
        console.log("Building IDs and Names:", uniqueBuildingIds.map(id => {
          const building = locations.find(loc => loc.id === id);
          return {
            id: id,
            name: building?.name || 'Unknown',
            address: building?.address || 'No address'
          };
        }));
        
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
      if (nearbyFeatures.some(f => 
        f.layer && 
        'id' in f.layer && 
        f.layer.id === 'texas-tower'
      )) {
        map.current?.setPaintProperty(
          'texas-tower', 
          'fill-extrusion-color', 
          BUILDING_COLORS.SELECTED
        );
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
      // Create a map to store the latest data for each building
      const latestBuildingData = new Map();
      
      // Get the latest data for each building
      locations.forEach(loc => {
        const existing = latestBuildingData.get(loc.name);
        if (!existing || new Date(loc.start_date) > new Date(existing.start_date)) {
          latestBuildingData.set(loc.name, loc);
        }
      });

      // Convert map to array and sort by foottraffic
      const sortedBuildings = Array.from(latestBuildingData.values())
        .sort((a, b) => parseInt(b.foottraffic) - parseInt(a.foottraffic));

      // Find overall position
      const overallPosition = sortedBuildings.findIndex(b => b.id === location.id) + 1;

      // Get market (region) rankings
      const marketBuildings = sortedBuildings
        .filter(b => b.region_code === location.region_code)
        .sort((a, b) => parseInt(b.foottraffic) - parseInt(a.foottraffic));

      const marketPosition = marketBuildings.findIndex(b => b.id === location.id) + 1;

      // Calculate peak day
      const weekdayVisits = {
        Monday: parseInt(location.visits_by_day_of_week_monday) || 0,
        Tuesday: parseInt(location.visits_by_day_of_week_tuesday) || 0,
        Wednesday: parseInt(location.visits_by_day_of_week_wednesday) || 0,
        Thursday: parseInt(location.visits_by_day_of_week_thursday) || 0,
        Friday: parseInt(location.visits_by_day_of_week_friday) || 0,
        Saturday: parseInt(location.visits_by_day_of_week_saturday) || 0,
        Sunday: parseInt(location.visits_by_day_of_week_sunday) || 0
      };

      const peakDay = Object.entries(weekdayVisits)
        .reduce((max, [day, visits]) => visits > max.visits ? { day, visits } : max, 
          { day: 'Monday', visits: weekdayVisits.Monday });

      // Add hourly distribution data processing
      const hourlyDistribution: { [key: string]: number } = {};
      for (let hour = 0; hour < 24; hour++) {
        const paddedHour = hour.toString().padStart(2, '0');
        const nextHour = ((hour + 1) % 24).toString().padStart(2, '0');
        const key = `visits_by_hour_of_day_${paddedHour}:00_${nextHour}:00`;
        hourlyDistribution[key] = parseFloat(location[key] || '0');
      }

      return {
        overall: overallPosition,
        market: {
          position: marketPosition,
          total: marketBuildings.length
        },
        totalBuildings: sortedBuildings.length,
        peakDay: peakDay.day.substring(0, 3),
        statistics: {
          hourlyDistribution
        }
      };
    };

    // Calculate rankings before setting selected building
    const rankings = calculateRankings(location);
    
    setSelectedBuilding({
      ...location,
      rankings: rankings // Now includes hourly distribution data
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

    // Add this helper function to find buildings by coordinates
    const findBuildingByCoordinates = (lat: number, lng: number, locations: any[], threshold = 0.0001) => {
      return locations.find(loc => 
        Math.abs(loc.lat - lat) < threshold && 
        Math.abs(loc.lng - lng) < threshold
      );
    };

    // Update the logging in handleMarkerClick
    console.log("Buildings near click:", buildingIdsToHighlight.map(id => {
      // Get building coordinates from Mapbox feature
      const feature = map.current?.querySourceFeatures('composite', {
        sourceLayer: 'building',
        filter: ['==', 'id', id]
      })[0];
      
      if (!feature?.geometry || 
          feature.geometry.type !== 'MultiPolygon' || 
          !feature.geometry.coordinates?.[0]?.[0]) {
        return { id, name: 'Unknown' };
      }
      
      const [lng, lat] = feature.geometry.coordinates[0][0];
      const building = findBuildingByCoordinates(
        Number(lat), 
        Number(lng), 
        locations
      );
      
      return {
        id,
        name: building?.name || 'Unknown',
        address: building?.address || 'No address',
        coordinates: [lat, lng]
      };
    }));
  };

  // Add this function inside the PMap component
  const handleAdminBuildingClick = async (building: any): Promise<void> => {
    await handleMarkerClick(building);
  };

  // Update the cleanup effect
  useEffect(() => {
    return () => {
      if (map.current) {
        cleanupMapResources(map.current);
      }
    };
  }, []);

  const handleBuildingClick = useCallback((buildingData: BuildingData) => {
    setSelectedBuilding({
      ...buildingData,
      vibrancyScore: buildingVibrancyScores.get(buildingData.id)
    });
    setHighlightedBuilding(undefined);
    setShowAdmin(false);
  }, [buildingVibrancyScores]);

  const handleBuildingNameClick = (name: string) => {
    setSelectedBuilding(null);
    setHighlightedBuilding(name);
    setShowAdmin(true);
  };

  const processData = (text: string) => {
    Papa.parse<BuildingEntry>(text, {
      header: true,
      complete: (results) => {
        const parsedData = results.data
          .filter((entry): entry is BuildingEntry => entry !== null)
          .map(entry => ({
            ...entry,
            lat: parseFloat(entry.lat || '0'),
            lng: parseFloat(entry.lng || '0'),
            foottraffic: parseInt(entry.foottraffic || '0') || 0,
            visits_by_day_of_week_sunday: parseFloat(entry.visits_by_day_of_week_sunday || '0'),
            visits_by_day_of_week_monday: parseFloat(entry.visits_by_day_of_week_monday || '0'),
            visits_by_day_of_week_tuesday: parseFloat(entry.visits_by_day_of_week_tuesday || '0'),
            visits_by_day_of_week_wednesday: parseFloat(entry.visits_by_day_of_week_wednesday || '0'),
            visits_by_day_of_week_thursday: parseFloat(entry.visits_by_day_of_week_thursday || '0'),
            visits_by_day_of_week_friday: parseFloat(entry.visits_by_day_of_week_friday || '0'),
            visits_by_day_of_week_saturday: parseFloat(entry.visits_by_day_of_week_saturday || '0')
          })) as ProcessedBuildingEntry[];

        setCsvData(results.data.filter((entry): entry is BuildingEntry => entry !== null));
        setLocations(parsedData);

        const processedBuildings = processBuildings(parsedData);
        setAdminData(prev => ({
          ...prev,
          totalBuildings: new Set(parsedData.map(b => b.id)).size,
          buildingsList: processedBuildings
        }));
      },
      error: (error: Error, file: File) => {
        console.error('[CSV] Error parsing data:', error);
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

  const calculateVibrancyScores = (locations: any[]): Map<string, VibrancyScoreData> => {
    const DEBUG = true;
    const scores = new Map<string, VibrancyScoreData>();
    
    // Get max values for normalization
    const maxTraffic = Math.max(...locations.map(l => parseInt(l.foottraffic) || 0));
    
    locations.forEach(location => {
      const trafficScore = (parseInt(location.foottraffic) || 0) / maxTraffic;
      
      // Calculate dwell score (weighted average of dwell times > 30 mins)
      const dwellTimes = [
        parseInt(location.visits_by_dwell_time_30_45) || 0,
        parseInt(location.visits_by_dwell_time_45_60) || 0,
        parseInt(location.visits_by_dwell_time_60_75) || 0,
        parseInt(location.visits_by_dwell_time_75_90) || 0
      ];
      const dwellScore = dwellTimes.reduce((acc, val) => acc + val, 0) / 
                        (parseInt(location.foottraffic) || 1);
      
      // Calculate spread score (evenness of distribution across hours)
      const hourlyVisits = Array(24).fill(0).map((_, i) => {
        const hour = i.toString().padStart(2, '0');
        return parseInt(location[`visits_by_hour_of_day_${hour}:00_${(i+1).toString().padStart(2, '0')}:00`]) || 0;
      });
      
      const totalVisits = hourlyVisits.reduce((a, b) => a + b, 0);
      const idealDistribution = totalVisits / 24;
      const spreadScore = 1 - hourlyVisits.reduce((acc, visits) => 
        acc + Math.abs(visits - idealDistribution), 0) / (totalVisits * 2);

      const score = (trafficScore + dwellScore + spreadScore) / 3;
      
      scores.set(location.name, {
        score,
        components: {
          trafficScore,
          dwellScore,
          spreadScore
        }
      });
    });

    // Log top 3 and bottom 3
    if (DEBUG) {
      const sortedScores = Array.from(scores.entries())
        .sort(([,a], [,b]) => b.score - a.score);
      
      console.log("\n=== Top 3 Buildings by Vibrancy Score ===");
      sortedScores.slice(0, 3).forEach(([name, data], i) => {
        console.log(`${i+1}. ${name}`);
        console.log(`   Score: ${(data.score * 100).toFixed(1)}%`);
        console.log(`   Traffic: ${(data.components.trafficScore * 100).toFixed(1)}%`);
        console.log(`   Dwell: ${(data.components.dwellScore * 100).toFixed(1)}%`);
        console.log(`   Spread: ${(data.components.spreadScore * 100).toFixed(1)}%`);
      });

      console.log("\n=== Bottom 3 Buildings by Vibrancy Score ===");
      sortedScores.slice(-3).reverse().forEach(([name, data], i) => {
        console.log(`${i+1}. ${name}`);
        console.log(`   Score: ${(data.score * 100).toFixed(1)}%`);
        console.log(`   Traffic: ${(data.components.trafficScore * 100).toFixed(1)}%`);
        console.log(`   Dwell: ${(data.components.dwellScore * 100).toFixed(1)}%`);
        console.log(`   Spread: ${(data.components.spreadScore * 100).toFixed(1)}%`);
      });
    }

    return scores;
  };

  return (
    <div className="fixed inset-0 w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full z-0" />
      
      {isLoading && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <p className="text-white">Loading map data...</p>
          </div>
        </div>
      )}
      
      {/* Admin Panel */}
      {showAdmin && (
        <Admin 
          totalBuildings={adminData.totalBuildings}
          selectedBuildings={adminData.selectedBuildings}
          lastUpdate={adminData.lastUpdate}
          buildingsList={adminData.buildingsList}
          onBuildingClick={handleAdminBuildingClick}
          highlightedBuilding={highlightedBuilding}
          className="z-10"
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
          vibrancyScore={buildingVibrancyScores.get(selectedBuilding?.id)}
          className="z-20"
        />
      )}
    </div>
  );
} 