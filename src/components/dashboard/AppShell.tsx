import { HeaderBar } from './HeaderBar';
import { Sidebar } from './Sidebar';
import { MapContainer } from './MapContainer';
import { MetricCards } from './MetricCards';
import { ScatterPlot } from './ScatterPlot';
import { CompactStats } from './CompactStats';

export function AppShell() {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <HeaderBar />

      {/* Sidebar Overlay */}
      <Sidebar />

      {/* Main Content - Full Width */}
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer />
          <CompactStats />
        </div>

        {/* Bottom Panel: Metrics & Analytics */}
        <div className="border-t bg-background p-4 space-y-4 max-h-[45vh] overflow-y-auto">
          <MetricCards />
          <ScatterPlot />
        </div>
      </div>
    </div>
  );
}
