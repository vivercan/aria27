import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const BASE_URL = "https://aria.jjcrm27.com";

// Obtener usuario por ROL (dinamico)
async function getUserByRole(role: string) {
  const { data } = await supabase.from("Users").select("*").eq("role", role).single();
  return data;
}

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);

  try {
    const body = await request.json();

    // Soportar AMBOS formatos:
    // Formato A (tramite): { requisition, items, total, token }
    // Formato B (capturar): { requisitionId, cotizacion }
    const reqId = body.requisitionId || body.requisition?.id;
    const cotizacion = body.cotizacion || {
      supplier_name: body.items?.[0]?.selected_supplier || "Varios",
      items: (body.items || []).map((item: any) => ({
        product_name: item.product_name || item.name || item.nombre,
        quantity: item.quantity || item.cantidad || 1,
        unit: item.unit || item.unidad || "PZA",
        unit_price: item.selected_price || item.unit_price || 0
      }))
    };

    if (!reqId) {
      return NextResponse.json({ error: "Falta requisitionId o requisition" }, { status: 400 });
    }

    const { data: req, error } = await supabase
      .from("Requisiciones")
      .select("*")
      .eq("id", reqId)
      .single();

    if (error || !req) {
      return NextResponse.json({ error: "Requisicion no encontrada" }, { status: 404 });
    }

    const token = crypto.randomUUID();
    const total = body.total || cotizacion.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

    await supabase.from("Requisiciones").update({
      status: "EN_AUTORIZACION",
      authorization_comments: token,
      cotizacion_data: cotizacion
    }).eq("id", reqId);

    // Obtener direccion (autorizador) dinamicamente por ROL
    const autorizadorUser = await getUserByRole("direccion");

    const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MANANA" : `${daysUntil} dias`;
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";

    const approveUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA`;
    const rejectUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA`;

    const itemsHtml = cotizacion.items.map((item: any) => 
      `<tr><td style="padding:10px;border:1px solid #e2e8f0">${item.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${item.quantity} ${item.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:right">$${item.unit_price.toLocaleString()}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:right">$${(item.quantity * item.unit_price).toLocaleString()}</td></tr>`
    ).join("");

    if (autorizadorUser) {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: autorizadorUser.email,
        subject: `AUTORIZAR: ${req.folio} - $${total.toLocaleString()} - ${urgencyText}`,
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
        </div>`
      });

      if (autorizadorUser.phone) {
        const materialesWA = cotizacion.items.map((item: any) => `${item.product_name} ${item.quantity} ${item.unit}`).join(", ");
        await sendWhatsAppTemplate("compra_autorizar", [req.folio, req.cost_center_name, req.created_by || "N/A", urgencyText, materialesWA, `$${total.toLocaleString()}`], autorizadorUser.phone, token);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Enviado a autorizacion: ${autorizadorUser?.email || 'N/A'}`,
      total 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





