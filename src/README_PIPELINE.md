# Data Pipeline - ETL & Prediction Services

Hızlı ETL ve prediction servisleri için komple pipeline sistemi.

## Hızlı Başlangıç

### 1. Tek Komutla Tüm Verileri Yükle

```bash
python quick_start.py
```

Bu script:
- Veritabanını başlatır
- Tüm GeoJSON dosyalarını bulur
- Veritabanına yükler
- İstatistikleri gösterir

### 2. Tek Dosya İşleme

```python
from data_pipeline import quick_pipeline

# Sadece ETL (veritabanına yükle)
result = quick_pipeline(
    "public/data/istanbul_mahalle_risk.geojson",
    year=2024
)

# ETL + Prediction
result = quick_pipeline(
    "public/data/istanbul_mahalle_risk.geojson",
    output_file="output/predicted_istanbul.geojson",
    model_path="models/risk_model.pkl",
    year=2024
)
```

### 3. Toplu İşleme

```python
from data_pipeline import quick_batch_pipeline

# Tüm klasörü işle
results = quick_batch_pipeline(
    input_dir="public/data",
    output_dir="output/predictions",
    model_path="models/risk_model.pkl"
)
```

## Servisler

### ETL Service (`etl_service.py`)

GeoJSON ve CSV verilerini veritabanına yükleme.

```python
from etl_service import ETLService

with ETLService() as etl:
    # Tek dosya
    result = etl.process_geojson_file("data.geojson", year=2024)

    # Tüm dosyaları bul ve yükle
    results = etl.discover_and_process_all("public/data")

    # İstatistikler
    stats = etl.get_etl_statistics()
    print(f"Total records: {stats['total_records']}")
```

**Özellikler:**
- ✅ Batch processing (100'lü gruplar)
- ✅ Otomatik spatial index
- ✅ Hata yönetimi
- ✅ Progress tracking
- ✅ CSV export

### Prediction Service (`prediction_service.py`)

ML modelleri ile risk tahmini.

```python
from prediction_service import PredictionService

with PredictionService(model_path="model.pkl") as predictor:
    # Tek tahmin
    result = predictor.predict_single({
        'rjb_km': 18.5,
        'earthquake_count_5km': 3.0,
        'pga_scenario_mw72': 0.0045,
        'vs30': 400.0,
        'toplam_nufus': 14534.0
    })

    # GeoJSON için tahmin
    predicted = predictor.predict_from_geojson(geojson_data)

    # Veritabanından tahmin
    predictions = predictor.predict_from_database({'district': 'Maltepe'})

    # Dosya işleme
    predictor.predict_and_save_geojson(
        "input.geojson",
        "output_predicted.geojson"
    )
```

**Özellikler:**
- ✅ Pickle/Joblib model desteği
- ✅ Batch predictions
- ✅ Confidence scores
- ✅ GeoJSON uyumlu
- ✅ Database integration

### Data Pipeline (`data_pipeline.py`)

ETL ve Prediction'ı birleştirir.

```python
from data_pipeline import DataPipeline

with DataPipeline(model_path="model.pkl") as pipeline:
    # Tam pipeline
    result = pipeline.run_full_pipeline(
        input_file="data.geojson",
        output_file="predicted.geojson",
        year=2025
    )

    # Toplu işleme
    results = pipeline.batch_process_directory(
        input_dir="public/data",
        output_dir="predictions"
    )

    # Incremental update
    update_result = pipeline.incremental_update("new_data.geojson")

    # CSV export
    pipeline.export_predictions_to_csv("predictions.csv", district="Maltepe")
```

**Pipeline Adımları:**
1. **ETL**: GeoJSON → Database
2. **Prediction**: Model → Tahminler
3. **Export**: Database → GeoJSON/CSV
4. **Statistics**: Raporlama

## Kullanım Senaryoları

### Senaryo 1: İlk Kurulum - Tüm Verileri Yükle

```bash
# Veritabanını hazırla
python -c "from database_config import init_db; init_db()"

# Tüm verileri yükle
python quick_start.py
```

### Senaryo 2: Yeni Veri Güncelleme

```python
from data_pipeline import DataPipeline

with DataPipeline() as pipeline:
    # Yeni 2026 tahminlerini yükle
    result = pipeline.run_full_pipeline(
        "public/data/2026/istanbul_risk_predictions.geojson",
        year=2026,
        make_predictions=False  # Sadece yükle
    )
```

### Senaryo 3: Model ile Tahmin

```python
from data_pipeline import DataPipeline

# Model ile tam pipeline
with DataPipeline(model_path="models/catboost_model.pkl") as pipeline:
    result = pipeline.run_full_pipeline(
        input_file="public/data/ankara_mahalle_risk.geojson",
        output_file="output/ankara_predicted_2025.geojson",
        year=2025,
        make_predictions=True
    )
```

### Senaryo 4: Toplu Güncelleme

```python
from data_pipeline import quick_batch_pipeline

# Tüm 2025 ve 2026 tahminlerini işle
results = quick_batch_pipeline(
    input_dir="public/data",
    output_dir="output/predictions",
    model_path="models/risk_model.pkl"
)

# Başarılı dosyalar
successful = [r for r in results if r.get('success')]
print(f"Processed {len(successful)} files")
```

### Senaryo 5: CSV Export

```python
from etl_service import ETLService

with ETLService() as etl:
    # İlçeye göre export
    etl.export_to_csv(
        "maltepe_data.csv",
        query_params={'district': 'Maltepe'}
    )
```

## Performans

### ETL Hızı
- **Tek dosya**: ~5-10 saniye (1000 feature)
- **Batch processing**: ~2-3 dosya/saniye
- **Spatial indexing**: Otomatik, her import sonrası

### Prediction Hızı
- **Single prediction**: <1ms
- **Batch (1000 features)**: ~1-2 saniye
- **GeoJSON dosya**: ~5-15 saniye

### Optimizasyon İpuçları

1. **Batch Size**: Default 100, büyük dosyalar için artırabilirsiniz
   ```python
   etl.load_geojson_to_db(data, batch_size=500)
   ```

2. **Spatial Index**: Her zaman oluşturun
   ```python
   repo.create_spatial_index()
   ```

3. **Database Connection Pool**: `database_config.py`'de ayarlı
   ```python
   pool_size=10
   max_overflow=20
   ```

## Hata Yönetimi

Pipeline hataları loglanır ve işleme devam eder:

```python
results = pipeline.batch_process_directory("public/data")

# Başarılı ve başarısız dosyaları ayır
successful = [r for r in results if r.get('success')]
failed = [r for r in results if not r.get('success')]

for f in failed:
    print(f"Failed: {f['input_file']}")
    print(f"Error: {f.get('error')}")
```

## Monitoring

### İstatistikler

```python
from etl_service import ETLService

with ETLService() as etl:
    stats = etl.get_etl_statistics()
    print(f"""
    Total records: {stats['total_records']}
    Districts: {stats['total_districts']}
    Source files: {stats['source_files']}
    First import: {stats['first_import']}
    Last update: {stats['last_update']}
    """)
```

### Prediction İstatistikleri

```python
from prediction_service import PredictionService

predictor = PredictionService(model_path="model.pkl")
predictions = predictor.predict_from_database()
stats = predictor.calculate_risk_statistics(predictions)

print(f"""
High risk: {stats['high_risk_count']}
Medium risk: {stats['medium_risk_count']}
Low risk: {stats['low_risk_count']}
Mean risk: {stats['mean_risk']:.4f}
""")
```

## Dosya Yapısı

```
urban-risk-lens-main/
├── etl_service.py           # ETL servisi
├── prediction_service.py    # Prediction servisi
├── data_pipeline.py         # Pipeline orchestrator
├── quick_start.py          # Hızlı başlangıç script
├── geo_repository.py       # Spatial queries
├── geo_models.py          # Database models
├── database_config.py     # DB configuration
└── geojson_utils.py       # GeoJSON helpers
```

## Örnek Workflow

```python
# 1. Database'i başlat
from database_config import init_db
init_db()

# 2. Verileri yükle
from etl_service import quick_import_all
results = quick_import_all("public/data")

# 3. Tahminler yap (model varsa)
from prediction_service import quick_predict_geojson
quick_predict_geojson(
    "public/data/istanbul_mahalle_risk.geojson",
    "output/predicted_istanbul.geojson",
    "models/model.pkl"
)

# 4. İstatistikleri kontrol et
from etl_service import ETLService
with ETLService() as etl:
    stats = etl.get_etl_statistics()
    print(stats)
```

## Gereksinimler

```bash
pip install -r requirements_db.txt
```

Gerekli paketler:
- sqlalchemy
- psycopg2-binary
- geoalchemy2
- shapely
- pandas
- numpy
- python-dotenv

## Troubleshooting

### Bağlantı Hatası
`.env` dosyasını kontrol edin:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urban_risk_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### PostGIS Hatası
```bash
sudo apt-get install postgresql-postgis
```

### Model Yükleme Hatası
Model formatını kontrol edin (.pkl veya .joblib)

## Lisans

Defensive security purposes only.
