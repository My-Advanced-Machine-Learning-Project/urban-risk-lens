import { joinData } from './dataJoin';
import { buildCityIndex, NormalizedFeature, CityInfo } from './geoNormalize';

// Robust Turkish character normalization
const normalizeTr = (s: string = '') =>
  s.normalize('NFD')
   .replace(/\p{Diacritic}/gu, '')
   .replace(/İ/g, 'I').replace(/ı/g, 'i')
   .replace(/Ş/g, 'S').replace(/ş/g, 's')
   .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
   .replace(/Ç/g, 'C').replace(/ç/g, 'c')
   .replace(/Ö/g, 'O').replace(/ö/g, 'o')
   .replace(/Ü/g, 'U').replace(/ü/g, 'u')
   .toLowerCase().trim();

// Map any city name variant to stable key
const cityKeyFromName = (name: string): string => {
  const n = normalizeTr(name);
  if (n.includes('istanbul')) return 'İstanbul';
  if (n.includes('ankara')) return 'Ankara';
  return name; // fallback to original
};

// Safe number parsing
const getNum = (v: any): number | undefined => {
  if (v === '' || v == null || v === 'NA' || v === 'N/A') return undefined;
  const num = Number(v);
  return isNaN(num) ? undefined : num;
};

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
  // Normalize city name for lookup
  const normalizedKey = cityKeyFromName(cityName);
  const cityConfig = CITY_CONFIG[normalizedKey];
  
  if (!cityConfig) {
    console.warn(`[DataLoader] No data config for city: ${cityName} (normalized: ${normalizedKey})`);
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
    const csvData = parseCSV(csvText).map(row => ({
      ...row,
      city: normalizedKey
    }));
    
    console.info(`[DataLoader] ${normalizedKey} - Raw data:`, {
      geoFeatures: geojson.features?.length,
      csvRows: csvData.length,
      sampleGeoId: geojson.features?.[0]?.properties?.mah_id || geojson.features?.[0]?.properties?.fid,
      sampleCsvKeys: csvData[0] ? Object.keys(csvData[0]).slice(0, 10) : []
    });
    
    // Join data - NOTE: csvData first, then features!
    const { features: joinedFeatures } = joinData(csvData, geojson.features);
    
    // Enhance joined features with safe property copying and ID assignment
    joinedFeatures.forEach((feature: any) => {
      const props = feature.properties;
      const matchingRow = csvData.find((row: any) => {
        const rowId = String(row.mah_id || row.fid || '');
        const featId = String(props.mah_id || props.fid || '');
        return rowId === featId;
      });
      
      if (matchingRow) {
        // Safe numeric assignments with fallbacks
        props.risk_score = getNum((matchingRow as any).risk_score) ?? props.risk_score ?? 0;
        props.toplam_nufus = getNum((matchingRow as any).toplam_nufus) ?? props.toplam_nufus ?? 0;
        props.toplam_bina = getNum((matchingRow as any).toplam_bina) ?? props.toplam_bina ?? 0;
        props.vs30_mean = getNum((matchingRow as any).vs30_mean) ?? getNum((matchingRow as any).vs30) ?? props.vs30_mean ?? -1;
        
        // City/district names with all variant field names
        const ilceValue = (matchingRow as any).ilce_adi ?? (matchingRow as any).ilce ?? (matchingRow as any).district;
        if (ilceValue) {
          props.ilce_adi = ilceValue;
          props.ilce = ilceValue;  // Duplicate for compatibility
          props.district = ilceValue;
        }
        
        const ilValue = (matchingRow as any).il_adi ?? (matchingRow as any).sehir ?? (matchingRow as any).city ?? normalizedKey;
        if (ilValue) {
          props.il_adi = ilValue;
          props.il = ilValue;  // Duplicate for compatibility
          props.city = ilValue;
        }
      }
      
      // Ensure city/district are set even if no CSV match (use normalized city name as fallback)
      if (!props.il_adi && !props.il && !props.city) {
        props.il_adi = normalizedKey;
        props.il = normalizedKey;
        props.city = normalizedKey;
      }
      
      // Ensure stable feature ID for feature-state support
      // Prefix with city to avoid ID collisions between cities
      const fid = String(props.mah_id ?? props.fid ?? feature.id ?? '');
      if (fid) {
        feature.id = `${normalizedKey.toLowerCase()}-${fid}`;
        props.mah_id = feature.id;  // Update property to match
      }
    });
    
    // Verify join and data quality
    const withScore = joinedFeatures.filter(f => (f.properties?.risk_score ?? 0) > 0).length;
    const withId = joinedFeatures.filter(f => f.id != null).length;
    console.info(`[DataLoader] ${normalizedKey} - Join result:`, {
      total: joinedFeatures.length,
      withScore: withScore,
      withId: withId,
      configFiles: config
    });
    
    if (joinedFeatures.length === 0) {
      console.warn(`[DataLoader] WARNING: ${normalizedKey} loaded ZERO features!`);
    }
    
    // Sample feature check
    if (joinedFeatures.length > 0) {
      const sample = joinedFeatures[Math.floor(Math.random() * joinedFeatures.length)];
      console.info(`[DataLoader] ${normalizedKey} - Sample feature:`, {
        id: sample.id,
        mahalle: sample.properties?.mahalle_adi,
        ilce: sample.properties?.ilce_adi,
        il: sample.properties?.il_adi,
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
    
    console.info(`[DataLoader] ✅ Loaded ${normalizedKey}: ${joinedGeoJSON.features.length} features`);
    
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
    console.error(`[DataLoader] ❌ Error loading ${normalizedKey}:`, error);
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
