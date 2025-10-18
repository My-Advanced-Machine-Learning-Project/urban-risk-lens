import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { getRiskClass, getRiskColor } from '@/lib/riskColors';

// Demo data - gerçek veri yüklendikçe güncellenecek
const DEMO_DATA = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  vs30: 300 + Math.random() * 400,
  risk_score: 0.1 + Math.random() * 0.4,
  toplam_bina: Math.floor(500 + Math.random() * 3000)
}));

export function ScatterPlot() {
  const { language } = useMapState();

  const scatterData = useMemo(() => {
    return DEMO_DATA.map(d => ({
      ...d,
      riskClass: getRiskClass(d.risk_score)
    }));
  }, []);

  // SVG dimensions
  const width = 600;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const xScale = (value: number) => {
    const min = 300;
    const max = 700;
    return margin.left + ((value - min) / (max - min)) * innerWidth;
  };

  const yScale = (value: number) => {
    const min = 0;
    const max = 0.6;
    return margin.top + innerHeight - ((value - min) / (max - min)) * innerHeight;
  };

  const sizeScale = (value: number) => {
    const min = 500;
    const max = 3500;
    return 3 + ((value - min) / (max - min)) * 8;
  };

  // Ticks
  const xTicks = [300, 400, 500, 600, 700];
  const yTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('scatterAnalysis', language)}
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
            strokeWidth="1"
            className="text-muted-foreground"
          />
          {xTicks.map(tick => (
            <g key={tick}>
              <line
                x1={xScale(tick)}
                y1={height - margin.bottom}
                x2={xScale(tick)}
                y2={height - margin.bottom + 5}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <text
                x={xScale(tick)}
                y={height - margin.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-muted-foreground"
              >
                {tick}
              </text>
            </g>
          ))}
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            className="text-sm fill-foreground font-medium"
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
            strokeWidth="1"
            className="text-muted-foreground"
          />
          {yTicks.map(tick => (
            <g key={tick}>
              <line
                x1={margin.left - 5}
                y1={yScale(tick)}
                x2={margin.left}
                y2={yScale(tick)}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <text
                x={margin.left - 10}
                y={yScale(tick)}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-muted-foreground"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          ))}
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="text-sm fill-foreground font-medium"
          >
            {t('riskScore', language)}
          </text>

          {/* Data points */}
          {scatterData.map(d => (
            <circle
              key={d.id}
              cx={xScale(d.vs30)}
              cy={yScale(d.risk_score)}
              r={sizeScale(d.toplam_bina)}
              fill={getRiskColor(d.riskClass)}
              opacity={0.6}
              className="hover:opacity-100 transition-opacity"
            >
              <title>
                VS30: {d.vs30.toFixed(0)}, Risk: {d.risk_score.toFixed(3)}, Bina: {d.toplam_bina}
              </title>
            </circle>
          ))}
        </svg>
      </CardContent>
    </Card>
  );
}
