import { useState, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya',
  'Artvin', 'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne',
  'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane',
  'Hakkari', 'Hatay', 'Isparta', 'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu',
  'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya',
  'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu',
  'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Tekirdağ', 'Tokat',
  'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak', 'Van', 'Yozgat', 'Zonguldak', 'Aksaray',
  'Bayburt', 'Karaman', 'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'Iğdır',
  'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'
].sort();

// Demo neighborhood data (replace with actual data)
const DEMO_NEIGHBORHOODS = [
  { id: '1', name: 'Beşiktaş', district: 'Beşiktaş', city: 'İstanbul' },
  { id: '2', name: 'Levent', district: 'Beşiktaş', city: 'İstanbul' },
  { id: '3', name: 'Etiler', district: 'Beşiktaş', city: 'İstanbul' },
  { id: '4', name: 'Kadıköy', district: 'Kadıköy', city: 'İstanbul' },
  { id: '5', name: 'Moda', district: 'Kadıköy', city: 'İstanbul' },
  { id: '6', name: 'Çankaya', district: 'Çankaya', city: 'Ankara' },
  { id: '7', name: 'Kızılay', district: 'Çankaya', city: 'Ankara' },
  { id: '8', name: 'Keçiören', district: 'Keçiören', city: 'Ankara' },
];

export function Sidebar() {
  const { 
    language, 
    selectedCities, 
    selectedMah, 
    toggleCity, 
    toggleMah, 
    clearCities, 
    clearMah,
    selectAllMah,
    sidebarOpen 
  } = useMapState();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [openCities, setOpenCities] = useState<Set<string>>(new Set(['İstanbul', 'Ankara']));

  // Filter cities
  const filteredCities = TURKISH_CITIES.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group neighborhoods by city and district
  const neighborhoodsByCity = useMemo(() => {
    const grouped: Record<string, Record<string, typeof DEMO_NEIGHBORHOODS>> = {};
    
    DEMO_NEIGHBORHOODS.forEach(n => {
      if (!grouped[n.city]) grouped[n.city] = {};
      if (!grouped[n.city][n.district]) grouped[n.city][n.district] = [];
      grouped[n.city][n.district].push(n);
    });
    
    return grouped;
  }, []);

  // Filter neighborhoods based on search
  const filterNeighborhoods = (neighborhoods: typeof DEMO_NEIGHBORHOODS) => {
    if (!searchTerm) return neighborhoods;
    return neighborhoods.filter(n => 
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.district.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const toggleCityOpen = (city: string) => {
    const newOpen = new Set(openCities);
    if (newOpen.has(city)) {
      newOpen.delete(city);
    } else {
      newOpen.add(city);
    }
    setOpenCities(newOpen);
  };

  return (
    <aside
      className={cn(
        "bg-sidebar border-r transition-all duration-300 flex flex-col h-full",
        sidebarOpen ? "w-80" : "w-0 border-r-0"
      )}
      style={{ overflow: sidebarOpen ? 'visible' : 'hidden' }}
    >
      {sidebarOpen && (
        <>
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                {t('neighborhoodSelection', language)}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {selectedMah.size} {t('selected', language)}
              </Badge>
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

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={selectAllMah}
              >
                {t('selectAll', language)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={clearMah}
              >
                {t('clearAll', language)}
              </Button>
            </div>
          </div>

          {/* Hierarchical List: Cities → Districts → Neighborhoods */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {filteredCities
                .filter(city => selectedCities.has(city))
                .map((city) => {
                  const isOpen = openCities.has(city);
                  const districts = neighborhoodsByCity[city] || {};
                  
                  return (
                    <Collapsible key={city} open={isOpen} onOpenChange={() => toggleCityOpen(city)}>
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            "hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <span>{city}</span>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pl-4 mt-1 space-y-1">
                        {Object.entries(districts).map(([district, neighborhoods]) => {
                          const filtered = filterNeighborhoods(neighborhoods);
                          if (filtered.length === 0) return null;
                          
                          return (
                            <div key={district} className="space-y-1">
                              <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                                {district}
                              </div>
                              {filtered.map((n) => {
                                const isSelected = selectedMah.has(n.id);
                                return (
                                  <button
                                    key={n.id}
                                    onClick={() => toggleMah(n.id)}
                                    className={cn(
                                      "w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors",
                                      isSelected
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                  >
                                    {n.name}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
            </div>
          </ScrollArea>

          {/* Stats Footer */}
          <div className="p-4 border-t bg-muted/50">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>{t('selected', language)}:</span>
                <span className="font-medium text-foreground">{selectedMah.size}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
