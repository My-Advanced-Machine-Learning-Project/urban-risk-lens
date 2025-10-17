import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapState } from '@/stores/useMapState';
import { getMapPaintExpression, getRiskClass, getRiskColor } from '@/lib/riskColors';
import { t } from '@/lib/i18n';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';

function getStyleUrl(theme: 'light' | 'dark'): string {
  if (!MAPTILER_KEY) {
    return 'https://demotiles.maplibre.org/style.json';
  }
  return theme === 'dark'
    ? `https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_KEY}`
    : `https://api.maptiler.com/maps/streets/style.json?key=${MAPTILER_KEY}`;
}

export function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { theme, language, viewMode, metric, selectedCities } = useMapState();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getStyleUrl(theme),
      center: [35.0, 39.0], // Turkey center
      zoom: 6,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.current.on('load', () => {
      console.info('[MapContainer] Map loaded successfully');
      // Add demo source and layer (replace with actual GeoJSON)
      addDemoLayers();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update theme
  useEffect(() => {
    if (!map.current) return;
    
    const newStyleUrl = getStyleUrl(theme);
    
    map.current.once('styledata', () => {
      console.info('[MapContainer] Theme changed, reattaching layers');
      addDemoLayers();
    });
    
    map.current.setStyle(newStyleUrl as any);
  }, [theme]);

  // Update view mode
  useEffect(() => {
    if (!map.current) return;
    toggleViewMode(viewMode);
  }, [viewMode]);

  // Update metric paint
  useEffect(() => {
    if (!map.current) return;
    updateMetricPaint();
  }, [metric]);

  function addDemoLayers() {
    if (!map.current) return;

    // Demo: Add a simple choropleth layer
    // In production, replace with actual GeoJSON data
    const demoSource = {
      type: 'geojson' as const,
      data: {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[
                [28.5, 41.2],
                [29.5, 41.2],
                [29.5, 40.7],
                [28.5, 40.7],
                [28.5, 41.2],
              ]],
            },
            properties: {
              mahalle_adi: 'Demo Mahalle 1',
              ilce_adi: 'Demo İlçe',
              il: 'İstanbul',
              risk_score: 0.35,
              vs30: 450,
              toplam_nufus: 15000,
            },
          },
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[
                [32.5, 39.9],
                [33.0, 39.9],
                [33.0, 39.6],
                [32.5, 39.6],
                [32.5, 39.9],
              ]],
            },
            properties: {
              mahalle_adi: 'Demo Mahalle 2',
              ilce_adi: 'Demo İlçe',
              il: 'Ankara',
              risk_score: 0.25,
              vs30: 520,
              toplam_nufus: 22000,
            },
          },
        ],
      },
    };

    if (!map.current.getSource('neighborhoods')) {
      map.current.addSource('neighborhoods', demoSource);
    }

    // Choropleth layer
    if (!map.current.getLayer('neighborhoods-fill')) {
      map.current.addLayer({
        id: 'neighborhoods-fill',
        type: 'fill',
        source: 'neighborhoods',
        paint: {
          'fill-color': getMapPaintExpression(metric),
          'fill-opacity': 0.7,
        },
      });
    }

    // Border layer
    if (!map.current.getLayer('neighborhoods-line')) {
      map.current.addLayer({
        id: 'neighborhoods-line',
        type: 'line',
        source: 'neighborhoods',
        paint: {
          'line-color': theme === 'dark' ? '#fff' : '#000',
          'line-width': 1,
          'line-opacity': 0.3,
        },
      });
    }

    // Add popup on click
    map.current.on('click', 'neighborhoods-fill', (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const props = feature.properties;
      const riskClass = getRiskClass(props?.risk_score || 0);
      const riskLabel = t(riskClass as any, language);
      
      new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-2 space-y-1">
            <h3 class="font-semibold text-sm">${props?.mahalle_adi || 'N/A'}</h3>
            <p class="text-xs text-gray-600">${props?.ilce_adi || 'N/A'}, ${props?.il || 'N/A'}</p>
            <div class="mt-2 space-y-1 text-xs">
              <div class="flex justify-between">
                <span>${t('riskClass', language)}:</span>
                <span class="font-medium" style="color: ${getRiskColor(riskClass)}">${riskLabel}</span>
              </div>
              <div class="flex justify-between">
                <span>${t('riskScore', language)}:</span>
                <span class="font-medium">${(props?.risk_score || 0).toFixed(3)}</span>
              </div>
              <div class="flex justify-between">
                <span>${t('vs30', language)}:</span>
                <span class="font-medium">${props?.vs30 || 'N/A'}</span>
              </div>
              <div class="flex justify-between">
                <span>${t('totalPopulation', language)}:</span>
                <span class="font-medium">${(props?.toplam_nufus || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        `)
        .addTo(map.current!);
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'neighborhoods-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'neighborhoods-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
  }

  function toggleViewMode(mode: typeof viewMode) {
    if (!map.current) return;

    const choroplethVisible = mode === 'choropleth';
    const heatmapVisible = mode === 'heatmap';
    const scatterVisible = mode === 'scatter';

    if (map.current.getLayer('neighborhoods-fill')) {
      map.current.setLayoutProperty(
        'neighborhoods-fill',
        'visibility',
        choroplethVisible ? 'visible' : 'none'
      );
    }

    // TODO: Add heatmap and scatter layers when data is available
    console.info(`[MapContainer] View mode: ${mode}`);
  }

  function updateMetricPaint() {
    if (!map.current || !map.current.getLayer('neighborhoods-fill')) return;

    map.current.setPaintProperty(
      'neighborhoods-fill',
      'fill-color',
      getMapPaintExpression(metric)
    );
    
    console.info(`[MapContainer] Metric updated: ${metric}`);
  }

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
}
