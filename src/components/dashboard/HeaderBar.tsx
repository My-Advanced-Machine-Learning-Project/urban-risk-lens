import { Menu, Moon, Sun, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMapState } from '@/stores/useMapState';
import { t } from '@/lib/i18n';
import { useEffect } from 'react';

export function HeaderBar() {
  const { 
    theme, 
    language, 
    viewMode, 
    metric, 
    year,
    toggleTheme, 
    setLanguage, 
    setViewMode,
    setMetric,
    setYear,
    toggleSidebar 
  } = useMapState();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const viewModes = [
    { value: 'choropleth' as const, label: t('choropleth', language) },
    { value: 'heatmap' as const, label: t('heatmap', language) },
    { value: 'scatter' as const, label: t('scatter', language) },
  ];

  const metrics = [
    { value: 'risk_score' as const, label: t('riskScore', language) },
    { value: 'vs30' as const, label: t('vs30', language) },
    { value: 'population' as const, label: t('population', language) },
  ];

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4">
      {/* Left: Hamburger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Center: Controls */}
      <div className="flex items-center gap-2 flex-1 justify-center flex-wrap">
        {/* View Mode Buttons */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {viewModes.map((mode) => (
            <Button
              key={mode.value}
              variant={viewMode === mode.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(mode.value)}
              className="text-xs"
            >
              {mode.label}
            </Button>
          ))}
        </div>

        {/* Metric Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[120px]">
              {metrics.find(m => m.value === metric)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {metrics.map((m) => (
              <DropdownMenuItem key={m.value} onClick={() => setMetric(m.value)}>
                {m.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Year Toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={year === 2025 ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setYear(2025)}
            className="text-xs"
          >
            2025
          </Button>
          <Button
            variant={year === 2026 ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setYear(2026)}
            className="text-xs"
          >
            2026
          </Button>
        </div>
      </div>

      {/* Right: Theme & Language */}
      <div className="flex items-center gap-2">
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Globe className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage('tr')}>
              Türkçe
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')}>
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
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
