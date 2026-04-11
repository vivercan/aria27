-- ============================================================
-- ARIA27 P0 HARDENING SCRIPT
-- Generado: 2026-04-07
-- Idempotente y reversible (excepto bloque 2 lockdown que esta comentado)
-- Ejecutar BLOQUE POR BLOQUE en Supabase SQL Editor con snapshot previo.
-- ============================================================

-- ------------------------------------------------------------
-- BLOQUE 1: Drop policies abiertas (qual=true cmd=ALL roles=public)
-- y recrear como service_role only en tablas sensibles
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND qual = 'true'
      AND cmd = 'ALL'
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped open policy: %.% / %', r.schemaname, r.tablename, r.policyname;
  END LOOP;
END $$;

-- Service-role-only en tablas criticas
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['deleted_records','documentos_plantilla','propuestas_licitacion','ordenes_formato'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS service_only ON public.%I', t);
      EXECUTE format('CREATE POLICY service_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- BLOQUE 2: RLS LOCKDOWN GLOBAL (COMENTADO)
-- Activar SOLO despues de migrar todas las APIs a usar supabaseAdmin
-- (de lo contrario rompera el frontend que aun usa anon key)
-- ------------------------------------------------------------
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false LOOP
--     EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
--     EXECUTE format('CREATE POLICY service_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', r.tablename);
--   END LOOP;
-- END $$;

-- ------------------------------------------------------------
-- BLOQUE 3: Privatizar buckets + limites mime/size
-- ------------------------------------------------------------
UPDATE storage.buckets
SET public = false,
    file_size_limit = 26214400,  -- 25 MB
    allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
WHERE id IN ('alta-documentos','expedientes');

-- ------------------------------------------------------------
-- BLOQUE 4: Eliminar backdoor exec_audit_sql
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.exec_audit_sql(text);

-- ------------------------------------------------------------
-- BLOQUE 5: Brute-force tracker persistente
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  ip TEXT,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_email_time ON public.auth_attempts(email, attempted_at DESC);
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_only ON public.auth_attempts;
CREATE POLICY service_only ON public.auth_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- BLOQUE 6: Audit log + trigger generico
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  op TEXT NOT NULL,
  row_pk TEXT,
  actor TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  before JSONB,
  after JSONB
);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_time ON public.audit_log(table_name, changed_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_only ON public.audit_log;
CREATE POLICY service_only ON public.audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.aria27_audit_trigger() RETURNS TRIGGER AS $$
DECLARE actor TEXT;
BEGIN
  actor := coalesce(current_setting('request.header.x-aria-actor', true), 'system');
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(table_name, op, row_pk, actor, after)
    VALUES (TG_TABLE_NAME, 'INSERT', (to_jsonb(NEW)->>'id'), actor, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log(table_name, op, row_pk, actor, before, after)
    VALUES (TG_TABLE_NAME, 'UPDATE', (to_jsonb(NEW)->>'id'), actor, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log(table_name, op, row_pk, actor, before)
    VALUES (TG_TABLE_NAME, 'DELETE', (to_jsonb(OLD)->>'id'), actor, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['requisitions','quotations','purchase_orders','nominas','employees','gastos','por_pagar','solicitudes_vacaciones','incapacidades','prestamos','users'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS aria27_audit ON public.%I', t);
      EXECUTE format('CREATE TRIGGER aria27_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aria27_audit_trigger()', t);
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- BLOQUE 7: Verificacion
-- ------------------------------------------------------------
-- SELECT count(*) FROM pg_policies WHERE schemaname='public' AND qual='true' AND cmd='ALL' AND 'public' = ANY(roles);  -- esperado: 0
-- SELECT id, public, file_size_limit FROM storage.buckets WHERE id IN ('alta-documentos','expedientes');               -- esperado: public=false
-- SELECT proname FROM pg_proc WHERE proname='exec_audit_sql';                                                          -- esperado: 0 filas
-- SELECT count(*) FROM information_schema.triggers WHERE trigger_name='aria27_audit';                                  -- esperado: 11 (o menos si tablas no existen)
