-- Subcarpetas anidadas en expedientes
-- Run once in Supabase SQL editor

ALTER TABLE expedientes_carpetas
  ADD COLUMN IF NOT EXISTS parent_carpeta_id uuid REFERENCES expedientes_carpetas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expedientes_carpetas_parent
  ON expedientes_carpetas(parent_carpeta_id);

CREATE INDEX IF NOT EXISTS idx_expedientes_carpetas_anio_parent
  ON expedientes_carpetas(anio, parent_carpeta_id)
  WHERE obra_id IS NULL;
