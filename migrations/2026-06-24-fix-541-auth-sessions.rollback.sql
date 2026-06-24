-- ROLLBACK FIX 541.1
-- Pre-condición: ninguna sesión activa creada por requireUser strict (de lo contrario, todos pierden auth)
DROP TABLE IF EXISTS auth_sessions CASCADE;
