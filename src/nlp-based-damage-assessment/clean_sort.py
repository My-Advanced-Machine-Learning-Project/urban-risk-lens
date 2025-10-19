import pandas as pd
# cleaner.py
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
import re

def clean_text(text):
    text = str(text)
    text = re.sub(r'\s+', ' ', text)  # Fazla boşlukları temizle
    text = re.sub(r'\n|\r', ' ', text)
    text = re.sub(r'[^a-zA-Z0-9ğüşöçİĞÜŞÖÇ.,;:!? ]', '', text)  # Türkçe karakter uyumlu temizlik
    return text.strip()

def clean_and_sort_csv(input_path, output_path):
    df = pd.read_csv(input_path)
    print(f"📄 Yüklenen veri: {len(df)} satır")

    # Boş veya eksik metinleri at
    df = df[df['text'].notna()]
    df['text'] = df['text'].apply(clean_text)

    # Tarihe göre sırala (varsa)
    if 'date' in df.columns:
        df = df.sort_values(by='date', ascending=True)

    # Temiz dosyayı kaydet
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"✅ Temizlenmiş veri '{output_path}' dosyasına kaydedildi.")

def run_tfidf_analysis(csv_path, column="text", max_features=20):
    df = pd.read_csv(csv_path)
    corpus = df[column].dropna().tolist()

    vectorizer = TfidfVectorizer(max_features=max_features, stop_words='turkish')
    X = vectorizer.fit_transform(corpus)

    tfidf_df = pd.DataFrame(X.toarray(), columns=vectorizer.get_feature_names_out())
    tfidf_sum = tfidf_df.sum().sort_values(ascending=False)

    print("\n📊 En yüksek TF-IDF değerine sahip kelimeler:")
    print(tfidf_sum.head(20))


def clean_and_sort_csv(input_csv, output_csv):
    df = pd.read_csv(input_csv)

    # Tarih sütununu datetime formatına çevir
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')  # hatalı formatları NaT yapar

        # Tarihe göre sıralama (en yeni en üstte)
        df = df.sort_values(by='date', ascending=False)
    else:
        print("⚠️ 'date' sütunu bulunamadı, sıralama yapılmadı.")

    # Duplicates temizleme
    df = df.drop_duplicates(subset=['url'])
    df = df.drop_duplicates(subset=['text'])

    # Yeni temizlenmiş CSV olarak kaydet
    #df.to_csv(output_csv, index=False, encoding='utf-8-sig')
    #print(f"✅ Temizlenmiş ve sıralanmış CSV '{output_csv}' olarak kaydedildi.")


import pandas as pd
import re

# 1. Metin Temizleme Fonksiyonu
def clean_text(text):
    if pd.isna(text):
        return ""
    text = str(text)
    text = re.sub(r'\s+', ' ', text)  # fazla boşlukları kaldır
    text = re.sub(r'http\S+', '', text)  # linkleri kaldır
    text = re.sub(r'<.*?>', '', text)  # HTML tagleri kaldır
    text = re.sub(r'[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ .,!?]', '', text)  # özel karakterleri kaldır
    return text.strip()

# 2. Şehir Eşleştirme Fonksiyonu
def match_city(text, cities):
    matches = [city for city in cities if city.lower() in text.lower()]
    return ", ".join(matches)

# 3. Temizleme, Tarih Sıralama ve Yeni CSV’ye Kaydetme
def clean_and_sort_csv(input_csv, output_csv):
    print(f"📥 Girdi dosyası: {input_csv}")
    df = pd.read_csv(input_csv)

    # Metin temizliği
    df['text'] = df['text'].apply(clean_text)

    # Tarih formatı ve sıralama
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df = df.sort_values(by='date', ascending=False)

    # Duplicates temizleme
    df = df.drop_duplicates(subset=['url'])
    df = df.drop_duplicates(subset=['text'])

    # Şehir eşleme (2023 depreminden etkilenen iller)
    cities = [
        "Adana", "Adıyaman", "Diyarbakır", "Elazığ", "Gaziantep",
        "Hatay", "Kahramanmaraş", "Kilis", "Malatya", "Osmaniye", 
        "Şanlıurfa"
    ]
    df['cities'] = df['text'].apply(lambda x: match_city(str(x), cities))

    # Yeni dosyaya yaz
    df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"✅ Temizlenmiş ve sıralanmış veri '{output_csv}' olarak kaydedildi.")

def clean_text(text):
    text = str(text)
    text = re.sub(r'\s+', ' ', text)  # Fazla boşlukları temizle
    text = re.sub(r'\n|\r', ' ', text)
    text = re.sub(r'[^a-zA-Z0-9ğüşöçİĞÜŞÖÇ.,;:!? ]', '', text)  # Türkçe karakter uyumlu temizlik
    return text.strip()

def clean_and_sort_csv(input_path, output_path):
    df = pd.read_csv(input_path)
    print(f"📄 Yüklenen veri: {len(df)} satır")

    # Boş veya eksik metinleri at
    df = df[df['text'].notna()]
    df['text'] = df['text'].apply(clean_text)

    # Tarihe göre sırala (varsa)
    if 'date' in df.columns:
        df = df.sort_values(by='date', ascending=True)

    # Temiz dosyayı kaydet
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"✅ Temizlenmiş veri '{output_path}' dosyasına kaydedildi.")

def run_tfidf_analysis(csv_path, column="text", max_features=20):
    df = pd.read_csv(csv_path)
    corpus = df[column].dropna().tolist()

    # 1️⃣ Türkçe stop kelimeleri önce tanımla
    turkish_stop_words = [
        "acaba", "ama", "aslında", "az", "bazı", "belki", "biri", "birkaç", "birşey", "biz", "bu", "çok",
        "çünkü", "da", "daha", "de", "defa", "diye", "en", "gibi", "hem", "hep", "hepsi", "her", "hiç",
        "için", "ile", "ise", "kez", "ki", "kim", "mı", "mu", "mü", "nasıl", "ne", "neden", "nerde",
        "nerede", "nereye", "niçin", "niye", "o", "sanki", "şey", "siz", "şu", "tüm", "ve", "veya",
        "ya", "yani"
    ]

    # 2️⃣ Vectorizer burada tanımlanmalı
    vectorizer = TfidfVectorizer(max_features=max_features, stop_words=turkish_stop_words)
    X = vectorizer.fit_transform(corpus)

    tfidf_df = pd.DataFrame(X.toarray(), columns=vectorizer.get_feature_names_out())
    tfidf_sum = tfidf_df.sum().sort_values(ascending=False)

    print("\n📊 En yüksek TF-IDF değerine sahip kelimeler:")
    print(tfidf_sum.head(20))


from wordcloud import WordCloud
import matplotlib.pyplot as plt

def show_wordcloud(csv_path, column="text"):
    df = pd.read_csv(csv_path)
    text = " ".join(df[column].dropna().tolist())
    wc = WordCloud(width=800, height=400, background_color="white", stopwords=set(stopwords.words("turkish"))).generate(text)

    plt.figure(figsize=(12, 6))
    plt.imshow(wc, interpolation="bilinear")
    plt.axis("off")
    plt.title("WordCloud: En Sık Geçen Kelimeler")
    plt.show()



# Direkt çalıştırmak için:
if __name__ == "__main__":
    input_csv = "orijinal_code_gazete.csv"
    output_csv = "temizlenmis__sorted_haberler.csv"

    clean_and_sort_csv(input_csv, output_csv)
    run_tfidf_analysis(output_csv)





