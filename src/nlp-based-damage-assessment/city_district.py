# city_district_matcher.py
import pandas as pd
import time
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

geolocator = Nominatim(user_agent="district_matcher")

def get_coordinates(place):
    try:
        location = geolocator.geocode(place + ", Turkey", timeout=10)
        if location:
            return pd.Series([location.latitude, location.longitude])
        else:
            return pd.Series([None, None])
    except GeocoderTimedOut:
        print(f"Zaman aşımı: {place}")
        time.sleep(1)
        return get_coordinates(place)

def enrich_with_districts(input_csv, output_csv):
    df = pd.read_csv(input_csv)

    # Tüm ilçe isimleri örnek:
    districts = {
        "Adana": ["Seyhan", "Yüreğir", "Çukurova", "Sarıçam", "Ceyhan", "Kozan"],
        "Hatay": ["Antakya", "İskenderun", "Kırıkhan", "Dörtyol", "Samandağ"],
        "Kahramanmaraş": ["Dulkadiroğlu", "Onikişubat", "Afşin"],
        "Gaziantep": ["Şahinbey", "Şehitkamil", "Nizip"],
        "Malatya": ["Yeşilyurt", "Battalgazi"],
        "Osmaniye": ["Merkez", "Kadirli"],
        "Kilis": ["Merkez"],
    }

    # İlçe adı eşleştirme
    all_districts = [(il, ilce) for il, ilceler in districts.items() for ilce in ilceler]
    df['district'] = ""
    df['il'] = ""

    for i, row in df.iterrows():
        text = str(row['text']).lower()
        for il, ilce in all_districts:
            if ilce.lower() in text:
                df.at[i, 'district'] = ilce
                df.at[i, 'il'] = il
                break
        if df.at[i, 'district'] == "":
            df.at[i, 'il'] = row.get('main_city', '')

    # Koordinat bul
    df['coord'] = df.apply(lambda x: get_coordinates(f"{x['district']}, {x['il']}") if x['district'] else get_coordinates(x['il']), axis=1)
    df[['latitude', 'longitude']] = pd.DataFrame(df['coord'].to_list(), index=df.index)
    df.drop(columns=['coord'], inplace=True)

    df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"✅ İlçe koordinatlı dosya: {output_csv}")

# Kullanmak için:
# enrich_with_districts("temizlenmis__sorted_haberler.csv", "ilce_koord_haberler.csv")
