-- ============================================================
-- CAJA CHICA — DDL para módulo ERP completo
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-04-10
-- ============================================================

-- 1. Fondos de caja chica (uno por obra o área)
CREATE TABLE IF NOT EXISTS caja_chica_fondos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  obra_id UUID REFERENCES centros_trabajo(id),
  responsable_id UUID REFERENCES employees(id),
  monto_autorizado NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monto_autorizado >= 0),
  saldo_actual NUMERIC(12,2) NOT NULL DEFAULT 0,
  estatus TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estatus IN ('ACTIVO','SUSPENDIDO','CERRADO')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Movimientos (gastos y reposiciones)
CREATE TABLE IF NOT EXISTS caja_chica_movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fondo_id UUID NOT NULL REFERENCES caja_chica_fondos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('GASTO','REPOSICION')),
  concepto TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  comprobante TEXT,
  responsable TEXT,
  categoria TEXT DEFAULT 'GENERAL' CHECK (categoria IN (
    'GENERAL','MATERIALES','TRANSPORTE','ALIMENTACION',
    'PAPELERIA','HERRAMIENTA','LIMPIEZA','COMBUSTIBLE','OTROS'
  )),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cortes periódicos (snapshots de cierre)
CREATE TABLE IF NOT EXISTS caja_chica_cortes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fondo_id UUID NOT NULL REFERENCES caja_chica_fondos(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  total_gastos NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_reposiciones NUMERIC(12,2) NOT NULL DEFAULT 0,
  num_movimientos INT NOT NULL DEFAULT 0,
  saldo_inicial NUMERIC(12,2) NOT NULL,
  saldo_final NUMERIC(12,2) NOT NULL,
  estatus TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (estatus IN ('ABIERTO','CERRADO')),
  cerrado_por TEXT,
  cerrado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_ccm_fondo ON caja_chica_movimientos(fondo_id);
CREATE INDEX IF NOT EXISTS idx_ccm_fecha ON caja_chica_movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ccm_tipo ON caja_chica_movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_ccc_fondo ON caja_chica_cortes(fondo_id);

-- 5. Trigger para actualizar saldo_actual del fondo
CREATE OR REPLACE FUNCTION fn_caja_chica_update_saldo()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo = 'GASTO' THEN
      UPDATE caja_chica_fondos SET saldo_actual = saldo_actual - NEW.monto, updated_at = now() WHERE id = NEW.fondo_id;
    ELSE
      UPDATE caja_chica_fondos SET saldo_actual = saldo_actual + NEW.monto, updated_at = now() WHERE id = NEW.fondo_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.tipo = 'GASTO' THEN
      UPDATE caja_chica_fondos SET saldo_actual = saldo_actual + OLD.monto, updated_at = now() WHERE id = OLD.fondo_id;
    ELSE
      UPDATE caja_chica_fondos SET saldo_actual = saldo_actual - OLD.monto, updated_at = now() WHERE id = OLD.fondo_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_caja_chica_saldo ON caja_chica_movimientos;
CREATE TRIGGER trg_caja_chica_saldo
  AFTER INSERT OR DELETE ON caja_chica_movimientos
  FOR EACH ROW EXECUTE FUNCTION fn_caja_chica_update_saldo();

-- 6. RLS básico (lectura autenticada)
ALTER TABLE caja_chica_fondos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_chica_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_chica_cortes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_fondos" ON caja_chica_fondos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_fondos" ON caja_chica_fondos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_movimientos" ON caja_chica_movimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_movimientos" ON caja_chica_movimientos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_cortes" ON caja_chica_cortes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_cortes" ON caja_chica_cortes FOR ALL TO authenticated USING (true) WITH CHECK (true);
