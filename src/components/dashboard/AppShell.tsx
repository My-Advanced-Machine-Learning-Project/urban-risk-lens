import { HeaderBar } from './HeaderBar';
import { Sidebar } from './Sidebar';
import { MapContainer } from './MapContainer';
import { Legend } from './Legend';
import { MetricCards } from './MetricCards';
import { AnalyticsPanel } from './AnalyticsPanel';
import { useMapState } from '@/stores/useMapState';

export function AppShell() {
  const { sidebarOpen } = useMapState();

  // Demo metrics - replace with actual data
  const metrics = {
    totalDistricts: 970,
    averageRisk: 0.285,
    highRiskCount: 230,
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header */}
      <HeaderBar />

      {/* Main Content */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Right Panel: Map + Analytics */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Map Container */}
          <div className="flex-1 relative">
            <MapContainer />
            <Legend />
          </div>

          {/* Bottom Analytics Panel */}
          <div className="border-t bg-background p-4 space-y-4 max-h-[40vh] overflow-y-auto">
            <MetricCards {...metrics} />
            <AnalyticsPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
