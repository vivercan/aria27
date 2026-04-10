-- ============================================================
-- SUA FINANZAS — DDL para módulo control financiero IMSS
-- Complementa /administracion/sua (CRUD aportaciones)
-- Fecha: 2026-04-10
-- ============================================================

-- Líneas de captura SIPARE / SUA
CREATE TABLE IF NOT EXISTS sua_lineas_captura (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('IMSS','INFONAVIT','RCV','AMORTIZACION','MULTA')),
  periodo TEXT NOT NULL,
  obra_id UUID REFERENCES centros_trabajo(id),
  obra_nombre TEXT,
  num_trabajadores INT,
  linea_captura TEXT,
  monto_base NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_base >= 0),
  recargos NUMERIC(12,2) NOT NULL DEFAULT 0,
  actualizacion NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  vigencia DATE,
  monto_pagado NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha_pago DATE,
  banco TEXT,
  referencia_pago TEXT,
  estatus TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estatus IN ('PENDIENTE','PAGADA','VENCIDA','PARCIAL')),
  comprobante_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_slc_periodo ON sua_lineas_captura(periodo DESC);
CREATE INDEX IF NOT EXISTS idx_slc_tipo ON sua_lineas_captura(tipo);
CREATE INDEX IF NOT EXISTS idx_slc_obra ON sua_lineas_captura(obra_id);
CREATE INDEX IF NOT EXISTS idx_slc_estatus ON sua_lineas_captura(estatus);
CREATE INDEX IF NOT EXISTS idx_slc_vigencia ON sua_lineas_captura(vigencia);

-- RLS
ALTER TABLE sua_lineas_captura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_slc" ON sua_lineas_captura FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_slc" ON sua_lineas_captura FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger auto-vencimiento (marca VENCIDA si vigencia pasó y no está PAGADA)
CREATE OR REPLACE FUNCTION fn_sua_check_vencimiento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vigencia IS NOT NULL AND NEW.vigencia < CURRENT_DATE AND NEW.estatus = 'PENDIENTE' THEN
    NEW.estatus := 'VENCIDA';
  END IF;
  IF NEW.monto_pagado >= NEW.total AND NEW.total > 0 THEN
    NEW.estatus := 'PAGADA';
  ELSIF NEW.monto_pagado > 0 AND NEW.monto_pagado < NEW.total THEN
    NEW.estatus := 'PARCIAL';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sua_vencimiento ON sua_lineas_captura;
CREATE TRIGGER trg_sua_vencimiento
  BEFORE INSERT OR UPDATE ON sua_lineas_captura
  FOR EACH ROW EXECUTE FUNCTION fn_sua_check_vencimiento();
