-- FIX 541.1 · 24-Jun-2026 · ARIA27 server-side opaque session
-- ADITIVA · REVERSIBLE · NO DESTRUCTIVA (no toca tablas existentes)
-- Rollback: migrations/2026-06-24-fix-541-auth-sessions.rollback.sql

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  -- Identidad estable: snapshot. Resolver Users por user_id si existe, fallback a email.
  user_id BIGINT,                       -- FK lógica a public.users.id BIGINT (no enforced para permitir users sin auth)
  user_email TEXT NOT NULL,           -- snapshot del email al login; canonical en users.email
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  user_agent_hash TEXT,
  created_ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS auth_sessions_token_hash_idx ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS auth_sessions_user_email_idx ON auth_sessions(user_email);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS auth_sessions_active_idx ON auth_sessions(expires_at) WHERE revoked_at IS NULL;

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
-- No policies = anon/authenticated bloqueados. service_role bypassea RLS = OK.
GRANT SELECT, INSERT, UPDATE ON auth_sessions TO service_role;
REVOKE ALL ON auth_sessions FROM anon, authenticated, public;

COMMENT ON TABLE auth_sessions IS 'FIX 541 · Sesiones opacas ARIA27. token_hash = SHA-256(token). Token raw solo en cookie. Acceso server-side via service_role.';
COMMENT ON COLUMN auth_sessions.user_id IS 'FK lógica a public.users.id si está disponible. Identidad estable (email puede cambiar).';
COMMENT ON COLUMN auth_sessions.user_email IS 'Snapshot del email al login. Canonical en public.users.email.';
