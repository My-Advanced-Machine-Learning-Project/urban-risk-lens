/**
 * Data Join Auto-detection & Normalization
 * Automatically finds best matching CSV and GeoJSON key combinations
 */

export interface JoinDiagnostics {
  used: {
    csvKey: string;
    geoKey: string;
  };
  matched: number;
  missing: number;
  sampleMissing: string[];
  totalFeatures: number;
}

// Potential CSV key candidates
const CSV_KEY_CANDIDATES = ['fid', 'mah_id', 'mahalle_id', 'uavt', 'geo_id', 'id'];

// Potential GeoJSON key candidates
const GEO_KEY_CANDIDATES = ['fid', 'mah_id', 'mahalle_id', 'id'];

/**
 * Normalize key value (remove decimals, trim, handle unicode)
 */
export function normalizeKey(value: any): string {
  if (value === null || value === undefined) return '';
  
  let str = String(value).trim();
  
  // Remove .0 decimals (e.g., "192001.0" → "192001")
  str = str.replace(/\.0+$/, '');
  
  // Remove non-breaking spaces and normalize unicode
  str = str.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  
  return str;
}

/**
 * Find best matching key combination between CSV and GeoJSON
 */
export function findBestJoinKeys(
  csvData: any[],
  geoFeatures: any[]
): { csvKey: string; geoKey: string; matchCount: number } {
  let bestMatch = { csvKey: '', geoKey: '', matchCount: 0 };
  
  // Sample size for testing (300 features)
  const sampleSize = Math.min(300, geoFeatures.length);
  const sampleFeatures = geoFeatures.slice(0, sampleSize);
  
  // Build CSV key sets
  const csvKeySets: Record<string, Set<string>> = {};
  CSV_KEY_CANDIDATES.forEach(key => {
    csvKeySets[key] = new Set(
      csvData.map(row => normalizeKey(row[key])).filter(v => v !== '')
    );
  });
  
  // Test all combinations
  for (const csvKey of CSV_KEY_CANDIDATES) {
    if (!csvKeySets[csvKey] || csvKeySets[csvKey].size === 0) continue;
    
    for (const geoKey of GEO_KEY_CANDIDATES) {
      let matchCount = 0;
      
      for (const feature of sampleFeatures) {
        const geoValue = normalizeKey(feature.properties?.[geoKey]);
        if (geoValue && csvKeySets[csvKey].has(geoValue)) {
          matchCount++;
        }
      }
      
      if (matchCount > bestMatch.matchCount) {
        bestMatch = { csvKey, geoKey, matchCount };
      }
    }
  }
  
  console.info('[dataJoin] Best match found:', bestMatch);
  return bestMatch;
}

/**
 * Join CSV data with GeoJSON features using normalized keys
 */
export function joinData(
  csvData: any[],
  geoFeatures: any[],
  options?: { csvKey?: string; geoKey?: string }
): { features: any[]; diagnostics: JoinDiagnostics } {
  console.log('[dataJoin] Input:', { csvRows: csvData.length, geoFeatures: geoFeatures.length });
  
  // Build CSV lookup map using multiple key strategies
  const csvByKey = new Map<string, any>();
  const csvByNormalizedName = new Map<string, any>();
  
  csvData.forEach(row => {
    // Strategy 1: Use ID fields
    CSV_KEY_CANDIDATES.forEach(key => {
      const value = normalizeKey(row[key]);
      if (value) {
        csvByKey.set(value, row);
      }
    });
    
    // Strategy 2: Use normalized composite key (city::district::name)
    const cityRaw = row.city || row.il || row.sehir || row.şehir || '';
    const districtRaw = row.district || row.ilce || row.ilce_adi || '';
    const nameRaw = row.name || row.mahalle || row.mahalle_adi || '';
    
    if (cityRaw && districtRaw && nameRaw) {
      const city = String(cityRaw).toLowerCase().trim();
      const district = String(districtRaw).toLowerCase().trim();
      const name = String(nameRaw).toLowerCase().trim();
      const compositeKey = `${city}::${district}::${name}`;
      csvByNormalizedName.set(compositeKey, row);
    }
  });
  
  console.log('[dataJoin] CSV indexes built:', {
    byId: csvByKey.size,
    byComposite: csvByNormalizedName.size
  });
  
  // Join features
  const joinedFeatures: any[] = [];
  const missingKeys: string[] = [];
  let matchedCount = 0;
  let istanbulMatched = 0, istanbulTotal = 0;
  let ankaraMatched = 0, ankaraTotal = 0;
  
  geoFeatures.forEach(feature => {
    const props = feature.properties || {};
    let csvRow: any = null;
    
    // Try ID-based matching first
    for (const geoKey of GEO_KEY_CANDIDATES) {
      const geoValue = normalizeKey(props[geoKey]);
      if (geoValue && csvByKey.has(geoValue)) {
        csvRow = csvByKey.get(geoValue);
        break;
      }
    }
    
    // If no match, try composite key matching
    if (!csvRow) {
      const cityRaw = props.city || props.il || '';
      const districtRaw = props.district || props.ilce || props.ilce_adi || '';
      const nameRaw = props.name || props.mahalle || props.mahalle_adi || '';
      
      if (cityRaw && districtRaw && nameRaw) {
        const city = String(cityRaw).toLowerCase().trim();
        const district = String(districtRaw).toLowerCase().trim();
        const name = String(nameRaw).toLowerCase().trim();
        const compositeKey = `${city}::${district}::${name}`;
        csvRow = csvByNormalizedName.get(compositeKey);
      }
    }
    
    // Track city coverage
    const isIstanbul = props.ilce_adi && (
      String(props.mah_id || '').startsWith('40') ||
      String(props.mah_id || '').startsWith('99') ||
      String(props.mah_id || '').startsWith('100')
    );
    const isAnkara = props.ilce_adi && (
      String(props.mah_id || '').startsWith('1') &&
      String(props.mah_id || '').length <= 6
    );
    
    if (isIstanbul) istanbulTotal++;
    if (isAnkara) ankaraTotal++;
    
    if (csvRow) {
      joinedFeatures.push({
        ...feature,
        properties: {
          ...props,
          risk_score: Number(csvRow.risk_score || csvRow.risk || csvRow.score || 0),
          risk_class_5: Number(csvRow.risk_class_5 || csvRow.risk_class || csvRow.risk_label || 3),
          toplam_nufus: Number(csvRow.toplam_nufus || csvRow.population || csvRow.nufus || 0),
          toplam_bina: Number(csvRow.toplam_bina || csvRow.building_count || csvRow.bina || csvRow.bina_sayisi || 0),
          vs30_mean: Number(csvRow.vs30_mean || csvRow.vs30 || csvRow.VS30 || 0),
        },
      });
      matchedCount++;
      if (isIstanbul) istanbulMatched++;
      if (isAnkara) ankaraMatched++;
    } else {
      joinedFeatures.push(feature);
      if (missingKeys.length < 10) {
        const id = props.mah_id || props.fid || props.mahalle_adi || 'unknown';
        missingKeys.push(String(id));
      }
    }
  });
  
  const diagnostics: JoinDiagnostics = {
    used: { csvKey: 'multi-strategy', geoKey: 'multi-strategy' },
    matched: matchedCount,
    missing: geoFeatures.length - matchedCount,
    sampleMissing: missingKeys,
    totalFeatures: geoFeatures.length,
  };
  
  console.info('[dataJoin] Join complete:', {
    matched: matchedCount,
    missing: diagnostics.missing,
    matchRate: `${((matchedCount / geoFeatures.length) * 100).toFixed(1)}%`,
    istanbul: `${istanbulMatched}/${istanbulTotal}`,
    ankara: `${ankaraMatched}/${ankaraTotal}`,
  });
  
  if (diagnostics.missing > 0) {
    console.warn('[dataJoin] Sample missing keys:', missingKeys.slice(0, 5));
  }
  
  return { features: joinedFeatures, diagnostics };
}

/**
 * Calculate bounding box for a feature
 */
export function calculateBBox(feature: any): [number, number, number, number] | null {
  const coords = feature.geometry?.coordinates;
  if (!coords) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  const processCoords = (c: any) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]);
      maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]);
      maxY = Math.max(maxY, c[1]);
    } else {
      c.forEach(processCoords);
    }
  };
  
  processCoords(coords);
  
  return [minX, minY, maxX, maxY];
}

/**
 * Build bbox cache for features
 */
export function buildBBoxCache(features: any[], idKey: string = 'mah_id'): Record<string, [number, number, number, number]> {
  const cache: Record<string, [number, number, number, number]> = {};
  
  features.forEach(feature => {
    const id = normalizeKey(feature.properties?.[idKey]);
    const bbox = calculateBBox(feature);
    if (id && bbox) {
      cache[id] = bbox;
    }
  });
  
  console.info(`[dataJoin] BBox cache built: ${Object.keys(cache).length} entries`);
  return cache;
}
