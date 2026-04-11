/**
 * Validación de variables de entorno al arrancar el servidor.
 * Se importa desde instrumentation.ts (Next.js hook de startup).
 *
 * Niveles:
 *  - CRITICAL: sin ellas el sistema no funciona (throw)
 *  - WARN: features degradadas pero el sistema arranca (console.warn)
 */

/* eslint-disable no-console */

interface EnvVar {
  name: string;
  level: "critical" | "warn";
  description: string;
}

const SERVER_VARS: EnvVar[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", level: "critical", description: "Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", level: "critical", description: "Supabase anon key" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", level: "critical", description: "Supabase admin key" },
  { name: "RESEND_API_KEY", level: "warn", description: "Resend email API key" },
  { name: "WHATSAPP_ACCESS_TOKEN", level: "warn", description: "Meta WhatsApp token" },
  { name: "WHATSAPP_PHONE_ID", level: "warn", description: "Meta WhatsApp phone ID" },
  { name: "META_APP_SECRET", level: "warn", description: "Meta App Secret para HMAC" },
  { name: "DIGEST_TOKEN", level: "warn", description: "Token protección cron digest" },
  { name: "BACKUP_TOKEN", level: "warn", description: "Token protección cron backup" },
  { name: "WEBHOOK_VERIFY_TOKEN", level: "warn", description: "Token verificación webhook" },
];

export function checkEnvVars(): void {
  if (typeof window !== "undefined") return; // Solo servidor

  const missing: { critical: string[]; warn: string[] } = { critical: [], warn: [] };

  for (const v of SERVER_VARS) {
    const val = process.env[v.name];
    if (!val || val.trim() === "") {
      missing[v.level].push(`  ${v.name} — ${v.description}`);
    }
  }

  if (missing.warn.length > 0) {
    console.warn(
      `\n⚠️  [ARIA27] Variables de entorno faltantes (features degradadas):\n${missing.warn.join("\n")}\n`
    );
  }

  if (missing.critical.length > 0) {
    const msg = `\n🚨 [ARIA27] Variables de entorno CRÍTICAS faltantes:\n${missing.critical.join("\n")}\n`;
    console.error(msg);
    // En producción no hacemos throw para no romper el build.
    // Solo advertencia fuerte.
    if (process.env.NODE_ENV === "production") {
      console.error("⛔ El sistema NO funcionará correctamente sin estas variables.");
    }
  }
}
