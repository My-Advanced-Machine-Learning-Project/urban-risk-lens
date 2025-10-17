import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { getPalette } from '@/lib/riskColors';
import { cn } from '@/lib/utils';

export function Legend() {
  const { language, metric } = useMapState();
  const palette = getPalette(metric);

  return (
    <div className="absolute bottom-6 left-6 bg-card border rounded-lg shadow-lg p-4 w-64 z-10">
      <h3 className="font-semibold text-sm mb-3">
        {t('legend', language)}
      </h3>
      
      <div className="space-y-2">
        {palette.map((item, index) => {
          const nextValue = palette[index + 1]?.value;
          const range = nextValue 
            ? `${item.value.toFixed(2)} - ${nextValue.toFixed(2)}`
            : `≥ ${item.value.toFixed(2)}`;
          
          return (
            <div key={index} className="flex items-center gap-3">
              <div
                className={cn("w-8 h-5 rounded border")}
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 flex justify-between items-center text-xs">
                <span className="font-medium">
                  {t(item.label as any, language)}
                </span>
                <span className="text-muted-foreground">
                  {range}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        {metric === 'risk_score' && (
          <p>{language === 'tr' ? 'Risk Skoru (0-1 arası)' : 'Risk Score (0-1 range)'}</p>
        )}
      </div>
    </div>
  );
}
