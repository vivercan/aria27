-- FIX 541.1 · 24-Jun-2026 · ARIA27 server-side session (opaque, NO JWT)
-- Reverso: DROP TABLE auth_sessions CASCADE;
--          DROP INDEX IF EXISTS auth_sessions_token_hash_idx, auth_sessions_user_email_idx;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at) WHERE revoked_at IS NULL;

-- RLS estricta: NADIE puede leer/escribir directo (solo via service_role server-side)
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
-- No policies = nadie con anon/authenticated puede acceder. service_role bypass = OK.

GRANT SELECT, INSERT, UPDATE ON auth_sessions TO service_role;
REVOKE ALL ON auth_sessions FROM anon, authenticated;

-- Cleanup periódico: cron job opcional para borrar sesiones >7 días expiradas
-- DELETE FROM auth_sessions WHERE expires_at < now() - interval '7 days';

COMMENT ON TABLE auth_sessions IS 'FIX 541 · Sesiones opacas ARIA27. Token original solo en cookie HttpOnly. SHA-256 del token en token_hash. Acceso exclusivamente server-side via service_role.';
