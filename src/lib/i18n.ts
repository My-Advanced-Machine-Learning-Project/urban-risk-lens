export const translations = {
  tr: {
    // Sidebar
    citySelection: 'Risk Haritası',
    selected: 'Seçilen',
    year: 'Yıl',
    metric: 'Metrik',
    search: 'Ara...',
    clearSelection: 'Seçimi Temizle',
    totalNeighborhoods: 'Toplam Mahalle',
    
    // Metrics
    riskScore: 'Risk Skoru',
    riskClass: 'Risk Sınıfı',
    vs30: 'VS30',
    population: 'Nüfus',
    buildings: 'Bina Sayısı',
    
    // Risk levels
    veryLow: 'Çok Düşük',
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
    veryHigh: 'Çok Yüksek',
    
    // Legend
    legend: 'Lejant',
    
    // Popup
    district: 'İlçe',
    selectZoom: 'Seç & Zoom',
    zoom: 'Zoom',
    
    // Cards
    totalDistricts: 'Toplam Mahalle',
    averageRisk: 'Ortalama Risk',
    highRiskAreas: 'Yüksek Riskli Alanlar',
    
    // Analytics
    scatterAnalysis: 'Dağılım Analizi',
    scatterMode1: 'VS30 vs Risk Skoru',
    scatterMode2: 'Nüfus Yoğunluğu vs Risk',
    scatterMode3: 'Bina Sayısı vs Risk',
    scatterMode4: 'VS30 vs Bina Sayısı',
    scatterMode5: 'Risk Skoru vs Risk Sınıfı',
    scatterMode6: 'Şehir Karşılaştırması',
    
    // Common
    city: 'Şehir',
    districts: 'ilçe',
    
    // Descriptions
    riskScoreDesc: 'Risk Skoru (0-1 arası)',
    vs30Desc: 'VS30 zemin hızı (m/s)',
    populationDesc: 'Toplam nüfus',
    buildingsDesc: 'Toplam bina sayısı',
  },
  en: {
    // Sidebar
    citySelection: 'Risk Map',
    selected: 'Selected',
    year: 'Year',
    metric: 'Metric',
    search: 'Search...',
    clearSelection: 'Clear Selection',
    totalNeighborhoods: 'Total Neighborhoods',
    
    // Metrics
    riskScore: 'Risk Score',
    riskClass: 'Risk Class',
    vs30: 'VS30',
    population: 'Population',
    buildings: 'Building Count',
    
    // Risk levels
    veryLow: 'Very Low',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    veryHigh: 'Very High',
    
    // Legend
    legend: 'Legend',
    
    // Popup
    district: 'District',
    selectZoom: 'Select & Zoom',
    zoom: 'Zoom',
    
    // Cards
    totalDistricts: 'Total Neighborhoods',
    averageRisk: 'Average Risk',
    highRiskAreas: 'High Risk Areas',
    
    // Analytics
    scatterAnalysis: 'Scatter Analysis',
    scatterMode1: 'VS30 vs Risk Score',
    scatterMode2: 'Population Density vs Risk',
    scatterMode3: 'Building Count vs Risk',
    scatterMode4: 'VS30 vs Building Count',
    scatterMode5: 'Risk Score vs Risk Class',
    scatterMode6: 'City Comparison',
    
    // Common
    city: 'City',
    districts: 'districts',
    
    // Descriptions
    riskScoreDesc: 'Risk Score (0-1 range)',
    vs30Desc: 'VS30 soil velocity (m/s)',
    populationDesc: 'Total population',
    buildingsDesc: 'Total building count',
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.tr;

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || key;
}
