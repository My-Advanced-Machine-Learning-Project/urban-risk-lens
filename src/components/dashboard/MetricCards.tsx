import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';

export function MetricCards() {
  const { language } = useMapState();

  // Demo data - replace with real calculations when GeoJSON is loaded
  const totalDistricts = 2;
  const averageRisk = 0.30;
  const highRiskCount = 0;

  const cards = [
    {
      title: t('totalDistricts', language),
      value: totalDistricts.toLocaleString(),
      icon: BarChart3,
      color: 'text-blue-500',
    },
    {
      title: t('averageRisk', language),
      value: averageRisk.toFixed(3),
      icon: TrendingUp,
      color: 'text-amber-500',
    },
    {
      title: t('highRiskAreas', language),
      value: highRiskCount.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
