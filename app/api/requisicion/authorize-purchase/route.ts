import { NextResponse, NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
const supabase = getSupabaseAdmin();
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmailLogged } from "@/lib/email-log";
const log = logger("AUTHORIZE-PURCHASE");

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";

interface CotizacionItem {
  product_name?: string;
  name?: string;
  nombre?: string;
  quantity?: number;
  cantidad?: number;
  unit?: string;
  unidad?: string;
  unit_price?: number;
  selected_price?: number;
  selected_supplier?: string;
}

interface CotizacionData {
  supplier_name: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }>;
}

interface Requisicion {
  id: string;
  folio: string;
  cost_center_name: string;
  created_by: string;
  required_date: string;
}

interface Usuario {
  email: string;
  phone?: string;
}

// Obtener usuario por ROL (dinamico)
async function getUserByRole(role: string): Promise<Usuario | null> {
  const { data, error } = await supabase.from("Users").select("email,phone").eq("role", role).limit(1).maybeSingle();
  if (error) { log.error("getUserByRole error:", error?.message); return null; }
  return data;
}

export async function POST(request: Request) {
  const req = new NextRequest(request);
  const rl = checkRateLimit(getClientIdentifier(req), { key: "req:auth-purchase", ...RATE_LIMITS.WRITE });
  if (!rl.allowed) return rateLimitResponse(rl);
  try {
    const body = await request.json().catch(() => ({}));

    // Soportar AMBOS formatos:
    // Formato A (tramite): { requisition, items, total, token }
    // Formato B (capturar): { requisitionId, cotizacion }
    const reqId = body.requisitionId || body.requisition?.id;
    const cotizacion: CotizacionData = body.cotizacion || {
      supplier_name: body.items?.[0]?.selected_supplier || "Varios",
      items: (body.items || []).map((item: CotizacionItem) => {
        const mapped = {
          product_name: (item.product_name || item.name || item.nombre) as string,
          quantity: (item.quantity || item.cantidad || 1) as number,
          unit: (item.unit || item.unidad || "PZA") as string,
          unit_price: (item.selected_price || item.unit_price || 0) as number
        };
        return mapped;
      })
    };

    if (!reqId) {
      return NextResponse.json({ error: "Falta requisitionId o requisition" }, { status: 400 });
    }

    const { data: reqRaw, error } = await supabase
      .from("requisitions")
      .select("*")
      .eq("id", reqId)
      .single();

    const req = reqRaw as Requisicion | null;

    if (error || !req) {
      return NextResponse.json({ error: "Requisicion no encontrada" }, { status: 404 });
    }

    const token = crypto.randomUUID();
    const total = body.total || cotizacion.items.reduce((sum: number, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);

    const { error: updateError } = await supabase.from("requisitions").update({
      status: "EN_AUTORIZACION",
      authorization_comments: token,
      cotizacion_data: cotizacion
    }).eq("id", reqId);
    if (updateError) throw updateError;

    // Obtener direccion (autorizador) dinamicamente por ROL
    const autorizadorUser = await getUserByRole("direccion");

    const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MAÑANA" : `${daysUntil} días`;
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const approveUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA`;
    const rejectUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA`;

    const itemsHtml = cotizacion.items.map((item) =>
      `<tr><td style="padding:10px;border:1px solid #e2e8f0">${item.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${item.quantity} ${item.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:right">$${(item.unit_price || 0).toLocaleString()}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:right">$${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}</td></tr>`
    ).join("");

    if (autorizadorUser) {
      const emailResult = await sendEmailLogged({
        template: "requisicion_autorizar_oc_direccion",
        to: autorizadorUser.email,
        subject: `[AUTORIZAR] ${req.folio} - $${total.toLocaleString()} - ${urgencyText}`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:white;padding:25px;text-align:center">
              <h1 style="margin:0">Solicitud de Autorizacion</h1>
            </div>
            <div style="background:${urgencyColor};color:white;padding:15px;text-align:center">
              <div style="font-size:28px;font-weight:bold">${urgencyText} - $${total.toLocaleString()} MXN</div>
            </div>
            <div style="padding:25px">
              <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px">
                <p><strong>Folio:</strong> ${req.folio}</p>
                <p><strong>Obra:</strong> ${req.cost_center_name}</p>
                <p><strong>Solicitante:</strong> ${req.created_by}</p>
                <p><strong>Proveedor:</strong> ${cotizacion.supplier_name}</p>
              </div>
              <table style="width:100%;border-collapse:collapse;margin:20px 0">
                <thead><tr style="background:#1e3a5f;color:white">
                  <th style="padding:12px;text-align:left">Material</th>
                  <th style="padding:12px">Cantidad</th>
                  <th style="padding:12px;text-align:right">P.U.</th>
                  <th style="padding:12px;text-align:right">Importe</th>
                </tr></thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot><tr style="background:#f1f5f9;font-weight:bold">
                  <td colspan="3" style="padding:12px;text-align:right">TOTAL:</td>
                  <td style="padding:12px;text-align:right">$${total.toLocaleString()}</td>
                </tr></tfoot>
              </table>
              <div style="text-align:center;margin:30px 0">
                <a href="${approveUrl}" style="display:inline-block;background:#10b981;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">AUTORIZAR</a>
                <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold;margin:5px">RECHAZAR</a>
              </div>
            </div>
          </div>`,
        origen: "authorize-purchase-direccion",
        enviadoPor: "authorize-purchase",
      });
      if (!emailResult.success) {
        log.error("Email autorizador error", { folio: req.folio, error: emailResult.error });
      }

      if (autorizadorUser.phone) {
        const materialesWA = cotizacion.items.map((item) => `${item.product_name} ${item.quantity} ${item.unit}`).join(", ");
        await sendWhatsAppLogged("compra_autorizar", [req.folio, req.cost_center_name, req.created_by || "N/A", urgencyText, materialesWA, `$${total.toLocaleString()}`], autorizadorUser.phone, { origen: "compra-autorizar", enviadoPor: "authorize-purchase", buttonToken: token });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Enviado a autorizacion: ${autorizadorUser?.email || 'N/A'}`,
      total 
    });

  } catch (error: unknown) {
    log.error("[AUTHORIZE-PURCHASE]", error);
    return NextResponse.json({ error: (error as Error)?.message || "Error interno" }, { status: 500 });
  }
}





