import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';

export function AnalyticsPanel() {
  const { language } = useMapState();

  // Demo data - replace with actual data
  const riskDistribution = [
    { label: t('veryLow', language), value: 120, color: '#f1f5f9' },
    { label: t('low', language), value: 180, color: '#fde68a' },
    { label: t('medium', language), value: 240, color: '#fbbf24' },
    { label: t('high', language), value: 150, color: '#ef4444' },
    { label: t('veryHigh', language), value: 80, color: '#7f1d1d' },
  ];

  const total = riskDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Risk Distribution Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t('riskDistribution', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {riskDistribution.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(1);
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">
                      {item.value} ({percentage}%)
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
        </CardContent>
      </Card>

      {/* Scatter Plot Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t('scatterAnalysis', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-4xl">📊</div>
              <p className="text-xs text-muted-foreground">
                {language === 'tr' 
                  ? 'Scatter plot (VS30 vs Risk Score) burada görüntülenecek' 
                  : 'Scatter plot (VS30 vs Risk Score) will be displayed here'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
