/**
 * Convert any value to a proper number, handling Turkish comma decimals
 */
export function toNum(v: any): number {
  if (v == null || v === '') return NaN;
  if (typeof v === 'number') return v;
  
  // Handle Turkish comma decimals: "0,37" -> "0.37"
  const s = String(v).replace(',', '.').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Add padding to domain to prevent points from sticking to edges
 */
export function padDomain(min: number, max: number, paddingPercent = 0.1): [number, number] {
  // Edge case: if min === max, add fixed padding
  if (min === max) {
    return [min - 1, max + 1];
  }
  
  const range = max - min;
  const padding = range * paddingPercent;
  
  return [
    Math.max(0, min - padding), // Don't go below 0 for most metrics
    max + padding
  ];
}

/**
 * Calculate nice domain for axis with proper padding
 */
export function calculateDomain(values: number[], paddingPercent = 0.1): [number, number] {
  if (values.length === 0) {
    return [0, 100];
  }
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return padDomain(min, max, paddingPercent);
}
