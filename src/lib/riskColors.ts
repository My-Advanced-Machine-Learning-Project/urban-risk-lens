export interface RiskBreak {
  value: number;
  label: string;
  color: string;
}

export function getRiskClass(score: number): string {
  if (score < 0.18) return 'veryLow';
  if (score < 0.23) return 'low';
  if (score < 0.30) return 'medium';
  if (score < 0.43) return 'high';
  return 'veryHigh';
}

export function getRiskColor(riskClass: string): string {
  const colors: Record<string, string> = {
    veryLow: '#f5ebb8',
    low: '#f0c96c',
    medium: '#e69344',
    high: '#b94843',
    veryHigh: '#6b2527',
  };
  return colors[riskClass] || colors.veryLow;
}

export function getPalette(metric: string = 'risk_score'): RiskBreak[] {
  if (metric === 'risk_score') {
    return [
      { value: 0, label: 'veryLow', color: '#f5ebb8' },
      { value: 0.18, label: 'low', color: '#f0c96c' },
      { value: 0.23, label: 'medium', color: '#e69344' },
      { value: 0.30, label: 'high', color: '#b94843' },
      { value: 0.43, label: 'veryHigh', color: '#6b2527' },
    ];
  } else if (metric === 'vs30') {
    return [
      { value: 222, label: 'vs30VeryLow', color: '#e8f0f7' },
      { value: 376, label: 'vs30Low', color: '#aac9e3' },
      { value: 412, label: 'vs30Medium', color: '#6ba3d0' },
      { value: 446, label: 'vs30High', color: '#3d7eb8' },
      { value: 489, label: 'vs30VeryHigh', color: '#1e4d8b' },
    ];
  } else if (metric === 'population') {
    return [
      { value: 13, label: 'popVeryLow', color: '#d9f0ed' },
      { value: 1398, label: 'popLow', color: '#8dd4c7' },
      { value: 8557, label: 'popMedium', color: '#4eb3a1' },
      { value: 15642, label: 'popHigh', color: '#2a8c7a' },
      { value: 25496, label: 'popVeryHigh', color: '#1a5d52' },
    ];
  } else if (metric === 'buildings') {
    return [
      { value: 10, label: 'buildVeryLow', color: '#e8d9f5' },
      { value: 341, label: 'buildLow', color: '#c5a3e3' },
      { value: 790, label: 'buildMedium', color: '#9d6dc7' },
      { value: 1263, label: 'buildHigh', color: '#7541a8' },
      { value: 1861, label: 'buildVeryHigh', color: '#4d2670' },
    ];
  }
  
  // Default fallback
  return [
    { value: 0, label: 'veryLow', color: '#f5ebb8' },
    { value: 0.18, label: 'low', color: '#f0c96c' },
    { value: 0.23, label: 'medium', color: '#e69344' },
    { value: 0.30, label: 'high', color: '#b94843' },
    { value: 0.43, label: 'veryHigh', color: '#6b2527' },
  ];
}

export function getMapPaintExpression(metric: string = 'risk_score'): any {
  const palette = getPalette(metric);
  
  return [
    'interpolate',
    ['linear'],
    ['get', metric],
    ...palette.flatMap(b => [b.value, b.color])
  ];
}
