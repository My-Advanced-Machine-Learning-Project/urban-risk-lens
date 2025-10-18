import { Moon, Sun, Menu, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMapState } from '@/stores/useMapState';
import { useEffect } from 'react';

export function HeaderBar() {
  const {
    theme,
    language,
    toggleTheme,
    setLanguage,
    toggleSidebar
  } = useMapState();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 z-50">
      {/* Left: Menu + Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold hidden sm:block">
          Türkiye Risk Haritası
        </h1>
      </div>

      {/* Right: Language & Theme */}
      <div className="flex items-center gap-2">
        {/* Language Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
          title={language === 'tr' ? 'Switch to English' : 'Türkçe\'ye Geç'}
        >
          <Globe className="h-5 w-5" />
        </Button>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
