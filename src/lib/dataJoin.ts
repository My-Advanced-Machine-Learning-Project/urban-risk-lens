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
 * Join CSV data with GeoJSON features
 */
export function joinData(
  csvData: any[],
  geoFeatures: any[],
  options?: { csvKey?: string; geoKey?: string }
): { features: any[]; diagnostics: JoinDiagnostics } {
  // Auto-detect keys if not provided
  let csvKey = options?.csvKey;
  let geoKey = options?.geoKey;
  
  if (!csvKey || !geoKey) {
    const detected = findBestJoinKeys(csvData, geoFeatures);
    csvKey = csvKey || detected.csvKey;
    geoKey = geoKey || detected.geoKey;
  }
  
  if (!csvKey || !geoKey) {
    console.warn('[dataJoin] Could not find valid join keys');
    return {
      features: geoFeatures,
      diagnostics: {
        used: { csvKey: '', geoKey: '' },
        matched: 0,
        missing: geoFeatures.length,
        sampleMissing: [],
        totalFeatures: geoFeatures.length,
      },
    };
  }
  
  // Build CSV lookup map
  const csvMap = new Map<string, any>();
  csvData.forEach(row => {
    const key = normalizeKey(row[csvKey!]);
    if (key) csvMap.set(key, row);
  });
  
  // Join features
  const joinedFeatures: any[] = [];
  const missingKeys: string[] = [];
  let matchedCount = 0;
  
  geoFeatures.forEach(feature => {
    const geoValue = normalizeKey(feature.properties?.[geoKey!]);
    const csvRow = csvMap.get(geoValue);
    
    if (csvRow) {
      joinedFeatures.push({
        ...feature,
        properties: {
          ...feature.properties,
          ...csvRow,
        },
      });
      matchedCount++;
    } else {
      joinedFeatures.push(feature);
      if (missingKeys.length < 10) {
        missingKeys.push(geoValue || 'null');
      }
    }
  });
  
  const diagnostics: JoinDiagnostics = {
    used: { csvKey, geoKey },
    matched: matchedCount,
    missing: geoFeatures.length - matchedCount,
    sampleMissing: missingKeys,
    totalFeatures: geoFeatures.length,
  };
  
  // Store diagnostics globally for debugging
  (window as any).__joinDiag = diagnostics;
  
  console.info('[dataJoin] Join complete:', {
    keys: `${csvKey} → ${geoKey}`,
    matched: matchedCount,
    missing: diagnostics.missing,
    matchRate: `${((matchedCount / geoFeatures.length) * 100).toFixed(1)}%`,
  });
  
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
