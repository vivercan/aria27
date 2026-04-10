-- ============================================================
-- FINIQUITOS Y BAJAS — DDL para módulo de Terminación de Empleados
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-04-10
-- ============================================================

-- 1. Tabla principal: Finiquitos (Liquidación de empleados)
CREATE TABLE IF NOT EXISTS finiquitos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Tipo de baja (termination reason)
  tipo TEXT NOT NULL CHECK (tipo IN (
    'RENUNCIA_VOLUNTARIA',
    'DESPIDO_JUSTIFICADO',
    'DESPIDO_INJUSTIFICADO',
    'MUTUO_ACUERDO',
    'FIN_CONTRATO',
    'DEFUNCION'
  )),

  -- Fechas críticas
  fecha_baja DATE NOT NULL,
  fecha_ingreso DATE,

  -- Cálculos automáticos
  antiguedad_dias INT DEFAULT 0,

  -- Conceptos del finiquito (Mexican Labor Law - LFT)
  salario_diario NUMERIC(12,2) DEFAULT 0,

  -- Aguinaldo proporcional: (días trabajados en año / 365) × 15 días × salario_diario
  dias_aguinaldo_proporcional NUMERIC(8,2) DEFAULT 0,
  monto_aguinaldo NUMERIC(12,2) DEFAULT 0,

  -- Vacaciones pendientes según tabla LFT por antigüedad
  dias_vacaciones_pendientes NUMERIC(8,2) DEFAULT 0,
  monto_vacaciones NUMERIC(12,2) DEFAULT 0,

  -- Prima vacacional: 25% sobre vacaciones (LFT art 80)
  prima_vacacional_pct NUMERIC(5,2) DEFAULT 25,
  monto_prima_vacacional NUMERIC(12,2) DEFAULT 0,

  -- Prima de antigüedad: 12 días × salario_diario × años completos (LFT art 162)
  -- Tope: 2 × SMG (salario mínimo general)
  dias_prima_antiguedad NUMERIC(8,2) DEFAULT 0,
  monto_prima_antiguedad NUMERIC(12,2) DEFAULT 0,

  -- Indemnización 90 días: SOLO aplica en DESPIDO_INJUSTIFICADO
  -- 90 × salario_diario (LFT art 48)
  indemnizacion_90_dias NUMERIC(12,2) DEFAULT 0,

  -- Salarios caídos: SOLO aplica en DESPIDO_INJUSTIFICADO
  -- Usuario especifica días, se calcula: días × salario_diario
  salarios_caidos_dias INT DEFAULT 0,
  monto_salarios_caidos NUMERIC(12,2) DEFAULT 0,

  -- TOTALES
  total_percepciones NUMERIC(12,2) DEFAULT 0,

  -- Deducciones
  deducciones_infonavit NUMERIC(12,2) DEFAULT 0,
  deducciones_prestamos NUMERIC(12,2) DEFAULT 0,
  otras_deducciones NUMERIC(12,2) DEFAULT 0,
  total_deducciones NUMERIC(12,2) DEFAULT 0,

  neto_a_pagar NUMERIC(12,2) DEFAULT 0,

  -- Metadata
  status TEXT DEFAULT 'BORRADOR' CHECK (status IN (
    'BORRADOR',
    'CALCULADO',
    'APROBADO',
    'PAGADO',
    'CANCELADO'
  )),

  motivo TEXT,
  notas TEXT,

  -- Auditoria
  created_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_finiquitos_employee ON finiquitos(employee_id);
CREATE INDEX IF NOT EXISTS idx_finiquitos_status ON finiquitos(status);
CREATE INDEX IF NOT EXISTS idx_finiquitos_fecha_baja ON finiquitos(fecha_baja);
CREATE INDEX IF NOT EXISTS idx_finiquitos_created_at ON finiquitos(created_at DESC);

-- 3. Habilitar RLS
ALTER TABLE finiquitos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: authenticated users can view/manage finiquitos
CREATE POLICY "finiquitos_auth" ON finiquitos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- VISTA: Finiquitos con datos del empleado (para UI)
-- ============================================================
CREATE OR REPLACE VIEW finiquitos_completo AS
SELECT
  f.id,
  f.employee_id,
  f.tipo,
  f.fecha_baja,
  f.fecha_ingreso,
  f.antiguedad_dias,
  f.salario_diario,
  f.total_percepciones,
  f.total_deducciones,
  f.neto_a_pagar,
  f.status,
  f.motivo,
  f.notas,
  f.approved_at,
  f.paid_at,
  f.created_at,
  f.updated_at,
  p.full_name,
  p.employee_number,
  p.position
FROM finiquitos f
LEFT JOIN employees p ON f.employee_id = p.id;
