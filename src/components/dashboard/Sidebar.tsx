import { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
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

// Safe string conversion for sorting
const toStr = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const obj = v as any;
    if ('name' in obj) return String(obj.name ?? '');
    if ('label' in obj) return String(obj.label ?? '');
    if ('properties' in obj && obj.properties?.name) return String(obj.properties.name);
    if ('mahalle_adi' in obj) return String(obj.mahalle_adi ?? '');
  }
  return String(v ?? '');
};

// Turkish locale-aware sorting
const sortByName = (a: any, b: any): number => {
  const aStr = toStr(a);
  const bStr = toStr(b);
  return aStr.localeCompare(bStr, 'tr', { sensitivity: 'base', numeric: true });
};

interface District {
  name: string;
  neighborhoods: Array<{ id: string; name: string }>;
}

export function Sidebar() {
  const { 
    language, 
    selectedCities, 
    selectedMah,
    mahData,
    metric,
    toggleCity: toggleCitySelection,
    toggleMah,
    clearMah,
    setMetric,
    sidebarOpen,
    toggleSidebar
  } = useMapState();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set(['İstanbul', 'Ankara']));
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());

  // Group neighborhoods by city and district
  const groupedData = useMemo(() => {
    const cityMap: Record<string, Record<string, Array<{ id: string; name: string }>>> = {
      'İstanbul': {},
      'Ankara': {}
    };
    
    mahData.forEach((mah, id) => {
      if (!mah.mahalle_adi || !mah.ilce_adi) return;
      
      let city = 'Unknown';
      const idStr = id.toString();
      
      // City detection based on mah_id patterns
      if (idStr.startsWith('40') || idStr.startsWith('99') || idStr.startsWith('100')) {
        city = 'İstanbul';
      } else if (idStr.startsWith('1') && idStr.length <= 6) {
        city = 'Ankara';
      }
      
      if (!cityMap[city]) return;
      if (!selectedCities.has(city)) return;
      
      const district = mah.ilce_adi;
      if (!cityMap[city][district]) {
        cityMap[city][district] = [];
      }
      
      cityMap[city][district].push({
        id: idStr,
        name: toStr(mah.mahalle_adi)
      });
    });
    
    // Sort neighborhoods alphabetically within each district
    Object.values(cityMap).forEach(districts => {
      Object.values(districts).forEach(neighborhoods => {
        neighborhoods.sort(sortByName);
      });
    });
    
    return cityMap;
  }, [mahData, selectedCities]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return groupedData;
    
    const term = searchTerm.toLowerCase();
    const filtered: typeof groupedData = {};
    
    Object.entries(groupedData).forEach(([city, districts]) => {
      const filteredDistricts: Record<string, Array<{ id: string; name: string }>> = {};
      
      Object.entries(districts).forEach(([district, neighborhoods]) => {
        const filteredNeighborhoods = neighborhoods.filter(n => 
          n.name.toLowerCase().includes(term) ||
          district.toLowerCase().includes(term)
        );
        
        if (filteredNeighborhoods.length > 0) {
          filteredDistricts[district] = filteredNeighborhoods;
        }
      });
      
      if (Object.keys(filteredDistricts).length > 0) {
        filtered[city] = filteredDistricts;
      }
    });
    
    return filtered;
  }, [groupedData, searchTerm]);

  const toggleCity = (city: string) => {
    const newSet = new Set(expandedCities);
    if (newSet.has(city)) {
      newSet.delete(city);
    } else {
      newSet.add(city);
    }
    setExpandedCities(newSet);
  };

  const toggleDistrict = (districtKey: string) => {
    const newSet = new Set(expandedDistricts);
    if (newSet.has(districtKey)) {
      newSet.delete(districtKey);
    } else {
      newSet.add(districtKey);
    }
    setExpandedDistricts(newSet);
  };

  // Count total neighborhoods
  const totalNeighborhoods = useMemo(() => {
    let count = 0;
    Object.values(groupedData).forEach(districts => {
      Object.values(districts).forEach(neighborhoods => {
        count += neighborhoods.length;
      });
    });
    return count;
  }, [groupedData]);

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
                  onClick={() => toggleCitySelection(city)}
                  className="flex-1"
                >
                  {city}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('metric', language)}
            </label>
            <Select value={metric} onValueChange={(value) => setMetric(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk_score">{t('riskScore', language)}</SelectItem>
                <SelectItem value="risk_class">{t('riskClass', language)}</SelectItem>
                <SelectItem value="vs30">{t('vs30', language)}</SelectItem>
                <SelectItem value="population">{t('population', language)}</SelectItem>
                <SelectItem value="buildings">{t('buildings', language)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search', language)}
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

          {/* Action Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={clearMah}
          >
            {t('clearSelection', language)}
          </Button>
        </div>

        {/* Hierarchical List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {Object.entries(filteredData).map(([city, districts]) => {
              const isCityExpanded = expandedCities.has(city);
              const districtCount = Object.keys(districts).length;
              
              return (
                <div key={city} className="mb-2">
                  {/* City Header */}
                  <button
                    onClick={() => toggleCity(city)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <span className="font-semibold text-sm">{city}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {districtCount} {t('districts', language)}
                      </span>
                      {isCityExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {/* Districts */}
                  {isCityExpanded && (
                    <div className="ml-2 mt-1 space-y-1">
                      {Object.entries(districts).sort((a, b) => toStr(a[0]).localeCompare(toStr(b[0]), 'tr')).map(([district, neighborhoods]) => {
                        const districtKey = `${city}-${district}`;
                        const isDistrictExpanded = expandedDistricts.has(districtKey);
                        
                        return (
                          <div key={districtKey}>
                            {/* District Header */}
                            <button
                              onClick={() => toggleDistrict(districtKey)}
                              className="w-full flex items-center justify-between px-3 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                            >
                              <span className="text-sm">{district}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {neighborhoods.length}
                                </span>
                                {isDistrictExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </div>
                            </button>

                            {/* Neighborhoods */}
                            {isDistrictExpanded && (
                              <div className="ml-3 mt-1 space-y-0.5">
                                {neighborhoods.map(n => {
                                  const isSelected = selectedMah.has(n.id);
                                  return (
                                    <button
                                      key={n.id}
                                      onClick={() => toggleMah(n.id)}
                                      className={cn(
                                        "w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors",
                                        isSelected
                                          ? "bg-primary text-primary-foreground font-medium"
                                          : "hover:bg-accent"
                                      )}
                                    >
                                      {n.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Stats Footer */}
        <div className="p-4 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>{t('totalNeighborhoods', language)}:</span>
              <span className="font-medium text-foreground">{totalNeighborhoods}</span>
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
