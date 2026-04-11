-- ============================================================
-- ARIA27 P0 HARDENING v2 — 2026-04-07
-- Corregido tras evidencia viva: por_pagar fantasma, buckets
-- con IDs falsos, audit_log preexistente, exec_audit_sql vivo.
-- Ejecutar BLOQUE POR BLOQUE en Supabase SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- BLOQUE 0: SNAPSHOT + DESCUBRIMIENTO (solo lectura, no muta)
-- ------------------------------------------------------------
-- 0.1 Policies abiertas actuales
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname='public' AND qual='true' AND cmd='ALL' AND 'public'=ANY(roles);

-- 0.2 Buckets REALES en prod
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
ORDER BY id;

-- 0.3 audit_log preexistente
SELECT to_regclass('public.audit_log') AS audit_log_exists,
       (SELECT count(*) FROM public.audit_log) AS audit_log_rows;

-- 0.4 exec_audit_sql vivo
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.proname='exec_audit_sql';

-- 0.5 Tablas reales del array de triggers
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN ('requisitions','quotations','purchase_orders','nominas',
                     'employees','gastos','solicitudes_vacaciones','incapacidades',
                     'prestamos','users');

-- ------------------------------------------------------------
-- BLOQUE 1: Drop policies abiertas + service-role-only en sensibles
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public' AND qual='true' AND cmd='ALL' AND 'public'=ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped open policy: %.% / %', r.schemaname, r.tablename, r.policyname;
  END LOOP;
END $$;

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
-- BLOQUE 2: RLS LOCKDOWN GLOBAL — INTENCIONALMENTE COMENTADO
-- Activar SOLO después de Fase 2 (migrar APIs a getSupabaseAdmin)
-- ------------------------------------------------------------
-- DO $$ DECLARE r RECORD; BEGIN
--   FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false LOOP
--     EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
--     EXECUTE format('CREATE POLICY service_only ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', r.tablename);
--   END LOOP;
-- END $$;

-- ------------------------------------------------------------
-- BLOQUE 3: Privatizar TODOS los buckets públicos (dinámico)
-- ------------------------------------------------------------
DO $$
DECLARE b RECORD;
BEGIN
  FOR b IN SELECT id FROM storage.buckets WHERE public = true LOOP
    UPDATE storage.buckets
    SET public = false,
        file_size_limit = COALESCE(file_size_limit, 26214400),
        allowed_mime_types = COALESCE(allowed_mime_types, ARRAY[
          'application/pdf','image/jpeg','image/png','image/webp',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ])
    WHERE id = b.id;
    RAISE NOTICE 'Privatizado bucket: %', b.id;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- BLOQUE 4: Eliminar backdoor exec_audit_sql (con REVOKE defensivo)
-- ------------------------------------------------------------
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT format('public.exec_audit_sql(%s)', pg_get_function_identity_arguments(oid)) AS sig
    FROM pg_proc WHERE proname='exec_audit_sql' AND pronamespace='public'::regnamespace
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.sig);
    EXECUTE format('DROP FUNCTION IF EXISTS %s', p.sig);
    RAISE NOTICE 'Drop exec_audit_sql signature: %', p.sig;
  END LOOP;
END $$;

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
-- BLOQUE 6: audit_log + trigger genérico (idempotente, NO duplica)
-- audit_log YA EXISTE en prod (vacía) — IF NOT EXISTS la respeta.
-- ------------------------------------------------------------
DO $$ BEGIN
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    RAISE NOTICE 'audit_log ya existe, conservando datos previos';
  END IF;
END $$;

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
  IF TG_OP='INSERT' THEN
    INSERT INTO public.audit_log(table_name,op,row_pk,actor,after)
    VALUES (TG_TABLE_NAME,'INSERT',(to_jsonb(NEW)->>'id'),actor,to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    INSERT INTO public.audit_log(table_name,op,row_pk,actor,before,after)
    VALUES (TG_TABLE_NAME,'UPDATE',(to_jsonb(NEW)->>'id'),actor,to_jsonb(OLD),to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    INSERT INTO public.audit_log(table_name,op,row_pk,actor,before)
    VALUES (TG_TABLE_NAME,'DELETE',(to_jsonb(OLD)->>'id'),actor,to_jsonb(OLD));
    RETURN OLD;
  END IF;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Array CORREGIDO: por_pagar removido (PGRST205, no existe en prod)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'requisitions','quotations','purchase_orders','nominas','employees',
    'gastos','solicitudes_vacaciones','incapacidades','prestamos','users'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS aria27_audit ON public.%I', t);
      EXECUTE format('CREATE TRIGGER aria27_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.aria27_audit_trigger()', t);
      RAISE NOTICE 'Trigger aria27_audit instalado en %', t;
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- BLOQUE 7: VERIFICACIÓN FINAL
-- ------------------------------------------------------------
SELECT count(*) AS open_policies_left
FROM pg_policies WHERE schemaname='public' AND qual='true' AND cmd='ALL' AND 'public'=ANY(roles);
-- esperado: 0

SELECT id, public FROM storage.buckets WHERE public = true;
-- esperado: 0 filas

SELECT count(*) AS exec_audit_sql_remaining FROM pg_proc WHERE proname='exec_audit_sql';
-- esperado: 0

SELECT count(*) AS aria27_audit_triggers FROM information_schema.triggers WHERE trigger_name='aria27_audit';
-- esperado: hasta 10

SELECT to_regclass('public.audit_log') AS audit_log, to_regclass('public.auth_attempts') AS auth_attempts;
-- esperado: ambas no nulas
