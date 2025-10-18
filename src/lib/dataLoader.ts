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

const CITY_CONFIG: Record<string, Record<number, { geo: string; csv: string }>> = {
  'İstanbul': {
    2025: {
      geo: '/data/ISTANBUL_MAHALLE_956_FINAL.geojson',
      csv: '/data/2025_istanbul.csv'
    },
    2026: {
      geo: '/data/ISTANBUL_MAHALLE_956_FINAL.geojson',
      csv: '/data/2026_istanbul.csv'
    }
  },
  'Ankara': {
    2025: {
      geo: '/data/ankara_mahalle_risk.geojson',
      csv: '/data/2025_ankara.csv'
    },
    2026: {
      geo: '/data/ankara_mahalle_risk.geojson',
      csv: '/data/2026_ankara.csv'
    }
  }
};

// Parse CSV text to array of objects (handles quoted values)
function parseCSV(text: string): Record<string, any>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Parse CSV line considering quotes
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };
  
  const headers = parseLine(lines[0]);
  const data: Record<string, any>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length !== headers.length) continue;
    
    const row: Record<string, any> = {};
    headers.forEach((header, idx) => {
      let value = values[idx];
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      // Try to parse as number, handle Turkish comma decimals
      const normalizedValue = value.replace(',', '.');
      const num = parseFloat(normalizedValue);
      row[header] = isNaN(num) ? value : num;
    });
    data.push(row);
  }
  
  console.info(`[CSV Parse] Parsed ${data.length} rows with headers:`, headers.slice(0, 10));
  if (data.length > 0) {
    console.info('[CSV Parse] Sample row:', data[0]);
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
export async function loadCityData(cityName: string, year: number = 2025): Promise<CityData | null> {
  const cityConfig = CITY_CONFIG[cityName];
  if (!cityConfig) {
    console.warn(`No data config for city: ${cityName}`);
    return null;
  }
  
  const config = cityConfig[year as 2025 | 2026];
  if (!config) {
    console.warn(`No data config for city: ${cityName} year: ${year}`);
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
    
    console.info(`[DataLoader] ${cityName} - Raw data:`, {
      geoFeatures: geojson.features?.length,
      csvRows: csvData.length,
      sampleGeoId: geojson.features?.[0]?.properties?.mah_id || geojson.features?.[0]?.properties?.fid,
      sampleCsvKeys: csvData[0] ? Object.keys(csvData[0]).slice(0, 10) : []
    });
    
    // Join data - NOTE: csvData first, then features!
    const { features: joinedFeatures } = joinData(csvData, geojson.features);
    
    // Verify join worked
    const withScore = joinedFeatures.filter(f => (f.properties?.risk_score ?? 0) > 0).length;
    console.info(`[DataLoader] ${cityName} - Join result: ${withScore}/${joinedFeatures.length} features have risk_score`);
    
    // Sample feature check
    if (joinedFeatures.length > 0) {
      const sample = joinedFeatures[Math.floor(Math.random() * joinedFeatures.length)];
      console.info(`[DataLoader] ${cityName} - Sample feature:`, {
        mahalle: sample.properties?.mahalle_adi,
        id: sample.properties?.mah_id || sample.properties?.fid,
        risk_score: sample.properties?.risk_score,
        population: sample.properties?.toplam_nufus,
        buildings: sample.properties?.toplam_bina,
        vs30: sample.properties?.vs30_mean
      });
    }
    
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
export async function loadCitiesData(cityNames: string[], year: number = 2025): Promise<Map<string, CityData>> {
  const dataMap = new Map<string, CityData>();
  
  const results = await Promise.all(
    cityNames.map(city => loadCityData(city, year))
  );
  
  cityNames.forEach((city, idx) => {
    if (results[idx]) {
      dataMap.set(city, results[idx]!);
    }
  });
  
  return dataMap;
}
