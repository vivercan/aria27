-- 24-Abr-2026 Synthetic Monitoring + Continuous Auditing
-- Tabla principal de bitacora de cada corrida del cron de monitoreo.
-- Una fila por check, varias filas por corrida (run_id las agrupa).

CREATE TABLE IF NOT EXISTS public.monitoring_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid        NOT NULL,
  category      text        NOT NULL,    -- HEALTH | SMOKE_CRUD | CONTRACT | PEN_TEST | ENV
  check_name    text        NOT NULL,    -- ej. "db:supabase", "smoke:requisitions_insert"
  status        text        NOT NULL,    -- ok | warn | error
  message       text,
  duration_ms   integer,
  details       jsonb,                   -- payload arbitrario
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mon_log_run     ON public.monitoring_log(run_id);
CREATE INDEX IF NOT EXISTS idx_mon_log_created ON public.monitoring_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mon_log_status  ON public.monitoring_log(status) WHERE status <> 'ok';
CREATE INDEX IF NOT EXISTS idx_mon_log_cat     ON public.monitoring_log(category, created_at DESC);

COMMENT ON TABLE public.monitoring_log IS
  'Bitacora del synthetic monitoring (cada 2 min). 5 categorias: HEALTH, SMOKE_CRUD, CONTRACT, PEN_TEST, ENV. 24-Abr-2026.';

-- Tabla auxiliar para smoke CRUD (escribir/borrar sin ensuciar tablas reales)
CREATE TABLE IF NOT EXISTS public._synthetic_smoke (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payload     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public._synthetic_smoke IS
  'Tabla efimera para que el synthetic monitor pruebe INSERT/DELETE. NO usar para datos reales.';
