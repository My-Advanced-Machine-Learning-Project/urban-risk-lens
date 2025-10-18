import { HeaderBar } from './HeaderBar';
import { Sidebar } from './Sidebar';
import { MapContainer } from './MapContainer';
import { Legend } from './Legend';
import { MetricCards } from './MetricCards';
import { ScatterPlot } from './ScatterPlot';

export function AppShell() {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header */}
      <HeaderBar />

      {/* Main Content */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar />

        {/* Right Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Map Container */}
          <div className="flex-1 relative">
            <MapContainer />
            <Legend />
          </div>

          {/* Bottom Panel: Metrics & Analytics */}
          <div className="border-t bg-background p-4 space-y-4 max-h-[45vh] overflow-y-auto">
            <MetricCards />
            <ScatterPlot />
          </div>
        </div>
      </div>
    </div>
  );
}
