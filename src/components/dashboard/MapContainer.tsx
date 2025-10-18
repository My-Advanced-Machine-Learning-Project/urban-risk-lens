import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapState } from '@/stores/useMapState';
import { loadCitiesData, type CityData } from '@/lib/dataLoader';
import { getRiskClass, getRiskColor } from '@/lib/riskColors';
import { t } from '@/lib/i18n';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';

// UI constants for popup positioning and zoom behavior
const HEADER_PX   = 72;   // üst bar
const FOOTER_PX   = 180;  // alttaki istatistik kartları
const SIDE_PAD    = 12;   // sağ/sol kenar
const POPUP_CLEAR = 12;   // popup-kenar aralığı
const TARGET_ZOOM = 13.5;
const UI_PADDING  = { top: HEADER_PX, right: 24, bottom: FOOTER_PX, left: 24 };

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
      ['coalesce', ['get', 'vs30_mean'], ['get', 'vs30'], -1],
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
  
  // Safe feature access helper - use featuresRef directly
  function getAllFeatures(): GeoJSON.Feature[] {
    return featuresRef.current;
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
      closeButton: false,
      closeOnClick: true,
      closeOnMove: true,
      maxWidth: '260px',          // küçük ve sabit
      offset: [0, 8],
      className: 'map-popup'      // css ile daha da inceltmek için
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

  // Reload data when year changes - full cleanup
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    console.info('[MapContainer] Year changed to:', year, '- reloading all data');
    
    // Kesin temizle - stale veri ihtimalini sıfırla
    featuresRef.current = [];
    allBBoxes.current = {};
    setMahData(new Map());
    setAllFeatures([]);
    
    // Clear map layers before reloading
    ['mahalle-selected', 'mahalle-line', 'mahalle-fill'].forEach(id => {
      if (map.current!.getLayer(id)) map.current!.removeLayer(id);
    });
    if (map.current.getSource('mahalle')) {
      map.current.removeSource('mahalle');
    }
    
    // Reload data with new year
    loadInitialData();
  }, [year]);

  // Load initial data
  async function loadInitialData() {
    if (!map.current) return;
    
    // Always load both cities regardless of selection
    const cities = ['İstanbul', 'Ankara'];
    
    console.info('[MapContainer] Loading cities:', cities, 'year:', year);
    
    // Clear previous data to prevent stale data
    featuresRef.current = [];
    allBBoxes.current = {};
    
    const dataMap = await loadCitiesData(cities, year);
    
    // Debug: Log per-city feature counts
    const citySizes = [...dataMap.entries()].map(([name, cityData]) => 
      `${name}=${cityData.features.length}`
    ).join(', ');
    console.info(`[MapContainer] ✓ Data loaded for year ${year}:`, citySizes);
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
    
    console.info('[MapContainer] ✅ City index updated:', {
      cities: [...combinedCityIndex.keys()],
      totalDistricts: [...combinedCityIndex.values()].reduce((sum, c) => sum + c.districts.size, 0),
      totalNeighborhoods: allNormalizedFeatures.length
    });
    
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
    const mahDataMap = new Map<string, any>();
    
    citiesData.current.forEach((cityData, cityName) => {
      console.info(`[MapContainer] Processing ${cityName}: ${cityData.features.length} features`);
      
      cityData.features.forEach((f: any) => {
        // Sayısallaştırma - CSV'den string gelebilir
        const pr = f.properties;
        pr.risk_score = pr.risk_score != null ? +pr.risk_score : null;
        pr.vs30_mean = pr.vs30_mean != null ? +pr.vs30_mean : (pr.vs30 != null ? +pr.vs30 : null);
        pr.toplam_nufus = pr.toplam_nufus != null ? +pr.toplam_nufus : null;
        pr.toplam_bina = pr.toplam_bina != null ? +pr.toplam_bina : null;
        
        // IDs are already prefixed with city name in dataLoader (e.g., "istanbul-12345")
        const fid = String(pr.mah_id ?? pr.fid ?? f.id ?? '');
        if (fid) {
          f.id = fid;
          mahDataMap.set(fid, pr);
        } else {
          console.warn('[MapContainer] Feature without ID:', pr.mahalle_adi);
        }
        allFeatures.push(f);
      });
    });

    if (allFeatures.length === 0) {
      console.warn('[MapContainer] ⚠️ No features to display - check data loading');
      return;
    }
    
    console.info(`[MapContainer] Total features to render: ${allFeatures.length}, mahDataMap size: ${mahDataMap.size}`);
    
    // Populate features ref for safe access
    featuresRef.current = allFeatures as GeoJSON.Feature[];
    
    // Store mahData for sidebar
    setMahData(mahDataMap);

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

    // Add highlighted border layer for selected neighborhoods (blue, prominent)
    if (!map.current.getLayer('mahalle-selected')) {
      map.current.addLayer({
        id: 'mahalle-selected',
        type: 'line',
        source: 'mahalle',
        filter: ['==', ['feature-state', 'selected'], true],
        paint: {
          'line-color': '#60a5fa',    // mavi vurgu (blue highlight)
          'line-width': 3,
          'line-opacity': 0.95
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

  // Helper to place popup safely (avoid clipping with header and footer)
  function placePopupSafely(lngLat: [number, number]) {
    if (!map.current || !popup.current) return;

    const canvas = map.current.getCanvas();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // lngLat → piksel
    const p = map.current.project(lngLat);

    // x'i ve y'yi güvenli aralığa sıkıştır
    const safeX = Math.min(Math.max(p.x, SIDE_PAD + POPUP_CLEAR), w - SIDE_PAD - POPUP_CLEAR);
    const safeY = Math.min(Math.max(p.y, HEADER_PX + POPUP_CLEAR), h - FOOTER_PX - POPUP_CLEAR);

    const safeLL = map.current.unproject(new maplibregl.Point(safeX, safeY));
    popup.current.setLngLat(safeLL);
  }

  // Handle feature click
  function handleFeatureClick(e: any) {
    if (!e.features || e.features.length === 0) return;
    
    const feature = e.features[0];
    const props0 = feature.properties;
    // Consistent ID resolution
    const mahId = String(props0.mah_id ?? props0.fid ?? feature.id ?? '');
    
    // YIL-BAĞIMLI: her zaman güncel store'dan oku
    const p = mahData.get(mahId) ?? props0;
    
    // Debug: log what data is actually available
    console.log('[Popup Debug] Using data from store:', {
      mahalle: p.mahalle_adi,
      id: mahId,
      risk_score: p.risk_score,
      population: p.toplam_nufus,
      buildings: p.toplam_bina,
      vs30: p.vs30_mean,
      year
    });
    
    const riskScore = Number(p.risk_score) || 0;
    const riskClass = getRiskClass(riskScore);
    const riskColor = getRiskColor(riskClass);
    const riskLabel = t(riskClass as any, language);
    
    // Build location string conditionally (no "N/A")
    const locParts = [];
    if (p.ilce_adi) locParts.push(p.ilce_adi);
    if (p.il_adi) locParts.push(p.il_adi);
    const locationStr = locParts.join(' • ') || '—';
    
    const html = `
      <div class="space-y-1">
        <div class="font-semibold text-black text-base leading-5">${p.mahalle_adi || '—'}</div>
        <div class="text-xs text-gray-600">${locationStr}</div>

        <div class="mt-2 grid grid-cols-2 gap-x-3 text-xs">
          <div class="text-gray-600">Risk</div>
          <div class="justify-self-end font-semibold">${riskScore.toFixed(3)}</div>
          <div class="text-gray-600">Sınıf</div>
          <div class="justify-self-end">
            <span style="background:${riskColor}" class="px-2 py-0.5 rounded text-white">${riskLabel}</span>
          </div>
          <div class="text-gray-600">${t('population', language)}</div>
          <div class="justify-self-end font-medium">${(p.toplam_nufus ?? 0).toLocaleString()}</div>
          <div class="text-gray-600">${t('buildings', language)}</div>
          <div class="justify-self-end font-medium">${(p.toplam_bina ?? 0).toLocaleString()}</div>
        </div>

        <button onclick="window.selectAndZoom('${mahId}')" 
                class="mt-2 w-full text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded">
          ${t('zoom', language)}
        </button>
      </div>
    `;
    
    // Calculate feature center and fly there with proper padding
    const center: [number, number] = e.lngLat ? [e.lngLat.lng, e.lngLat.lat] : [0, 0];
    
    // asla zoom-out yapma
    const currentZoom = map.current!.getZoom();
    const targetZoom = Math.max(TARGET_ZOOM, currentZoom);
    map.current!.easeTo({ center, zoom: targetZoom, padding: UI_PADDING, duration: 600 });

    // hareket bitince popup'ı ekranda garanti konuma yerleştirerek aç
    const open = () => {
      if (!popup.current) return;
      popup.current.setHTML(html);
      placePopupSafely(center);
      popup.current.addTo(map.current!);
      map.current!.off('moveend', open);
    };
    map.current!.on('moveend', open);
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
        const fId = String(f.properties?.mah_id ?? f.properties?.fid ?? '');
        return fId === String(mahId);
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
      
      // Use padding and ensure zoom in
      const currentZoom = map.current.getZoom();
      const targetZoom = Math.max(TARGET_ZOOM, currentZoom);
      map.current.flyTo({
        center,
        zoom: targetZoom,
        speed: 0.9,
        padding: UI_PADDING,
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
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="font-weight: 600; font-size: 16px; color: #000; line-height: 1.3;">${mah.mahalle_adi || '—'}</div>
                <div style="font-size: 12px; color: #666;">${locationStr}</div>

                <div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
                  <div style="color: #666;">Risk</div>
                  <div style="text-align: right; font-weight: 600;">${riskScore.toFixed(3)}</div>
                  <div style="color: #666;">Sınıf</div>
                  <div style="text-align: right;">
                    <span style="background: ${riskColor}; padding: 2px 8px; border-radius: 4px; color: white;">${riskLabel}</span>
                  </div>
                  <div style="color: #666;">${t('population', language)}</div>
                  <div style="text-align: right; font-weight: 500;">${(mah.toplam_nufus || 0).toLocaleString()}</div>
                  <div style="color: #666;">${t('buildings', language)}</div>
                  <div style="text-align: right; font-weight: 500;">${(mah.toplam_bina || 0).toLocaleString()}</div>
                </div>

                <button 
                  onclick="window.selectAndZoom('${mahId}')" 
                  style="width: 100%; margin-top: 8px; padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 12px; transition: background 0.2s;"
                  onmouseover="this.style.background='#2563eb'" 
                  onmouseout="this.style.background='#3b82f6'"
                >
                  ${t('zoom', language)}
                </button>
              </div>
            `;
            
            if (popup.current) popup.current.remove();
            popup.current = new maplibregl.Popup({ 
              closeButton: false,
              closeOnClick: true,
              closeOnMove: true,
              maxWidth: '260px',
              offset: [0, 8],
              className: 'map-popup'
            });
            popup.current.setHTML(html);
            placePopupSafely(center);
            popup.current.addTo(map.current);
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

  // Zoom to mahalle - zoom IN to the neighborhood with padding
  function zoomToMah(mahId: string) {
    if (!map.current) return;
    const bbox = allBBoxes.current[mahId];
    if (bbox) {
      // First fit to bounds with padding
      map.current.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
        padding: UI_PADDING,
        duration: 600
      });

      // Then ensure we're zoomed in enough (never zoom out)
      map.current.once('moveend', () => {
        if (!map.current) return;
        const center: [number, number] = [
          (bbox[0] + bbox[2]) / 2,
          (bbox[1] + bbox[3]) / 2
        ];
        const currentZoom = map.current.getZoom();
        const targetZoom = Math.max(TARGET_ZOOM, currentZoom);
        map.current.easeTo({ 
          center, 
          zoom: targetZoom, 
          padding: UI_PADDING, 
          duration: 500 
        });
      });
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
            // Consistent ID resolution
            const mahId = String(feature.properties.mah_id ?? feature.properties.fid ?? '');
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

  // Handle metric + year changes - choropleth rengi yenilenir
  useEffect(() => {
    if (!map.current || !map.current.getLayer('mahalle-fill')) return;
    
    console.info('[MapContainer] Updating metric paint:', metric, 'year:', year);
    map.current.setPaintProperty('mahalle-fill', 'fill-color', getMetricPaint(metric));
  }, [metric, year]);

  // Handle sidebar toggle - resize map and scatter
  useEffect(() => {
    if (!map.current) return;
    const timer = setTimeout(() => {
      map.current?.resize();
      window.dispatchEvent(new Event('resize')); // Trigger Recharts ResponsiveContainer
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
        const feature = cityData.features.find((f: any) => {
          // Consistent ID resolution
          const fId = String(f.properties.mah_id ?? f.properties.fid ?? '');
          return fId === mahId;
        });
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
