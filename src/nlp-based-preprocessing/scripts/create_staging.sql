CREATE SCHEMA IF NOT EXISTS staging;

DROP TABLE IF EXISTS staging.yeni_mahalle_raw;
CREATE TABLE staging.yeni_mahalle_raw(
  il text, il_norm text,
  ilce text, ilce_norm text,
  mahalle text, mahalle_norm text
);
