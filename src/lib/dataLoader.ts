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

// Map any city name variant to stable key (lowercase)
const cityKeyFromName = (name: string): string => {
  const n = normalizeTr(name);
  if (n.includes('istanbul')) return 'istanbul';
  if (n.includes('ankara')) return 'ankara';
  return n; // fallback to normalized
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

// Year-specific prediction files
const CITY_CONFIG: Record<string, (year: number) => string> = {
  'istanbul': (year) => `/data/${year}_istanbul_risk_predictions.geojson`,
  'ankara': (year) => `/data/${year}_ankara_risk_predictions.geojson`
};

// No longer needed - data comes from GeoJSON files

// No longer needed - data comes from GeoJSON files

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

// Load data for a specific city from year-specific GeoJSON
export async function loadCityData(cityName: string, year: number = 2025): Promise<CityData | null> {
  const normalizedKey = cityKeyFromName(cityName);
  const getGeoPath = CITY_CONFIG[normalizedKey];
  
  if (!getGeoPath) {
    console.warn(`[DataLoader] No data config for city: ${cityName} (normalized: ${normalizedKey})`);
    return null;
  }
  
  try {
    const geoPath = getGeoPath(year);
    console.info(`[DataLoader] Loading ${normalizedKey} year ${year} from: ${geoPath}`);
    
    const geoResponse = await fetch(geoPath, { cache: 'no-store' });
    
    if (!geoResponse.ok) {
      console.warn(`[DataLoader] ⚠ Failed to fetch ${geoPath} - status ${geoResponse.status}`);
      return null;
    }
    
    const geojson = await geoResponse.json();
    
    if (!geojson.features || geojson.features.length === 0) {
      console.warn(`[DataLoader] ⚠ No features in ${geoPath}`);
      return null;
    }
    
    console.info(`[DataLoader] ${normalizedKey} - Loaded ${geojson.features.length} features from ${geoPath}`);
    
    // Process features - data already in GeoJSON with risk_score_pred, risk_label_pred
    const features = geojson.features.map((feature: any) => {
      const props = feature.properties || {};
      
      // Normalize city key
      props.city_key = normalizedKey;
      
      // Normalize risk properties - handle multiple column name variants
      const scoreRaw = 
        props.risk_score_pred ?? 
        props.risk_score ?? 
        props.riskPred ?? 
        props.risk ?? 
        props.score ?? 
        props.riskScore;
      
      const score = (scoreRaw === '' || scoreRaw == null || scoreRaw === 'NA' || scoreRaw === 'N/A') 
        ? null 
        : getNum(scoreRaw);
      
      // Map to standard names (null-safe, no forced zeros)
      props.risk_score = score;
      props.risk_score_pred = score;
      
      // Risk label with fallbacks
      props.risk_label_pred = 
        props.risk_label_pred || 
        props.risk_label_tr || 
        props.risk_label || 
        props.label || 
        'unknown';
      props.risk_label = props.risk_label_pred;
      
      // Risk class with fallbacks
      props.risk_class_5_pred = 
        props.risk_class_5_pred ?? 
        props.risk_class_pred_5 ?? 
        props.risk_class_5 ?? 
        props.risk_class ?? 
        null;
      
      // Parse other numeric fields (null-safe)
      props.toplam_nufus = getNum(props.toplam_nufus);
      props.toplam_bina = getNum(props.toplam_bina);
      props.vs30_mean = getNum(props.vs30_mean) ?? getNum(props.vs30);
      
      // Ensure city/district names
      props.il_adi = props.il_adi || normalizedKey;
      props.il = props.il || normalizedKey;
      props.city = props.city || normalizedKey;
      
      // Stable feature ID with city prefix
      const fid = String(props.mah_id || props.fid || feature.id || '').trim();
      if (fid) {
        feature.id = `${normalizedKey}-${fid}`;
        props.mah_id = feature.id;
      }
      
      feature.properties = props;
      return feature;
    });
    
    // Data quality check
    const withScore = features.filter(f => (f.properties?.risk_score_pred ?? 0) > 0).length;
    const withLabel = features.filter(f => f.properties?.risk_label_pred).length;
    const withId = features.filter(f => f.id != null).length;
    
    console.info(`[DataLoader] ${normalizedKey} year ${year}:`, {
      total: features.length,
      withScore,
      withLabel,
      withId,
      geoFile: geoPath
    });
    
    // Sample feature
    if (features.length > 0) {
      const sample = features[Math.floor(Math.random() * features.length)];
      console.info(`[DataLoader] Sample feature:`, {
        id: sample.id,
        mahalle: sample.properties?.mahalle_adi,
        ilce: sample.properties?.ilce_adi,
        risk_score_pred: sample.properties?.risk_score_pred,
        risk_label_pred: sample.properties?.risk_label_pred,
        population: sample.properties?.toplam_nufus,
        buildings: sample.properties?.toplam_bina
      });
    }
    
    // Reconstruct GeoJSON
    const processedGeoJSON = {
      ...geojson,
      features
    };
    
    // Build normalized index
    const { normalized, cityIndex } = buildCityIndex(features);
    
    // Calculate bboxes
    const bboxes: Record<string, [number, number, number, number]> = {};
    features.forEach((feature: MahalleFeature) => {
      const mahId = String(feature.properties.mah_id || feature.properties.fid);
      bboxes[mahId] = calculateFeatureBBox(feature);
    });
    
    console.info(`[DataLoader] ✅ Loaded ${normalizedKey}: ${features.length} features`);
    
    // Get city info
    const cityKey = [...cityIndex.keys()][0];
    const cityInfo = cityIndex.get(cityKey);
    
    return {
      geojson: processedGeoJSON,
      features,
      bboxes,
      normalized,
      cityInfo,
    };
  } catch (error) {
    console.error(`[DataLoader] ❌ Error loading ${normalizedKey} year ${year}:`, error);
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
