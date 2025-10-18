import { joinData } from './dataJoin';
import { buildCityIndex, NormalizedFeature, CityInfo } from './geoNormalize';

export interface MahalleFeature {
  type: 'Feature';
  properties: {
    mah_id: number | string;
    mahalle_adi: string;
    ilce_adi: string;
    toplam_nufus?: number;
    toplam_bina?: number;
    vs30_mean?: number;
    risk_score?: number;
    risk_class_5?: number;
    [key: string]: any;
  };
  geometry: any;
}

export interface CityData {
  geojson: any;
  features: MahalleFeature[];
  bboxes: Record<string, [number, number, number, number]>;
  normalized: NormalizedFeature[];
  cityInfo?: CityInfo;
}

const CITY_CONFIG: Record<string, { geo: string; csv: string }> = {
  'İstanbul': {
    geo: '/data/ISTANBUL_MAHALLE_956_FINAL.geojson',
    csv: '/data/2025_istanbul.csv'
  },
  'Ankara': {
    geo: '/data/ankara_mahalle_risk.geojson',
    csv: '/data/ankara_risk_data.csv'
  }
};

// Parse CSV text to array of objects
function parseCSV(text: string): Record<string, any>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data: Record<string, any>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length !== headers.length) continue;
    
    const row: Record<string, any> = {};
    headers.forEach((header, idx) => {
      const value = values[idx].trim();
      // Try to parse as number
      const num = parseFloat(value);
      row[header] = isNaN(num) ? value : num;
    });
    data.push(row);
  }
  
  return data;
}

// Calculate bbox for a feature
function calculateFeatureBBox(feature: MahalleFeature): [number, number, number, number] {
  const coords = feature.geometry.coordinates;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  function processCoords(c: any) {
    if (Array.isArray(c[0])) {
      c.forEach(processCoords);
    } else {
      const [x, y] = c;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  
  processCoords(coords);
  return [minX, minY, maxX, maxY];
}

// Load data for a specific city
export async function loadCityData(cityName: string): Promise<CityData | null> {
  const config = CITY_CONFIG[cityName];
  if (!config) {
    console.warn(`No data config for city: ${cityName}`);
    return null;
  }
  
  try {
    // Fetch GeoJSON and CSV in parallel
    const [geoResponse, csvResponse] = await Promise.all([
      fetch(config.geo),
      fetch(config.csv)
    ]);
    
    if (!geoResponse.ok || !csvResponse.ok) {
      throw new Error('Failed to fetch data');
    }
    
    const geojson = await geoResponse.json();
    const csvText = await csvResponse.text();
    const csvData = parseCSV(csvText);
    
    // Join data - NOTE: csvData first, then features!
    const { features: joinedFeatures } = joinData(csvData, geojson.features);
    
    // Reconstruct GeoJSON
    const joinedGeoJSON = {
      ...geojson,
      features: joinedFeatures
    };
    
    // Build normalized index
    const { normalized, cityIndex } = buildCityIndex(joinedFeatures);
    
    // Calculate bboxes
    const bboxes: Record<string, [number, number, number, number]> = {};
    joinedGeoJSON.features.forEach((feature: MahalleFeature) => {
      const mahId = String(feature.properties.mah_id || feature.properties.fid);
      bboxes[mahId] = calculateFeatureBBox(feature);
    });
    
    console.info(`[DataLoader] Loaded ${cityName}: ${joinedGeoJSON.features.length} features`);
    
    // Get the city info for this specific city
    const cityKey = [...cityIndex.keys()][0]; // Should only be one city per load
    const cityInfo = cityIndex.get(cityKey);
    
    return {
      geojson: joinedGeoJSON,
      features: joinedGeoJSON.features,
      bboxes,
      normalized,
      cityInfo,
    };
  } catch (error) {
    console.error(`[DataLoader] Error loading ${cityName}:`, error);
    return null;
  }
}

// Load multiple cities
export async function loadCitiesData(cityNames: string[]): Promise<Map<string, CityData>> {
  const dataMap = new Map<string, CityData>();
  
  const results = await Promise.all(
    cityNames.map(city => loadCityData(city))
  );
  
  cityNames.forEach((city, idx) => {
    if (results[idx]) {
      dataMap.set(city, results[idx]!);
    }
  });
  
  return dataMap;
}
