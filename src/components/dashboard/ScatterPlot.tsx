import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { toNum, calculateDomain } from '@/lib/scatterUtils';

const SCATTER_MODES = [
  { value: 'vs30_risk', labelKey: 'scatterMode1', xLabel: 'VS30 (m/s)', yLabel: 'Risk Skoru' },
  { value: 'population_risk', labelKey: 'scatterMode2', xLabel: 'Nüfus', yLabel: 'Risk Skoru' },
  { value: 'buildings_risk', labelKey: 'scatterMode3', xLabel: 'Bina Sayısı', yLabel: 'Risk Skoru' },
  { value: 'vs30_buildings', labelKey: 'scatterMode4', xLabel: 'VS30 (m/s)', yLabel: 'Bina Sayısı' },
  { value: 'risk_class', labelKey: 'scatterMode5', xLabel: 'Risk Skoru', yLabel: 'Risk Sınıfı (1-5)' },
  { value: 'city_comparison', labelKey: 'scatterMode6', xLabel: 'Şehir', yLabel: 'Ortalama Risk' },
];

interface TooltipData {
  id: string;
  label: string;
  x: number;
  y: number;
  posX: number;
  posY: number;
}

export function ScatterPlot() {
  const { language, mahData, scatterSelectedId, setScatterSelectedId, scatterMode, setScatterMode, selectedMah, setSelectedMah, sidebarOpen } = useMapState();
  const [hoveredPoint, setHoveredPoint] = useState<TooltipData | null>(null);
  const [containerWidth, setContainerWidth] = useState(() => 
    typeof window !== 'undefined' ? Math.min(window.innerWidth - 40, 1200) : 1200
  );
  
  // Update width on window resize (triggered by sidebar toggle)
  useEffect(() => {
    const handleResize = () => {
      setContainerWidth(Math.min(window.innerWidth - 40, 1200));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Clear selection on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMah(new Set());
        setScatterSelectedId(null);
        setHoveredPoint(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedMah, setScatterSelectedId]);

  const currentMode = SCATTER_MODES.find(m => m.value === scatterMode) || SCATTER_MODES[0];

  // Prepare data based on scatter mode - filtered by selection
  const scatterData = useMemo(() => {
    console.log('[ScatterPlot] Preparing data, mahData size:', mahData.size, 'selectedMah size:', selectedMah.size);
    
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
        
        // Use normalized risk score with fallbacks
        const riskScore = mah.risk_score_pred ?? mah.risk_score ?? mah.risk ?? mah.score ?? 0;
        if (city && riskScore) {
          cityStats[city].totalRisk += riskScore;
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
      const idStr = id.toString();
      
      // Filter by selection: if selection is not empty, only show selected neighborhoods
      if (selectedMah.size > 0 && !selectedMah.has(idStr)) {
        return;
      }
      
      let x = 0, y = 0, size = 1000;
      
      // Get risk score with fallbacks for column name variants
      const riskScore = mah.risk_score_pred ?? mah.risk_score ?? mah.risk ?? mah.score ?? 0;
      
      // Convert to proper numbers using utility
      switch (scatterMode) {
        case 'vs30_risk':
          x = toNum(mah.vs30_mean);
          y = toNum(riskScore);
          size = toNum(mah.toplam_bina) || 1000;
          break;
          
        case 'population_risk':
          x = toNum(mah.toplam_nufus);
          y = toNum(riskScore);
          size = toNum(mah.toplam_bina) || 1000;
          break;
          
        case 'buildings_risk':
          x = toNum(mah.toplam_bina);
          y = toNum(riskScore);
          size = toNum(mah.toplam_nufus) || 5000;
          break;
          
        case 'vs30_buildings':
          x = toNum(mah.vs30_mean);
          y = toNum(mah.toplam_bina);
          size = (toNum(riskScore) || 0.2) * 5000;
          break;
          
        case 'risk_class':
          x = toNum(riskScore);
          y = toNum(mah.risk_class_5_pred ?? mah.risk_class_5 ?? mah.risk_class);
          size = toNum(mah.toplam_bina) || 1000;
          break;
      }
      
      // Skip if values are invalid
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      
      data.push({
        id: id.toString(),
        x,
        y,
        size,
        label: mah.mahalle_adi || 'N/A',
        riskClass: getRiskClass(toNum(riskScore) || 0),
        isSelected: selectedMah.has(id.toString())
      });
    });
    
    console.log(`[ScatterPlot] Generated ${data.length} valid points for mode: ${scatterMode}`);
    if (data.length === 0) {
      console.warn('[ScatterPlot] No valid data points! Check if CSV join worked.');
    }
    
    return data;
  }, [mahData, selectedMah, scatterMode]);

  // Calculate scales based on mode with proper domain
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (scatterMode === 'city_comparison') {
      return { xMin: 0, xMax: 2, yMin: 0, yMax: 0.6 };
    }
    
    if (scatterData.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    }
    
    const xValues = scatterData.map(d => d.x).filter(v => Number.isFinite(v));
    const yValues = scatterData.map(d => d.y).filter(v => Number.isFinite(v));
    
    if (xValues.length === 0 || yValues.length === 0) {
      return { xMin: 0, xMax: 100, yMin: 0, yMax: 100 };
    }
    
    const [xMin, xMax] = calculateDomain(xValues, 0.1);
    const [yMin, yMax] = calculateDomain(yValues, 0.1);
    
    return { xMin, xMax, yMin, yMax };
  }, [scatterData, scatterMode]);

  // SVG dimensions - responsive (reacts to window resize)
  const width = containerWidth;
  const height = typeof window !== "undefined" && window.innerWidth <= 768 ? 260 : 360;
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

  // Generate ticks with better distribution
  const xTicks = useMemo(() => {
    if (scatterMode === 'city_comparison') return [];
    const range = xMax - xMin;
    if (range === 0) return [xMin];
    
    const step = Math.pow(10, Math.floor(Math.log10(range / 5)));
    const niceStep = step * Math.ceil((range / 5) / step);
    const ticks = [];
    
    for (let i = Math.ceil(xMin / niceStep) * niceStep; i <= xMax; i += niceStep) {
      if (ticks.length < 8) ticks.push(i);
    }
    
    return ticks.length > 0 ? ticks : [xMin, (xMin + xMax) / 2, xMax];
  }, [xMin, xMax, scatterMode]);

  const yTicks = useMemo(() => {
    const range = yMax - yMin;
    if (range === 0) return [yMin];
    
    const step = Math.pow(10, Math.floor(Math.log10(range / 5)));
    const niceStep = step * Math.ceil((range / 5) / step);
    const ticks = [];
    
    for (let i = Math.ceil(yMin / niceStep) * niceStep; i <= yMax; i += niceStep) {
      if (ticks.length < 8) ticks.push(i);
    }
    
    return ticks.length > 0 ? ticks : [yMin, (yMin + yMax) / 2, yMax];
  }, [yMin, yMax]);

  const handlePointClick = (point: { id: string; label: string; x: number; y: number }, event: React.MouseEvent<SVGCircleElement>) => {
    if (scatterMode === 'city_comparison') return;
    
    event.stopPropagation();
    
    // Single selection: set only this point as selected
    setSelectedMah(new Set([point.id]));
    setScatterSelectedId(point.id);
    
    // Fly to neighborhood with popup
    if (typeof window !== 'undefined') {
      (window as any).flyToNeighborhood?.(point.id, { openPopup: true });
    }
    
    // Close tooltip if open
    setHoveredPoint(null);
  };
  
  const handlePointHover = (point: { id: string; label: string; x: number; y: number }, event: React.MouseEvent<SVGCircleElement>) => {
    if (scatterMode === 'city_comparison') return;
    
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setHoveredPoint({
      id: point.id,
      label: point.label,
      x: point.x,
      y: point.y,
      posX: x,
      posY: y,
    });
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
      <CardContent className="relative overflow-x-auto">
        <div className="min-w-[700px]">
          <svg width={width} height={height} className="w-full h-auto"
            onClick={() => setHoveredPoint(null)}
          >
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
                {/* Highlight ring for selected point */}
                {d.isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 6}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    opacity={1}
                  />
                )}
                
                {/* Main dot with white outline */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  opacity={d.isSelected ? 1 : 0.85}
                  className="cursor-pointer hover:opacity-100 transition-all"
                  onClick={(e) => handlePointClick({ id: d.id, label: d.label, x: d.x, y: d.y }, e)}
                  onMouseEnter={(e) => handlePointHover({ id: d.id, label: d.label, x: d.x, y: d.y }, e)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: scatterMode !== 'city_comparison' ? 'pointer' : 'default' }}
                />
              </g>
            );
          })}
        </svg>
        </div>
        
        {/* Legend - Right side, top */}
        <div 
          className="scatter-legend-vertical"
          style={{ position: 'absolute', right: 12, top: 12, zIndex: 2 }}
        >
          {['veryLow', 'low', 'medium', 'high', 'veryHigh'].map(riskClass => (
            <div key={riskClass} className="legend-item">
              <div
                className="legend-swatch"
                style={{ backgroundColor: getRiskColor(riskClass) }}
              />
              <span className="legend-label">{t(riskClass as any, language)}</span>
            </div>
          ))}
        </div>
        
        {/* Hover tooltip - shows on hover, not blocking click */}
        {hoveredPoint && (
          <div
            className="absolute z-50 bg-card border rounded-lg shadow-lg p-3 pointer-events-none"
            style={{
              left: `${hoveredPoint.posX + 10}px`,
              top: `${hoveredPoint.posY - 40}px`,
            }}
          >
            <div className="text-sm font-semibold mb-1">{hoveredPoint.label}</div>
            <div className="text-xs text-muted-foreground">
              <div>{currentMode.xLabel}: {hoveredPoint.x.toFixed(scatterMode.includes('risk') || scatterMode === 'city_comparison' ? 3 : 0)}</div>
              <div>{currentMode.yLabel}: {hoveredPoint.y.toFixed(scatterMode.includes('risk') || scatterMode === 'city_comparison' ? 3 : 0)}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-2 italic">
              {language === 'tr' ? 'Seçmek için tıklayın' : 'Click to select'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
