import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const CITIES = ['İstanbul', 'Ankara'];

export function Sidebar() {
  const { 
    language, 
    selectedCities, 
    toggleCity,
    sidebarOpen,
    toggleSidebar
  } = useMapState();

  return (
    <>
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-14 bottom-0 w-80 bg-card border-r z-50 overflow-y-auto transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 space-y-6">
          {/* City Selection */}
          <div>
            <h3 className="font-semibold text-sm mb-3">
              {t('citySelection', language)}
            </h3>
            
            <div className="space-y-2">
              {CITIES.map(city => (
                <label
                  key={city}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCities.has(city)}
                    onChange={() => toggleCity(city)}
                    className="rounded"
                  />
                  <span className="text-sm">{city}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Selected Cities Info */}
          {selectedCities.size > 0 && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                {t('selected', language)}: {selectedCities.size}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
