import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { getRiskClass, getRiskColor } from '@/lib/riskColors';

const SCATTER_MODES = [
  { value: 'vs30_risk', labelKey: 'scatterMode1', xLabel: 'VS30 (m/s)', yLabel: 'Risk Skoru' },
  { value: 'population_risk', labelKey: 'scatterMode2', xLabel: 'Nüfus', yLabel: 'Risk Skoru' },
  { value: 'buildings_risk', labelKey: 'scatterMode3', xLabel: 'Bina Sayısı', yLabel: 'Risk Skoru' },
  { value: 'vs30_buildings', labelKey: 'scatterMode4', xLabel: 'VS30 (m/s)', yLabel: 'Bina Sayısı' },
  { value: 'risk_class', labelKey: 'scatterMode5', xLabel: 'Risk Skoru', yLabel: 'Risk Sınıfı (1-5)' },
  { value: 'city_comparison', labelKey: 'scatterMode6', xLabel: 'Şehir', yLabel: 'Ortalama Risk' },
];

export function ScatterPlot() {
  const { language, mahData, selectedMah, toggleMah, scatterMode, setScatterMode } = useMapState();

  const currentMode = SCATTER_MODES.find(m => m.value === scatterMode) || SCATTER_MODES[0];

  // Prepare data based on scatter mode
  const scatterData = useMemo(() => {
    console.log('[ScatterPlot] Preparing data, mahData size:', mahData.size);
    
    // Sample check
    if (mahData.size > 0) {
      const [firstId, firstMah] = [...mahData.entries()][0];
      console.log('[ScatterPlot] Sample mahData:', {
        id: firstId,
        risk_score: firstMah?.risk_score,
        vs30: firstMah?.vs30_mean,
        population: firstMah?.toplam_nufus,
        buildings: firstMah?.toplam_bina
      });
    }
    
    if (scatterMode === 'city_comparison') {
      // City comparison mode
      const cityStats: Record<string, { totalRisk: number; count: number; city: string }> = {
        'İstanbul': { totalRisk: 0, count: 0, city: 'İstanbul' },
        'Ankara': { totalRisk: 0, count: 0, city: 'Ankara' }
      };
      
      mahData.forEach((mah, id) => {
        const idStr = id.toString();
        let city = '';
        
        if (idStr.startsWith('40') || idStr.startsWith('99') || idStr.startsWith('100')) {
          city = 'İstanbul';
        } else if (idStr.startsWith('1') && idStr.length <= 6) {
          city = 'Ankara';
        }
        
        if (city && mah.risk_score) {
          cityStats[city].totalRisk += mah.risk_score;
          cityStats[city].count += 1;
        }
      });
      
      return Object.values(cityStats).map((stat, idx) => ({
        id: stat.city,
        x: idx,
        y: stat.count > 0 ? stat.totalRisk / stat.count : 0,
        size: stat.count,
        label: stat.city,
        riskClass: getRiskClass(stat.count > 0 ? stat.totalRisk / stat.count : 0),
        isSelected: false
      }));
    }
    
    // Regular scatter modes
    const data: Array<{
      id: string;
      x: number;
      y: number;
      size: number;
      label: string;
      riskClass: string;
      isSelected: boolean;
    }> = [];
    
    mahData.forEach((mah, id) => {
      let x = 0, y = 0, size = 1000;
      
      // Validate data exists and is not NaN
      const hasValidData = (val: any) => val != null && !isNaN(Number(val)) && Number(val) > 0;
      
      switch (scatterMode) {
        case 'vs30_risk':
          if (!hasValidData(mah.vs30_mean) || !hasValidData(mah.risk_score)) return;
          x = Number(mah.vs30_mean);
          y = Number(mah.risk_score);
          size = Number(mah.toplam_bina) || 1000;
          break;
          
        case 'population_risk':
          if (!hasValidData(mah.toplam_nufus) || !hasValidData(mah.risk_score)) return;
          x = Number(mah.toplam_nufus);
          y = Number(mah.risk_score);
          size = Number(mah.toplam_bina) || 1000;
          break;
          
        case 'buildings_risk':
          if (!hasValidData(mah.toplam_bina) || !hasValidData(mah.risk_score)) return;
          x = Number(mah.toplam_bina);
          y = Number(mah.risk_score);
          size = Number(mah.toplam_nufus) || 5000;
          break;
          
        case 'vs30_buildings':
          if (!hasValidData(mah.vs30_mean) || !hasValidData(mah.toplam_bina)) return;
          x = Number(mah.vs30_mean);
          y = Number(mah.toplam_bina);
          size = (Number(mah.risk_score) || 0.2) * 5000;
          break;
          
        case 'risk_class':
          if (!hasValidData(mah.risk_score) || !hasValidData(mah.risk_class_5)) return;
          x = Number(mah.risk_score);
          y = Number(mah.risk_class_5);
          size = Number(mah.toplam_bina) || 1000;
          break;
      }
      
      data.push({
        id: id.toString(),
        x,
        y,
        size,
        label: mah.mahalle_adi || 'N/A',
        riskClass: getRiskClass(mah.risk_score || 0),
        isSelected: selectedMah.has(id.toString())
      });
    });
    
    console.log(`[ScatterPlot] Generated ${data.length} valid points for mode: ${scatterMode}`);
    if (data.length === 0) {
      console.warn('[ScatterPlot] No valid data points! Check if CSV join worked.');
    }
    
    return data;
  }, [mahData, selectedMah, scatterMode]);

  // Calculate scales based on mode
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (scatterMode === 'city_comparison') {
      return { xMin: 0, xMax: 2, yMin: 0, yMax: 0.6 };
    }
    
    if (scatterData.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    }
    
    const xValues = scatterData.map(d => d.x);
    const yValues = scatterData.map(d => d.y);
    
    let xMin = Math.min(...xValues);
    let xMax = Math.max(...xValues);
    let yMin = Math.min(...yValues);
    let yMax = Math.max(...yValues);
    
    // Add padding
    const xPadding = (xMax - xMin) * 0.1;
    const yPadding = (yMax - yMin) * 0.1;
    
    xMin -= xPadding;
    xMax += xPadding;
    yMin = Math.max(0, yMin - yPadding);
    yMax += yPadding;
    
    return { xMin, xMax, yMin, yMax };
  }, [scatterData, scatterMode]);

  // SVG dimensions
  const width = 700;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 70, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = (value: number) => {
    return margin.left + ((value - xMin) / (xMax - xMin)) * innerWidth;
  };

  const yScale = (value: number) => {
    return margin.top + innerHeight - ((value - yMin) / (yMax - yMin)) * innerHeight;
  };

  const sizeScale = (value: number) => {
    if (scatterMode === 'city_comparison') return 20;
    const min = 100;
    const max = 5000;
    return 3 + ((Math.min(value, max) - min) / (max - min)) * 10;
  };

  // Generate ticks
  const xTicks = useMemo(() => {
    if (scatterMode === 'city_comparison') return [];
    const range = xMax - xMin;
    const step = Math.pow(10, Math.floor(Math.log10(range / 5)));
    const ticks = [];
    for (let i = Math.ceil(xMin / step) * step; i <= xMax; i += step) {
      ticks.push(i);
    }
    return ticks.slice(0, 7);
  }, [xMin, xMax, scatterMode]);

  const yTicks = useMemo(() => {
    const range = yMax - yMin;
    const step = Math.pow(10, Math.floor(Math.log10(range / 5)));
    const ticks = [];
    for (let i = Math.ceil(yMin / step) * step; i <= yMax; i += step) {
      ticks.push(i);
    }
    return ticks.slice(0, 7);
  }, [yMin, yMax]);

  const handlePointClick = (mahId: string) => {
    if (scatterMode !== 'city_comparison') {
      toggleMah(mahId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {t('scatterAnalysis', language)}
          </CardTitle>
          <Select value={scatterMode} onValueChange={(value) => setScatterMode(value as any)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCATTER_MODES.map(mode => (
                <SelectItem key={mode.value} value={mode.value}>
                  {t(mode.labelKey as any, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          
          {scatterMode === 'city_comparison' ? (
            // City labels for comparison mode
            scatterData.map((d, idx) => (
              <text
                key={d.id}
                x={xScale(idx)}
                y={height - margin.bottom + 20}
                textAnchor="middle"
                className="text-sm fill-current font-medium"
              >
                {d.label}
              </text>
            ))
          ) : (
            // Regular ticks
            xTicks.map(tick => (
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
                  {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick.toFixed(0)}
                </text>
              </g>
            ))
          )}
          
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            className="text-sm fill-current font-semibold"
          >
            {currentMode.xLabel}
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
                {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick.toFixed(scatterMode === 'vs30_risk' || scatterMode === 'population_risk' || scatterMode === 'buildings_risk' || scatterMode === 'city_comparison' ? 2 : 0)}
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
            {currentMode.yLabel}
          </text>

          {/* Data points */}
          {scatterData.map(d => {
            const cx = xScale(d.x);
            const cy = yScale(d.y);
            const r = sizeScale(d.size);
            const color = getRiskColor(d.riskClass);
            
            return (
              <g key={d.id}>
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
                
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  opacity={d.isSelected ? 1 : 0.6}
                  className="cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => handlePointClick(d.id)}
                  style={{ cursor: scatterMode !== 'city_comparison' ? 'pointer' : 'default' }}
                >
                  <title>
                    {d.label}
{'\n'}{currentMode.xLabel}: {d.x.toFixed(scatterMode === 'city_comparison' || scatterMode.includes('risk') ? 3 : 0)}
{'\n'}{currentMode.yLabel}: {d.y.toFixed(scatterMode === 'city_comparison' || scatterMode.includes('risk') ? 3 : 0)}
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
