-- ARIA27 — Apartado COMBUSTIBLES dedicado
-- Pedido Daisy 04-Jun-2026
-- Ejecutar UNA vez en Supabase SQL Editor: https://supabase.com/dashboard/project/yhylkvpynzyorqortbkk/sql

CREATE TABLE IF NOT EXISTS public.equipo_combustible (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL,
  tipo_combustible text NOT NULL CHECK (tipo_combustible IN ('DIESEL','MAGNA','PREMIUM')),
  consumo_estandar_litros numeric(10,2) DEFAULT 0,
  numero_serie text,
  placas text,
  numero_economico text,
  marca text,
  modelo text,
  operador_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  notas text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.equipo_combustible_obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id uuid NOT NULL REFERENCES public.equipo_combustible(id) ON DELETE CASCADE,
  centro_trabajo_id uuid NOT NULL REFERENCES public.centros_trabajo(id) ON DELETE CASCADE,
  fecha_asignacion date DEFAULT CURRENT_DATE,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (equipo_id, centro_trabajo_id)
);

CREATE TABLE IF NOT EXISTS public.combustible_cargas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  equipo_id uuid REFERENCES public.equipo_combustible(id) ON DELETE SET NULL,
  equipo_alias_snapshot text,
  tipo_combustible text NOT NULL CHECK (tipo_combustible IN ('DIESEL','MAGNA','PREMIUM')),
  litros_solicitados numeric(10,2) NOT NULL DEFAULT 0,
  litros_cargados_reales numeric(10,2),
  precio_litro_estimado numeric(10,2),
  total_estimado numeric(12,2),
  horometro_lectura numeric(12,2),
  horometro_foto_url text,
  ticket_foto_url text,
  operador_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  notas text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_requisition ON public.combustible_cargas(requisition_id);
CREATE INDEX IF NOT EXISTS idx_cc_equipo ON public.combustible_cargas(equipo_id);
CREATE INDEX IF NOT EXISTS idx_eqobras_obra ON public.equipo_combustible_obras(centro_trabajo_id, activo);
CREATE INDEX IF NOT EXISTS idx_eq_activo ON public.equipo_combustible(activo);

ALTER TABLE public.equipo_combustible DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipo_combustible_obras DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.combustible_cargas DISABLE ROW LEVEL SECURITY;

-- Bucket Storage para fotos de horometros (publico, lectura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('horometros', 'horometros', true)
ON CONFLICT (id) DO NOTHING;

-- Policy storage: cualquier usuario autenticado puede subir
DROP POLICY IF EXISTS "horometros_anyone_upload" ON storage.objects;
CREATE POLICY "horometros_anyone_upload" ON storage.objects
FOR INSERT TO public WITH CHECK (bucket_id = 'horometros');

DROP POLICY IF EXISTS "horometros_anyone_read" ON storage.objects;
CREATE POLICY "horometros_anyone_read" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'horometros');
