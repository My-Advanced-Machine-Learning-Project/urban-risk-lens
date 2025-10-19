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
    <div className={`${className} map-legend`}>
      <div 
        className="legend-card"
        style={{
          background: 'var(--panel-bg)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: 'var(--panel-shadow)',
          color: 'var(--panel-fg)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <div 
            className="legend-title"
            style={{
              fontWeight: 700,
              fontSize: '18px',
              letterSpacing: '0.02em',
            }}
          >
            {title}
          </div>
        </div>

        {palette.map((item, i) => (
          <div 
            key={`${item.color}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '12px 0',
              fontSize: '14px',
            }}
          >
            <div 
              style={{ 
                width: '48px',
                height: '28px',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                flexShrink: 0,
                backgroundColor: item.color,
              }}
            />
            <span 
              className="legend-label"
              style={{
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {formatRange(palette, i, metric)}
            </span>
          </div>
        ))}

        <div 
          className="legend-sub"
          style={{
            fontSize: '13px',
            opacity: 0.85,
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
