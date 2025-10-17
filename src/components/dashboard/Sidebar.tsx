import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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

export function Sidebar() {
  const { language, selectedCities, toggleCity, clearCities, sidebarOpen } = useMapState();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCities = TURKISH_CITIES.filter(city =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                {t('citySelection', language)}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {selectedCities.size} {language === 'tr' ? 'Seçili' : 'Selected'}
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
                onClick={() => {
                  TURKISH_CITIES.forEach(city => {
                    if (!selectedCities.has(city)) {
                      toggleCity(city);
                    }
                  });
                }}
              >
                {t('selectAll', language)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={clearCities}
              >
                {t('clearAll', language)}
              </Button>
            </div>
          </div>

          {/* City List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {filteredCities.map((city) => {
                const isSelected = selectedCities.has(city);
                return (
                  <button
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Stats Footer */}
          <div className="p-4 border-t bg-muted/50">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>{language === 'tr' ? 'Görüntülenen' : 'Showing'}:</span>
                <span className="font-medium text-foreground">{filteredCities.length}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'tr' ? 'Seçilen' : 'Selected'}:</span>
                <span className="font-medium text-foreground">{selectedCities.size}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
