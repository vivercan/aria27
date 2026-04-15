/**
 * src/lib/env-check.ts — Validación de variables de entorno al arranque.
 *
 * Se importa desde instrumentation.ts (Next.js hook) para que cualquier
 * variable CRÍTICA faltante rompa el build/start inmediatamente en vez de
 * fallar silenciosamente en runtime.
 *
 * Variables opcionales se loguean como WARNING sin abortar.
 */

/* ------------------------------------------------------------------ */
/*  Definición de variables esperadas                                  */
/* ------------------------------------------------------------------ */

interface EnvVar {
  name: string;
  required: boolean;
  /** Descripción corta para el log de error */
  purpose: string;
}

const ENV_VARS: EnvVar[] = [
  // Supabase — requeridos siempre
  { name: "NEXT_PUBLIC_SUPABASE_URL", required: true, purpose: "Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true, purpose: "Supabase anon/public key" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", required: true, purpose: "Supabase service role (server-side)" },

  // Resend — email transaccional
  { name: "RESEND_API_KEY", required: true, purpose: "Resend API key para correos" },

  // WhatsApp Meta API
  { name: "WHATSAPP_ACCESS_TOKEN", required: true, purpose: "Meta WhatsApp access token" },
  { name: "WHATSAPP_PHONE_ID", required: true, purpose: "Meta WhatsApp phone number ID" },
  { name: "META_APP_SECRET", required: true, purpose: "Meta app secret para verificación webhook HMAC" },

  // Opcionales con fallback
  { name: "ADMIN_EMAIL", required: false, purpose: "Email admin (fallback: juanviverosv@gmail.com)" },
  { name: "ADMIN_WHATSAPP_PHONE", required: false, purpose: "WhatsApp admin para alertas y notificaciones" },
  { name: "NEXT_PUBLIC_BASE_URL", required: false, purpose: "URL base (fallback: https://aria.jjcrm27.com)" },
  { name: "NEXT_PUBLIC_SITE_URL", required: false, purpose: "URL pública del sitio para links en emails/WA" },
  { name: "ANTHROPIC_API_KEY", required: false, purpose: "Claude AI para búsqueda inteligente y análisis" },
  { name: "OPENAI_API_KEY", required: false, purpose: "OpenAI para AI asistente" },
  { name: "BACKUP_TOKEN", required: false, purpose: "Token para cron de backup" },
  { name: "DIGEST_TOKEN", required: false, purpose: "Token para cron de digest diario" },
];

/* ------------------------------------------------------------------ */
/*  Validación                                                         */
/* ------------------------------------------------------------------ */

export function checkEnvVars(): { ok: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_VARS) {
    const value = process.env[v.name];
    if (!value || value.trim() === "") {
      if (v.required) {
        missing.push(`❌ ${v.name} — ${v.purpose}`);
      } else {
        warnings.push(`⚠️ ${v.name} — ${v.purpose}`);
      }
    }
  }

  return { ok: missing.length === 0, missing, warnings };
}

/**
 * Ejecuta la validación y loguea resultados.
 * En producción, lanza error si faltan variables requeridas.
 * En desarrollo, solo advierte.
 */
export function validateEnvOrThrow(): void {
  const { ok, missing, warnings } = checkEnvVars();

  if (warnings.length > 0) {
    console.warn(`[env-check] Variables opcionales no configuradas:\n${warnings.join("\n")}`);
  }

  if (!ok) {
    const msg = `[env-check] Variables REQUERIDAS faltantes:\n${missing.join("\n")}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    } else {
      // En dev, advertir sin romper (permite trabajar sin todas las keys)
      console.warn(msg);
    }
  }
}
