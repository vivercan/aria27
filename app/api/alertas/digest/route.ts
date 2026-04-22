import { RESEND_FROM } from "@/lib/email-config";
import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("ALERTAS-DIGEST");

interface Alerta {
  tipo: "URGENTE" | "ATENCION" | "INFO";
  titulo: string;
  modulo?: string;
  detalle?: string;
  [key: string]: unknown;
}

// Envía digest diario de alertas agrupadas por severidad.
// Protegido por Bearer token (DIGEST_TOKEN) para que lo dispare cron externo (Vercel Cron, GitHub Actions, etc).
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(getClientIdentifier(req), { key: "alertas:digest", ...RATE_LIMITS.READ });
  if (!rl.allowed) return rateLimitResponse(rl);

  const auth = req.headers.get("authorization") || "";
  const expected = process.env.DIGEST_TOKEN || process.env.CRON_SECRET || "";
  const isVercelCron =
    req.headers.get("x-vercel-cron") === "1" ||
    req.headers.get("user-agent")?.startsWith("vercel-cron") === true;
  if (!isVercelCron && (!expected || auth !== `Bearer ${expected}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const to = req.nextUrl.searchParams.get("to") || process.env.ADMIN_EMAIL || "juanviverosv@gmail.com";

  try {
    // Llamada interna al endpoint /api/alertas para reusar la lógica existente
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";
    const r = await fetch(`${base}/api/alertas`, {
      headers: { "x-user-email": to, "x-digest": "1" },
      cache: "no-store",
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      log.error("alertas endpoint failed", { status: r.status });
      return NextResponse.json({ error: "alertas endpoint failed" }, { status: 500 });
    }

    const alertas: Alerta[] = data.alertas || [];
    const urgentes = alertas.filter(a => a.tipo === "URGENTE");
    const atencion = alertas.filter(a => a.tipo === "ATENCION");
    const info = alertas.filter(a => a.tipo === "INFO");

    if (urgentes.length === 0 && atencion.length === 0) {
      log.info("sin alertas relevantes — skip email", { to });
      return NextResponse.json({ ok: true, skipped: true, total: alertas.length });
    }

    const html = buildHtml(urgentes, atencion, info, base);

    const resend = getResend();
    const { data: sent, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: [to],
      subject: `🔔 ARIA27 Digest · ${urgentes.length} urgentes · ${atencion.length} atención`,
      html,
    });
    if (error) {
      log.error("resend error", { error });
      return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
    }

    log.info("digest enviado", { to, id: sent?.id, urgentes: urgentes.length, atencion: atencion.length });
    return NextResponse.json({ ok: true, id: sent?.id, urgentes: urgentes.length, atencion: atencion.length, info: info.length });
  } catch (e: unknown) {
    log.error("exception", { error: (e as Error).message });
    return NextResponse.json({ error: (e as Error).message || "error interno" }, { status: 500 });
  }
}

function buildHtml(urgentes: Alerta[], atencion: Alerta[], info: Alerta[], base: string) {
  const section = (titulo: string, color: string, items: Alerta[]) => {
    if (items.length === 0) return "";
    const rows = items.slice(0, 20).map(a => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">
          <div style="color:#0f172a;font-size:13px;font-weight:600;">${escape(a.titulo)}</div>
          <div style="color:#64748b;font-size:11px;margin-top:2px;">${escape(a.modulo || "")} &middot; ${escape(a.detalle || "")}</div>
        </td>
      </tr>`).join("");
    const more = items.length > 20 ? `<tr><td style="padding:8px;color:#94a3b8;font-size:11px;text-align:center;">+${items.length - 20} mas...</td></tr>` : "";
    return `
      <div style="margin-bottom:20px;">
        <div style="background:${color};color:white;padding:8px 12px;border-radius:6px 6px 0 0;font-size:13px;font-weight:700;">${titulo} (${items.length})</div>
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 6px 6px;">${rows}${more}</table>
      </div>`;
  };
  const fecha = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const inner = `<div style="padding:24px;font-family:sans-serif;color:#1e293b">
      <p style="color:#475569;font-size:12px;margin:0 0 20px;">${fecha}</p>
      ${section("Urgentes", "#dc2626", urgentes)}
      ${section("Atencion", "#d97706", atencion)}
      ${section("Info", "#2563eb", info)}
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">
        <a href="${base}/dashboard/inbox" style="display:inline-block;padding:10px 22px;background:#1E3E7A;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Ver inbox completo</a>
      </div>
    </div>`;
  return ariaEmailWrapper(ariaEmailHeader("Digest diario") + inner + ariaEmailFooter());
}

function escape(s: string) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
