import { useEffect, useState } from "react";
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { getPalette } from '@/lib/riskColors';
import { cn } from '@/lib/utils';

type Bin = { color: string; label: string };
interface Props {
  bins?: Bin[];
  title?: string;
  subtitle?: string;
  className?: string;
}

/** Desktop: açık, Mobile (<768px): kapalı başlayan, katlanır harita lejantı. */
export default function CollapsibleMapLegend({
  bins,
  title,
  subtitle,
  className = "",
}: Props) {
  const { language, metric } = useMapState();
  const [open, setOpen] = useState(true);
  const palette = getPalette(metric);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (isMobile) setOpen(false);
  }, []);

  // Use provided bins or generate from palette
  const legendBins = bins || palette.map((item, index) => {
    const nextValue = palette[index + 1]?.value;
    
    // Format range based on metric
    let range = '';
    if (metric === 'population' || metric === 'buildings') {
      // Format with comma separators
      const currentFormatted = item.value.toLocaleString('tr-TR');
      const nextFormatted = nextValue ? nextValue.toLocaleString('tr-TR') : '';
      range = nextValue 
        ? `${currentFormatted} – ${nextFormatted}`
        : `${currentFormatted}+`;
    } else if (metric === 'vs30') {
      // VS30 ranges
      const currentFormatted = Math.round(item.value);
      const nextFormatted = nextValue ? Math.round(nextValue) : '';
      range = nextValue 
        ? `${currentFormatted} – ${nextFormatted}`
        : `${currentFormatted}+`;
    } else {
      // Risk score - keep decimals
      range = nextValue 
        ? `${item.value.toFixed(2)} – ${nextValue.toFixed(2)}`
        : `${item.value.toFixed(2)}+`;
    }

    return {
      color: item.color,
      label: range
    };
  });

  const legendTitle = title || t('legend', language);
  const legendSubtitle = subtitle || (() => {
    if (metric === 'risk_score') return t('riskScoreDesc', language);
    if (metric === 'vs30') return t('vs30Desc', language);
    if (metric === 'population') return t('populationDesc', language);
    if (metric === 'buildings') return t('buildingsDesc', language);
    return "Risk Sınıfı";
  })();

  return (
    <div
      className={
        "map-legend pointer-events-auto fixed left-3 bottom-28 md:bottom-6 z-[5]" +
        (className ? " " + className : "")
      }
    >
      <div className="legend-card">
        <div className="legend-header">
          <span className="legend-title">{legendTitle}</span>
          <button
            aria-label={open ? "Lejantı daralt" : "Lejantı aç"}
            className="legend-toggle"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "−" : "+"}
          </button>
        </div>

        {open && (
          <>
            <div className="space-y-2">
              {legendBins.map((b, i) => (
                <div key={i} className="legend-item">
                  <div
                    className="legend-swatch"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="legend-label">{b.label}</span>
                </div>
              ))}
            </div>
            <div className="legend-sub">{legendSubtitle}</div>
          </>
        )}
      </div>
    </div>
  );
}
