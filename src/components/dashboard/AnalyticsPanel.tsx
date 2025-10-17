import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { getRiskClass } from '@/lib/riskColors';

// Demo data - replace with actual data
const DEMO_DATA = [
  { mah_id: '1', risk_score: 0.35, vs30: 450, bina_sayisi: 2500 },
  { mah_id: '2', risk_score: 0.28, vs30: 480, bina_sayisi: 1800 },
  { mah_id: '3', risk_score: 0.42, vs30: 420, bina_sayisi: 3200 },
  { mah_id: '4', risk_score: 0.19, vs30: 550, bina_sayisi: 2100 },
  { mah_id: '5', risk_score: 0.31, vs30: 460, bina_sayisi: 2800 },
  { mah_id: '6', risk_score: 0.25, vs30: 520, bina_sayisi: 3200 },
];

export function AnalyticsPanel() {
  const { language, selectedMah } = useMapState();

  // Filter data based on selection
  const filteredData = useMemo(() => {
    if (selectedMah.size === 0) return DEMO_DATA;
    return DEMO_DATA.filter(d => selectedMah.has(d.mah_id));
  }, [selectedMah]);

  // Calculate building distribution by risk class
  const buildingDistribution = useMemo(() => {
    const dist = {
      veryLow: 0,
      low: 0,
      medium: 0,
      high: 0,
      veryHigh: 0,
    };

    filteredData.forEach(d => {
      const riskClass = getRiskClass(d.risk_score);
      dist[riskClass as keyof typeof dist] += d.bina_sayisi;
    });

    return [
      { label: t('veryLow', language), value: dist.veryLow, color: '#f1f5f9' },
      { label: t('low', language), value: dist.low, color: '#fde68a' },
      { label: t('medium', language), value: dist.medium, color: '#fbbf24' },
      { label: t('high', language), value: dist.high, color: '#ef4444' },
      { label: t('veryHigh', language), value: dist.veryHigh, color: '#7f1d1d' },
    ];
  }, [filteredData, language]);

  const totalBuildings = buildingDistribution.reduce((sum, item) => sum + item.value, 0);

  // Scatter plot data
  const scatterData = useMemo(() => {
    return filteredData.map(d => ({
      ...d,
      riskClass: getRiskClass(d.risk_score),
    }));
  }, [filteredData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Building Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t('buildingDistribution', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {buildingDistribution.map((item, index) => {
              const percentage = totalBuildings > 0 
                ? ((item.value / totalBuildings) * 100).toFixed(1) 
                : '0.0';
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">
                      {item.value.toLocaleString()} {t('buildings', language)} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            {language === 'tr' 
              ? `Toplam: ${totalBuildings.toLocaleString()} bina`
              : `Total: ${totalBuildings.toLocaleString()} buildings`}
          </div>
        </CardContent>
      </Card>

      {/* Scatter Plot: VS30 vs Risk Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t('scatterAnalysis', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-square bg-muted rounded-lg relative overflow-hidden">
            <svg viewBox="0 0 400 400" className="w-full h-full">
              {/* Axes */}
              <line x1="50" y1="350" x2="380" y2="350" stroke="currentColor" strokeWidth="2" />
              <line x1="50" y1="350" x2="50" y2="20" stroke="currentColor" strokeWidth="2" />
              
              {/* X-axis label */}
              <text x="215" y="390" textAnchor="middle" fontSize="12" fill="currentColor">
                {t('vs30', language)}
              </text>
              
              {/* Y-axis label */}
              <text x="20" y="190" textAnchor="middle" fontSize="12" fill="currentColor" transform="rotate(-90 20 190)">
                {t('riskScore', language)}
              </text>
              
              {/* X-axis ticks */}
              {[400, 450, 500, 550, 600].map((val, i) => (
                <g key={i}>
                  <text x={50 + i * 82.5} y="370" textAnchor="middle" fontSize="10" fill="currentColor">
                    {val}
                  </text>
                </g>
              ))}
              
              {/* Y-axis ticks */}
              {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((val, i) => (
                <g key={i}>
                  <text x="40" y={350 - i * 55} textAnchor="end" fontSize="10" fill="currentColor">
                    {val.toFixed(1)}
                  </text>
                </g>
              ))}
              
              {/* Scatter points */}
              {scatterData.map((d, i) => {
                const x = 50 + ((d.vs30 - 400) / 200) * 330;
                const y = 350 - (d.risk_score * 330);
                const size = Math.sqrt(d.bina_sayisi / 100) * 2;
                const color = {
                  veryLow: '#f1f5f9',
                  low: '#fde68a',
                  medium: '#fbbf24',
                  high: '#ef4444',
                  veryHigh: '#7f1d1d',
                }[d.riskClass as any] || '#888';
                
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={size}
                    fill={color}
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.7"
                  />
                );
              })}
            </svg>
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {language === 'tr' 
              ? 'Nokta boyutu bina sayısını temsil eder'
              : 'Point size represents building count'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
