# NLP-Based Preprocessing (Mahalle/İlçe Verileri)

Yeni gelen (CSV/Excel/GeoJSON) verileri **NLP tabanlı kolon eşleme + Türkçe ad normalizasyonu** ile
standart hale getirir; `staging` tablosuna yükler ve `mah_id` eşlemesi için SQL betiklerini çalıştırır.

## Kurulum

```bash
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # ve DATABASE_URL'i doldur
```

## Kullanım (3 komut)

```bash
# 1) Temizle & Standartlaştır → CSV/GeoJSON çıktısı üret
python -m nlp_preprocess.cli clean   --in ./examples/sample_input.xlsx   --out ./outputs/temiz_veri.csv

# 2) DB'ye YÜKLE (staging) ve mah_id EŞLE
python -m nlp_preprocess.cli load-db   --in ./outputs/temiz_veri.csv   --staging-table staging.yeni_mahalle_raw

# 3) SQL betiklerini uygula (ilk kezse extensions/staging/indexler)
psql "$DATABASE_URL" -f scripts/create_extensions.sql
psql "$DATABASE_URL" -f scripts/create_staging.sql
psql "$DATABASE_URL" -f scripts/indexes.sql
psql "$DATABASE_URL" -f scripts/match_mahid.sql
```

## Yapı Taşları
- **configs/colmap.yaml**: sütun isimlerini standarta map’ler
- **configs/alias.yaml**: “kadi koy → kadikoy” gibi düzeltmeler
- **configs/pipeline.yaml**: davranış ayarları
- **src/nlp_preprocess/**: kod
- **scripts/**: SQL betikleri
