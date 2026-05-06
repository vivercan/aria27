import { NextResponse, NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendEmailLogged } from "@/lib/email-log";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";
import { notifyOps } from "@/lib/notify-ops";
import { logger } from "@/lib/logger";

const log = logger("REQ-EXPRESS");

async function getNextFolio(sb: ReturnType<typeof getSupabaseAdmin>) {
  const prefix = "REQ-" + new Date().getFullYear() + "-";
  const { data } = await sb.from("requisitions")
    .select("folio")
    .like("folio", prefix + "%")
    .order("folio", { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return prefix + "00001";
  const last = (data[0] as { folio: string }).folio.split("-")[2];
  return prefix + String(Number(last) + 1).padStart(5, "0");
}

interface Item { name: string; qty: number; unit?: string }
interface Cot { supplier_name: string; precios: Record<string, number> }

export async function POST(req: NextRequest) {
  const sb = getSupabaseAdmin();
  try {
    const body = await req.json();
    const userEmail = req.headers.get("x-user-email") || body.actor || "compras@gcuavante.com";
    const obra = String(body.obra_nombre || "").trim();
    const motivo = String(body.motivo || "").trim();
    const items: Item[] = Array.isArray(body.items) ? body.items : [];
    const cotizaciones: Cot[] = Array.isArray(body.cotizaciones) ? body.cotizaciones : [];

    if (!obra || !motivo || items.length === 0 || cotizaciones.length < 3) {
      return NextResponse.json({ error: "Faltan: obra, motivo, items y minimo 3 proveedores" }, { status: 400 });
    }

    const folio = await getNextFolio(sb);

    const { data: reqRow, error: reqErr } = await sb.from("requisitions").insert({
      folio,
      cost_center_name: obra,
      created_by: userEmail,
      motivo_solicitud: motivo,
      descripcion_compra: "EXPRESS",
      urgency: "NORMAL",
      status: "EN_AUTORIZACION",
    }).select("id").single();

    if (reqErr) {
      log.error("insert requisition fallo", { err: reqErr.message });
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }
    const reqId = (reqRow as { id: number }).id;

    await sb.from("requisition_items").insert(items.map(it => ({
      requisition_id: reqId,
      product_name: String(it.name).trim(),
      quantity: Number(it.qty) || 1,
      unit: String(it.unit || "PZA").trim(),
    })));

    const quotes = cotizaciones.map(c => {
      const subtotal = items.reduce((s: number, it) => s + ((Number(c.precios?.[it.name]) || 0) * (Number(it.qty) || 1)), 0);
      const iva = subtotal * 0.16;
      return {
        supplier: c.supplier_name,
        items_prices: c.precios || {},
        subtotal,
        iva,
        tax_rate: 0.16,
        total: subtotal + iva,
      };
    });

    await sb.from("requisitions").update({
      cotizacion_data: { quotes, items: items.map(it => it.name) },
    }).eq("id", reqId);

    const mejor = Math.min(...quotes.map(q => q.total));

    const { data: director } = await sb.from("Users").select("email").eq("role", "direccion").single();
    if ((director as { email?: string })?.email) {
      const html = ariaEmailWrapper(
        ariaEmailHeader("[EXPRESS] Comparativa directa de Compras") +
        "<div style=\"padding:25px;font-size:14px;color:#1e293b;line-height:1.6\">" +
        "<p style=\"background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:6px;margin:0 0 18px\"><strong>Tipo:</strong> Comparativa Express. Cotizaciones obtenidas afuera del sistema y capturadas directo por Compras.</p>" +
        "<table style=\"width:100%;font-size:13px\">" +
        "<tr><td style=\"color:#64748b;padding:4px 0\">Folio:</td><td><strong>" + folio + "</strong></td></tr>" +
        "<tr><td style=\"color:#64748b;padding:4px 0\">Obra:</td><td>" + obra + "</td></tr>" +
        "<tr><td style=\"color:#64748b;padding:4px 0\">Motivo:</td><td>" + motivo + "</td></tr>" +
        "<tr><td style=\"color:#64748b;padding:4px 0\">Items:</td><td>" + items.length + "</td></tr>" +
        "<tr><td style=\"color:#64748b;padding:4px 0\">Proveedores:</td><td>" + cotizaciones.length + "</td></tr>" +
        "<tr><td style=\"color:#64748b;padding:4px 0\">Mejor precio total:</td><td><strong style=\"color:#16a34a\">$" + mejor.toLocaleString("es-MX",{minimumFractionDigits:2}) + " MXN</strong></td></tr>" +
        "</table>" +
        "<p style=\"margin-top:18px;color:#64748b;font-size:12px\">Ingresa al sistema para revisar el detalle por proveedor y autorizar.</p>" +
        "</div>" + ariaEmailFooter()
      );
      await sendEmailLogged({
        template: "requisicion_comparativa_express",
        to: (director as { email: string }).email,
        subject: "[EXPRESS] " + folio + " - " + obra,
        html,
        origen: "req-express",
        enviadoPor: userEmail,
      });
    }

    await notifyOps({
      evento: "COTIZACION_ENVIADA",
      resumen: "[EXPRESS] " + folio + " " + obra + " - " + motivo,
      detalle: "Comparativa Express por Compras\nItems: " + items.length + "\nProveedores: " + cotizaciones.length + "\nMejor: $" + mejor.toLocaleString("es-MX",{minimumFractionDigits:2}),
      actor: userEmail,
      metadata: { folio, obra, express: true, num_proveedores: cotizaciones.length, num_items: items.length, mejor_total: mejor },
    }).catch(() => { /* best-effort */ });

    return NextResponse.json({ success: true, folio, requisition_id: reqId });
  } catch (e: unknown) {
    log.error("[REQ-EXPRESS]", e);
    return NextResponse.json({ error: (e as Error)?.message || "Error interno" }, { status: 500 });
  }
}
