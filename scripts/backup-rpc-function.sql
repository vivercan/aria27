-- Función RPC para listar todas las tablas base del esquema public.
-- Excluye VIEWs, tablas de sistema y la propia tabla de backups metadata.
-- Llamar con: supabase.rpc('list_backup_tables')

CREATE OR REPLACE FUNCTION public.list_backup_tables()
RETURNS TABLE(table_name text, row_estimate bigint) AS $$
  SELECT
    t.table_name::text,
    COALESCE(s.n_live_tup, 0)::bigint AS row_estimate
  FROM information_schema.tables t
  LEFT JOIN pg_stat_user_tables s
    ON s.schemaname = 'public' AND s.relname = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'pg_%'
    AND t.table_name NOT IN ('schema_migrations', 'supabase_migrations')
  ORDER BY t.table_name;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Permitir invocación desde service_role (backup cron)
GRANT EXECUTE ON FUNCTION public.list_backup_tables() TO service_role;
