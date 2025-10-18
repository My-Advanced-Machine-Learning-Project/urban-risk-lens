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
  
  return theme === 'dark'
    ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`
    : `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;
}

// Metric paint expressions with null safety
function getMetricPaint(metric: string): any {
  if (metric === 'risk_score') {
    return [
      'step',
      ['coalesce', ['get', 'risk_score'], -1],
      '#6b7280', // default gray for missing data
      0, '#f1f5f9',
      0.18, '#fde68a',
      0.23, '#fbbf24',
      0.30, '#ef4444',
      0.43, '#7f1d1d'
    ];
  } else if (metric === 'vs30') {
    return [
      'step',
      ['coalesce', ['get', 'vs30_mean'], -1],
      '#6b7280',
      0, '#7f1d1d',
      300, '#ef4444',
      400, '#fbbf24',
      500, '#fde68a',
      600, '#f1f5f9'
    ];
  } else if (metric === 'population') {
    return [
      'step',
      ['coalesce', ['get', 'toplam_nufus'], -1],
      '#6b7280',
      0, '#f1f5f9',
      5000, '#fde68a',
      10000, '#fbbf24',
      20000, '#ef4444',
      40000, '#7f1d1d'
    ];
  } else if (metric === 'buildings') {
    return [
      'step',
      ['coalesce', ['get', 'toplam_bina'], -1],
      '#6b7280',
      0, '#f1f5f9',
      500, '#fde68a',
      1000, '#fbbf24',
      2000, '#ef4444',
      4000, '#7f1d1d'
    ];
  }
  
  // Default: risk_score
  return [
    'step',
    ['coalesce', ['get', 'risk_score'], -1],
    '#6b7280',
    0, '#f1f5f9',
    0.18, '#fde68a',
    0.23, '#fbbf24',
    0.30, '#ef4444',
    0.43, '#7f1d1d'
  ];
}

export function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  
  const { 
    theme, 
    language, 
    selectedCities,
    selectedMah,
    metric,
    setMahData,
    setCityIndex,
    setAllFeatures,
    toggleMah
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
      closeButton: true,
      closeOnClick: false,
      maxWidth: '320px'
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

  // Load initial data
  async function loadInitialData() {
    if (!map.current) return;
    
    const cities = ['İstanbul', 'Ankara'];
    console.info('[MapContainer] Loading cities:', cities);
    
    const dataMap = await loadCitiesData(cities);
    citiesData.current = dataMap;
    
    // Build mahData for sidebar and collect normalized data
    const mahDataMap = new Map();
    const allNormalizedFeatures: any[] = [];
    const combinedCityIndex = new Map();
    
    dataMap.forEach((cityData, cityName) => {
      Object.assign(allBBoxes.current, cityData.bboxes);
      
      // Store raw features for sidebar compatibility
      cityData.features.forEach(f => {
        const id = String(f.properties.mah_id || f.properties.fid);
        mahDataMap.set(id, f.properties);
      });
      
      // Collect normalized features
      if (cityData.normalized) {
        allNormalizedFeatures.push(...cityData.normalized);
      }
      
      // Merge city info into combined index
      if (cityData.cityInfo) {
        combinedCityIndex.set(cityData.cityInfo.key, cityData.cityInfo);
      }
    });
    
    console.info('[MapContainer] Data loaded:', {
      mahDataSize: mahDataMap.size,
      normalizedFeatures: allNormalizedFeatures.length,
      cityIndexSize: combinedCityIndex.size,
      cityKeys: [...combinedCityIndex.keys()]
    });
    
    // Additional diagnostics
    const istanbulFeatures = allNormalizedFeatures.filter(f => f.cityKey === 'istanbul');
    const ankaraFeatures = allNormalizedFeatures.filter(f => f.cityKey === 'ankara');
    const istanbulWithScore = istanbulFeatures.filter(f => f.risk_score > 0);
    const ankaraWithScore = ankaraFeatures.filter(f => f.risk_score > 0);
    
    console.info('[MapContainer COVERAGE]:', {
      istanbul: `${istanbulWithScore.length}/${istanbulFeatures.length} have risk_score`,
      ankara: `${ankaraWithScore.length}/${ankaraFeatures.length} have risk_score`,
    });
    
    setMahData(mahDataMap);
    setAllFeatures(allNormalizedFeatures);
    setCityIndex(combinedCityIndex);
    
    addLayers();
    fitToSelectedCities(cities);
  }

  // Add layers
  function addLayers() {
    if (!map.current) return;

    const allFeatures: any[] = [];
    citiesData.current.forEach((cityData) => {
      allFeatures.push(...cityData.features);
    });

    if (allFeatures.length === 0) {
      console.warn('[MapContainer] No features');
      return;
    }

    if (!map.current.getSource('mahalle')) {
      map.current.addSource('mahalle', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: allFeatures
        }
      });
    }

    if (!map.current.getLayer('mahalle-fill')) {
      map.current.addLayer({
        id: 'mahalle-fill',
        type: 'fill',
        source: 'mahalle',
        paint: {
          'fill-color': getMetricPaint(metric),
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.9,
            0.7
          ]
        }
      });
    }

    if (!map.current.getLayer('mahalle-line')) {
      map.current.addLayer({
        id: 'mahalle-line',
        type: 'line',
        source: 'mahalle',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#ffffff',
            theme === 'dark' ? '#666666' : '#cccccc'
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            2,
            0.5
          ],
          'line-opacity': 0.8
        }
      });
    }

    map.current.on('click', 'mahalle-fill', handleFeatureClick as any);
    map.current.on('mouseenter', 'mahalle-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'mahalle-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    console.info('[MapContainer] Layers added:', allFeatures.length);
  }

  // Handle feature click
  function handleFeatureClick(e: any) {
    if (!e.features || e.features.length === 0) return;
    
    const feature = e.features[0];
    const props = feature.properties;
    const mahId = String(props.mah_id || props.fid);
    
    const riskScore = props.risk_score || 0;
    const riskClass = getRiskClass(riskScore);
    const riskColor = getRiskColor(riskClass);
    
    const html = `
      <div class="p-3">
        <h3 class="font-semibold text-base mb-3">${props.mahalle_adi || 'N/A'}</h3>
        <div class="text-sm space-y-2">
          <div class="flex justify-between">
            <span class="text-muted-foreground">${t('district', language)}:</span>
            <span class="font-medium">${props.ilce_adi || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">${t('population', language)}:</span>
            <span class="font-medium">${props.toplam_nufus?.toLocaleString() || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">${t('buildings', language)}:</span>
            <span class="font-medium">${props.toplam_bina?.toLocaleString() || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">${t('vs30', language)}:</span>
            <span class="font-medium">${props.vs30_mean?.toFixed(1) || 'N/A'}</span>
          </div>
          <div class="flex items-center justify-between pt-2 border-t">
            <span class="text-muted-foreground">${t('riskScore', language)}:</span>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded" style="background-color: ${riskColor}"></div>
              <span class="font-semibold">${riskScore.toFixed(3)}</span>
            </div>
          </div>
          <button 
            onclick="window.selectAndZoom('${mahId}')"
            class="w-full mt-3 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            ${t('selectZoom', language)}
          </button>
        </div>
      </div>
    `;
    
    if (popup.current) {
      popup.current.setLngLat(e.lngLat).setHTML(html).addTo(map.current!);
    }
  }

  // Global function for popup button
  useEffect(() => {
    (window as any).selectAndZoom = (mahId: string) => {
      toggleMah(mahId);
      zoomToMah(mahId);
      if (popup.current) popup.current.remove();
    };
  }, [toggleMah]);

  // Zoom to mahalle
  function zoomToMah(mahId: string) {
    if (!map.current) return;
    const bbox = allBBoxes.current[mahId];
    if (bbox) {
      map.current.fitBounds(
        [[bbox[0], bbox[1]], [bbox[2], bbox[3]]], 
        { padding: 60, duration: 800 }
      );
    }
  }

  // Fit to cities
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

    map.current.setStyle(getStyleUrl(theme) as any);
    
    map.current.once('idle', () => {
      addLayers();
      updateFeatureStates();
    });
  }, [theme]);

  // Handle metric changes
  useEffect(() => {
    if (!map.current || !map.current.getLayer('mahalle-fill')) return;
    
    console.info('[MapContainer] Updating metric paint:', metric);
    map.current.setPaintProperty('mahalle-fill', 'fill-color', getMetricPaint(metric));
  }, [metric]);

  // Handle selection changes
  useEffect(() => {
    updateFeatureStates();
    
    if (selectedMah.size > 0) {
      const bounds = new maplibregl.LngLatBounds();
      let hasFeatures = false;

      selectedMah.forEach(mahId => {
        const bbox = allBBoxes.current[mahId];
        if (bbox) {
          bounds.extend([bbox[0], bbox[1]]);
          bounds.extend([bbox[2], bbox[3]]);
          hasFeatures = true;
        }
      });

      if (hasFeatures && map.current) {
        map.current.fitBounds(bounds, { padding: 60, duration: 800 });
      }
    }
  }, [selectedMah]);

  // Update feature states
  function updateFeatureStates() {
    if (!map.current || !map.current.getSource('mahalle')) return;

    // Reset all
    citiesData.current.forEach((cityData) => {
      cityData.features.forEach((f: any) => {
        const mahId = String(f.properties.mah_id || f.properties.fid);
        map.current?.setFeatureState(
          { source: 'mahalle', id: f.id },
          { selected: false }
        );
      });
    });

    // Set selected
    selectedMah.forEach(mahId => {
      citiesData.current.forEach((cityData) => {
        const feature = cityData.features.find((f: any) => 
          String(f.properties.mah_id || f.properties.fid) === mahId
        );
        if (feature) {
          map.current?.setFeatureState(
            { source: 'mahalle', id: (feature as any).id },
            { selected: true }
          );
        }
      });
    });
  }

  return (
    <div 
      ref={mapContainer} 
      className="absolute inset-0 w-full h-full"
    />
  );
}
