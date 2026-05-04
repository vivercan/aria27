import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
const supabase = getSupabaseAdmin();
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmailLogged } from "@/lib/email-log";
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
    const body = await req.json().catch(() => ({}));
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";
    const linkAutorizar = `${baseUrl}/autorizar/${token}`;

    // 26-Abr-2026: rediseno canon AAA - email comparativa con tarjetas, no estilo Excel.
    // Header navy gradient, tarjeta destacada para el mejor proveedor, tabla minimalista compacta.
    const supTotalsSorted = [...supTotals].sort((a, b) => (a.total || 0) - (b.total || 0));
    const mejorProv = supTotalsSorted[0];

    const supplierCards = supTotalsSorted.map((s, idx) => {
      const isMejor = idx === 0 && bestTot > 0;
      const cardBg = isMejor
        ? "background:linear-gradient(135deg,#0F4C3A 0%,#16704D 100%);border:1px solid rgba(34,197,94,0.5)"
        : "background:#0F1A2E;border:1px solid rgba(124,148,180,0.20)";
      const badge = isMejor
        ? `<div style="display:inline-block;padding:3px 10px;background:rgba(255,255,255,0.18);color:#D9FBE7;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.05em;margin-bottom:8px">MEJOR PRECIO</div>`
        : "";
      const ivaBadge = s.rebaja_iva
        ? `<span style="background:rgba(34,197,94,0.18);color:#86efac;padding:2px 8px;border-radius:6px;font-size:11px">REBAJA IVA: SI</span>`
        : `<span style="background:rgba(239,68,68,0.18);color:#fca5a5;padding:2px 8px;border-radius:6px;font-size:11px">REBAJA IVA: NO</span>`;
      return `<div style="${cardBg};border-radius:14px;padding:18px;margin-bottom:12px">${badge}<div style="color:#F4F8FF;font-size:18px;font-weight:700;letter-spacing:-0.01em;margin-bottom:4px">${s.supplier}</div><div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><div style="color:rgba(214,228,255,0.55);font-size:11px;text-transform:uppercase;letter-spacing:0.06em">Total</div><div style="color:#F4F8FF;font-size:28px;font-weight:800;letter-spacing:-0.02em">$ ${(s.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div></div><div style="text-align:right;font-size:12px;color:rgba(214,228,255,0.70);line-height:1.5"><div>Subtotal: $ ${(s.subtotal || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div><div>IVA ${(s.tax_rate ?? 16)}%: $ ${(s.iva || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div><div>Anticipo ${s.advance_percentage || 0}%: $ ${(s.advance_amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div></div></div><div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">${ivaBadge}${s.observaciones ? `<span style="color:rgba(214,228,255,0.55);font-size:11px;font-style:italic">"${s.observaciones}"</span>` : ""}${s.entrega ? `<span style="color:rgba(214,228,255,0.55);font-size:11px">Entrega: ${s.entrega}</span>` : ""}</div></div>`;
    }).join("");

    // Tabla detalle compacta de items, monochromatica navy con celda destacada del mejor precio por item.
    const detalleRows = itemsDet.map((item: ItemDetail, idx: number) => {
      const allP = supTotalsSorted.map((s) => s.items_prices?.[item.product_name] || 0).filter((p: number) => p > 0);
      const bestP = allP.length > 0 ? Math.min(...allP) : 0;
      const cells = supTotalsSorted.map((s) => {
        const p = s.items_prices?.[item.product_name] || 0;
        const isWin = p > 0 && p === bestP;
        const tdStyle = isWin
          ? "padding:8px 10px;text-align:right;font-size:12px;color:#86efac;font-weight:700;border-bottom:1px solid rgba(124,148,180,0.10)"
          : "padding:8px 10px;text-align:right;font-size:12px;color:rgba(214,228,255,0.85);border-bottom:1px solid rgba(124,148,180,0.10)";
        return `<td style="${tdStyle}">${p > 0 ? "$ " + p.toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "-"}</td>`;
      }).join("");
      return `<tr><td style="padding:8px 10px;color:rgba(214,228,255,0.85);font-size:12px;border-bottom:1px solid rgba(124,148,180,0.10)">${item.product_name}</td><td style="padding:8px 10px;text-align:center;color:rgba(214,228,255,0.70);font-size:12px;border-bottom:1px solid rgba(124,148,180,0.10)">${item.quantity} ${item.unit || "PZA"}</td>${cells}</tr>`;
    }).join("");

    const supThead = supTotalsSorted.map((s, idx) => {
      const isMejor = idx === 0 && bestTot > 0;
      const color = isMejor ? "#86efac" : "rgba(214,228,255,0.70)";
      return `<th style="padding:10px;text-align:right;color:${color};font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;border-bottom:1px solid rgba(124,148,180,0.20)">${s.supplier}</th>`;
    }).join("");

    const emailHTML = `<div style="font-family:-apple-system,'Segoe UI',Arial,sans-serif;max-width:720px;margin:0 auto;background:#040810;border-radius:18px;overflow:hidden"><div style="background:linear-gradient(135deg,#123E92 0%,#0F2D6E 100%);padding:28px 24px"><div style="color:rgba(214,228,255,0.65);font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">Comparativa de Cotizaciones</div><h1 style="color:#F4F8FF;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.02em">${folio}</h1><div style="color:rgba(214,228,255,0.70);font-size:14px;margin-top:4px">${obra} &middot; ${supTotalsSorted.length} proveedores</div></div><div style="padding:24px">${supplierCards}</div><div style="padding:0 24px 24px"><div style="color:rgba(214,228,255,0.55);font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;font-weight:600">Detalle por producto</div><table style="width:100%;border-collapse:collapse;background:#0F1A2E;border-radius:12px;overflow:hidden"><thead><tr><th style="padding:10px;text-align:left;color:rgba(214,228,255,0.70);font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;border-bottom:1px solid rgba(124,148,180,0.20)">Producto</th><th style="padding:10px;text-align:center;color:rgba(214,228,255,0.70);font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;border-bottom:1px solid rgba(124,148,180,0.20)">Cantidad</th>${supThead}</tr></thead><tbody>${detalleRows}</tbody></table><div style="color:rgba(214,228,255,0.45);font-size:11px;margin-top:8px;font-style:italic">Las cifras en verde son el mejor precio por producto.</div></div><div style="padding:0 24px 28px;text-align:center"><a href="${linkAutorizar}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#1F8A60 0%,#16704D 100%);color:#F4F8FF;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;letter-spacing:0.02em;box-shadow:0 4px 12px rgba(22,112,77,0.35)">Ver comparativa y autorizar</a><div style="color:rgba(214,228,255,0.45);font-size:11px;margin-top:14px">Click para revisar y aprobar la requisición.</div></div><div style="padding:16px 24px;background:rgba(0,0,0,0.30);border-top:1px solid rgba(124,148,180,0.10);text-align:center;color:rgba(214,228,255,0.40);font-size:10px;letter-spacing:0.05em">ARIA27 &middot; Grupo Constructor Urbano Avante</div></div>`;

    let emailResult: EmailResult | null = null;
    let emailError: string | null = null;
    try {
      const sendRes = await sendEmailLogged({
        template: "requisicion_comparativa_director",
        to: director.email,
        subject: `[COMPARATIVA] ${folio} - ${obra} - ${supList.length || quotes?.length || 0} proveedores`,
        html: emailHTML,
        bcc: ["juanviverosv@gmail.com"],
        origen: "req-comparativa-director",
        enviadoPor: "enviar-comparativa",
      });
      emailResult = { data: sendRes.messageId ? { id: sendRes.messageId } : undefined, error: sendRes.error || undefined } as unknown as EmailResult;
      if (!sendRes.success) {
        emailError = sendRes.error || "unknown";
        log.error("Resend email error", { id: requisition_id, error: emailError });
      } else {
        log.info("Email enviado", { to: director.email, id: sendRes.messageId });
      }
    } catch (e: unknown) {
      emailError = (e as Error)?.message || String(e);
      log.error("Resend exception", { id: requisition_id, error: emailError });
    }

    let waResult: WhatsAppResult = { success: false, error: "no enviado (sin telefono)" };
    if (director.phone) {
      const { sendWhatsAppFallback } = await import("@/lib/whatsapp");
      const mejorText = `${mejor.supplier} $${(mejor.total || mejor.subtotal || 0).toLocaleString?.() || 0}`;
      const numProv = String(supList.length || quotes?.length || 0);
      waResult = await sendWhatsAppFallback(
        "comparativa_enviar",
        [folio, obra, mejorText, numProv],
        director.phone,
        `📊 *Comparativa Lista para Revisión*\n\n🔖 Req: ${folio}\n🏗️ Obra: ${obra}\n🏆 Mejor oferta: ${mejorText}\n🏪 Proveedores: ${numProv}\n\nIngresa a ARIA27 para aprobar o rechazar:\nhttps://aria.jjcrm27.com`,
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
