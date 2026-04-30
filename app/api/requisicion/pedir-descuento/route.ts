import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendEmailLogged } from "@/lib/email-log";
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
import { ariaEmailHeader, ariaEmailFooter, ariaEmailWrapper } from "@/lib/email-templates";

const log = logger("PEDIR-DESCUENTO");

interface UserRow { email: string; phone?: string; }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { token, item_name, supplier, precio_actual, precio_sugerido, notas, quantity, unit } = body as {
      token: string; item_name: string; supplier: string; precio_actual: number; precio_sugerido: number; notas?: string; quantity: number; unit: string;
    };

    if (!token || !item_name || !supplier || !precio_actual || !precio_sugerido) {
      return NextResponse.json({ error: "datos incompletos" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data: reqData } = await sb.from("requisitions").select("folio, cost_center_name").eq("authorization_comments", token).maybeSingle();
    if (!reqData) return NextResponse.json({ error: "Token invalido" }, { status: 404 });

    const folio = reqData.folio;
    const obra = reqData.cost_center_name || "N/A";
    const desc = ((precio_actual - precio_sugerido) / precio_actual * 100).toFixed(1);

    // Obtener usuario compras
    const { data: compras } = await sb.from("Users").select("email, phone").eq("role", "compras").maybeSingle() as { data: UserRow | null };

    if (compras?.email) {
      await sendEmailLogged({
        template: "renegociacion_descuento",
        to: compras.email,
        subject: `[NEGOCIAR] ${folio} - ${item_name} - ${supplier}`,
        html: ariaEmailWrapper(ariaEmailHeader("Solicitud de descuento") + `<div style="padding:25px;font-size:13px;color:#1e293b;line-height:1.55"><p><strong>Folio:</strong> ${folio} - ${obra}</p><div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0 0 8px;font-weight:700;color:#92400e">Item: ${item_name}</p><p style="margin:0;color:#451a03;font-size:12px">Cantidad: ${quantity} ${unit} · Proveedor: <strong>${supplier}</strong></p></div><table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0"><tr><td style="padding:6px 0;color:#475569">Precio actual cotizado:</td><td style="padding:6px 0;text-align:right;font-weight:600">$${precio_actual.toLocaleString("es-MX",{minimumFractionDigits:2})}/u</td></tr><tr><td style="padding:6px 0;color:#475569">Precio que solicita el director:</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#16a34a">$${precio_sugerido.toLocaleString("es-MX",{minimumFractionDigits:2})}/u</td></tr><tr><td style="padding:6px 0;color:#475569"><strong>Descuento solicitado:</strong></td><td style="padding:6px 0;text-align:right;color:#dc2626;font-weight:700">${desc}%</td></tr></table>${notas ? `<div style="background:#f1f5f9;border-radius:8px;padding:12px;margin:12px 0"><p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase">Notas del director</p><p style="margin:0;font-size:13px">${notas}</p></div>` : ""}<p style="color:#64748b;font-size:12px">Por favor contacta al proveedor con esta propuesta y actualiza la cotizacion en el sistema cuando recibas respuesta.</p></div>` + ariaEmailFooter()),
        origen: "renegociacion-descuento",
        enviadoPor: "pedir-descuento",
      });

      if (compras.phone) {
        await sendWhatsAppLogged("oc_generada", [folio, item_name.slice(0,40), supplier.slice(0,30), `$${precio_actual.toFixed(0)}`, `$${precio_sugerido.toFixed(0)}`, `${desc}%`], compras.phone, { origen: "descuento", enviadoPor: "pedir-descuento" }).catch(() => null);
      }
    }

    // Persistir registro (best-effort, si tabla no existe ignora)
    try {
      await sb.from("comparativa_descuentos").insert({
        folio, item_name, supplier, precio_actual, precio_sugerido, notas: notas || null, quantity, unit, status: "SOLICITADO", created_at: new Date().toISOString(),
      });
    } catch (e: unknown) {
      log.warn("comparativa_descuentos insert fallo (tabla puede no existir aun)", { err: (e as Error)?.message });
    }

    log.info("Descuento solicitado", { folio, item: item_name, supplier, precio_actual, precio_sugerido });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    log.error("error", { err: (err as Error)?.message });
    return NextResponse.json({ error: (err as Error)?.message }, { status: 500 });
  }
}
