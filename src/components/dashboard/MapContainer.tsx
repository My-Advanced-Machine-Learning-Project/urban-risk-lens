import { useEffect, useRef, useState } from 'react';
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

// Turkey bounding box
const TR_BBOX: [[number, number], [number, number]] = [[26, 36], [45, 42]];

// Demo data - replace with actual GeoJSON
const DEMO_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [28.5, 41.2], [29.5, 41.2], [29.5, 40.7], [28.5, 40.7], [28.5, 41.2],
        ]],
      },
      properties: {
        mah_id: '1',
        mahalle_adi: 'Beşiktaş',
        ilce_adi: 'Beşiktaş',
        il: 'İstanbul',
        risk_score: 0.35,
        vs30: 450,
        toplam_nufus: 15000,
        bina_sayisi: 2500,
      },
    },
    {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [32.5, 39.9], [33.0, 39.9], [33.0, 39.6], [32.5, 39.6], [32.5, 39.9],
        ]],
      },
      properties: {
        mah_id: '6',
        mahalle_adi: 'Çankaya',
        ilce_adi: 'Çankaya',
        il: 'Ankara',
        risk_score: 0.25,
        vs30: 520,
        toplam_nufus: 22000,
        bina_sayisi: 3200,
      },
    },
  ],
};

export function MapContainer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { theme, language, viewMode, metric, selectedCities, selectedMah, toggleMah } = useMapState();
  const [bboxCache] = useState<Record<string, [number, number, number, number]>>({});

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getStyleUrl(theme),
      center: [35.0, 39.0],
      zoom: 6,
      attributionControl: false,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.current.on('load', () => {
      console.info('[MapContainer] Map loaded');
      addLayers();
      applyFilters();
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
    
    map.current.once('idle', () => {
      console.info('[MapContainer] Theme changed, reattaching layers');
      addLayers();
      applyFilters();
      updateMetricPaint();
      toggleViewMode(viewMode);
    });
    
    map.current.setStyle(newStyleUrl as any);
  }, [theme]);

  // Update view mode
  useEffect(() => {
    if (!map.current) return;
    toggleViewMode(viewMode);
  }, [viewMode]);

  // Update metric
  useEffect(() => {
    if (!map.current) return;
    updateMetricPaint();
  }, [metric]);

  // Update filters when selection changes
  useEffect(() => {
    if (!map.current) return;
    applyFilters();
    fitToSelection();
  }, [selectedCities, selectedMah]);

  function addLayers() {
    if (!map.current) return;

    // Add source
    if (!map.current.getSource('neighborhoods')) {
      map.current.addSource('neighborhoods', {
        type: 'geojson',
        data: DEMO_GEOJSON,
      });
    }

    // Choropleth fill layer
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

    // Add click handler
    map.current.off('click', 'neighborhoods-fill', handleFeatureClick as any);
    map.current.on('click', 'neighborhoods-fill', handleFeatureClick as any);

    // Hover cursor
    map.current.on('mouseenter', 'neighborhoods-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'neighborhoods-fill', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
  }

  function handleFeatureClick(e: any) {
    if (!e.features || e.features.length === 0) return;
    
    const feature = e.features[0];
    const props = feature.properties;
    const mahId = props?.mah_id;
    
    // Toggle selection
    if (mahId) {
      toggleMah(mahId);
    }
    
    // Show popup
    const riskScore = props?.risk_score || 0;
    const riskClass = getRiskClass(riskScore);
    const riskLabel = t(riskClass as any, language);
    
    new maplibregl.Popup({ closeButton: true, closeOnClick: true })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="p-2 space-y-1" style="min-width: 200px;">
          <h3 class="font-semibold text-sm">${props?.mahalle_adi || 'N/A'}</h3>
          <p class="text-xs text-gray-600">${props?.ilce_adi || 'N/A'}, ${props?.il || 'N/A'}</p>
          <div class="mt-2 space-y-1 text-xs">
            <div class="flex justify-between">
              <span>${t('riskClass', language)}:</span>
              <span class="font-medium" style="color: ${getRiskColor(riskClass)}">${riskLabel}</span>
            </div>
            <div class="flex justify-between">
              <span>${t('riskScore', language)}:</span>
              <span class="font-medium">${riskScore.toFixed(3)}</span>
            </div>
            <div class="flex justify-between">
              <span>${t('vs30', language)}:</span>
              <span class="font-medium">${props?.vs30 || 'N/A'}</span>
            </div>
            <div class="flex justify-between">
              <span>${t('totalPopulation', language)}:</span>
              <span class="font-medium">${(props?.toplam_nufus || 0).toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span>${t('buildingCount', language)}:</span>
              <span class="font-medium">${(props?.bina_sayisi || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      `)
      .addTo(map.current!);
  }

  function applyFilters() {
    if (!map.current || !map.current.getLayer('neighborhoods-fill')) return;

    // If no selection, show all
    if (selectedMah.size === 0) {
      map.current.setFilter('neighborhoods-fill', null);
      map.current.setFilter('neighborhoods-line', null);
      return;
    }

    // Filter by selected neighborhoods
    const filter = ['in', ['get', 'mah_id'], ['literal', Array.from(selectedMah)]] as any;
    map.current.setFilter('neighborhoods-fill', filter);
    map.current.setFilter('neighborhoods-line', filter);
    
    console.info('[MapContainer] Filters applied:', selectedMah.size, 'neighborhoods');
  }

  function toggleViewMode(mode: typeof viewMode) {
    if (!map.current) return;

    const choroplethVisible = mode === 'choropleth';
    
    if (map.current.getLayer('neighborhoods-fill')) {
      map.current.setLayoutProperty(
        'neighborhoods-fill',
        'visibility',
        choroplethVisible ? 'visible' : 'none'
      );
    }
    
    if (map.current.getLayer('neighborhoods-line')) {
      map.current.setLayoutProperty(
        'neighborhoods-line',
        'visibility',
        choroplethVisible ? 'visible' : 'none'
      );
    }

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

  function fitToSelection() {
    if (!map.current) return;

    // No selection = show all Turkey
    if (selectedMah.size === 0) {
      map.current.fitBounds(TR_BBOX, { padding: 40, duration: 400 });
      return;
    }

    // Single selection = zoom to that feature
    if (selectedMah.size === 1) {
      const mahId = Array.from(selectedMah)[0];
      const bbox = bboxCache[mahId];
      if (bbox) {
        map.current.fitBounds([
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]]
        ] as any, { padding: 40, duration: 400 });
      }
      return;
    }

    // Multiple selections = union bbox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedMah.forEach(id => {
      const bbox = bboxCache[id];
      if (bbox) {
        minX = Math.min(minX, bbox[0]);
        minY = Math.min(minY, bbox[1]);
        maxX = Math.max(maxX, bbox[2]);
        maxY = Math.max(maxY, bbox[3]);
      }
    });

    if (minX !== Infinity) {
      map.current.fitBounds([[minX, minY], [maxX, maxY]] as any, { padding: 40, duration: 400 });
    }
  }

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
}
