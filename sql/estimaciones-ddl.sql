-- Estimaciones de Obra (progress billing)
CREATE TABLE IF NOT EXISTS obra_estimaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL,
  numero_estimacion INT NOT NULL, -- sequential per obra
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  -- Totals (sum of line items)
  importe_periodo NUMERIC(14,2) DEFAULT 0, -- amount this period
  importe_acumulado NUMERIC(14,2) DEFAULT 0, -- cumulative to date
  importe_contrato NUMERIC(14,2) DEFAULT 0, -- total contract amount
  pct_avance NUMERIC(5,2) DEFAULT 0, -- % of contract
  -- Deductions
  anticipo_pct NUMERIC(5,2) DEFAULT 0,
  amortizacion_anticipo NUMERIC(14,2) DEFAULT 0,
  retencion_pct NUMERIC(5,2) DEFAULT 0,
  monto_retencion NUMERIC(14,2) DEFAULT 0,
  iva_pct NUMERIC(5,2) DEFAULT 16,
  monto_iva NUMERIC(14,2) DEFAULT 0,
  neto_a_cobrar NUMERIC(14,2) DEFAULT 0,
  -- Status
  status TEXT DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'PRESENTADA', 'APROBADA', 'COBRADA', 'RECHAZADA')),
  fecha_presentacion DATE,
  fecha_aprobacion DATE,
  aprobada_por TEXT,
  notas TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Line items (partidas de la estimación)
CREATE TABLE IF NOT EXISTS obra_estimacion_partidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estimacion_id UUID NOT NULL REFERENCES obra_estimaciones(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  unidad TEXT DEFAULT 'PZA',
  cantidad_contrato NUMERIC(12,2) DEFAULT 0,
  precio_unitario NUMERIC(12,2) DEFAULT 0,
  cantidad_periodo NUMERIC(12,2) DEFAULT 0, -- qty this period
  cantidad_acumulada NUMERIC(12,2) DEFAULT 0, -- cumulative qty
  importe_periodo NUMERIC(14,2) DEFAULT 0, -- qty_period × price
  importe_acumulado NUMERIC(14,2) DEFAULT 0,
  pct_avance NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_estimaciones_obra ON obra_estimaciones(obra_id);
CREATE INDEX idx_estimaciones_status ON obra_estimaciones(status);
CREATE INDEX idx_estimacion_partidas_est ON obra_estimacion_partidas(estimacion_id);

-- RLS
ALTER TABLE obra_estimaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_estimacion_partidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estimaciones_auth" ON obra_estimaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "estimacion_partidas_auth" ON obra_estimacion_partidas FOR ALL TO authenticated USING (true) WITH CHECK (true);
