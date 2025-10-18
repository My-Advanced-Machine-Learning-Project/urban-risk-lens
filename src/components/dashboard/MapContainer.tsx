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

// Metric paint expressions with null safety - colors matching reference app
function getMetricPaint(metric: string): any {
  if (metric === 'risk_score') {
    // Yellow to dark red gradient (Very Low to Very High)
    return [
      'step',
      ['coalesce', ['get', 'risk_score'], -1],
      '#6b7280', // default gray for missing data
      0, '#f5ebb8',      // 0.00-0.18: Very Low (pale yellow)
      0.18, '#f0c96c',   // 0.18-0.23: Low (yellow)
      0.23, '#e69344',   // 0.23-0.30: Medium (orange)
      0.30, '#b94843',   // 0.30-0.43: High (dark red)
      0.43, '#6b2527'    // 0.43-1.00: Very High (very dark red)
    ];
  } else if (metric === 'vs30') {
    // Blue gradient (higher VS30 = better soil = darker blue)
    return [
      'step',
      ['coalesce', ['get', 'vs30_mean'], -1],
      '#6b7280', // default gray
      0, '#e8f0f7',      // 222-376: Very light blue
      222, '#e8f0f7',
      376, '#aac9e3',    // 376-412: Light blue
      412, '#6ba3d0',    // 412-446: Medium blue
      446, '#3d7eb8',    // 446-489: Blue
      489, '#1e4d8b'     // 489-653: Dark blue
    ];
  } else if (metric === 'population') {
    // Teal/green gradient
    return [
      'step',
      ['coalesce', ['get', 'toplam_nufus'], -1],
      '#6b7280', // default gray
      0, '#d9f0ed',      // 13-1,398: Very light teal
      13, '#d9f0ed',
      1398, '#8dd4c7',   // 1,398-8,557: Light teal
      8557, '#4eb3a1',   // 8,557-15,642: Medium teal
      15642, '#2a8c7a',  // 15,642-25,496: Dark teal
      25496, '#1a5d52'   // 25,496+: Very dark teal
    ];
  } else if (metric === 'buildings') {
    // Purple gradient
    return [
      'step',
      ['coalesce', ['get', 'toplam_bina'], -1],
      '#6b7280', // default gray
      0, '#e8d9f5',      // 10-341: Very light purple
      10, '#e8d9f5',
      341, '#c5a3e3',    // 341-790: Light purple
      790, '#9d6dc7',    // 790-1,263: Medium purple
      1263, '#7541a8',   // 1,263-1,861: Dark purple
      1861, '#4d2670'    // 1,861+: Very dark purple
    ];
  }
  
  // Default: risk_score
  return [
    'step',
    ['coalesce', ['get', 'risk_score'], -1],
    '#6b7280',
    0, '#f5ebb8',
    0.18, '#f0c96c',
    0.23, '#e69344',
    0.30, '#b94843',
    0.43, '#6b2527'
  ];
}

export function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  
  // Feature cache for safe access
  const featuresRef = useRef<GeoJSON.Feature[]>([]);
  
  // Safe feature access helper
  function getAllFeatures(): GeoJSON.Feature[] {
    if (featuresRef.current.length) return featuresRef.current;
    try {
      const feats = map.current?.querySourceFeatures('neighborhoods') ?? [];
      featuresRef.current = feats as unknown as GeoJSON.Feature[];
    } catch {
      // Ignore query errors
    }
    return featuresRef.current || [];
  }
  
  const { 
    theme, 
    language, 
    selectedCities,
    selectedMah,
    metric,
    year,
    setMahData,
    setCityIndex,
    setAllFeatures,
    toggleMah,
    mahData,
    sidebarOpen,
    setViewportStats
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

  // Resize map and scatter when sidebar toggles
  useEffect(() => {
    if (!map.current) return;
    
    const timer = setTimeout(() => {
      map.current?.resize();
      // Trigger window resize for ResponsiveContainer (Recharts)
      window.dispatchEvent(new Event('resize'));
    }, 320); // Match sidebar animation duration
    
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  // Reload data when year changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    console.info('[MapContainer] Year changed to:', year, '- reloading data');
    
    // Remove existing layers and source
    if (map.current.getLayer('mahalle-fill')) {
      map.current.removeLayer('mahalle-fill');
    }
    if (map.current.getLayer('mahalle-line')) {
      map.current.removeLayer('mahalle-line');
    }
    if (map.current.getSource('mahalle')) {
      map.current.removeSource('mahalle');
    }
    
    // Reload data with new year
    loadInitialData();
  }, [year]);

  // Load initial data
  async function loadInitialData() {
    if (!map.current) return;
    
    const cities = ['İstanbul', 'Ankara'];
    console.info('[MapContainer] Loading cities:', cities, 'year:', year);
    
    const dataMap = await loadCitiesData(cities, year);
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
    
    // Trigger viewport stats recalculation after data loads
    setTimeout(() => {
      if (map.current) {
        map.current.fire('moveend');
      }
    }, 100);
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
    
    // Populate features ref for safe access
    featuresRef.current = allFeatures as GeoJSON.Feature[];

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
          'line-color': '#ffffff',
          'line-width': 0.8,
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
    
    // Debug: log what data is actually available
    console.log('[Popup Debug] Feature properties:', {
      mahalle: props.mahalle_adi,
      id: mahId,
      risk_score: props.risk_score,
      population: props.toplam_nufus,
      buildings: props.toplam_bina,
      vs30: props.vs30_mean,
      allKeys: Object.keys(props).slice(0, 20)
    });
    
    const riskScore = props.risk_score || 0;
    const riskClass = getRiskClass(riskScore);
    const riskColor = getRiskColor(riskClass);
    const riskLabel = t(riskClass as any, language);
    
    const html = `
      <div class="p-4 bg-white/95 backdrop-blur-md rounded-xl shadow-lg">
        <h3 class="font-bold text-lg text-black mb-1">${props.mahalle_adi || 'N/A'}</h3>
        <p class="text-sm text-gray-600 mb-3">${props.ilce_adi || 'N/A'} • ${props.il_adi || 'N/A'}</p>
        
        <div class="text-sm space-y-2 mb-3">
          <div class="flex items-center justify-between">
            <span class="text-gray-600">${t('riskClass', language)}:</span>
            <span class="px-3 py-1 rounded-lg font-medium text-white text-sm" style="background-color: ${riskColor}">
              ${riskLabel}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">${t('riskScore', language)}:</span>
            <span class="font-semibold text-black">${riskScore.toFixed(3)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">${t('population', language)}:</span>
            <span class="font-medium text-black">${props.toplam_nufus?.toLocaleString() || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">${t('buildings', language)}:</span>
            <span class="font-medium text-black">${props.toplam_bina?.toLocaleString() || 'N/A'}</span>
          </div>
        </div>
        
        <button 
          onclick="window.selectAndZoom('${mahId}')"
          class="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
        >
          ${t('zoom', language)}
        </button>
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
    
    // Scatter plot zoom function (without select)
    (window as any).scatterZoomToMah = (mahId: string) => {
      zoomToMah(mahId);
    };
    
    // Fly to neighborhood with optional popup (for scatter plot)
    (window as any).flyToNeighborhood = (mahId: string, opts?: { openPopup?: boolean }) => {
      const all = getAllFeatures();
      if (!all.length || !map.current) return;
      
      const feature = all.find((f: any) => {
        const fId = f.properties?.mah_id ?? f.properties?.id ?? f.id ?? '';
        return String(fId) === String(mahId);
      });
      if (!feature) return;
      
      // Calculate center from bbox or use geometry
      let center: [number, number];
      if (feature.bbox) {
        center = [
          (feature.bbox[0] + feature.bbox[2]) / 2,
          (feature.bbox[1] + feature.bbox[3]) / 2
        ];
      } else if (feature.geometry?.type === 'Polygon' && feature.geometry.coordinates?.[0]) {
        // Simple centroid calculation for polygon
        const coords = feature.geometry.coordinates[0];
        if (coords && coords.length > 0) {
          const sum = coords.reduce((acc: [number, number], c: number[]) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
          center = [sum[0] / coords.length, sum[1] / coords.length];
        } else {
          return;
        }
      } else if (feature.geometry?.type === 'MultiPolygon' && feature.geometry.coordinates?.[0]?.[0]) {
        // Use first polygon of multipolygon
        const coords = feature.geometry.coordinates[0][0];
        if (coords && coords.length > 0) {
          const sum = coords.reduce((acc: [number, number], c: number[]) => [acc[0] + c[0], acc[1] + c[1]], [0, 0]);
          center = [sum[0] / coords.length, sum[1] / coords.length];
        } else {
          return;
        }
      } else {
        return;
      }
      
      map.current.flyTo({
        center,
        zoom: 13,
        speed: 0.8,
        essential: true
      });
      
      if (opts?.openPopup) {
        setTimeout(() => {
          const mah = mahData.get(mahId.toString());
          if (mah && map.current) {
            const riskScore = mah.risk_score || 0;
            const riskClass = getRiskClass(riskScore);
            const riskColor = getRiskColor(riskClass);
            const riskLabel = t(riskClass as any, language);
            
            // Build location string conditionally (no "N/A")
            const locationParts = [];
            if (mah.ilce_adi) locationParts.push(mah.ilce_adi);
            if (mah.il_adi) locationParts.push(mah.il_adi);
            const locationStr = locationParts.join(' • ') || '—';
            
            const html = `
              <div style="padding: 16px; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-radius: 12px; min-width: 200px;">
                <h3 style="font-weight: bold; font-size: 18px; color: #000; margin-bottom: 4px;">${mah.mahalle_adi || '—'}</h3>
                <p style="font-size: 14px; color: #666; margin-bottom: 12px;">${locationStr}</p>
                
                <div style="margin-bottom: 12px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #666; font-size: 14px;">${t('riskClass', language)}:</span>
                    <span style="padding: 4px 12px; border-radius: 8px; font-weight: 500; color: white; font-size: 14px; background-color: ${riskColor}">
                      ${riskLabel}
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: #666; font-size: 14px;">${t('riskScore', language)}:</span>
                    <span style="font-weight: 600; color: #000; font-size: 14px;">${riskScore.toFixed(3)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: #666; font-size: 14px;">${t('population', language)}:</span>
                    <span style="font-weight: 500; color: #000; font-size: 14px;">${(mah.toplam_nufus || 0).toLocaleString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #666; font-size: 14px;">${t('buildings', language)}:</span>
                    <span style="font-weight: 500; color: #000; font-size: 14px;">${(mah.toplam_bina || 0).toLocaleString()}</span>
                  </div>
                </div>
                
                <button 
                  onclick="window.selectAndZoom('${mahId}')" 
                  style="width: 100%; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 500; font-size: 14px; transition: background 0.2s;"
                  onmouseover="this.style.background='#2563eb'" 
                  onmouseout="this.style.background='#3b82f6'"
                >
                  ${t('zoom', language)}
                </button>
              </div>
            `;
            
            if (popup.current) popup.current.remove();
            popup.current = new maplibregl.Popup({ closeButton: true, closeOnClick: false })
              .setLngLat(center)
              .setHTML(html)
              .addTo(map.current);
          }
        }, 500);
      }
    };
    
    return () => {
      delete (window as any).selectAndZoom;
      delete (window as any).scatterZoomToMah;
      delete (window as any).flyToNeighborhood;
    };
  }, [toggleMah, mahData, language]);

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

  // Handle sidebar toggle - resize map
  useEffect(() => {
    if (!map.current) return;
    const timer = setTimeout(() => {
      map.current?.resize();
    }, 320); // Match sidebar animation duration
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  // Compute viewport stats
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    const computeStats = () => {
      if (!map.current) return;
      
      const bounds = map.current.getBounds();
      const zoom = map.current.getZoom();
      
      const visible = getAllFeatures().filter((f: any) => {
        // Simple bbox check
        const geom = f.geometry;
        if (!geom) return false;
        
        // Get approximate center
        let lng = 0, lat = 0;
        if (geom.type === 'Polygon' && geom.coordinates?.[0]?.[0]) {
          lng = geom.coordinates[0][0][0];
          lat = geom.coordinates[0][0][1];
        } else if (geom.type === 'MultiPolygon' && geom.coordinates?.[0]?.[0]?.[0]) {
          lng = geom.coordinates[0][0][0][0];
          lat = geom.coordinates[0][0][0][1];
        }
        
        return lng >= bounds.getWest() && lng <= bounds.getEast() &&
               lat >= bounds.getSouth() && lat <= bounds.getNorth();
      });
      
      const totalMah = visible.length;
      const totalPop = visible.reduce((s, f: any) => s + (f.properties?.toplam_nufus ?? 0), 0);
      const totalBld = visible.reduce((s, f: any) => s + (f.properties?.toplam_bina ?? 0), 0);
      const sumRisk = visible.reduce((s, f: any) => s + (f.properties?.risk_score ?? 0), 0);
      const meanRisk = totalMah ? sumRisk / totalMah : 0;
      
      setViewportStats({ totalMah, totalPop, totalBld, meanRisk, zoom });
    };
    
    // Initial compute
    computeStats();
    
    // Listen to map movements
    map.current.on('moveend', computeStats);
    map.current.on('zoomend', computeStats);
    
    return () => {
      map.current?.off('moveend', computeStats);
      map.current?.off('zoomend', computeStats);
    };
  }, [setViewportStats]);

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
        if (f.id != null) {
          map.current?.setFeatureState(
            { source: 'mahalle', id: f.id },
            { selected: false }
          );
        }
      });
    });

    // Set selected
    selectedMah.forEach(mahId => {
      citiesData.current.forEach((cityData) => {
        const feature = cityData.features.find((f: any) => 
          String(f.properties.mah_id || f.properties.fid) === mahId
        );
        if (feature && (feature as any).id != null) {
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
