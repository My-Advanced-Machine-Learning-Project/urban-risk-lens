import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const CITIES = ['İstanbul', 'Ankara'];

export function Sidebar() {
  const { 
    language, 
    selectedCities, 
    selectedMah,
    mahData,
    metric,
    toggleCity,
    toggleMah,
    clearMah,
    setMetric,
    sidebarOpen,
    toggleSidebar
  } = useMapState();

  const [searchTerm, setSearchTerm] = useState('');

  // Mahalle listesi
  const neighborhoods = useMemo(() => {
    const list: Array<{ id: string; name: string; district: string; city: string }> = [];
    
    mahData.forEach((mah, id) => {
      if (mah.mahalle_adi && mah.ilce_adi) {
        let city = 'Unknown';
        
        // City detection
        if (id.toString().startsWith('40') || id.toString().startsWith('99') || id.toString().startsWith('100')) {
          city = 'İstanbul';
        } else if (id.toString().startsWith('1')) {
          city = 'Ankara';
        }
        
        if (selectedCities.has(city)) {
          list.push({
            id: id.toString(),
            name: mah.mahalle_adi,
            district: mah.ilce_adi,
            city
          });
        }
      }
    });
    
    return list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [mahData, selectedCities]);

  // Filtered neighborhoods
  const filteredNeighborhoods = useMemo(() => {
    if (!searchTerm) return neighborhoods;
    
    const term = searchTerm.toLowerCase();
    return neighborhoods.filter(n => 
      n.name.toLowerCase().includes(term) ||
      n.district.toLowerCase().includes(term)
    );
  }, [neighborhoods, searchTerm]);

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
          "fixed left-0 top-14 bottom-0 w-80 bg-card border-r z-50 overflow-hidden transition-transform duration-300 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 space-y-4 border-b">
          {/* City Selection */}
          <div>
            <h3 className="font-semibold text-sm mb-2">
              {t('citySelection', language)}
            </h3>
            <div className="flex gap-2">
              {CITIES.map(city => (
                <Button
                  key={city}
                  variant={selectedCities.has(city) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCity(city)}
                  className="flex-1"
                >
                  {city}
                </Button>
              ))}
            </div>
          </div>

          {/* Metric Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Metrik
            </label>
            <Select value={metric} onValueChange={(value) => setMetric(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk_score">Risk Skoru</SelectItem>
                <SelectItem value="risk_class">Risk Sınıfı</SelectItem>
                <SelectItem value="vs30">VS30</SelectItem>
                <SelectItem value="population">Nüfus</SelectItem>
                <SelectItem value="buildings">Bina Sayısı</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mahalle ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={clearMah}
            >
              Tümünü Temizle
            </Button>
          </div>
        </div>

        {/* Neighborhood List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredNeighborhoods.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Mahalle bulunamadı
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNeighborhoods.map((n) => {
                  const isSelected = selectedMah.has(n.id);
                  return (
                    <button
                      key={n.id}
                      onClick={() => toggleMah(n.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-accent"
                      )}
                    >
                      <div className="font-medium">{n.name}</div>
                      <div className="text-xs opacity-80">
                        {n.district}, {n.city}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Stats Footer */}
        <div className="p-4 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Toplam:</span>
              <span className="font-medium text-foreground">{neighborhoods.length}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('selected', language)}:</span>
              <span className="font-medium text-foreground">{selectedMah.size}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
