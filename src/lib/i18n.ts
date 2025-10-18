export const translations = {
  tr: {
    // Sidebar
    citySelection: 'Risk Haritası',
    selected: 'Seçilen',
    
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
  },
  en: {
    // Sidebar
    citySelection: 'Risk Map',
    selected: 'Selected',
    
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
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.tr;

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || key;
}
