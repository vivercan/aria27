import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
const log = logger("ENVIAR-COMPARATIVA");

// ===== TypeScript Interfaces =====
interface CallerUser {
  role: string;
}

interface Director {
  email: string;
  phone?: string;
}

interface RequisitionData {
  created_by: string;
}

interface ItemDetail {
  product_name: string;
  quantity: number;
  unit: string;
}

interface QuoteInput {
  supplier: string;
  subtotal?: number;
  total?: number;
  iva?: number;
  tax_rate?: number;
  advance_percentage?: number;
  advance_amount?: number;
  notas?: string;
  entrega?: string;
  forma_pago?: string;
}

interface SupplierInput {
  items_prices?: Record<string, number>;
  tax_rate?: number;
  advance_percentage?: number;
}

interface SupplierTotal extends SupplierInput {
  supplier: string;
  subtotal: number;
  iva: number;
  total: number;
  tax_rate: number;
  advance_percentage: number;
  advance_amount: number;
  observaciones: string;
  entrega: string;
  forma_pago: string;
  rebaja_iva: boolean;
  items_prices: Record<string, number>;
}

interface EmailResult {
  data?: { id: string };
  error?: Record<string, unknown> | string | null;
}

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await req.json();
    const { requisition_id, folio, obra, quotes, items, items_detail, suppliers, user_email } = body;

    // Auth check: verificar usuario y rol
    if (!user_email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Rate limit: protege contra envío masivo de emails
    const clientId = getClientIdentifier(req, user_email);
    const rl = checkRateLimit(clientId, { key: "req:enviar-comparativa", ...RATE_LIMITS.EMAIL });
    if (!rl.allowed) {
      log.warn("Rate limit excedido", { clientId, retryAfter: rl.retryAfter });
      return rateLimitResponse(rl);
    }
    const { data: callerUser } = await supabase.from("Users").select("role").eq("email", user_email).single() as { data: CallerUser | null };
    if (!callerUser || !["admin", "compras", "direccion"].includes(callerUser.role)) {
      return NextResponse.json({ error: "No autorizado para esta acción" }, { status: 403 });
    }

    const { data: director, error: dirError } = await supabase
      .from("Users").select("*").eq("role", "direccion").single() as { data: Director | null; error: unknown };

    if (!director) return NextResponse.json({ error: "No se encontro director" }, { status: 404 });

    const { data: reqData, error: reqLookupErr } = await supabase
      .from("requisitions").select("created_by").eq("id", requisition_id).single() as { data: RequisitionData | null; error: unknown };
    if (reqLookupErr || !reqData) {
      const errMsg = (reqLookupErr as Record<string, unknown>)?.message;
      log.error("Lookup requisicion fallo", { id: requisition_id, error: errMsg, code: (reqLookupErr as Record<string, unknown>)?.code });
      return NextResponse.json({ error: `Lookup requisicion fallo: ${errMsg || 'no encontrada'}` }, { status: reqLookupErr ? 500 : 404 });
    }
    const solicitante = reqData?.created_by || "N/A";
    const token = crypto.randomUUID();

    const { error: updEnvErr } = await supabase.from("requisitions").update({
      status: "EN_AUTORIZACION",
      authorization_comments: token,
      cotizacion_data: { quotes, items, items_detail, suppliers, obra, folio }
    }).eq("id", requisition_id);
    if (updEnvErr) {
      log.error("Error update EN_AUTORIZACION", { id: requisition_id, error: updEnvErr.message });
      return NextResponse.json({ error: `Error actualizando requisición: ${updEnvErr.message}` }, { status: 500 });
    }

    const supList = suppliers || [];
    const itemsDet = items_detail || (items || []).map((name: string) => ({ product_name: name, quantity: 1, unit: "PZA" }));

    // Si vienen quotes con totales calculados (capturar/page.tsx), usarlos como fuente de verdad.
    // Si vienen suppliers con items_prices (tramite/page.tsx legado), recalcular con tax_rate por columna o 16% default.
    let supTotals: SupplierTotal[];
    if (supList.length > 0) {
      supTotals = (supList as (SupplierInput & { supplier?: string })[]).map((s): SupplierTotal => {
        const subtotal = itemsDet.reduce((sum: number, item: ItemDetail) => sum + ((s.items_prices?.[item.product_name] || 0) * (item.quantity || 1)), 0);
        const taxRate = typeof s.tax_rate === "number" ? s.tax_rate : 16;
        const iva = +(subtotal * (taxRate / 100)).toFixed(2);
        const total = +(subtotal + iva).toFixed(2);
        const advancePct = typeof s.advance_percentage === "number" ? s.advance_percentage : 0;
        const advanceAmount = +(total * (advancePct / 100)).toFixed(2);
        return {
          supplier: s.supplier || "",
          items_prices: s.items_prices || {},
          subtotal,
          iva,
          total,
          tax_rate: taxRate,
          advance_percentage: advancePct,
          advance_amount: advanceAmount,
          observaciones: "",
          entrega: "",
          forma_pago: "",
          rebaja_iva: false
        };
      });
    } else {
      // Usar quotes (flujo capturar): cada quote ya trae subtotal, iva, total, advance
      supTotals = (quotes as QuoteInput[] || []).map((q) => ({
        supplier: q.supplier,
        subtotal: Number(q.subtotal ?? q.total ?? 0),
        iva: Number(q.iva ?? 0),
        total: Number(q.total ?? 0),
        tax_rate: Number(q.tax_rate ?? 16),
        advance_percentage: Number(q.advance_percentage ?? 0),
        advance_amount: Number(q.advance_amount ?? 0),
        observaciones: q.notas || "",
        entrega: q.entrega ? `${q.entrega}d` : "",
        forma_pago: q.forma_pago || "",
        rebaja_iva: false,
        items_prices: {},
      }));
    }
    const bestTot = supTotals.length > 0 ? Math.min(...supTotals.filter((s) => s.total > 0).map((s) => s.total)) : 0;

    const mejor = supTotals.find((s) => s.total === bestTot) || ((quotes as QuoteInput[])?.[0] ? (quotes as QuoteInput[]).reduce((m, q) => (q.total || 0) < (m.total || 0) ? q : m, (quotes as QuoteInput[])[0]) : { supplier: "N/A", total: 0 });

    // Guardar total estimado (mejor proveedor) en Requisiciones para visualización en Estatus
    if (bestTot > 0) {
      const { error: montoErr } = await supabase.from("requisitions").update({ monto: bestTot }).eq("id", requisition_id);
      if (montoErr) log.error("Error guardando monto estimado", { id: requisition_id, error: montoErr.message });
    }

    const linkAutorizar = `https://aria.jjcrm27.com/autorizar/${token}`;

    const supH = supTotals.map((s) => `<th style="padding:8px;text-align:center;${s.total === bestTot && bestTot > 0 ? "background:#16a34a;color:white" : "background:#1e3a5f;color:white"};font-size:12px;border:1px solid #334155">${s.supplier}</th>`).join("");

    const prodRows = itemsDet.map((item: ItemDetail, idx: number) => {
      const allP = supTotals.map((s) => s.items_prices?.[item.product_name] || 0).filter((p: number) => p > 0);
      const bestP = allP.length > 0 ? Math.min(...allP) : 0;
      const cells = supTotals.map((s) => {
        const p = s.items_prices?.[item.product_name] || 0;
        const bg = p > 0 && p === bestP ? "background:#dcfce7;" : s.total === bestTot && bestTot > 0 ? "background:#f0fdf4;" : "";
        return `<td style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-size:12px;${bg}">${p > 0 ? "$ " + p.toLocaleString("es-MX", {minimumFractionDigits: 2}) : "-"}</td>`;
      }).join("");
      return `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:12px">${idx+1}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:12px">${item.product_name}</td><td style="padding:6px 8px;text-align:center;border:1px solid #e2e8f0;font-size:12px">${item.quantity}</td><td style="padding:6px 8px;text-align:center;border:1px solid #e2e8f0;font-size:12px">${item.unit || "PZA"}</td>${cells}</tr>`;
    }).join("");

    const mkRow = (lbl: string, fn: (s: SupplierTotal) => number, bold: boolean) => `<tr><td colspan="4" style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;font-size:12px">${lbl}</td>${supTotals.map((s) => { const v = fn(s); const bg = s.total === bestTot && bestTot > 0 ? (bold ? "background:#16a34a;color:white;" : "background:#dcfce7;") : ""; return `<td style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;${bold?"font-weight:bold;":""}font-size:12px;${bg}">$ ${v.toLocaleString("es-MX",{minimumFractionDigits:2})}</td>`; }).join("")}</tr>`;

    const ivaLabelRow = `<tr><td colspan="4" style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;font-size:12px">I.V.A.</td>${supTotals.map((s) => { const bg = s.total === bestTot && bestTot > 0 ? "background:#dcfce7;" : ""; return `<td style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-size:12px;${bg}">${(s.tax_rate ?? 16)}% &nbsp; $ ${(s.iva || 0).toLocaleString("es-MX",{minimumFractionDigits:2})}</td>`; }).join("")}</tr>`;
    const advanceR = `<tr><td colspan="4" style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;font-size:12px;color:#b45309">ANTICIPO</td>${supTotals.map((s) => { const pct = s.advance_percentage || 0; const amt = s.advance_amount || 0; const bg = s.total === bestTot && bestTot > 0 ? "background:#fef3c7;" : ""; return `<td style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-size:12px;${bg}">${pct}% &nbsp; $ ${amt.toLocaleString("es-MX",{minimumFractionDigits:2})}</td>`; }).join("")}</tr>`;
    const rebajaR = `<tr><td colspan="4" style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;font-size:12px;color:#7c3aed">¿REBAJAN IVA?</td>${supTotals.map((s) => `<td style="padding:6px 8px;text-align:center;border:1px solid #e2e8f0;font-weight:bold;${s.rebaja_iva ? "background:#16a34a;color:white" : "background:#dc2626;color:white"}">${s.rebaja_iva ? "SI" : "NO"}</td>`).join("")}</tr>`;
    const obsR = `<tr><td colspan="4" style="padding:6px 8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;font-size:12px">OBSERVACIONES</td>${supTotals.map((s) => `<td style="padding:6px 8px;text-align:center;border:1px solid #e2e8f0;font-size:11px">${s.observaciones || s.entrega || "-"}</td>`).join("")}</tr>`;

    const emailHTML = `<div style="font-family:Arial;max-width:900px;margin:0 auto"><div style="background:#1e3a5f;padding:15px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:white;margin:0;font-size:20px">COMPARATIVA DE COTIZACIONES</h1><p style="color:#93c5fd;margin:4px 0 0;font-size:14px">REQ ${folio} ${obra}</p></div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px">#</th><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">PRODUCTO</th><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">CANT</th><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">UNIDAD</th>${supH}</tr></thead><tbody>${prodRows}${mkRow("SUBTOTAL",(s: SupplierTotal)=>s.subtotal,false)}${ivaLabelRow}${mkRow("TOTAL",(s: SupplierTotal)=>s.total,true)}${advanceR}${rebajaR}${obsR}</tbody></table><div style="text-align:center;padding:20px"><a href="${linkAutorizar}" style="display:inline-block;padding:14px 48px;background:#1e3a5f;color:white;text-decoration:none;border-radius:6px;font-weight:bold">VER COMPARATIVA Y AUTORIZAR</a></div><p style="text-align:center;color:#94a3b8;font-size:10px">ARIA27 - Grupo Constructor Urbano Avante</p></div>`;

    let emailResult: EmailResult | null = null;
    let emailError: string | null = null;
    try {
      emailResult = await resend.emails.send({ from: "ARIA27 <noreply@mail.jjcrm27.com>", to: director.email, subject: `Comparativa: ${folio} - ${obra} (${supList.length || quotes?.length || 0} proveedores)`, html: emailHTML }) as unknown as EmailResult;
      if (emailResult?.error) {
        const errMsg = typeof emailResult.error === "string" ? emailResult.error : (emailResult.error as Record<string, unknown>)?.message ? String((emailResult.error as Record<string, unknown>).message) : JSON.stringify(emailResult.error);
        emailError = errMsg;
        log.error("Resend email error", { id: requisition_id, error: emailError });
      } else {
        log.info("Email enviado", { to: director.email, id: emailResult?.data?.id });
      }
    } catch (e: unknown) {
      emailError = (e as Error)?.message || String(e);
      log.error("Resend exception", { id: requisition_id, error: emailError });
    }

    let waResult: WhatsAppResult = { success: false, error: "no enviado (sin telefono)" };
    if (director.phone) {
      const { sendWhatsAppLogged } = await import("@/lib/whatsapp");
      const mejorText = `${mejor.supplier} $${(mejor.total || mejor.subtotal || 0).toLocaleString?.() || 0}`;
      waResult = await sendWhatsAppLogged(
        "comparativa_enviar",
        [folio, obra, mejorText, String(supList.length || quotes?.length || 0)],
        director.phone,
        { origen: "comparativa-enviar", enviadoPor: "enviar-comparativa", buttonToken: token }
      );
      if (!waResult.success) {
        log.error("WhatsApp comparativa fallo", { id: requisition_id, phone: director.phone, error: waResult.error });
      } else {
        log.info("WhatsApp comparativa enviado", { id: requisition_id, messageId: waResult.messageId });
      }
    } else {
      log.warn("Director sin telefono - WhatsApp no enviado", { id: requisition_id });
    }

    return NextResponse.json({
      success: true,
      enviado_a: director.email,
      email: emailError ? { ok: false, error: emailError } : { ok: true, id: emailResult?.data?.id || null },
      whatsapp: waResult,
    });
  } catch (error: unknown) {
    log.error("[COMPARATIVA] Error:", error);
    return NextResponse.json({ error: (error as Error)?.message || "Error interno" }, { status: 500 });
  }
}
