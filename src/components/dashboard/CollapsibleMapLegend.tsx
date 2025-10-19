import React from "react";
import { getPalette, type RiskBreak } from "@/lib/riskColors";
import { t } from "@/lib/i18n";

type Props = {
  metric?: string;
  language?: string;
  className?: string;
};

// Format ranges based on metric type
function formatRange(breaks: RiskBreak[], index: number, metric: string): string {
  if (index === breaks.length - 1) {
    // Last item - show "value+"
    if (metric === 'risk_score') {
      return `${breaks[index].value.toFixed(2)}+`;
    } else if (metric === 'vs30' || metric === 'population' || metric === 'buildings') {
      return `${Math.round(breaks[index].value).toLocaleString()}+`;
    }
    return `${breaks[index].value.toFixed(2)}+`;
  }
  
  // Show range from current to next
  const current = breaks[index].value;
  const next = breaks[index + 1].value;
  
  if (metric === 'risk_score') {
    return `${current.toFixed(2)} – ${next.toFixed(2)}`;
  } else if (metric === 'vs30' || metric === 'population' || metric === 'buildings') {
    return `${Math.round(current).toLocaleString()} – ${Math.round(next).toLocaleString()}`;
  }
  
  return `${current.toFixed(2)} – ${next.toFixed(2)}`;
}

// Get subtitle based on metric
function getSubtitle(metric: string, language: string): string {
  if (metric === 'risk_score') {
    return language === 'tr' ? 'Risk Skoru (0-1 arası)' : 'Risk Score (0-1 range)';
  } else if (metric === 'vs30') {
    return language === 'tr' ? 'VS30 (m/s)' : 'VS30 (m/s)';
  } else if (metric === 'population') {
    return language === 'tr' ? 'Nüfus' : 'Population';
  } else if (metric === 'buildings') {
    return language === 'tr' ? 'Bina Sayısı' : 'Building Count';
  }
  return '';
}

export default function CollapsibleMapLegend({
  metric = 'risk_score',
  language = 'tr',
  className = "",
}: Props) {
  const palette = getPalette(metric);
  const title = language === 'tr' ? 'Lejant' : 'Legend';
  const subtitle = getSubtitle(metric, language);

  return (
    <div className={`map-legend ${className}`}>
      <div className="legend-card">
        <div className="legend-header">
          <div className="legend-title">{title}</div>
        </div>

        {palette.map((item, i) => (
          <div className="legend-item" key={`${item.color}-${i}`}>
            <div className="legend-swatch" style={{ backgroundColor: item.color }} />
            <span className="legend-label">{formatRange(palette, i, metric)}</span>
          </div>
        ))}

        <div className="legend-sub">{subtitle}</div>
      </div>
    </div>
  );
}
