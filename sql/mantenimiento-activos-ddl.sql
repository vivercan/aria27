-- ============================================================
-- MANTENIMIENTO DE ACTIVOS — DDL módulo ERP completo
-- Programa preventivo + correctivo + historial
-- Fecha: 2026-04-10
-- ============================================================

-- 1. Programas de mantenimiento preventivo
CREATE TABLE IF NOT EXISTS mantenimiento_programas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activo_id UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'PREVENTIVO' CHECK (tipo IN ('PREVENTIVO','PREDICTIVO')),
  frecuencia_dias INT NOT NULL DEFAULT 30 CHECK (frecuencia_dias > 0),
  frecuencia_km INT,
  descripcion TEXT,
  proveedor TEXT,
  costo_estimado NUMERIC(12,2) DEFAULT 0,
  ultima_ejecucion DATE,
  proxima_ejecucion DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Órdenes de trabajo (preventivo y correctivo)
CREATE TABLE IF NOT EXISTS mantenimiento_ordenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio TEXT NOT NULL,
  activo_id UUID NOT NULL REFERENCES activos(id) ON DELETE CASCADE,
  programa_id UUID REFERENCES mantenimiento_programas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('PREVENTIVO','CORRECTIVO','PREDICTIVO','EMERGENCIA')),
  prioridad TEXT NOT NULL DEFAULT 'NORMAL' CHECK (prioridad IN ('BAJA','NORMAL','ALTA','URGENTE')),
  descripcion TEXT NOT NULL,
  diagnostico TEXT,
  fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_programada DATE,
  fecha_inicio DATE,
  fecha_fin DATE,
  responsable TEXT,
  proveedor TEXT,
  costo_estimado NUMERIC(12,2) DEFAULT 0,
  costo_real NUMERIC(12,2) DEFAULT 0,
  km_actual INT,
  horas_actual INT,
  estatus TEXT NOT NULL DEFAULT 'ABIERTA' CHECK (estatus IN ('ABIERTA','EN_PROCESO','COMPLETADA','CANCELADA','ESPERANDO_REFACCIONES')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Historial de trabajos (detalle por orden)
CREATE TABLE IF NOT EXISTS mantenimiento_trabajos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orden_id UUID NOT NULL REFERENCES mantenimiento_ordenes(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  tipo_trabajo TEXT DEFAULT 'MANO_OBRA' CHECK (tipo_trabajo IN ('MANO_OBRA','REFACCION','CONSUMIBLE','SERVICIO_EXTERNO')),
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  proveedor TEXT,
  factura TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Secuencia para folios
CREATE SEQUENCE IF NOT EXISTS seq_mantenimiento_folio START 1;

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_mp_activo ON mantenimiento_programas(activo_id);
CREATE INDEX IF NOT EXISTS idx_mp_proxima ON mantenimiento_programas(proxima_ejecucion);
CREATE INDEX IF NOT EXISTS idx_mo_activo ON mantenimiento_ordenes(activo_id);
CREATE INDEX IF NOT EXISTS idx_mo_estatus ON mantenimiento_ordenes(estatus);
CREATE INDEX IF NOT EXISTS idx_mo_fecha ON mantenimiento_ordenes(fecha_solicitud DESC);
CREATE INDEX IF NOT EXISTS idx_mo_tipo ON mantenimiento_ordenes(tipo);
CREATE INDEX IF NOT EXISTS idx_mt_orden ON mantenimiento_trabajos(orden_id);

-- 6. Trigger: calcular próxima ejecución al marcar orden completada
CREATE OR REPLACE FUNCTION fn_mantenimiento_orden_completada()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estatus = 'COMPLETADA' AND OLD.estatus != 'COMPLETADA' THEN
    NEW.fecha_fin := COALESCE(NEW.fecha_fin, CURRENT_DATE);
    -- Actualizar programa preventivo si existe
    IF NEW.programa_id IS NOT NULL THEN
      UPDATE mantenimiento_programas
      SET ultima_ejecucion = NEW.fecha_fin,
          proxima_ejecucion = NEW.fecha_fin + (frecuencia_dias || ' days')::INTERVAL,
          updated_at = now()
      WHERE id = NEW.programa_id;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mantenimiento_completada ON mantenimiento_ordenes;
CREATE TRIGGER trg_mantenimiento_completada
  BEFORE UPDATE ON mantenimiento_ordenes
  FOR EACH ROW EXECUTE FUNCTION fn_mantenimiento_orden_completada();

-- 7. Trigger: actualizar costo_total en trabajos
CREATE OR REPLACE FUNCTION fn_mantenimiento_trabajo_costo()
RETURNS TRIGGER AS $$
BEGIN
  NEW.costo_total := NEW.cantidad * NEW.costo_unitario;
  -- Actualizar costo_real de la orden
  IF TG_OP = 'INSERT' THEN
    UPDATE mantenimiento_ordenes SET costo_real = costo_real + NEW.costo_total, updated_at = now() WHERE id = NEW.orden_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE mantenimiento_ordenes SET costo_real = costo_real - OLD.costo_total, updated_at = now() WHERE id = OLD.orden_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mantenimiento_trabajo_costo ON mantenimiento_trabajos;
CREATE TRIGGER trg_mantenimiento_trabajo_costo
  BEFORE INSERT OR DELETE ON mantenimiento_trabajos
  FOR EACH ROW EXECUTE FUNCTION fn_mantenimiento_trabajo_costo();

-- 8. RLS
ALTER TABLE mantenimiento_programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimiento_ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimiento_trabajos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_rw_mp" ON mantenimiento_programas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rw_mo" ON mantenimiento_ordenes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_rw_mt" ON mantenimiento_trabajos FOR ALL TO authenticated USING (true) WITH CHECK (true);
