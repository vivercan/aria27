-- ============================================================
-- ARIA27 ERP — Migración 15-Abr-2026
-- Campos ERP avanzados en requisitions + foto audit trail en entregas
-- Todos son additive (nullable/default) → backwards compatible
-- ============================================================

-- ── requisitions: campos ERP de primer mundo ────────────────
ALTER TABLE requisitions
  ADD COLUMN IF NOT EXISTS prioridad TEXT DEFAULT 'NORMAL'
    CHECK (prioridad IN ('CRITICO','URGENTE','NORMAL','PLANIFICADO')),
  ADD COLUMN IF NOT EXISTS presupuesto_estimado DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS canal_origen TEXT DEFAULT 'WEB'
    CHECK (canal_origen IN ('WEB','WHATSAPP','API','IMPORTACION')),
  ADD COLUMN IF NOT EXISTS duplicado_de TEXT,       -- folio de la req original si es duplicado
  ADD COLUMN IF NOT EXISTS foto_ticket_url TEXT;     -- foto del ticket que originó el pedido

-- Índice para consultas por prioridad + status (dashboard CEO)
CREATE INDEX IF NOT EXISTS idx_requisitions_prioridad ON requisitions(prioridad, status);

-- ── entregas: foto collision protection + audit trail ───────
ALTER TABLE entregas
  ADD COLUMN IF NOT EXISTS foto_hash TEXT,           -- SHA-256 primeros 32KB para detección duplicados
  ADD COLUMN IF NOT EXISTS foto_uploaded_at TIMESTAMPTZ, -- timestamp watermark de cuándo se subió
  ADD COLUMN IF NOT EXISTS notas TEXT;               -- preservar URL foto anterior en auditoría

-- ============================================================
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================
