import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapState } from '@/stores/useMapState';
import { loadCitiesData, type CityData } from '@/lib/dataLoader';
import { getRiskClass, getRiskColor } from '@/lib/riskColors';
import { t } from '@/lib/i18n';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';

function getStyleUrl(theme: 'light' | 'dark'): string {
  if (!MAPTILER_KEY) {
    return 'https://demotiles.maplibre.org/style.json';
  }
  
  // streets-v2 (light) ↔ dataviz-dark (dark)
  return theme === 'dark'
    ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
    : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;
}

export function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  
  const { 
    theme, 
    language, 
    selectedCities
  } = useMapState();
  
  const citiesData = useRef<Map<string, CityData>>(new Map());
  const allBBoxes = useRef<Record<string, [number, number, number, number]>>({});

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getStyleUrl(theme),
      center: [35.0, 39.0],
      zoom: 6,
      maxZoom: 18,
      minZoom: 5
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    map.current.on('load', () => {
      console.info('[MapContainer] Map loaded');
      loadInitialData();
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Load initial data (İstanbul + Ankara)
  async function loadInitialData() {
    if (!map.current) return;
    
    const cities = ['İstanbul', 'Ankara'];
    console.info('[MapContainer] Loading initial cities:', cities);
    
    const dataMap = await loadCitiesData(cities);
    citiesData.current = dataMap;
    
    // Merge all bboxes
    dataMap.forEach((cityData) => {
      Object.assign(allBBoxes.current, cityData.bboxes);
    });
    
    // Add layers
    addLayers();
    
    // Fit to combined bbox
    fitToSelectedCities(cities);
  }

  // Add layers to map
  function addLayers() {
    if (!map.current) return;

    // Combine all features from loaded cities
    const allFeatures: any[] = [];
    citiesData.current.forEach((cityData) => {
      allFeatures.push(...cityData.features);
    });

    if (allFeatures.length === 0) {
      console.warn('[MapContainer] No features to add');
      return;
    }

    // Add source
    if (!map.current.getSource('mahalle')) {
      map.current.addSource('mahalle', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: allFeatures
        }
      });
    }

    // Add fill layer
    if (!map.current.getLayer('mahalle-fill')) {
      map.current.addLayer({
        id: 'mahalle-fill',
        type: 'fill',
        source: 'mahalle',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'risk_score'],
            0, '#f1f5f9',
            0.18, '#fde68a',
            0.23, '#fbbf24',
            0.30, '#ef4444',
            0.43, '#7f1d1d'
          ],
          'fill-opacity': 0.7
        }
      });
    }

    // Add line layer
    if (!map.current.getLayer('mahalle-line')) {
      map.current.addLayer({
        id: 'mahalle-line',
        type: 'line',
        source: 'mahalle',
        paint: {
          'line-color': theme === 'dark' ? '#ffffff' : '#000000',
          'line-width': 0.5,
          'line-opacity': 0.3
        }
      });
    }

    // Add click handler for popup
    map.current.on('click', 'mahalle-fill', handleFeatureClick as any);
    map.current.on('mouseenter', 'mahalle-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'mahalle-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    console.info('[MapContainer] Layers added:', allFeatures.length, 'features');
  }

  // Handle feature click
  function handleFeatureClick(e: any) {
    if (!e.features || e.features.length === 0) return;
    
    const feature = e.features[0];
    const props = feature.properties;
    
    const riskScore = props.risk_score || 0;
    const riskClass = getRiskClass(riskScore);
    const riskColor = getRiskColor(riskClass);
    
    const html = `
      <div class="p-2 min-w-[200px]">
        <h3 class="font-semibold text-sm mb-2">${props.mahalle_adi || 'N/A'}</h3>
        <div class="text-xs space-y-1">
          <p><strong>${t('district', language)}:</strong> ${props.ilce_adi || 'N/A'}</p>
          <p><strong>${t('population', language)}:</strong> ${props.toplam_nufus?.toLocaleString() || 'N/A'}</p>
          <p><strong>${t('buildings', language)}:</strong> ${props.toplam_bina?.toLocaleString() || 'N/A'}</p>
          <p><strong>VS30:</strong> ${props.vs30_mean?.toFixed(1) || 'N/A'}</p>
          <div class="flex items-center gap-2 mt-2 pt-2 border-t">
            <div class="w-4 h-4 rounded" style="background-color: ${riskColor}"></div>
            <span class="font-medium">${t(riskClass as any, language)}</span>
            <span class="text-muted-foreground">${riskScore.toFixed(3)}</span>
          </div>
        </div>
      </div>
    `;
    
    if (popup.current) {
      popup.current.setLngLat(e.lngLat).setHTML(html).addTo(map.current!);
    }
  }

  // Fit map to selected cities
  function fitToSelectedCities(cities: string[]) {
    if (!map.current || cities.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    let hasFeatures = false;

    cities.forEach(city => {
      const cityData = citiesData.current.get(city);
      if (cityData) {
        cityData.features.forEach(feature => {
          const mahId = String(feature.properties.mah_id || feature.properties.fid);
          const bbox = allBBoxes.current[mahId];
          if (bbox) {
            bounds.extend([bbox[0], bbox[1]]);
            bounds.extend([bbox[2], bbox[3]]);
            hasFeatures = true;
          }
        });
      }
    });

    if (hasFeatures) {
      map.current.fitBounds(bounds, { padding: 40, duration: 800 });
    }
  }

  // Handle theme changes
  useEffect(() => {
    if (!map.current) return;

    const currentStyle = getStyleUrl(theme);
    map.current.setStyle(currentStyle as any);
    
    map.current.once('idle', () => {
      addLayers();
    });
  }, [theme]);

  // Handle city selection changes
  useEffect(() => {
    if (selectedCities.size > 0) {
      fitToSelectedCities(Array.from(selectedCities));
    }
  }, [selectedCities]);

  return (
    <div 
      ref={mapContainer} 
      className="absolute inset-0 w-full h-full"
    />
  );
}
