# geocoder.py

import pandas as pd
import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
import re

# 1. Nominatim istemcisi
geolocator = Nominatim(user_agent="news_geocoder")

# 2. Koordinat alma fonksiyonu
def get_coordinates(city_name, retries=3):
    for attempt in range(retries):
        try:
            location = geolocator.geocode(f"{city_name}, Turkey", timeout=10)
            if location:
                return pd.Series([location.latitude, location.longitude])
            else:
                return pd.Series([None, None])
        except GeocoderTimedOut:
            print(f"⏱️ Zaman aşımı: {city_name}, tekrar deneniyor ({attempt+1}/{retries})...")
            time.sleep(2)
        except GeocoderUnavailable:
            print(f"🚫 Nominatim erişilemiyor: {city_name}")
            return pd.Series([None, None])
    return pd.Series([None, None])

# 3. Şehir eşleştirme (text içeriğinden)
def match_city(text, cities):
    text = str(text).lower()
    matches = [city for city in cities if city.lower() in text]
    return ", ".join(matches) if matches else None

# 4. Ana işlem fonksiyonu
def enrich_with_coordinates(input_csv, output_csv):
    try:
        df = pd.read_csv(input_csv)
    except FileNotFoundError:
        print(f"❌ Dosya bulunamadı: {input_csv}")
        return

    # Eğer 'cities' sütunu yoksa text'ten üret
    if "cities" not in df.columns:
        print("🔍 'cities' sütunu oluşturuluyor (metinden eşleştirme ile)...")
        deprem_cities = [
            "Adana", "Adıyaman", "Diyarbakır", "Elazığ", "Gaziantep",
            "Hatay", "Kahramanmaraş", "Kilis", "Malatya", "Osmaniye",
            "Şanlıurfa"
        ]
        df['cities'] = df['text'].apply(lambda x: match_city(x, deprem_cities))

    # Çoklu şehir varsa ilkini al
    df['main_city'] = df['cities'].astype(str).apply(lambda x: x.split(',')[0].strip() if x else None)

    # Eşsiz şehirler için koordinatları bul
    unique_cities = df['main_city'].dropna().unique()
    city_coords = {}

    for city in unique_cities:
        lat, lon = get_coordinates(city)
        city_coords[city] = {'latitude': lat, 'longitude': lon}
        print(f"📍 {city} → {lat}, {lon}")
        time.sleep(1)  # Rate limit

    # Koordinatları ata
    df['latitude'] = df['main_city'].apply(lambda x: city_coords.get(x, {}).get('latitude'))
    df['longitude'] = df['main_city'].apply(lambda x: city_coords.get(x, {}).get('longitude'))

    # Kaydet
    df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"✅ Koordinatlar eklendi → '{output_csv}' olarak kaydedildi.")

# Çalıştırmak için
if __name__ == "__main__":
    enrich_with_coordinates("temizlenmis__sorted_haberler.csv", "koordine_edilmis_haberler.csv")
