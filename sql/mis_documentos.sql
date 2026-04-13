-- ============================================================
-- MIS DOCUMENTOS â Tabla de metadatos + columna password en users
-- MÃ³dulo: Talento > Mis Documentos
-- Fecha: 2026-04-12
-- ============================================================

-- 1. Tabla principal de archivos
CREATE TABLE IF NOT EXISTS mis_documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,           -- FK a auth.users o users.id (SYSTEM_UUID 00000000-... para PÃºblica)
  owner_name TEXT NOT NULL,              -- nombre display del dueÃ±o ("PÃºblica" para carpeta pÃºblica)
  folder_type TEXT NOT NULL CHECK (folder_type IN ('compartidos', 'privados', 'publica')),
  parent_path TEXT NOT NULL DEFAULT '/', -- ruta relativa dentro de la carpeta (/ = raÃ­z)
  nombre TEXT NOT NULL,                  -- nombre del archivo
  tipo TEXT,                             -- extensiÃ³n/mime
  url TEXT NOT NULL,                     -- public URL en Storage
  size_bytes BIGINT DEFAULT 0,
  uploaded_by TEXT,                      -- email de quien subiÃ³
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ãndices
CREATE INDEX IF NOT EXISTS idx_mis_documentos_owner ON mis_documentos(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_mis_documentos_folder ON mis_documentos(owner_user_id, folder_type, parent_path);

-- 2. Columna de contraseÃ±a para carpeta privada en users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'private_folder_pin'
  ) THEN
    ALTER TABLE users ADD COLUMN private_folder_pin TEXT DEFAULT '1234';
  END IF;
END $$;

-- 3. RLS
ALTER TABLE mis_documentos ENABLE ROW LEVEL SECURITY;

-- Admin ve todo
DROP POLICY IF EXISTS "mis_documentos_admin_all" ON mis_documentos;
CREATE POLICY "mis_documentos_admin_all" ON mis_documentos
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE mis_documentos IS 'Archivos personales de cada usuario del sistema (Compartidos + Privados + PÃºblica)';
