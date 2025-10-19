CREATE INDEX IF NOT EXISTS idx_ref_mahalle_norm
  ON ref.mahalle (ilce_name_norm, mahalle_name_norm);

CREATE INDEX IF NOT EXISTS idx_stg_mahalle_norm
  ON staging.yeni_mahalle_raw (ilce_norm, mahalle_norm);
