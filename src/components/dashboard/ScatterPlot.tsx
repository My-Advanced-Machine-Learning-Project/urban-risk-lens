import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { getRiskClass, getRiskColor } from '@/lib/riskColors';

export function ScatterPlot() {
  const { language, mahData, selectedMah, toggleMah } = useMapState();

  const scatterData = useMemo(() => {
    const data: Array<{
      id: string;
      vs30: number;
      risk_score: number;
      toplam_bina: number;
      mahalle_adi: string;
      riskClass: string;
      isSelected: boolean;
    }> = [];
    
    mahData.forEach((mah, id) => {
      if (mah.vs30_mean && mah.risk_score) {
        data.push({
          id: id.toString(),
          vs30: mah.vs30_mean,
          risk_score: mah.risk_score,
          toplam_bina: mah.toplam_bina || 1000,
          mahalle_adi: mah.mahalle_adi || 'N/A',
          riskClass: getRiskClass(mah.risk_score),
          isSelected: selectedMah.has(id.toString())
        });
      }
    });
    
    return data;
  }, [mahData, selectedMah]);

  // SVG dimensions
  const width = 700;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 60, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const xMin = 250;
  const xMax = 750;
  const yMin = 0;
  const yMax = 0.6;

  const xScale = (value: number) => {
    return margin.left + ((value - xMin) / (xMax - xMin)) * innerWidth;
  };

  const yScale = (value: number) => {
    return margin.top + innerHeight - ((value - yMin) / (yMax - yMin)) * innerHeight;
  };

  const sizeScale = (value: number) => {
    const min = 100;
    const max = 5000;
    return 3 + ((Math.min(value, max) - min) / (max - min)) * 10;
  };

  // Ticks
  const xTicks = [300, 400, 500, 600, 700];
  const yTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5];

  // Handle click on scatter point
  const handlePointClick = (mahId: string) => {
    toggleMah(mahId);
  };

  // Global function for scatter plot clicks
  useEffect(() => {
    (window as any).selectScatterPoint = (mahId: string) => {
      handlePointClick(mahId);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('scatterAnalysis', language)} (VS30 vs Risk Score)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg width={width} height={height} className="w-full h-auto">
          {/* X-axis */}
          <line
            x1={margin.left}
            y1={height - margin.bottom}
            x2={width - margin.right}
            y2={height - margin.bottom}
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground"
          />
          {xTicks.map(tick => (
            <g key={tick}>
              <line
                x1={xScale(tick)}
                y1={height - margin.bottom}
                x2={xScale(tick)}
                y2={height - margin.bottom + 6}
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted-foreground"
              />
              <text
                x={xScale(tick)}
                y={height - margin.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-current"
              >
                {tick}
              </text>
            </g>
          ))}
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            className="text-sm fill-current font-semibold"
          >
            {t('vs30', language)}
          </text>

          {/* Y-axis */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={height - margin.bottom}
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground"
          />
          {yTicks.map(tick => (
            <g key={tick}>
              <line
                x1={margin.left - 6}
                y1={yScale(tick)}
                x2={margin.left}
                y2={yScale(tick)}
                stroke="currentColor"
                strokeWidth="1"
                className="text-muted-foreground"
              />
              <text
                x={margin.left - 12}
                y={yScale(tick)}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-current"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          ))}
          <text
            x={20}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 20, ${height / 2})`}
            className="text-sm fill-current font-semibold"
          >
            {t('riskScore', language)}
          </text>

          {/* Data points */}
          {scatterData.map(d => {
            const cx = xScale(d.vs30);
            const cy = yScale(d.risk_score);
            const r = sizeScale(d.toplam_bina);
            const color = getRiskColor(d.riskClass);
            
            return (
              <g key={d.id}>
                {/* Highlight ring for selected */}
                {d.isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 4}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    opacity={0.8}
                  />
                )}
                
                {/* Main point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  opacity={d.isSelected ? 1 : 0.6}
                  className="cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => handlePointClick(d.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>
                    {d.mahalle_adi}
{'\n'}VS30: {d.vs30.toFixed(0)}
{'\n'}Risk: {d.risk_score.toFixed(3)}
{'\n'}Bina: {d.toplam_bina}
                  </title>
                </circle>
              </g>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
          {['veryLow', 'low', 'medium', 'high', 'veryHigh'].map(riskClass => (
            <div key={riskClass} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getRiskColor(riskClass) }}
              />
              <span>{t(riskClass as any, language)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
