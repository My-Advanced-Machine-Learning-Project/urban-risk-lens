DROP SCHEMA IF EXISTS etl CASCADE;
CREATE SCHEMA IF NOT EXISTS etl;

-- Metin tabanlı doğrudan eşleme
DROP TABLE IF EXISTS etl.yeni_eslesme;
CREATE TABLE etl.yeni_eslesme AS
SELECT
  r.mah_id,
  s.il, s.il_norm, s.ilce, s.ilce_norm, s.mahalle, s.mahalle_norm
FROM staging.yeni_mahalle_raw s
JOIN ref.mahalle r
  ON r.mahalle_name_norm = s.mahalle_norm
 AND r.ilce_name_norm    = s.ilce_norm;

-- Eşleşmeyenler
DROP TABLE IF EXISTS etl.audit_unmatched;
CREATE TABLE etl.audit_unmatched AS
SELECT s.*
FROM staging.yeni_mahalle_raw s
LEFT JOIN ref.mahalle r
  ON r.mahalle_name_norm = s.mahalle_norm
 AND r.ilce_name_norm    = s.ilce_norm
WHERE r.mah_id IS NULL;

-- Final tablo
CREATE TABLE IF NOT EXISTS etl.mahalle_std(
  mah_id text primary key,
  il_norm text,
  ilce_norm text,
  mahalle_norm text
);

INSERT INTO etl.mahalle_std(mah_id, il_norm, ilce_norm, mahalle_norm)
SELECT mah_id, il_norm, ilce_norm, mahalle_norm
FROM etl.yeni_eslesme
ON CONFLICT (mah_id) DO UPDATE
SET il_norm=EXCLUDED.il_norm, ilce_norm=EXCLUDED.ilce_norm, mahalle_norm=EXCLUDED.mahalle_norm;
