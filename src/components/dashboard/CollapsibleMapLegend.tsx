import React from "react";

/** Choropleth rampasını ve aralık etiketlerini burada tanımla
 *  – Haritadaki renklerle bire bir aynı olmalı.
 *  İstersen colorScale.range() kullanabilirsin.
 */
const LEGEND_COLORS = ["#e9e2b0", "#dcc38b", "#c99a66", "#b56550", "#7a1f1d"];
const LEGEND_RANGES = ["0.00 – 0.18", "0.18 – 0.23", "0.23 – 0.30", "0.30 – 0.43", "0.43+"];

type Props = {
  title?: string;
  subtitle?: string;
  colors?: string[];
  ranges?: string[];
  className?: string;
};

export default function CollapsibleMapLegend({
  title = "Lejant",
  subtitle = "Risk Sınıfı",
  colors = LEGEND_COLORS,
  ranges = LEGEND_RANGES,
  className = "",
}: Props) {
  return (
    <div className={`map-legend ${className}`}>
      <div className="legend-card">
        <div className="legend-header">
          <div className="legend-title">{title}</div>
        </div>

        {colors.map((c, i) => (
          <div className="legend-item" key={`${c}-${i}`}>
            <div className="legend-swatch" style={{ backgroundColor: c }} />
            <span className="legend-label">{ranges[i] ?? ""}</span>
          </div>
        ))}

        <div className="legend-sub">{subtitle}</div>
      </div>
    </div>
  );
}
