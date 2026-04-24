-- scripts/portales-credenciales-ddl.sql
-- 24-Abr-2026: Modulo portales facturacion Blikon (3 empresas RFC distintas).
-- Tabla de credenciales + tabla de audit log.
-- Ejecutar en Supabase SQL editor con "Run without RLS" (consistente con proyecto).

-- 1) Tabla de credenciales
CREATE TABLE IF NOT EXISTS public.portales_credenciales (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_key    text        NOT NULL,           -- ej: "blikon"
  portal_nombre text        NOT NULL,           -- ej: "Blikon CFDI 3.3"
  portal_url    text        NOT NULL,           -- ej: "https://fel.blikon.com/CFDI33FP/Presentacion/Usuario/Ingreso.aspx?v2"
  empresa       text        NOT NULL,           -- AVANTE / DENIVEL / TERRACRET
  rfc           text        NOT NULL,
  usuario       text        NOT NULL,
  password      text        NOT NULL,           -- texto plano; acceso restringido por endpoint + audit
  pin           text,
  notas         text,
  activo        boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portal_key, empresa)
);

CREATE INDEX IF NOT EXISTS idx_portales_cred_portal ON public.portales_credenciales(portal_key);
CREATE INDEX IF NOT EXISTS idx_portales_cred_empresa ON public.portales_credenciales(empresa);

COMMENT ON TABLE public.portales_credenciales IS
  'Credenciales de acceso a portales externos (CFDI Blikon, SAT, etc). Acceso restringido a roles admin/compras/direccion via endpoint /api/portales-credenciales con audit log. 24-Abr-2026.';

-- 2) Tabla de audit log (quien accede, cuando, a que portal)
CREATE TABLE IF NOT EXISTS public.portales_accesos_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  credencial_id uuid        REFERENCES public.portales_credenciales(id) ON DELETE SET NULL,
  portal_key    text,
  empresa       text,
  user_email    text        NOT NULL,
  accion        text        NOT NULL,           -- 'VIEW_LIST' | 'VIEW_PASSWORD' | 'COPY_PASSWORD'
  ip            text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portales_log_created_at ON public.portales_accesos_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portales_log_user ON public.portales_accesos_log(user_email);
CREATE INDEX IF NOT EXISTS idx_portales_log_portal ON public.portales_accesos_log(portal_key);

COMMENT ON TABLE public.portales_accesos_log IS
  'Auditoria de consultas a credenciales de portales externos.';

-- 3) Seed: 3 empresas del grupo (ARIA27 24-Abr-2026 WhatsApp Compras)
INSERT INTO public.portales_credenciales (portal_key, portal_nombre, portal_url, empresa, rfc, usuario, password, pin, notas)
VALUES
  ('blikon', 'Blikon CFDI 3.3',
   'https://fel.blikon.com/CFDI33FP/Presentacion/Usuario/Ingreso.aspx?v2',
   'AVANTE', 'GCU141009RZ9', 'GCU141009RZ9', 'Avante@1235', '12345',
   'Avante - RFC Grupo Constructor Urbano Avante.'),
  ('blikon', 'Blikon CFDI 3.3',
   'https://fel.blikon.com/CFDI33FP/Presentacion/Usuario/Ingreso.aspx?v2',
   'DENIVEL', 'DCC210416PR9', 'DCC210416PR9', 'Denivel$2024', '123456',
   'Denivel.'),
  ('blikon', 'Blikon CFDI 3.3',
   'https://fel.blikon.com/CFDI33FP/Presentacion/Usuario/Ingreso.aspx?v2',
   'TERRACRET', 'TCO210416R6A', 'TCO210416R6A', 'Terracret654$', '123456',
   'Terracret.')
ON CONFLICT (portal_key, empresa) DO UPDATE SET
  usuario = EXCLUDED.usuario,
  password = EXCLUDED.password,
  pin = EXCLUDED.pin,
  portal_url = EXCLUDED.portal_url,
  updated_at = now();

-- Verificacion
SELECT empresa, rfc, usuario, LEFT(password, 3) || '***' AS password_mask, pin, portal_url
FROM public.portales_credenciales
WHERE portal_key = 'blikon'
ORDER BY empresa;
