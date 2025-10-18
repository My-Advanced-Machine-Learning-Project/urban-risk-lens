import { create } from 'zustand';
import { Language } from '@/lib/i18n';
import { CityInfo, NormalizedFeature } from '@/lib/geoNormalize';

export type ViewMode = 'choropleth' | 'heatmap' | 'scatter';
export type Metric = 'risk_score' | 'vs30' | 'population' | 'buildings' | 'risk_class';
export type Year = 2025 | 2026;
export type ScatterMode = 'vs30_risk' | 'population_risk' | 'buildings_risk' | 'vs30_buildings' | 'risk_class' | 'city_comparison';

interface MapState {
  // UI State
  theme: 'light' | 'dark';
  language: Language;
  sidebarOpen: boolean;
  
  // Map State
  viewMode: ViewMode;
  metric: Metric;
  year: Year;
  scatterMode: ScatterMode;
  
  // Selection State
  selectedCities: Set<string>;
  selectedDistricts: Set<string>;
  selectedMah: Set<string>;
  
  // Data
  mahData: Map<string, any>; // mahalle verisi cache
  cityIndex: Map<string, CityInfo>; // normalized city index
  allFeatures: NormalizedFeature[]; // all normalized features
  
  // Actions
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setViewMode: (mode: ViewMode) => void;
  setMetric: (metric: Metric) => void;
  setYear: (year: Year) => void;
  setScatterMode: (mode: ScatterMode) => void;
  toggleCity: (city: string) => void;
  toggleDistrict: (district: string) => void;
  toggleMah: (id: string) => void;
  clearCities: () => void;
  clearDistricts: () => void;
  clearMah: () => void;
  selectAllMah: () => void;
  setMahData: (data: Map<string, any>) => void;
  setCityIndex: (index: Map<string, CityInfo>) => void;
  setAllFeatures: (features: NormalizedFeature[]) => void;
}

export const useMapState = create<MapState>((set) => ({
  // Initial state
  theme: 'dark',
  language: 'tr',
  sidebarOpen: false,
  viewMode: 'choropleth',
  metric: 'risk_score',
  year: 2025,
  scatterMode: 'vs30_risk',
  selectedCities: new Set(['İstanbul', 'Ankara']),
  selectedDistricts: new Set(),
  selectedMah: new Set(),
  mahData: new Map(),
  cityIndex: new Map(),
  allFeatures: [],
  
  // Actions
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
  
  setLanguage: (language) => set({ language }),
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setViewMode: (viewMode) => set({ viewMode }),
  
  setMetric: (metric) => set({ metric }),
  
  setYear: (year) => set({ year }),
  
  setScatterMode: (scatterMode) => set({ scatterMode }),
  
  toggleCity: (city) => set((state) => {
    const newSet = new Set(state.selectedCities);
    if (newSet.has(city)) {
      newSet.delete(city);
    } else {
      newSet.add(city);
    }
    return { selectedCities: newSet };
  }),
  
  toggleDistrict: (district) => set((state) => {
    const newSet = new Set(state.selectedDistricts);
    if (newSet.has(district)) {
      newSet.delete(district);
    } else {
      newSet.add(district);
    }
    return { selectedDistricts: newSet };
  }),
  
  toggleMah: (id) => set((state) => {
    const newSet = new Set(state.selectedMah);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedMah: newSet };
  }),
  
  clearCities: () => set({ selectedCities: new Set() }),
  
  clearDistricts: () => set({ selectedDistricts: new Set() }),
  
  clearMah: () => set({ selectedMah: new Set() }),
  
  selectAllMah: () => set({ selectedMah: new Set() }),
  
  setMahData: (mahData) => set({ mahData }),
  
  setCityIndex: (cityIndex) => set({ cityIndex }),
  
  setAllFeatures: (allFeatures) => set({ allFeatures }),
}));
