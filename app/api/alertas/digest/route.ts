import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

const log = logger("ALERTAS-DIGEST");

// Envía digest diario de alertas agrupadas por severidad.
// Protegido por Bearer token (DIGEST_TOKEN) para que lo dispare cron externo (Vercel Cron, GitHub Actions, etc).
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.DIGEST_TOKEN || "";
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!isVercelCron && (!expected || auth !== `Bearer ${expected}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const to = req.nextUrl.searchParams.get("to") || "juanviverosv@gmail.com";

  try {
    // Llamada interna al endpoint /api/alertas para reusar la lógica existente
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://aria.jjcrm27.com";
    const r = await fetch(`${base}/api/alertas`, {
      headers: { "x-user-email": to, "x-digest": "1" },
      cache: "no-store",
    });
    const data = await r.json();
    if (!r.ok) {
      log.error("alertas endpoint failed", { status: r.status });
      return NextResponse.json({ error: "alertas endpoint failed" }, { status: 500 });
    }

    const alertas: any[] = data.alertas || [];
    const urgentes = alertas.filter(a => a.tipo === "URGENTE");
    const atencion = alertas.filter(a => a.tipo === "ATENCION");
    const info = alertas.filter(a => a.tipo === "INFO");

    if (urgentes.length === 0 && atencion.length === 0) {
      log.info("sin alertas relevantes — skip email", { to });
      return NextResponse.json({ ok: true, skipped: true, total: alertas.length });
    }

    const html = buildHtml(urgentes, atencion, info, base);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: sent, error } = await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: [to],
      subject: `🔔 ARIA27 Digest · ${urgentes.length} urgentes · ${atencion.length} atención`,
      html,
    });
    if (error) {
      log.error("resend error", { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    log.info("digest enviado", { to, id: sent?.id, urgentes: urgentes.length, atencion: atencion.length });
    return NextResponse.json({ ok: true, id: sent?.id, urgentes: urgentes.length, atencion: atencion.length, info: info.length });
  } catch (e: any) {
    log.error("exception", { error: e?.message });
    return NextResponse.json({ error: e?.message || "error interno" }, { status: 500 });
  }
}

function buildHtml(urgentes: any[], atencion: any[], info: any[], base: string) {
  const section = (titulo: string, color: string, items: any[]) => {
    if (items.length === 0) return "";
    const rows = items.slice(0, 20).map(a => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #334155;">
          <div style="color:#e2e8f0;font-size:13px;font-weight:600;">${escape(a.titulo)}</div>
          <div style="color:#94a3b8;font-size:11px;margin-top:2px;">${escape(a.modulo || "")} · ${escape(a.detalle || "")}</div>
        </td>
      </tr>`).join("");
    const more = items.length > 20 ? `<tr><td style="padding:8px;color:#64748b;font-size:11px;text-align:center;">+${items.length - 20} más...</td></tr>` : "";
    return `
      <div style="margin-bottom:20px;">
        <div style="background:${color};color:white;padding:8px 12px;border-radius:6px 6px 0 0;font-size:13px;font-weight:700;">${titulo} (${items.length})</div>
        <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:0 0 6px 6px;">${rows}${more}</table>
      </div>`;
  };
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;">
      <h1 style="color:#60a5fa;margin:0 0 8px;font-size:22px;">ARIA27 — Digest diario</h1>
      <p style="color:#94a3b8;font-size:12px;margin:0 0 20px;">${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      ${section("🔴 Urgentes", "#dc2626", urgentes)}
      ${section("🟡 Atención", "#d97706", atencion)}
      ${section("🔵 Info", "#2563eb", info)}
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #334155;text-align:center;">
        <a href="${base}/dashboard/inbox" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Ver inbox completo</a>
      </div>
      <p style="color:#64748b;font-size:10px;text-align:center;margin-top:16px;">ARIA27 ERP · Grupo Constructor Urbano Avante</p>
    </div>`;
}

function escape(s: string) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
