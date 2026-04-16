import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { sendWhatsAppText } from "@/lib/whatsapp";

const log = logger("HEALTH-MONITOR");

// ---------------------------------------------------------------------------
// /api/cron/health-monitor — Cron cada 15 minutos
// Llama a /api/health y si detecta errores críticos manda alerta WhatsApp a JJ.
// Schedule: "*/15 * * * *"  (cada 15 min, 24/7)
// Protegido por CRON_SECRET igual que el backup
// ---------------------------------------------------------------------------

const ADMIN_PHONE = process.env.ADMIN_WHATSAPP_PHONE || "5218112392266";
const SITE_URL    = process.env.NEXT_PUBLIC_SITE_URL || "https://aria.jjcrm27.com";

// Solo alertar por estas categorías críticas (no queremos spam por warns menores)
const CRITICAL_CHECK_NAMES = [
  "combo:HMAC_BYPASS_MISSING",   // ← el bug exacto que causó el desmadre
  "db:supabase",
  "env:WHATSAPP_ACCESS_TOKEN",
  "env:SUPABASE_SERVICE_ROLE_KEY",
  "env:ANTHROPIC_API_KEY",
  "combo:BACKUP_UNPROTECTED",
  "whatsapp:phone_id",
];

export async function GET(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET || "";
  const auth       = req.headers.get("authorization") || "";
  const isVercelCron =
    req.headers.get("x-vercel-cron") === "1" ||
    req.headers.get("user-agent")?.startsWith("vercel-cron") === true;

  if (!isVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Llamar a /api/health ──────────────────────────────────────────────
  let healthData: {
    status: string;
    timestamp: string;
    summary: { total: number; ok: number; warn: number; error: number };
    checks: { name: string; status: string; message: string }[];
  };

  try {
    const res = await fetch(`${SITE_URL}/api/health`, {
      headers: { "User-Agent": "aria27-health-monitor/1.0" },
      cache: "no-store",
    });
    healthData = await res.json().catch(() => ({}));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("No se pudo llamar a /api/health", { error: msg });
    await sendWhatsAppText(ADMIN_PHONE,
      `🚨 *ARIA27 — ALERTA CRÍTICA*\n\n❌ El monitor no pudo conectar a:\n${SITE_URL}/api/health\n\nError: ${msg}\n\n🕐 ${new Date().toISOString()}\n\nRevisa Vercel Dashboard.`,
      { origen: "health-monitor", enviadoPor: "cron" }
    );
    return NextResponse.json({ alerted: true, error: msg }, { status: 200 });
  }

  // ── Filtrar checks críticos con error ───────────────────────────────────────
  const criticalErrors = healthData.checks.filter(
    c => c.status === "error" && CRITICAL_CHECK_NAMES.includes(c.name)
  );

  if (criticalErrors.length === 0) {
    log.info("Health OK", { status: healthData.status, timestamp: healthData.timestamp });
    return NextResponse.json({ status: "ok", checked: healthData.summary });
  }

  // ── Construir y enviar alerta ─────────────────────────────────────────────
  const errorLines = criticalErrors.map(c => `• ${c.message}`).join("\n");
  const message = `🚨 *ARIA27 — SISTEMA CON FALLOS*\n\n*${criticalErrors.length} error(es) detectado(s):*\n\n${errorLines}\n\n🕐 ${healthData.timestamp}\n🔗 ${SITE_URL}/api/health\n\nAcción requerida.`;

  try {
    await sendWhatsAppText(ADMIN_PHONE, message, { origen: "health-monitor", enviadoPor: "cron" });
    log.warn("Alerta WhatsApp enviada a admin", { errors: criticalErrors.length, checks: criticalErrors.map(c => c.name) });
  } catch (err: unknown) {
    log.error("No se pudo enviar alerta WA", { error: err instanceof Error ? err.message : String(err) });
  }

  return NextResponse.json({
    alerted: true,
    errors: criticalErrors.length,
    checks: criticalErrors.map(c => c.name),
  });
}
