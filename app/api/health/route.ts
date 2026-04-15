import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const log = logger("HEALTH");

// ---------------------------------------------------------------------------
// /api/health — Chequeo integral del sistema ARIA27
// Verifica: env vars críticas, combinaciones peligrosas, DB, Storage
// Retorna JSON con status general y detalle por componente
// GET público — no expone valores, solo presencia/ausencia
// ---------------------------------------------------------------------------

interface HealthCheck {
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
}

export async function GET(_req: NextRequest) {
  const checks: HealthCheck[] = [];
  const startMs = Date.now();

  // ── 1. ENV VARS CRÍTICAS ────────────────────────────────────────────

  const requiredEnvs: { key: string; label: string }[] = [
    { key: "NEXT_PUBLIC_SUPABASE_URL",        label: "Supabase URL" },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",   label: "Supabase Anon Key" },
    { key: "SUPABASE_SERVICE_ROLE_KEY",        label: "Supabase Service Role" },
    { key: "WHATSAPP_ACCESS_TOKEN",            label: "WhatsApp Token" },
    { key: "WHATSAPP_PHONE_ID",                label: "WhatsApp Phone ID" },
    { key: "ANTHROPIC_API_KEY",                label: "Anthropic API Key" },
    { key: "RESEND_API_KEY",                   label: "Resend API Key" },
  ];

  for (const { key, label } of requiredEnvs) {
    const present = !!process.env[key];
    checks.push({
      name: `env:${key}`,
      status: present ? "ok" : "error",
      message: present ? `${label} presente` : `🔴 ${label} AUSENTE — funcionalidad degradada`,
    });
  }

  // CRON_SECRET / BACKUP_TOKEN — cualquiera es válido para crons y backup
  const hasCronAuth = !!(process.env.CRON_SECRET || process.env.BACKUP_TOKEN);
  checks.push({
    name: "env:CRON_AUTH",
    status: hasCronAuth ? "ok" : "error",
    message: hasCronAuth
      ? `Cron auth presente (${process.env.CRON_SECRET ? "CRON_SECRET" : "BACKUP_TOKEN"})`
      : "🔴 CRON_SECRET y BACKUP_TOKEN ausentes — crons y backup sin protección",
  });

  // ── 2. COMBINACIONES PELIGROSAS ───────────────────────────────────────────

  // Verificación HMAC Meta + URL token fallback
  const hasMetaSecret    = !!process.env.META_APP_SECRET;
  const hasWebhookToken  = !!process.env.WEBHOOK_URL_TOKEN;
  const hasHmacBypass    = process.env.DISABLE_WEBHOOK_HMAC === "true";

  if (hasHmacBypass) {
    checks.push({
      name: "combo:HMAC_BYPASS_ACTIVE",
      status: "warn",
      message: "⚠️ DISABLE_WEBHOOK_HMAC=true sigue activo — ya no es necesario, elimínalo de Vercel env vars",
    });
  } else if (hasMetaSecret && hasWebhookToken) {
    checks.push({
      name: "combo:HMAC",
      status: "ok",
      message: "✅ Auth webhook doble capa: HMAC (Meta) + URL token fallback activos",
    });
  } else if (hasMetaSecret && !hasWebhookToken) {
    checks.push({
      name: "combo:WEBHOOK_TOKEN_MISSING",
      status: "warn",
      message: "⚠️ META_APP_SECRET activo pero WEBHOOK_URL_TOKEN ausente — agrega a Vercel + URL Meta webhook",
    });
  } else {
    checks.push({
      name: "combo:HMAC",
      status: "ok",
      message: "HMAC: sin META_APP_SECRET — modo sin verificación de firma (aceptable en dev)",
    });
  }

  // BACKUP_TOKEN ausente → backup expuesto
  if (!process.env.BACKUP_TOKEN && !process.env.CRON_SECRET) {
    checks.push({
      name: "combo:BACKUP_UNPROTECTED",
      status: "error",
      message: "🔴 BACKUP_TOKEN y CRON_SECRET ausentes — endpoint /api/backup/snapshot sin protección",
    });
  }

  // ── 3. DB CONNECTIVITY ────────────────────────────────────────────────
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("employees").select("id").limit(1);
    checks.push({
      name: "db:supabase",
      status: error ? "error" : "ok",
      message: error
        ? `🔴 DB error: ${error.message}`
        : "Supabase DB responde correctamente",
    });
  } catch (err: unknown) {
    checks.push({
      name: "db:supabase",
      status: "error",
      message: `🔴 DB exception: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // ── 4. STORAGE CONNECTIVITY ────────────────────────────────────────────
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.storage.listBuckets();
    checks.push({
      name: "storage:supabase",
      status: error ? "warn" : "ok",
      message: error
        ? `⚠️ Storage warning: ${error.message}`
        : "Supabase Storage responde correctamente",
    });
  } catch (err: unknown) {
    checks.push({
      name: "storage:supabase",
      status: "warn",
      message: `⚠️ Storage exception: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // ── 5. WHATSAPP PHONE ID ──────────────────────────────────────────────
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const expectedPhoneId = "963627606824867";
  if (phoneId && phoneId !== expectedPhoneId) {
    checks.push({
      name: "whatsapp:phone_id",
      status: "error",
      message: `🔴 WHATSAPP_PHONE_ID incorrecto (${phoneId}) — debe ser ${expectedPhoneId} (JJCRM27 WABA)`,
    });
  } else if (phoneId === expectedPhoneId) {
    checks.push({
      name: "whatsapp:phone_id",
      status: "ok",
      message: "WhatsApp Phone ID correcto (JJCRM27 WABA)",
    });
  }

  // ── RESULTADO FINAL ───────────────────────────────────────────────────
  const errors = checks.filter(c => c.status === "error");
  const warns  = checks.filter(c => c.status === "warn");
  const overall = errors.length > 0 ? "error" : warns.length > 0 ? "warn" : "ok";

  const elapsedMs = Date.now() - startMs;
  const nowCST = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const timestamp = nowCST.toISOString().replace("T", " ").substring(0, 19) + " CST";

  if (overall !== "ok") {
    log.warn("Health check degradado", { overall, errors: errors.length, warns: warns.length });
  }

  return NextResponse.json(
    {
      status: overall,
      timestamp,
      elapsed_ms: elapsedMs,
      summary: {
        total: checks.length,
        ok:    checks.filter(c => c.status === "ok").length,
        warn:  warns.length,
        error: errors.length,
      },
      checks,
    },
    { status: overall === "error" ? 503 : 200 }
  );
}
