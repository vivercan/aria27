-- scripts/email-log-ddl.sql
-- PR feat/email-flow-canon 23-Abr-2026 — Claude
-- Tabla de auditoria de correos transaccionales (analoga a wa_log).
-- Ejecutar via Chrome MCP en Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.email_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template      text        NOT NULL,
  to_email      text        NOT NULL,
  subject       text,
  body_preview  text,
  success       boolean     NOT NULL DEFAULT false,
  message_id    text,
  error         text,
  origen        text,
  enviado_por   text,
  reply_to      text,
  bcc           text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON public.email_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_template    ON public.email_log(template);
CREATE INDEX IF NOT EXISTS idx_email_log_to_email    ON public.email_log(to_email);
CREATE INDEX IF NOT EXISTS idx_email_log_success     ON public.email_log(success);

COMMENT ON TABLE public.email_log IS
  'Auditoria de envios de correo transaccional via Resend. Analoga a wa_log. PR feat/email-flow-canon 23-Abr-2026.';

-- Smoke (opcional, descomentar):
-- INSERT INTO public.email_log (template, to_email, subject, success, origen, enviado_por)
-- VALUES ('smoke', 'smoke@example.com', '[SMOKE] email_log DDL', true, 'ddl-smoke', 'claude');
-- SELECT count(*) FROM public.email_log WHERE template = 'smoke';
-- DELETE FROM public.email_log WHERE template = 'smoke';
