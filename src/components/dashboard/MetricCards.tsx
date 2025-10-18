import { TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';

export function MetricCards() {
  const { language } = useMapState();

  // Demo metrics - gerçek veriden hesaplanacak
  const totalDistricts = 1743; // İstanbul + Ankara toplam mahalle
  const averageRisk = 0.32;
  const highRiskAreas = 245;

  const cards = [
    {
      title: t('totalDistricts', language),
      value: totalDistricts.toLocaleString(),
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: t('averageRisk', language),
      value: averageRisk.toFixed(3),
      icon: TrendingUp,
      color: 'text-orange-500'
    },
    {
      title: t('highRiskAreas', language),
      value: highRiskAreas.toLocaleString(),
      icon: AlertTriangle,
      color: 'text-red-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
