/**
 * POST /api/proveedores/[id]/correo
 *
 * Envia un correo a un proveedor desde el panel lateral del catalogo de productos.
 * Usa los helpers de branding ariaEmailHeader/Footer/Wrapper (rebrand 22-Abr-2026).
 *
 * Body:
 *   { subject, body, productId?, productSku?, productName? }
 *
 * Logging: por ahora solo server log (logger). Pendiente persistir en
 * tabla dedicada `proveedor_comunicaciones` cuando JJ apruebe el DDL.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOriginOrUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";
import { sendEmailLogged } from "@/lib/email-log";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const log = logger("API.PROVEEDORES.CORREO");
  try {
    const __auth = await requireOriginOrUser(req);
    if (!__auth.ok) return __auth.res;
    const { id } = await ctx.params;
    const supplierId = Number(id);
    if (!Number.isFinite(supplierId)) {
      return NextResponse.json({ error: "supplier id invalido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const subject = String(body.subject || "").trim();
    const messageBody = String(body.body || "").trim();
    const productSku = body.productSku ? String(body.productSku) : null;
    const productName = body.productName ? String(body.productName) : null;

    if (!subject || !messageBody) {
      return NextResponse.json({ error: "subject y body requeridos" }, { status: 400 });
    }

    const supa = getSupabaseAdmin();

    const { data: supplier, error: sErr } = await supa
      .from("suppliers")
      .select("id, name, email, razon_social")
      .eq("id", supplierId)
      .maybeSingle();
    if (sErr) {
      log.error("query supplier", sErr);
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }
    if (!supplier || !supplier.email) {
      return NextResponse.json({ error: "Proveedor sin correo registrado" }, { status: 400 });
    }

    const sender = req.headers.get("x-user-email") || "compras@aria27.com";

    const productLine = productSku && productName
      ? `<div style="background:#f5f7fa;padding:10px 14px;border-left:3px solid #1E3E7A;margin:14px 0;font-size:12px;color:#334155"><strong>Producto referenciado:</strong> ${escapeHtml(productSku)} &mdash; ${escapeHtml(productName)}</div>`
      : "";

    const html = ariaEmailWrapper(
      ariaEmailHeader("Solicitud de cotizacion") +
      `<div style="padding:22px 24px;font-size:13px;color:#1e293b;line-height:1.55">
        ${productLine}
        <div style="white-space:pre-line">${escapeHtml(messageBody)}</div>
      </div>` +
      ariaEmailFooter("Enviado desde ARIA27 ERP por " + escapeHtml(sender))
    );

    const sent = await sendEmailLogged({
      template: "proveedor_correo_manual",
      to: supplier.email,
      subject,
      html,
      replyTo: sender,
      origen: "proveedor-correo-manual",
      enviadoPor: sender,
    });

    if (!sent.success) {
      log.error("resend error", { error: sent.error });
      return NextResponse.json({ error: String(sent.error || "resend error") }, { status: 502 });
    }

    log.info("correo proveedor enviado", {
      supplier_id: supplierId,
      to: supplier.email,
      sender,
      product_sku: productSku,
    });

    return NextResponse.json({ ok: true, to: supplier.email });
  } catch (err: unknown) {
    log.error("uncaught", err);
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
