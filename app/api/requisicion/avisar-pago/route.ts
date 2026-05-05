import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-api";
import { sendEmailLogged } from "@/lib/email-log";
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
import { ariaEmailWrapper, ariaEmailHeader, ariaEmailFooter } from "@/lib/email-templates";

const log = logger("AVISAR-PAGO");

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => ({}));
  const folio = String(body.folio || "").trim();
  const phone = String(body.phone || "").replace(/\D/g, "");
  const email = String(body.email || "").trim();

  if (!folio) return NextResponse.json({ error: "folio requerido" }, { status: 400 });
  if (!phone && !email) return NextResponse.json({ error: "phone o email requerido" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: r, error } = await sb
    .from("requisitions")
    .select("folio, cost_center_name, motivo_solicitud, descripcion_compra, proveedor, banco, clabe_interbancaria, numero_cuenta, monto, status")
    .eq("folio", folio)
    .maybeSingle();

  if (error || !r) return NextResponse.json({ error: "Requisicion no encontrada" }, { status: 404 });

  const fmt = (n: number | null | undefined) => "$" + (Number(n) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 });
  const concepto = r.motivo_solicitud || r.descripcion_compra || "";
  const obra = r.cost_center_name || "";
  const proveedor = r.proveedor || "(sin proveedor)";
  const banco = r.banco || "";
  const clabe = r.clabe_interbancaria || r.numero_cuenta || "";

  // Mensaje formato JJ
  const mensajePlano = `REQ ${r.folio} ${concepto.toUpperCase()} ${obra}\n${proveedor}\n${fmt(r.monto)}\n${banco}\n${clabe}`;

  const result: { wa?: { ok: boolean; id?: string; error?: string }; email?: { ok: boolean; id?: string; error?: string } } = {};

  // 1. WhatsApp
  if (phone) {
    const ph = phone.startsWith("52") ? phone : `52${phone}`;
    const wa = await sendWhatsAppLogged(
      "requisicion_compras",
      [`AVISO PAGO ${r.folio}`, `${proveedor} - ${fmt(r.monto)}`, banco || "—", clabe || "—"],
      ph,
      { origen: "avisar-pago", enviadoPor: auth.email }
    ).catch((e) => ({ success: false, error: (e as Error).message }));
    result.wa = { ok: wa.success, id: (wa as { messageId?: string }).messageId, error: wa.error };
  }

  // 2. Email
  if (email) {
    const html = ariaEmailWrapper(
      ariaEmailHeader("Aviso de pago - Requisicion autorizada") +
      `<div style="padding:25px;font-size:14px;color:#1e293b;line-height:1.6;font-family:monospace">
        <pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px;font-size:14px;line-height:1.5;white-space:pre-wrap;font-family:'Courier New',monospace">${mensajePlano}</pre>
        <p style="color:#64748b;font-size:11px;margin-top:14px">Por favor procesa este pago. Cualquier duda, responde este correo.</p>
      </div>` + ariaEmailFooter()
    );
    const em = await sendEmailLogged({
      template: "aviso_pago_tesoreria",
      to: email,
      subject: `[AVISO PAGO] ${r.folio} - ${proveedor} - ${fmt(r.monto)}`,
      html,
      bcc: ["juanviverosv@gmail.com"],
      origen: "avisar-pago",
      enviadoPor: auth.email,
    });
    result.email = { ok: em.success, id: em.messageId || undefined, error: em.error || undefined };
  }

  log.info("Aviso de pago enviado", { folio, phone, email, result });
  return NextResponse.json({ ok: true, mensaje: mensajePlano, result });
}
