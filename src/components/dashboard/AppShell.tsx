import { HeaderBar } from './HeaderBar';
import { Sidebar } from './Sidebar';
import { MapContainer } from './MapContainer';
import { Legend } from './Legend';

export function AppShell() {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header */}
      <HeaderBar />

      {/* Main Content */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar />

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer />
          <Legend />
        </div>
      </div>
    </div>
  );
}
