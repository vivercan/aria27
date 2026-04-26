-- 25-Abr-2026 P-15: cifrar portales_credenciales.password con pgcrypto.
-- Requiere PORTALES_CRYPTO_KEY en Vercel env vars (PORTALES_CRYPTO_KEY=<32-char-hex>).
-- NOTA: en Supabase pgcrypto vive en schema "extensions". search_path debe incluirlo.

-- 1) pgcrypto disponible
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Columna nueva password_enc bytea (encriptada)
ALTER TABLE public.portales_credenciales
  ADD COLUMN IF NOT EXISTS password_enc bytea;

-- 3) RPC para descifrar (la key se pasa por argumento, NUNCA se almacena en DB)
CREATE OR REPLACE FUNCTION public.decrypt_portal_password(p_id uuid, p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  enc_data bytea;
  decrypted text;
BEGIN
  SELECT password_enc INTO enc_data
  FROM public.portales_credenciales
  WHERE id = p_id AND activo = true;
  IF enc_data IS NULL THEN
    RETURN NULL;
  END IF;
  decrypted := extensions.pgp_sym_decrypt(enc_data, p_key);
  RETURN decrypted;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.decrypt_portal_password(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrypt_portal_password(uuid, text) TO service_role;

COMMENT ON FUNCTION public.decrypt_portal_password IS
  'Descifra password_enc con la KEY pasada como argumento. Solo accesible por service_role. P-15 25-Abr-2026.';

-- 4) Migracion: cifrar passwords existentes
-- Sustituir AQUI_PEGAR_KEY por el valor real al ejecutar:
UPDATE public.portales_credenciales
SET password_enc = extensions.pgp_sym_encrypt(password, 'AQUI_PEGAR_KEY')
WHERE password_enc IS NULL AND password IS NOT NULL;

-- 5) Verificacion
SELECT empresa, rfc,
       (password IS NOT NULL) AS has_plain,
       (password_enc IS NOT NULL) AS has_enc,
       octet_length(password_enc) AS enc_bytes
FROM public.portales_credenciales
ORDER BY empresa;

-- 6) (DESPUES DE confirmar funciona el endpoint con descifrado): drop password texto plano
-- ALTER TABLE public.portales_credenciales DROP COLUMN password;

