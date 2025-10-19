"""
Damage Classification from Turkish News Text
Analyzes newspaper articles to extract damage severity levels
"""

import pandas as pd
import re
from collections import defaultdict

class DamageClassifier:
    def __init__(self):
        # Define damage keywords by severity (Turkish)
        self.damage_keywords = {
            'severe': [
                'ağır hasar', 'ağır hasarlı', 'tamamen yıkıldı', 'tamamen yıkılmış',
                'yıkım', 'yıkıldı', 'yıkılmış', 'yerle bir', 'çöktü', 'çökmüş',
                'enkaz', 'enkaz altında', 'acil yıkılacak', 'kullanılamaz',
                'oturulamaz', 'büyük hasar'
            ],
            'moderate': [
                'orta hasar', 'orta hasarlı', 'hasar gördü', 'hasarlı',
                'hasar tespiti', 'kısmen hasar', 'çatlak', 'çatlamış',
                'zarar gördü', 'zarar görmüş', 'hasara uğradı'
            ],
            'light': [
                'hafif hasar', 'hafif hasarlı', 'az hasar', 'küçük hasar',
                'ufak hasar', 'hafif zarar'
            ],
            'emergency': [
                'arama kurtarma', 'can kaybı', 'yaralı', 'ölü',
                'acil durum', 'felaket', 'afet', 'çadır kent',
                'tahliye', 'evakuasyon'
            ]
        }

    def classify_text(self, text):
        """
        Classify damage severity from text
        Returns: dict with damage levels and scores
        """
        if pd.isna(text):
            return {
                'damage_level': 'unknown',
                'damage_score': 0,
                'severe_count': 0,
                'moderate_count': 0,
                'light_count': 0,
                'emergency_count': 0,
                'keywords_found': []
            }

        text_lower = text.lower()

        # Count occurrences of each damage type
        counts = {
            'severe': 0,
            'moderate': 0,
            'light': 0,
            'emergency': 0
        }

        keywords_found = []

        for severity, keywords in self.damage_keywords.items():
            for keyword in keywords:
                # Count how many times this keyword appears
                count = len(re.findall(r'\b' + re.escape(keyword) + r'\b', text_lower))
                if count > 0:
                    counts[severity] += count
                    keywords_found.append((keyword, count))

        # Calculate damage score (0-100)
        # Severe: 10 points each, Moderate: 5, Light: 2, Emergency: 7
        damage_score = (
            counts['severe'] * 10 +
            counts['moderate'] * 5 +
            counts['light'] * 2 +
            counts['emergency'] * 7
        )

        # Cap at 100
        damage_score = min(damage_score, 100)

        # Determine primary damage level
        if counts['severe'] > 0:
            damage_level = 'severe'
        elif counts['emergency'] > 2:
            damage_level = 'severe'
        elif counts['moderate'] > 0:
            damage_level = 'moderate'
        elif counts['light'] > 0:
            damage_level = 'light'
        elif counts['emergency'] > 0:
            damage_level = 'emergency'
        else:
            damage_level = 'none'

        return {
            'damage_level': damage_level,
            'damage_score': damage_score,
            'severe_count': counts['severe'],
            'moderate_count': counts['moderate'],
            'light_count': counts['light'],
            'emergency_count': counts['emergency'],
            'keywords_found': keywords_found
        }

    def process_dataframe(self, df):
        """
        Process entire dataframe and add damage classification columns
        """
        results = df['text'].apply(self.classify_text)

        # Expand results into separate columns
        df['damage_level'] = results.apply(lambda x: x['damage_level'])
        df['damage_score'] = results.apply(lambda x: x['damage_score'])
        df['severe_count'] = results.apply(lambda x: x['severe_count'])
        df['moderate_count'] = results.apply(lambda x: x['moderate_count'])
        df['light_count'] = results.apply(lambda x: x['light_count'])
        df['emergency_count'] = results.apply(lambda x: x['emergency_count'])

        return df

    def get_statistics(self, df):
        """
        Get damage statistics from processed dataframe
        """
        stats = {
            'total_articles': len(df),
            'damage_levels': df['damage_level'].value_counts().to_dict(),
            'avg_damage_score': df['damage_score'].mean(),
            'max_damage_score': df['damage_score'].max(),
            'articles_with_damage': len(df[df['damage_score'] > 0])
        }

        return stats


if __name__ == "__main__":
    # Load data
    print("📖 Loading newspaper data...")
    df = pd.read_csv('koordine_edilmis_haberler.csv')

    # Classify damage
    print("🔍 Classifying damage levels...")
    classifier = DamageClassifier()
    df = classifier.process_dataframe(df)

    # Get statistics
    print("\n" + "="*60)
    print("DAMAGE CLASSIFICATION RESULTS")
    print("="*60)

    stats = classifier.get_statistics(df)
    print(f"\n📊 Total articles: {stats['total_articles']}")
    print(f"💥 Articles with damage mentions: {stats['articles_with_damage']}")
    print(f"📈 Average damage score: {stats['avg_damage_score']:.2f}")
    print(f"🔥 Max damage score: {stats['max_damage_score']}")

    print("\n🏷️ DAMAGE LEVEL DISTRIBUTION:")
    for level, count in sorted(stats['damage_levels'].items(),
                               key=lambda x: x[1], reverse=True):
        percentage = (count / stats['total_articles']) * 100
        print(f"  {level:12} : {count:4} ({percentage:.1f}%)")

    print("\n🗺️ TOP 10 LOCATIONS BY DAMAGE SCORE:")
    top_locations = df.groupby('main_city')['damage_score'].agg(['mean', 'count', 'sum']).sort_values('sum', ascending=False).head(10)
    for city, row in top_locations.iterrows():
        if pd.notna(city):
            print(f"  {city:20} : avg={row['mean']:.1f}, total={row['sum']:.0f}, articles={int(row['count'])}")

    # Save enriched data
    output_file = 'haberler_with_damage.csv'
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"\n✅ Enriched data saved to: {output_file}")

    # Show sample with high damage
    print("\n📰 SAMPLE HIGH DAMAGE ARTICLES:")
    high_damage = df.nlargest(3, 'damage_score')[['title', 'main_city', 'damage_level', 'damage_score', 'date']]
    for idx, row in high_damage.iterrows():
        print(f"\n  Title: {row['title'][:80]}...")
        print(f"  City: {row['main_city']}, Level: {row['damage_level']}, Score: {row['damage_score']}, Date: {row['date']}")
