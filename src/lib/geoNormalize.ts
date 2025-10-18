// Normalize Turkish characters for key matching
export const toKey = (s: string): string => {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ş/gi, 's')
    .replace(/ı/gi, 'i')
    .replace(/ğ/gi, 'g')
    .replace(/ç/gi, 'c')
    .replace(/ö/gi, 'o')
    .replace(/ü/gi, 'u')
    .toLowerCase()
    .trim();
};

// Safe property getter
const get = (obj: any, keys: string[], fallback: any = ''): any => {
  for (const key of keys) {
    if (obj?.[key] != null && obj[key] !== '') {
      return obj[key];
    }
  }
  return fallback;
};

// Normalize a GeoJSON feature
export interface NormalizedFeature {
  id: string;
  city: string;
  cityKey: string;
  district: string;
  districtKey: string;
  name: string;
  nameKey: string;
  risk_score: number;
  risk_class: number;
  population: number;
  building_count: number;
  vs30: number;
  bbox?: [number, number, number, number];
  _raw: any;
}

export function normalizeFeature(feature: any): NormalizedFeature {
  const p = feature.properties ?? {};
  
  // Extract city, district, name
  const cityRaw = get(p, ['city', 'il', 'province', 'sehir', 'şehir']);
  const districtRaw = get(p, ['district', 'ilce', 'ilce_adi', 'county']);
  const nameRaw = get(p, ['name', 'mahalle', 'mahalle_adi', 'neighborhood']);
  
  const city = String(cityRaw).trim();
  const district = String(districtRaw).trim();
  const name = String(nameRaw).trim();
  
  const cityKey = toKey(city);
  const districtKey = toKey(`${city}::${district}`);
  const nameKey = toKey(`${city}::${district}::${name}`);
  
  return {
    id: String(get(p, ['id', 'mah_id', 'mahalle_id', 'fid'], `${cityKey}-${districtKey}-${nameKey}`)),
    city,
    cityKey,
    district,
    districtKey,
    name,
    nameKey,
    risk_score: Number(get(p, ['risk_score', 'risk', 'score'], 0)),
    risk_class: Number(get(p, ['risk_class_5', 'risk_class', 'risk_label'], 3)),
    population: Number(get(p, ['population', 'nufus', 'toplam_nufus'], 0)),
    building_count: Number(get(p, ['building_count', 'bina', 'bina_sayisi', 'toplam_bina'], 0)),
    vs30: Number(get(p, ['vs30', 'VS30', 'vs30_mean'], NaN)),
    _raw: feature,
  };
}

// Build hierarchical index
export interface DistrictInfo {
  label: string;
  key: string;
  neighborhoods: NormalizedFeature[];
}

export interface CityInfo {
  label: string;
  key: string;
  districts: Map<string, DistrictInfo>;
}

export function buildCityIndex(features: any[]): {
  normalized: NormalizedFeature[];
  cityIndex: Map<string, CityInfo>;
} {
  const cityIndex = new Map<string, CityInfo>();
  const normalized: NormalizedFeature[] = [];
  
  for (const feature of features) {
    const nf = normalizeFeature(feature);
    normalized.push(nf);
    
    // Ensure city exists
    if (!cityIndex.has(nf.cityKey)) {
      cityIndex.set(nf.cityKey, {
        label: nf.city,
        key: nf.cityKey,
        districts: new Map(),
      });
    }
    
    const cityInfo = cityIndex.get(nf.cityKey)!;
    
    // Ensure district exists
    if (!cityInfo.districts.has(nf.districtKey)) {
      cityInfo.districts.set(nf.districtKey, {
        label: nf.district,
        key: nf.districtKey,
        neighborhoods: [],
      });
    }
    
    // Add neighborhood to district
    cityInfo.districts.get(nf.districtKey)!.neighborhoods.push(nf);
  }
  
  // Sort neighborhoods within each district
  for (const city of cityIndex.values()) {
    for (const district of city.districts.values()) {
      district.neighborhoods.sort((a, b) => 
        a.name.localeCompare(b.name, 'tr', { numeric: true, sensitivity: 'base' })
      );
    }
  }
  
  console.info('[GeoNormalize] Built city index:', {
    cities: cityIndex.size,
    totalNeighborhoods: normalized.length,
    cityKeys: [...cityIndex.keys()],
  });
  
  return { normalized, cityIndex };
}
