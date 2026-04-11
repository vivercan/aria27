-- ============================================================
-- ADD CFDI Columns para Facturacion
-- Agrega soporte para UUID fiscal, tipo INGRESO/EGRESO
-- Fecha: 2026-04-10
-- ============================================================

-- Add uuid_fiscal column if not exists
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS uuid_fiscal TEXT UNIQUE;

-- Add tipo column if not exists (INGRESO o EGRESO)
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'EGRESO' CHECK (tipo IN ('INGRESO', 'EGRESO'));

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_facturas_uuid_fiscal ON facturas(uuid_fiscal);
CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON facturas(tipo);

-- Add RLS if not already enabled
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "auth_read_facturas" ON facturas FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "auth_write_facturas" ON facturas FOR ALL TO authenticated USING (true) WITH CHECK (true);
