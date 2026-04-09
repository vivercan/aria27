-- =============================================================
-- ARIA27 — Inventario Fotos: DDL para evidencia fotográfica
-- Fecha: 9 Abr 2026
-- =============================================================

-- 1. Agregar foto_url a inventario_obra (foto del producto/material)
ALTER TABLE inventario_obra ADD COLUMN IF NOT EXISTS foto_url text;

-- 2. Agregar foto_url a inventario_movimientos (evidencia por movimiento)
ALTER TABLE inventario_movimientos ADD COLUMN IF NOT EXISTS foto_url text;

-- 3. Agregar producto_id FK a inventario_obra para ligar al catálogo
ALTER TABLE inventario_obra ADD COLUMN IF NOT EXISTS producto_id bigint REFERENCES products(id);

-- 4. Crear bucket de Storage para fotos de inventario (ejecutar manualmente si no existe)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('inventario', 'inventario', true)
-- ON CONFLICT (id) DO NOTHING;

-- 5. Fix obra_id en movimientos: original era integer, debe ser uuid (consistente con inventario_obra)
ALTER TABLE inventario_movimientos ALTER COLUMN obra_id TYPE uuid USING obra_id::text::uuid;

-- 6. Index para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_inventario_obra_producto ON inventario_obra(producto_id);
CREATE INDEX IF NOT EXISTS idx_inventario_mov_foto ON inventario_movimientos(foto_url) WHERE foto_url IS NOT NULL;

-- 7. Comentarios
COMMENT ON COLUMN inventario_obra.foto_url IS 'URL de la foto del producto/material en Supabase Storage bucket inventario';
COMMENT ON COLUMN inventario_movimientos.foto_url IS 'Evidencia fotográfica del movimiento (entrada/salida/ajuste)';
COMMENT ON COLUMN inventario_obra.producto_id IS 'FK opcional a products para ligar al catálogo central';
