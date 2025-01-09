import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import Popup from './popup';
import Admin from './admin';

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

export default function PMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const selectedBuildingId = useRef<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [adminData, setAdminData] = useState({
    totalBuildings: 100,
    selectedBuildings: 0,
    lastUpdate: '12/18/2024'
  });

  useEffect(() => {
    fetch('/data/Hines_monthly_2024-12-18.csv')
      .then(response => response.text())
      .then(text => {
        // Parse CSV
        const lines = text.split('\n').slice(1); // Skip header
        const parsedData = lines
          .filter(line => line.trim().length > 0) // Remove empty lines
          .map(line => {
            const columns = line.split(',');
            
            // Only create entry if we have valid coordinates
            if (columns[11] && columns[12] && !isNaN(parseFloat(columns[11])) && !isNaN(parseFloat(columns[12]))) {
              return {
                name: columns[3]?.trim(),
                lat: parseFloat(columns[11]),
                lng: parseFloat(columns[12]),
                state: columns[9]?.trim(),
                id: columns[2],
                foottraffic: columns[16],
                visit_duration: columns[15],
                start_date: columns[6],
                end_date: columns[7],
                // Make sure these indices match the new CSV structure
                visits_by_day_of_week_sunday: columns[161],
                visits_by_day_of_week_monday: columns[162],
                visits_by_day_of_week_tuesday: columns[163],
                visits_by_day_of_week_wednesday: columns[164],
                visits_by_day_of_week_thursday: columns[165],
                visits_by_day_of_week_friday: columns[166],
                visits_by_day_of_week_saturday: columns[167],
                address: `${columns[8]}, ${columns[9]}, ${columns[10]}`
              };
            }
            return null;
          })
          .filter(entry => entry !== null); // Remove any null entries

        // Add console logging to debug
        console.log(`Parsed ${parsedData.length} valid buildings from CSV`);
        
        // Update locations without changing admin data
        setLocations(parsedData);
        
        // Don't update the selected buildings count here
        // Only update when user actually selects buildings
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
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        }
      });

      // Add the outer circle source and layer
      map.current.addSource(HIGHLIGHT_CIRCLE_OUTER_SOURCE, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[]]
          }
        }
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
        if (features && features.length > 0) {
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

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Create new markers with the matching green color
    locations.forEach(location => {
      if (location.lat && location.lng && !isNaN(location.lat) && !isNaN(location.lng)) {
        const marker = new mapboxgl.Marker({
          color: MARKER_COLOR  // Changed from '#FF0000' to match admin.tsx green
        })
          .setLngLat([location.lng, location.lat])
          .addTo(map.current!);

        marker.getElement().addEventListener('click', (e) => {
          e.stopPropagation();
          handleMarkerClick(location);
        });

        markers.current.push(marker);
      }
    });

    // Fit map to show all markers
    const bounds = new mapboxgl.LngLatBounds();
    locations.forEach(location => {
      if (location.lng && location.lat) {
        bounds.extend([location.lng, location.lat]);
      }
    });
    
    map.current.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 15
    });

  }, [locations]);

  // Helper function to find building data in CSV
  const findBuildingInCSV = (buildingName: string) => {
    console.log('Looking for building in CSV:', buildingName);
    // Filter csvData array directly since it's already parsed
    const matches = csvData.filter(row => row.name === buildingName);
    
    // Get the most recent data for this building
    if (matches.length > 0) {
      // Sort by date descending and take the first record
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

    const boundingBox = [
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
      zoom: 17,
      pitch: 5,
      bearing: -17.6,
      duration: 1000
    });

    setSelectedBuilding(location);

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
  const handleAdminBuildingClick = (buildingName: string) => {
    const building = locations.find(loc => loc.name === buildingName);
    if (building) {
      // Use the existing handleMarkerClick function
      handleMarkerClick(building);
    }
  };

  // Update the cleanup effect
  useEffect(() => {
    return () => {
      if (map.current) {
        cleanupMapResources(map.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full" 
      />
      <div className="absolute top-6 inset-x-6 z-[1000] flex justify-between">
        {selectedBuilding && (
          <div className="max-h-[calc(100vh-48px)] overflow-auto">
            <Popup 
              buildingData={selectedBuilding} 
              locations={locations}
            />
          </div>
        )}
        
        <div>
          <Admin 
            totalBuildings={adminData.totalBuildings}
            selectedBuildings={adminData.selectedBuildings}
            lastUpdate={adminData.lastUpdate}
            buildingsList={locations.map(location => location.name)}
            onBuildingClick={handleAdminBuildingClick}
          />
        </div>
      </div>
    </div>
  );
} 