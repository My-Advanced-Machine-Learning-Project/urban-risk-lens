export const translations = {
  tr: {
    // Sidebar
    citySelection: 'Risk Haritası',
    selected: 'Seçilen',
    year: 'Yıl',
    
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
    population: 'Nüfus',
    buildings: 'Bina Sayısı',
    
    // Metrics
    totalDistricts: 'Toplam Mahalle',
    averageRisk: 'Ortalama Risk',
    highRiskAreas: 'Yüksek Riskli Alanlar',
    
    // Analytics
    riskDistribution: 'Risk Dağılımı',
    scatterAnalysis: 'Dağılım Analizi',
    vs30: 'VS30',
    riskScore: 'Risk Skoru',
  },
  en: {
    // Sidebar
    citySelection: 'Risk Map',
    selected: 'Selected',
    year: 'Year',
    
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
    population: 'Population',
    buildings: 'Building Count',
    
    // Metrics
    totalDistricts: 'Total Neighborhoods',
    averageRisk: 'Average Risk',
    highRiskAreas: 'High Risk Areas',
    
    // Analytics
    riskDistribution: 'Risk Distribution',
    scatterAnalysis: 'Scatter Analysis',
    vs30: 'VS30',
    riskScore: 'Risk Score',
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.tr;

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || key;
}
