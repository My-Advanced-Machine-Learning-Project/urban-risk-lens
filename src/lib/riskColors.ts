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
    veryLow: 'hsl(var(--risk-very-low))',
    low: 'hsl(var(--risk-low))',
    medium: 'hsl(var(--risk-medium))',
    high: 'hsl(var(--risk-high))',
    veryHigh: 'hsl(var(--risk-very-high))',
  };
  return colors[riskClass] || colors.veryLow;
}

export function getPalette(metric: string = 'risk_score'): RiskBreak[] {
  if (metric === 'risk_score') {
    return [
      { value: 0, label: 'veryLow', color: '#f1f5f9' },
      { value: 0.18, label: 'low', color: '#fde68a' },
      { value: 0.23, label: 'medium', color: '#fbbf24' },
      { value: 0.30, label: 'high', color: '#ef4444' },
      { value: 0.43, label: 'veryHigh', color: '#7f1d1d' },
    ];
  }
  // Add other metric palettes as needed
  return [
    { value: 0, label: 'veryLow', color: '#f1f5f9' },
    { value: 0.25, label: 'low', color: '#fde68a' },
    { value: 0.50, label: 'medium', color: '#fbbf24' },
    { value: 0.75, label: 'high', color: '#ef4444' },
    { value: 1, label: 'veryHigh', color: '#7f1d1d' },
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
