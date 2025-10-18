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
import { toKey } from '@/lib/geoNormalize';

const CITIES = [
  { label: 'İstanbul', key: 'istanbul' },
  { label: 'Ankara', key: 'ankara' },
];

export function Sidebar() {
  const { 
    language, 
    selectedCities, 
    selectedMah,
    cityIndex,
    metric,
    toggleCity: toggleCitySelection,
    toggleMah,
    clearMah,
    setMetric,
    sidebarOpen,
    toggleSidebar
  } = useMapState();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set(['istanbul', 'ankara']));
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());

  // Build grouped data from cityIndex
  const groupedData = useMemo(() => {
    const result: Record<string, Record<string, Array<{ id: string; name: string }>>> = {};
    
    console.log('[Sidebar DIAG] cityIndex size:', cityIndex.size);
    console.log('[Sidebar DIAG] cityIndex keys:', [...cityIndex.keys()]);
    console.log('[Sidebar DIAG] selectedCities:', [...selectedCities]);
    
    // Process each selected city
    selectedCities.forEach(cityLabel => {
      const cityKey = toKey(cityLabel);
      const cityInfo = cityIndex.get(cityKey);
      
      if (!cityInfo) {
        console.warn(`[Sidebar] No city info for: ${cityLabel} (key: ${cityKey})`);
        return;
      }
      
      result[cityLabel] = {};
      
      // Process each district in the city
      cityInfo.districts.forEach((districtInfo, districtKey) => {
        result[cityLabel][districtInfo.label] = districtInfo.neighborhoods.map(n => ({
          id: n.id,
          name: n.name,
        }));
      });
    });
    
    console.log('[Sidebar DIAG] grouped data:', Object.keys(result), Object.values(result).map(d => Object.keys(d).length));
    
    return result;
  }, [cityIndex, selectedCities]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return groupedData;
    
    const term = searchTerm.toLowerCase();
    const filtered: typeof groupedData = {};
    
    // Auto-expand districts and cities when filtering
    const newExpandedCities = new Set<string>();
    const newExpandedDistricts = new Set<string>();
    
    Object.entries(groupedData).forEach(([city, districts]) => {
      const filteredDistricts: Record<string, Array<{ id: string; name: string }>> = {};
      
      Object.entries(districts).forEach(([district, neighborhoods]) => {
        const filteredNeighborhoods = neighborhoods.filter(n => 
          n.name.toLowerCase().includes(term) ||
          district.toLowerCase().includes(term)
        );
        
        if (filteredNeighborhoods.length > 0) {
          filteredDistricts[district] = filteredNeighborhoods;
          // Auto-expand matching city and district
          newExpandedCities.add(toKey(city));
          newExpandedDistricts.add(`${city}-${district}`);
        }
      });
      
      if (Object.keys(filteredDistricts).length > 0) {
        filtered[city] = filteredDistricts;
      }
    });
    
    // Update expanded states when searching
    if (searchTerm) {
      setExpandedCities(newExpandedCities);
      setExpandedDistricts(newExpandedDistricts);
    }
    
    return filtered;
  }, [groupedData, searchTerm]);

  const toggleCity = (city: string) => {
    const cityKey = toKey(city);
    const newSet = new Set(expandedCities);
    if (newSet.has(cityKey)) {
      newSet.delete(cityKey);
    } else {
      newSet.add(cityKey);
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
  
  // Auto-expand first few districts on initial load
  useMemo(() => {
    if (totalNeighborhoods > 0 && expandedDistricts.size === 0) {
      const firstDistrictsToExpand = new Set<string>();
      let count = 0;
      
      Object.entries(groupedData).forEach(([city, districts]) => {
        Object.keys(districts).slice(0, 2).forEach(district => {
          if (count < 4) { // Expand up to 4 districts total
            firstDistrictsToExpand.add(`${city}-${district}`);
            count++;
          }
        });
      });
      
      if (firstDistrictsToExpand.size > 0) {
        setExpandedDistricts(firstDistrictsToExpand);
      }
    }
  }, [totalNeighborhoods]);

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
                  key={city.key}
                  variant={selectedCities.has(city.label) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCitySelection(city.label)}
                  className="flex-1"
                >
                  {city.label}
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
              placeholder={`${t('search', language)} (${totalNeighborhoods} ${language === 'tr' ? 'mahalle' : 'neighborhoods'})`}
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
          
          {totalNeighborhoods === 0 && (
            <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
              {language === 'tr' 
                ? 'Veriler yükleniyor... Konsolu kontrol edin.' 
                : 'Loading data... Check console.'}
            </div>
          )}

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
              const cityKey = toKey(city);
              const isCityExpanded = expandedCities.has(cityKey);
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
                      {Object.entries(districts).sort((a, b) => a[0].localeCompare(b[0], 'tr', { sensitivity: 'base', numeric: true })).map(([district, neighborhoods]) => {
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
