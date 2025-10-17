export const translations = {
  tr: {
    // Header
    theme: 'Tema',
    language: 'Dil',
    year: 'Yıl',
    viewMode: 'Görünüm Modu',
    metric: 'Metrik',
    
    // View modes
    choropleth: 'Choropleth',
    heatmap: 'Isı Haritası',
    scatter: 'Dağılım',
    
    // Metrics
    riskScore: 'Risk Skoru',
    vs30: 'VS30',
    population: 'Nüfus',
    
    // Sidebar
    citySelection: 'Şehir Seçimi',
    neighborhoodSelection: 'Mahalle Seçimi',
    search: 'Ara...',
    selectAll: 'Tümünü Seç',
    clearAll: 'Tümünü Temizle',
    
    // Risk levels
    veryLow: 'Çok Düşük',
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
    veryHigh: 'Çok Yüksek',
    
    // Legend
    legend: 'Lejant',
    riskLevel: 'Risk Seviyesi',
    
    // KPI Cards
    totalDistricts: 'Toplam Mahalle',
    averageRisk: 'Ortalama Risk',
    highRiskAreas: 'Yüksek Riskli Alanlar',
    
    // Analytics
    analytics: 'Analitik',
    riskDistribution: 'Risk Dağılımı',
    scatterAnalysis: 'Dağılım Analizi',
    
    // Popup
    neighborhood: 'Mahalle',
    district: 'İlçe',
    riskClass: 'Risk Sınıfı',
    totalPopulation: 'Toplam Nüfus',
  },
  en: {
    // Header
    theme: 'Theme',
    language: 'Language',
    year: 'Year',
    viewMode: 'View Mode',
    metric: 'Metric',
    
    // View modes
    choropleth: 'Choropleth',
    heatmap: 'Heatmap',
    scatter: 'Scatter',
    
    // Metrics
    riskScore: 'Risk Score',
    vs30: 'VS30',
    population: 'Population',
    
    // Sidebar
    citySelection: 'City Selection',
    neighborhoodSelection: 'Neighborhood Selection',
    search: 'Search...',
    selectAll: 'Select All',
    clearAll: 'Clear All',
    
    // Risk levels
    veryLow: 'Very Low',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    veryHigh: 'Very High',
    
    // Legend
    legend: 'Legend',
    riskLevel: 'Risk Level',
    
    // KPI Cards
    totalDistricts: 'Total Districts',
    averageRisk: 'Average Risk',
    highRiskAreas: 'High Risk Areas',
    
    // Analytics
    analytics: 'Analytics',
    riskDistribution: 'Risk Distribution',
    scatterAnalysis: 'Scatter Analysis',
    
    // Popup
    neighborhood: 'Neighborhood',
    district: 'District',
    riskClass: 'Risk Class',
    totalPopulation: 'Total Population',
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.tr;

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || key;
}
