# PostGIS GeoJSON Database Integration

Bu proje, GeoJSON dosyalarını PostgreSQL/PostGIS veritabanına aktarma ve spatial (coğrafi) sorgular çalıştırma için gerekli altyapıyı içerir.

## Kurulum

### 1. Gerekli Paketleri Yükleyin

```bash
pip install -r requirements_db.txt
```

### 2. PostgreSQL ve PostGIS Kurulumu

PostgreSQL ve PostGIS extension'ının yüklü olması gerekir:

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib postgis

# macOS (Homebrew)
brew install postgresql postgis

# Windows
# PostgreSQL installer'dan PostGIS'i seçin
```

### 3. Veritabanı Oluşturma

```bash
# PostgreSQL'e bağlanın
sudo -u postgres psql

# Veritabanı oluşturun
CREATE DATABASE urban_risk_db;

# PostGIS extension'ını aktifleştirin
\c urban_risk_db
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
```

### 4. Çevre Değişkenlerini Ayarlayın

`.env` dosyası oluşturun:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urban_risk_db
DB_USER=postgres
DB_PASSWORD=your_password_here
```

## Dosya Yapısı

- **database_config.py** - PostgreSQL/PostGIS bağlantı yapılandırması
- **models.py** - Temel SQLAlchemy modelleri
- **geo_models.py** - PostGIS geometry tiplerine sahip spatial modeller
- **repository.py** - Temel veri erişim katmanı
- **geo_repository.py** - Spatial/coğrafi sorgular için repository
- **geojson_utils.py** - GeoJSON dosyalarını yükleme ve işleme yardımcıları
- **example_geojson_import.py** - GeoJSON import ve sorgu örnekleri

## Kullanım

### GeoJSON Dosyalarını İçe Aktarma

```python
from database_config import SessionLocal, init_db
from geo_repository import GeoSpatialRepository
from geojson_utils import load_geojson_file

# Veritabanını başlat
init_db()

# GeoJSON dosyasını yükle
geojson_data = load_geojson_file("public/data/istanbul_mahalle_risk.geojson")

# Veritabanına aktar
db = SessionLocal()
repo = GeoSpatialRepository(db)

results = repo.bulk_import_geojson(
    geojson_data,
    source_file="istanbul_mahalle_risk.geojson",
    year=2024
)

print(f"Imported {len(results)} features")

# Spatial index oluştur (hızlı sorgular için)
repo.create_spatial_index()

db.close()
```

### Spatial Sorgular

#### 1. İsme Göre Mahalle Bulma

```python
db = SessionLocal()
repo = GeoSpatialRepository(db)

results = repo.get_by_name("Gülsuyu")
for item in results:
    print(f"{item.mahalle_adi} - Risk: {item.bilesik_risk_skoru}")

db.close()
```

#### 2. Yüksek Riskli Alanları Bulma

```python
high_risk = repo.get_high_risk_areas(threshold=0.2)
for item in high_risk[:10]:
    print(f"{item.name} - Risk: {item.bilesik_risk_skoru:.4f}")
```

#### 3. Belirli Bir Noktanın Yakınındaki Alanları Bulma

```python
# Istanbul merkez koordinatları
lon, lat = 28.9784, 41.0082

# 5km yarıçapındaki alanları bul
nearby = repo.find_within_distance(lon, lat, distance_km=5)
print(f"Found {len(nearby)} areas within 5km")
```

#### 4. En Yakın Mahalleleri Bulma

```python
# En yakın 10 mahalleyi bul
nearest = repo.find_nearest(lon, lat, limit=10)

for area, distance in nearest:
    print(f"{area.name} - {distance:.2f} km uzaklıkta")
```

#### 5. İlçe İstatistikleri

```python
stats = repo.get_statistics_by_district("Maltepe")

print(f"Mahalle sayısı: {stats['neighborhood_count']}")
print(f"Ortalama risk: {stats['average_risk']:.4f}")
print(f"Toplam nüfus: {stats['total_population']:,}")
print(f"Toplam bina: {stats['total_buildings']:,}")
```

#### 6. GeoJSON Olarak Dışa Aktarma

```python
# Tek bir alan
geojson = repo.get_as_geojson(item_id=1)

# Birden fazla alan (FeatureCollection)
geojson_collection = repo.get_all_as_geojson(skip=0, limit=100)
```

### Örnek Script Çalıştırma

```bash
python example_geojson_import.py
```

Bu script:
1. Veritabanını başlatır
2. Örnek bir GeoJSON dosyasını analiz eder
3. Veritabanına aktarır
4. Çeşitli spatial sorgular çalıştırır

## Veri Modeli

`MahalleRiskData` modeli aşağıdaki ana alanları içerir:

### Coğrafi Bilgiler
- `geometry` - PostGIS geometry (Polygon/MultiPolygon)
- `centroid` - Alanın merkez noktası
- `x`, `y` - Koordinatlar

### Risk Skorları
- `bilesik_risk_skoru` - Bileşik risk skoru
- `risk_label_5li` - 5 seviyeli risk etiketi
- `comprehensive_earthquake_risk` - Kapsamlı deprem riski

### Deprem Verileri
- `earthquake_count_*km` - Belirli yarıçaptaki deprem sayıları
- `max_magnitude_nearby_20km` - 20km içindeki maksimum büyüklük
- `pga_scenario_mw*` - PGA senaryoları

### Nüfus ve Bina Bilgileri
- `toplam_nufus` - Toplam nüfus
- `toplam_bina` - Toplam bina sayısı
- `population_density` - Nüfus yoğunluğu
- `building_density` - Bina yoğunluğu

### Güvenlik Açıkları
- `total_vulnerability` - Toplam güvenlik açığı
- `infrastructure_vulnerability` - Altyapı güvenlik açığı
- `human_building_vulnerability` - İnsan/bina güvenlik açığı

## PostGIS Fonksiyonları

Repository'de kullanılan ana PostGIS fonksiyonları:

- `ST_GeomFromGeoJSON()` - GeoJSON'dan geometry oluşturma
- `ST_AsGeoJSON()` - Geometry'yi GeoJSON'a çevirme
- `ST_Distance()` - İki geometry arası mesafe
- `ST_DWithin()` - Belirli mesafe içinde mi kontrolü
- `ST_Intersects()` - Kesişme kontrolü
- `ST_Centroid()` - Merkez nokta hesaplama
- `ST_Area()` - Alan hesaplama

## Performans İpuçları

1. **Spatial Index Kullanın**: Her import sonrası `create_spatial_index()` çağırın
2. **SRID Tutarlılığı**: Tüm geometriler SRID 4326 (WGS84) kullanır
3. **Batch Import**: Çok sayıda feature için `bulk_import_geojson()` kullanın
4. **Connection Pool**: `database_config.py`'de pool ayarları yapılandırılmıştır

## Sorun Giderme

### PostGIS Extension Hatası

```
ERROR: could not open extension control file
```

Çözüm:
```bash
sudo apt-get install postgresql-*-postgis-3
```

### Bağlantı Hatası

`.env` dosyasındaki veritabanı bilgilerini kontrol edin.

### Geometry Hatası

Tüm geometrilerin geçerli olduğundan emin olun. Geçersiz geometriler için:

```python
# SQL ile düzelt
UPDATE mahalle_risk_data
SET geometry = ST_MakeValid(geometry)
WHERE NOT ST_IsValid(geometry);
```

## Gelişmiş Özellikler

### Özel Spatial Sorgular

```python
from sqlalchemy import func

# Belirli bir polygon içindeki alanları bul
results = db.query(MahalleRiskData).filter(
    func.ST_Within(
        MahalleRiskData.geometry,
        func.ST_GeomFromGeoJSON(your_polygon_geojson)
    )
).all()
```

### Buffer (Tampon Bölge) Oluşturma

```python
# 1km tampon bölge
buffered = db.query(
    func.ST_AsGeoJSON(
        func.ST_Buffer(
            MahalleRiskData.geometry::Geography,
            1000  # meters
        )
    )
).filter(MahalleRiskData.id == area_id).scalar()
```

## Lisans

Bu kod defensif güvenlik amaçlıdır ve kötü niyetli kullanım için tasarlanmamıştır.
