import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';

export function CompactStats() {
  const { viewportStats, language } = useMapState();
  
  if (!viewportStats) return null;
  
  const formatNumber = (n: number, zoom: number): string => {
    if (!Number.isFinite(n) || n === 0) return '0';
    if (zoom < 7) return (n / 1e6).toFixed(1) + 'M';
    if (zoom < 9) return (n / 1e3).toFixed(0) + 'K';
    return n.toLocaleString('tr-TR');
  };
  
  return (
    <div className="fixed left-4 bottom-4 z-30 rounded-2xl bg-gray-900/90 dark:bg-gray-800/90 text-white p-4 backdrop-blur-sm shadow-2xl hidden md:block">
      <div className="flex gap-6">
        <div>
          <div className="text-xs opacity-70 mb-1">{t('totalNeighborhoods', language)}</div>
          <div className="text-xl font-semibold">{formatNumber(viewportStats.totalMah, viewportStats.zoom)}</div>
        </div>
        <div>
          <div className="text-xs opacity-70 mb-1">{t('population', language)}</div>
          <div className="text-xl font-semibold">{formatNumber(viewportStats.totalPop, viewportStats.zoom)}</div>
        </div>
        <div>
          <div className="text-xs opacity-70 mb-1">{t('buildings', language)}</div>
          <div className="text-xl font-semibold">{formatNumber(viewportStats.totalBld, viewportStats.zoom)}</div>
        </div>
        <div>
          <div className="text-xs opacity-70 mb-1">{language === 'tr' ? 'Ort. Risk' : 'Avg. Risk'}</div>
          <div className="text-xl font-semibold">{(viewportStats.meanRisk * 100).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}
