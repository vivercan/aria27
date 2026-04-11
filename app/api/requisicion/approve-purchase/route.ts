import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
const log = logger("REQUISICION-APPROVE-PURCHASE");

// ===== Supabase Query Result Types =====
interface ItemDetail {
  product_name: string;
  quantity: number;
  unit: string;
}

interface SupplierQuote {
  supplier: string;
  items_prices?: Record<string, number>;
  subtotal?: number;
  tax_rate?: number;
  iva?: number;
  total?: number;
  advance_percentage?: number;
  advance_amount?: number;
  entrega?: string;
  forma_pago?: string;
  dias_credito?: number;
  rebaja_iva?: boolean;
  notas?: string;
  factura?: string;
  observaciones?: string;
}

interface SupplierData extends SupplierQuote {
  subtotal: number;
  tax_rate: number;
  iva: number;
  total: number;
  advance_percentage: number;
  advance_amount: number;
}

interface CotizacionData {
  suppliers?: SupplierQuote[];
  quotes?: SupplierQuote[];
  items_detail?: ItemDetail[];
  items?: string[];
}

interface Requisition {
  id: string;
  folio: string;
  status: string;
  authorization_comments: string | null;
  cost_center_name?: string;
  user_email: string;
  cotizacion_data?: CotizacionData;
  proveedor?: string;
  forma_pago?: string;
  monto?: number;
}

interface RequisitionItem {
  id: string;
  requisition_id: string;
  product_name: string;
  selected_supplier_name?: string;
  selected_price?: number;
}

interface User {
  id: string;
  email: string;
  role: string;
  phone?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";

async function getUserByRole(role: string): Promise<User | null> {
  const { data } = await supabase.from("Users").select("*").eq("role", role).single();
  return (data as User) || null;
}
async function getUserByEmail(email: string): Promise<User | null> {
  const { data } = await supabase.from("Users").select("*").eq("email", email).single();
  return (data as User) || null;
}
async function getNextOCFolio(): Promise<string> {
  const { data } = await supabase.from("sequences").select("current_value").eq("id", "OC").single();
  const next = (data?.current_value || 0) + 1;
  await supabase.from("sequences").upsert({ id: "OC", current_value: next });
  return `OC-${new Date().getFullYear()}-${String(next).padStart(5, "0")}`;
}

function buildComparativaHTML(req: Requisition, token: string): string {
  const cotData: CotizacionData = req.cotizacion_data || {};
  const suppliers: SupplierQuote[] = cotData.suppliers || [];
  const itemsDet: ItemDetail[] = cotData.items_detail || (cotData.items || []).map((n: string) => ({product_name:n,quantity:1,unit:"PZA"}));
  const quotes: SupplierQuote[] = cotData.quotes || [];
  let supData: SupplierData[] = [];
  if (suppliers.length > 0) {
    supData = suppliers.map((s: SupplierQuote): SupplierData => {
      const sub = itemsDet.reduce((sum: number, it: ItemDetail) => sum + ((s.items_prices?.[it.product_name]||0)*(it.quantity||1)),0);
      const tr = typeof s.tax_rate === "number" ? s.tax_rate : 16;
      const iva = +(sub * (tr/100)).toFixed(2);
      const total = +(sub + iva).toFixed(2);
      const apct = typeof s.advance_percentage === "number" ? s.advance_percentage : 0;
      const aamt = +(total * (apct/100)).toFixed(2);
      return {...s, subtotal:sub, tax_rate:tr, iva, total, advance_percentage:apct, advance_amount:aamt} as SupplierData;
    });
  } else {
    supData = quotes.map((q: SupplierQuote): SupplierData => ({
      supplier: q.supplier,
      subtotal: Number(q.subtotal ?? q.total ?? 0),
      tax_rate: Number(q.tax_rate ?? 16),
      iva: Number(q.iva ?? 0),
      total: Number(q.total ?? 0),
      advance_percentage: Number(q.advance_percentage ?? 0),
      advance_amount: Number(q.advance_amount ?? 0),
      entrega: q.entrega || "-",
      forma_pago: q.forma_pago || "-",
      factura: q.factura,
      rebaja_iva: false,
      observaciones: q.notas || "",
      items_prices: {},
    }));
  }
  const bt = supData.length>0?Math.min(...supData.filter((s: SupplierData)=>s.subtotal>0).map((s: SupplierData)=>s.total)):0;
  const sH = supData.map((s: SupplierData)=>`<th style="padding:10px 8px;text-align:center;font-size:12px;border:1px solid #334155;${s.total===bt&&bt>0?"background:#16a34a;color:white":"background:#1e3a5f;color:white"}">${s.supplier}</th>`).join("");
  const pR = itemsDet.map((it: ItemDetail,idx: number)=>{
    const ap=supData.map((s: SupplierData)=>s.items_prices?.[it.product_name]||0).filter((p: number)=>p>0);
    const bp=ap.length>0?Math.min(...ap):0;
    const cells=supData.map((s: SupplierData)=>{const p=s.items_prices?.[it.product_name]||0;const ib=p>0&&p===bp;const ic=s.total===bt&&bt>0;const bg=ib?"background:#bbf7d0;font-weight:bold;color:#16a34a;":ic?"background:#f0fdf4;":"";return`<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-size:13px;${bg}">${p>0?"$ "+p.toLocaleString("es-MX",{minimumFractionDigits:2}):"-"}</td>`;}).join("");
    return`<tr style="background:${idx%2===0?"white":"#f8fafc"}"><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;color:#7c3aed">${idx+1}</td><td style="padding:8px;border:1px solid #e2e8f0">${it.product_name}</td><td style="padding:8px;text-align:center;border:1px solid #e2e8f0">${it.quantity}</td><td style="padding:8px;text-align:center;border:1px solid #e2e8f0">${it.unit||"PZA"}</td>${cells}</tr>`;
  }).join("");
  const mR=(l: string,fn: (s: SupplierData)=>number,b: boolean)=>`<tr style="background:#f1f5f9"><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold">${l}</td>${supData.map((s: SupplierData)=>{const v=fn(s);const ic=s.total===bt&&bt>0;const bg=ic?(b?"background:#16a34a;color:white;":"background:#dcfce7;"):"";return`<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;${b?"font-weight:bold;":""}${bg}">$ ${v.toLocaleString("es-MX",{minimumFractionDigits:2})}</td>`;}).join("")}</tr>`;

  const ivaLabelRow = `<tr><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold">I.V.A.</td>${supData.map((s: SupplierData)=>{const ic=s.total===bt&&bt>0;const bg=ic?"background:#dcfce7;":"";return `<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;${bg}">${(s.tax_rate ?? 16)}% &nbsp; $ ${(s.iva||0).toLocaleString("es-MX",{minimumFractionDigits:2})}</td>`;}).join("")}</tr>`;
  const advanceR = `<tr><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:#b45309">ANTICIPO</td>${supData.map((s: SupplierData)=>{const pct=s.advance_percentage||0;const amt=s.advance_amount||0;const ic=s.total===bt&&bt>0;const bg=ic?"background:#fef3c7;":"";return `<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;${bg}">${pct}% &nbsp; $ ${amt.toLocaleString("es-MX",{minimumFractionDigits:2})}</td>`;}).join("")}</tr>`;
  const rebajaR = `<tr><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:#7c3aed">&iquest;REBAJAN IVA?</td>${supData.map((s: SupplierData)=>`<td style="padding:8px;text-align:center;border:1px solid #e2e8f0;font-weight:bold;${s.rebaja_iva?"background:#16a34a;color:white":"background:#dc2626;color:white"}">${s.rebaja_iva?"SI":"NO"}</td>`).join("")}</tr>`;
  const obsR = `<tr><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold">OBSERVACIONES</td>${supData.map((s: SupplierData)=>`<td style="padding:8px;text-align:center;border:1px solid #e2e8f0;font-size:11px">${s.observaciones||s.entrega||"-"}</td>`).join("")}</tr>`;

  const linkAprobar = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=aprobar`;
  const linkRechazar = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=rechazar`;

  return `<div style="font-family:Arial;max-width:900px;margin:0 auto"><div style="background:#1e3a5f;padding:15px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:white;margin:0;font-size:20px">COMPARATIVA DE COTIZACIONES</h1><p style="color:#93c5fd;margin:4px 0 0;font-size:14px">REQ ${req.folio} &times; ${req.cost_center_name}</p></div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px">#</th><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">PRODUCTO</th><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">CANT</th><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">UNIDAD</th>${sH}</tr></thead><tbody>${pR}${mR("SUBTOTAL",(s: SupplierData)=>s.subtotal,false)}${ivaLabelRow}${mR("TOTAL",(s: SupplierData)=>s.total,true)}${advanceR}${rebajaR}${obsR}</tbody></table><div style="text-align:center;padding:20px"><a href="${linkAprobar}" style="display:inline-block;padding:14px 48px;background:#16a34a;color:white;text-decoration:none;border-radius:6px;font-weight:bold;margin:0 10px">APROBAR COMPRA</a><a href="${linkRechazar}" style="display:inline-block;padding:14px 48px;background:#ef4444;color:white;text-decoration:none;border-radius:6px;font-weight:bold;margin:0 10px">RECHAZAR</a></div><p style="text-align:center;color:#94a3b8;font-size:10px">ARIA27 &times; Grupo Constructor Urbano Avante</p></div>`;
}

export async function GET(request: NextRequest) {
  // Rate limit público por IP: protege contra brute-force de tokens
  const clientId = getClientIdentifier(request);
  const rl = checkRateLimit(clientId, { key: "req:approve-purchase", ...RATE_LIMITS.PUBLIC });
  if (!rl.allowed) {
    log.warn("Rate limit excedido en approve-purchase", { clientId });
    return rateLimitResponse(rl);
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action");
    const proveedorElegido = searchParams.get("proveedor");

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    // Si no viene action, redirigir a la página de autorización
    if (!action) {
      return NextResponse.redirect(`${BASE_URL}/autorizar/${token}`);
    }

    const { data: reqData, error: reqError } = await supabase
      .from("requisitions")
      .select("*")
      .eq("authorization_comments", token)
      .single();

    const req = reqData as Requisition | null;
    if (reqError || !req) {
      log.error("Token lookup failed", { error: reqError?.message });
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x26A0;</div><h1 style="color:#f59e0b">Token Inv&aacute;lido o Expirado</h1></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    if (req.status !== "EN_AUTORIZACION") {
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x2139;</div><h1 style="color:#3b82f6">Ya Procesada</h1><p style="color:#94a3b8">Esta requisici&oacute;n ya fue procesada.</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    const comprasUser = await getUserByRole("compras");
    // Query items separately (no FK relationship between Requisiciones and requisition_items)
    const { data: reqItemsData } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", req.id);
    const reqItems = (reqItemsData as RequisitionItem[]) || [];

    if (action === "aprobar" || action === "AUTORIZADA") {
      const ocFolio = await getNextOCFolio();
      const cotData: CotizacionData = req.cotizacion_data || {};
      const suppliers: SupplierQuote[] = cotData.suppliers || [];
      const quotes: SupplierQuote[] = cotData.quotes || [];

      let supplierName = "N/A";
      let total = 0;
      let elegidoData: SupplierQuote | SupplierData | Record<string, never> = {};

      if (proveedorElegido) {
        elegidoData = suppliers.find((s: SupplierQuote) => s.supplier === proveedorElegido) || {};
      }
      if (!elegidoData.supplier && suppliers.length > 0) {
        const itemsDet: ItemDetail[] = cotData.items_detail || [];
        elegidoData = suppliers.reduce((best: SupplierQuote | SupplierData | Record<string, never>, s: SupplierQuote): SupplierQuote | SupplierData | Record<string, never> => {
          const sub = itemsDet.reduce((sum: number, it: ItemDetail) => sum + ((s.items_prices?.[it.product_name]||0)*(it.quantity||1)),0);
          const tr = typeof s.tax_rate === "number" ? s.tax_rate : 16;
          const iva = +(sub * (tr/100)).toFixed(2);
          const tot = +(sub + iva).toFixed(2);
          const apct = typeof s.advance_percentage === "number" ? s.advance_percentage : 0;
          const aamt = +(tot * (apct/100)).toFixed(2);
          if (!best.total || (tot > 0 && tot < best.total)) return {...s, subtotal: sub, tax_rate: tr, iva, total: tot, advance_percentage: apct, advance_amount: aamt} as SupplierData;
          return best;
        }, {} as SupplierQuote | SupplierData | Record<string, never>);
      }
      if (!elegidoData.supplier && quotes.length > 0) {
        elegidoData = quotes.reduce((m: SupplierQuote, q: SupplierQuote): SupplierQuote => (q.total ?? 0) < (m.total ?? 0) ? q : m, quotes[0]);
      }

      supplierName = elegidoData.supplier || "N/A";
      const elegTaxRate = typeof elegidoData.tax_rate === "number" ? elegidoData.tax_rate : 16;
      const elegSubtotal = Number(elegidoData.subtotal ?? 0);
      const elegIva = elegidoData.iva != null ? Number(elegidoData.iva) : +(elegSubtotal * (elegTaxRate/100)).toFixed(2);
      total = Number(elegidoData.total ?? +(elegSubtotal + elegIva).toFixed(2));
      const elegAdvPct = Number(elegidoData.advance_percentage ?? 0);
      const elegAdvAmt = Number(elegidoData.advance_amount ?? +(total * (elegAdvPct/100)).toFixed(2));

      // Bloquear OC con total $0 - redirigir a selección manual de proveedor
      if (total <= 0) {
        log.warn(`[APPROVE-PURCHASE] Bloqueada OC con total $0 para req ${req.folio}. Redirigiendo a selección manual.`);
        return new Response(
          `<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a">` +
          `<div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px;max-width:500px">` +
          `<div style="font-size:80px">&#x26A0;</div>` +
          `<h1 style="color:#f59e0b">No se puede generar la OC</h1>` +
          `<p style="color:#94a3b8;margin:15px 0">La cotización de <strong style="color:white">${req.folio}</strong> no tiene precios registrados. ` +
          `Es necesario seleccionar un proveedor con precios válidos.</p>` +
          `<a href="${BASE_URL}/autorizar/${token}" style="display:inline-block;margin-top:15px;padding:12px 36px;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;font-weight:bold">Seleccionar Proveedor</a>` +
          `</div></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      const { error: updReqErr } = await supabase.from("requisitions").update({
        status: "OC_GENERADA",
        authorization_comments: null,
        authorized_by: `magic_link:${String(token).substring(0, 12)}`,
        authorized_at: new Date().toISOString(),
        proveedor: supplierName,
        forma_pago: elegidoData.forma_pago || null,
        monto: total || null,
      }).eq("id", req.id);
      if (updReqErr) { log.error("Error update requisition", { error: updReqErr.message, req: req.folio }); throw new Error(`Error actualizando requisición ${req.folio}: ${updReqErr.message}`); }

      const { error: poInsErr } = await supabase.from("purchase_orders").insert({
        folio: ocFolio,
        requisition_id: req.id,
        supplier_name: supplierName,
        subtotal: elegSubtotal,
        tax_rate: elegTaxRate,
        iva: elegIva,
        total: total,
        advance_percentage: elegAdvPct,
        advance_amount: elegAdvAmt,
        status: "GENERADA",
        payment_method: elegidoData.forma_pago || "Transferencia",
        credit_days: elegidoData.dias_credito || 0,
        authorized_at: new Date().toISOString()
      });
      if (poInsErr) { log.error("Error insert purchase_order", { error: poInsErr.message, ocFolio }); throw new Error(`Error creando OC ${ocFolio}: ${poInsErr.message}`); }

      if (proveedorElegido && elegidoData.items_prices && reqItems) {
        for (const item of reqItems) {
          const price = elegidoData.items_prices?.[item.product_name] || 0;
          if (price > 0) {
            const { error: itemUpdErr } = await supabase.from("requisition_items").update({
              selected_supplier_name: supplierName,
              selected_price: price
            }).eq("id", item.id);
            if (itemUpdErr) log.error("Error update requisition_item", { error: itemUpdErr.message, item_id: item.id });
          }
        }
      }

      if (comprasUser) {
        try {
          await resend.emails.send({
            from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
            subject: `OC AUTORIZADA: ${ocFolio} - ${req.folio}`,
            html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#10b981;color:white;padding:25px;text-align:center"><h1 style="margin:0">Orden de Compra Autorizada</h1></div><div style="padding:25px"><div style="background:#f0fdf4;border:2px solid #10b981;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center"><div style="font-size:32px;font-weight:bold;color:#10b981">${ocFolio}</div><div style="color:#64748b">Requisici&oacute;n: ${req.folio}</div></div><p><strong>Obra:</strong> ${req.cost_center_name || "N/A"}</p><p><strong>Proveedor elegido:</strong> ${supplierName}</p><p><strong>Total:</strong> $${total.toLocaleString("es-MX", {minimumFractionDigits: 2})} MXN</p></div></div>`
          });
        } catch (emailErr: unknown) {
          log.error("Email compras OC exception", { ocFolio, error: (emailErr as Error).message });
        }
        if (comprasUser.phone) {
          await sendWhatsAppLogged("oc_generada", [req.folio, ocFolio, req.cost_center_name || "N/A", supplierName, String(total), elegidoData.forma_pago || "Transferencia"], comprasUser.phone, { origen: "oc-generada-approve", enviadoPor: "approve-purchase" });
        }
      }

      try {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
          subject: `Tu requisici\u00f3n ${req.folio} fue autorizada - ${ocFolio}`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#10b981;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisici&oacute;n Autorizada</h1></div><div style="padding:25px"><p>Tu requisici&oacute;n <strong>${req.folio}</strong> ha sido autorizada.</p><p>OC: <strong>${ocFolio}</strong></p><p>Proveedor: ${supplierName} - $${total.toLocaleString("es-MX", {minimumFractionDigits: 2})}</p></div></div>`
        });
      } catch (emailErr: unknown) {
        log.error("Email solicitante OC exception", { folio: req.folio, error: (emailErr as Error).message });
      }

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x2705;</div><h1 style="color:#10b981">Compra Autorizada</h1><p style="font-size:24px;font-weight:bold;color:#10b981">${ocFolio}</p><p style="color:#94a3b8">Requisici&oacute;n: ${req.folio}</p><p style="color:#94a3b8">Proveedor: ${supplierName} - $${total.toLocaleString("es-MX", {minimumFractionDigits: 2})}</p><p style="color:#64748b">Se notific&oacute; a Compras y al Solicitante</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });

    } else if (action === "rechazar" || action === "RECHAZADA") {
      const { error: rechErr } = await supabase.from("requisitions").update({
        status: "RECHAZADA_DIRECCION",
        authorization_comments: null
      }).eq("id", req.id);
      if (rechErr) { log.error("Error rechazar requisicion", { error: rechErr.message, req: req.folio }); throw new Error(`Error rechazando requisición ${req.folio}: ${rechErr.message}`); }

      if (comprasUser) {
        try {
          await resend.emails.send({
            from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
            subject: `RECHAZADA: ${req.folio}`,
            html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">Compra Rechazada</h1></div><div style="padding:25px"><p>La requisici&oacute;n <strong>${req.folio}</strong> fue rechazada por Direcci&oacute;n.</p></div></div>`
          });
        } catch (emailErr: unknown) {
          log.error("Email compras rechazo exception", { folio: req.folio, error: (emailErr as Error).message });
        }
      }

      try {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
          subject: `Requisici\u00f3n ${req.folio} rechazada por Direcci\u00f3n`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisici&oacute;n Rechazada</h1></div><div style="padding:25px"><p>Tu requisici&oacute;n <strong>${req.folio}</strong> fue rechazada por Direcci&oacute;n.</p></div></div>`
        });
      } catch (emailErr: unknown) {
        log.error("Email solicitante rechazo exception", { folio: req.folio, error: (emailErr as Error).message });
      }

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x274C;</div><h1 style="color:#ef4444">Compra Rechazada</h1><p style="color:#94a3b8">${req.folio}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    } else {
      return NextResponse.json({ error: `Acci\u00f3n no v\u00e1lida: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    log.error("[APPROVE-PURCHASE]", { error: String(error) });
    return NextResponse.json({ error: (error as Error)?.message || "Error interno" }, { status: 500 });
  }
}
