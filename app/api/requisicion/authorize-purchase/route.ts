import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://aria.jjcrm27.com";
const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";
const PHONE_NUMBER_ID = "869940452874474";
const TEST_PHONE = "528112392266";

async function sendWhatsAppText(message: string) {
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) return null;
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: TEST_PHONE,
        type: "text",
        text: { preview_url: true, body: message }
      })
    });
    return await response.json();
  } catch (e) {
    console.error("WhatsApp error:", e);
    return null;
  }
}

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  try {
    const { requisition, items, suppliers, total, token, daysUntil } = await request.json();

    const itemsHtml = items.map((item: any) => {
      const supplier = suppliers?.find((s: any) => s.supplier?.id === item.selected_supplier_id)?.supplier;
      const subtotal = (item.selected_price || 0) * item.quantity;
      return `<tr>
        <td style="padding:10px;border:1px solid #e2e8f0">${item.product_name}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${item.quantity} ${item.unit}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">$${(item.selected_price || 0).toLocaleString()}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;font-weight:bold">$${subtotal.toLocaleString()}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${supplier?.name || "N/A"}</td>
      </tr>`;
    }).join("");

    const supplierSummary = (suppliers || []).map((s: any) => `
      <div style="background:#f8fafc;border-radius:8px;padding:15px;margin:10px 0">
        <div style="font-weight:bold;color:#1e3a5f;font-size:16px">${s.supplier?.name}</div>
        <div style="color:#64748b;font-size:14px">${s.supplier?.payment_method}${s.supplier?.credit_days > 0 ? ` - ${s.supplier?.credit_days} dias credito` : ""}</div>
        ${s.supplier?.bank_name && s.supplier?.bank_name !== "PAGO EN EFECTIVO" ? `
          <div style="margin-top:8px;padding:8px;background:#e2e8f0;border-radius:4px;font-family:monospace;font-size:12px">
            <div><strong>Banco:</strong> ${s.supplier?.bank_name}</div>
            <div><strong>CLABE:</strong> ${s.supplier?.bank_clabe || "N/A"}</div>
          </div>
        ` : s.supplier?.bank_name === "PAGO EN EFECTIVO" ? `<div style="color:#f59e0b;font-weight:bold;margin-top:5px">PAGO EN EFECTIVO</div>` : ""}
        <div style="text-align:right;font-size:18px;font-weight:bold;color:#10b981;margin-top:10px">$${s.total?.toLocaleString()}</div>
      </div>
    `).join("");

    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const urgencyText = daysUntil <= 0 ? "HOY!" : daysUntil === 1 ? "MANANA!" : `${daysUntil} dias`;

    const approveUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZAR`;
    const rejectUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZAR`;

    const fechaRequerida = new Date(requisition.required_date).toLocaleDateString("es-MX", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    const materialesList = items.map((item: any, i: number) => {
      const subtotal = (item.selected_price || 0) * item.quantity;
      return `${i + 1}. ${item.product_name} - ${item.quantity} ${item.unit} - $${subtotal.toLocaleString()}`;
    }).join("\n");

    // Email a Direccion
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "timonfx@hotmail.com",
      subject: `AUTORIZAR COMPRA: ${requisition.folio} - $${total.toLocaleString()} MXN`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;background:#ffffff">
          <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:white;padding:30px;text-align:center">
            <h1 style="margin:0;font-size:28px">AUTORIZACION DE COMPRA</h1>
            <p style="margin:10px 0 0;opacity:0.8">Sistema ARIA27 - Grupo Constructor Avante</p>
          </div>
          <div style="background:${urgencyColor};color:white;padding:20px;text-align:center">
            <div style="font-size:14px;opacity:0.9">FECHA REQUERIDA</div>
            <div style="font-size:36px;font-weight:bold">${urgencyText}</div>
            <div style="font-size:14px;margin-top:5px">${fechaRequerida}</div>
          </div>
          <div style="padding:25px">
            <table style="width:100%;margin-bottom:20px">
              <tr>
                <td style="padding:8px;background:#f1f5f9;border-radius:4px">
                  <div style="color:#64748b;font-size:12px">FOLIO</div>
                  <div style="font-weight:bold;font-size:18px;color:#1e3a5f">${requisition.folio}</div>
                </td>
                <td style="padding:8px;background:#f1f5f9;border-radius:4px">
                  <div style="color:#64748b;font-size:12px">OBRA/DESTINO</div>
                  <div style="font-weight:bold;color:#1e3a5f">${requisition.cost_center_name}</div>
                </td>
                <td style="padding:8px;background:#10b981;border-radius:4px;text-align:center">
                  <div style="color:white;font-size:12px">TOTAL</div>
                  <div style="font-weight:bold;font-size:24px;color:white">$${total.toLocaleString()}</div>
                </td>
              </tr>
            </table>
            <h3 style="color:#1e3a5f">Detalle de la compra:</h3>
            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <thead>
                <tr style="background:#1e3a5f;color:white">
                  <th style="padding:12px;text-align:left">Material</th>
                  <th style="padding:12px">Cantidad</th>
                  <th style="padding:12px">Precio Unit.</th>
                  <th style="padding:12px;text-align:right">Subtotal</th>
                  <th style="padding:12px">Proveedor</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <h3 style="color:#1e3a5f">Resumen por proveedor:</h3>
            ${supplierSummary}
            <div style="text-align:center;margin:30px 0">
              <a href="${approveUrl}" style="display:inline-block;background:#10b981;color:white;padding:18px 50px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:18px;margin:10px">AUTORIZAR</a>
              <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:18px 50px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:18px;margin:10px">RECHAZAR</a>
            </div>
          </div>
        </div>
      `
    });

    // WhatsApp a Direccion
    await sendWhatsAppText(`*AUTORIZAR COMPRA*

Folio: ${requisition.folio}
Obra: ${requisition.cost_center_name}
Urgencia: ${urgencyText}
Para: ${fechaRequerida}

*TOTAL: $${total.toLocaleString()} MXN*

*Materiales:*
${materialesList}

*AUTORIZAR:*
${approveUrl}

*RECHAZAR:*
${rejectUrl}

_ARIA27 ERP_`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
