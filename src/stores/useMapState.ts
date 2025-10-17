import { create } from 'zustand';
import { Language } from '@/lib/i18n';

export type ViewMode = 'choropleth' | 'heatmap' | 'scatter';
export type Metric = 'risk_score' | 'vs30' | 'population';
export type Year = 2025 | 2026;

interface MapState {
  // UI State
  theme: 'light' | 'dark';
  language: Language;
  sidebarOpen: boolean;
  
  // Map State
  viewMode: ViewMode;
  metric: Metric;
  year: Year;
  
  // Selection State
  selectedCities: Set<string>;
  selectedNeighborhoods: Set<string>;
  
  // Actions
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setViewMode: (mode: ViewMode) => void;
  setMetric: (metric: Metric) => void;
  setYear: (year: Year) => void;
  toggleCity: (city: string) => void;
  toggleNeighborhood: (id: string) => void;
  clearCities: () => void;
  clearNeighborhoods: () => void;
}

export const useMapState = create<MapState>((set) => ({
  // Initial state
  theme: 'light',
  language: 'tr',
  sidebarOpen: true,
  viewMode: 'choropleth',
  metric: 'risk_score',
  year: 2025,
  selectedCities: new Set(['İstanbul', 'Ankara']),
  selectedNeighborhoods: new Set(),
  
  // Actions
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
  
  setLanguage: (language) => set({ language }),
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setViewMode: (viewMode) => set({ viewMode }),
  
  setMetric: (metric) => set({ metric }),
  
  setYear: (year) => set({ year }),
  
  toggleCity: (city) => set((state) => {
    const newSet = new Set(state.selectedCities);
    if (newSet.has(city)) {
      newSet.delete(city);
    } else {
      newSet.add(city);
    }
    return { selectedCities: newSet };
  }),
  
  toggleNeighborhood: (id) => set((state) => {
    const newSet = new Set(state.selectedNeighborhoods);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedNeighborhoods: newSet };
  }),
  
  clearCities: () => set({ selectedCities: new Set() }),
  
  clearNeighborhoods: () => set({ selectedNeighborhoods: new Set() }),
}));
