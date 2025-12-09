import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  
  try {
    const { requisition, items, supplier, total, token } = await request.json();
    
    const BASE_URL = "https://aria.jjcrm27.com";
    const approveUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=APROBADA`;
    const rejectUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA`;

    const itemsHtml = items.map((i: any) =>
      `<tr><td style="padding:8px;border:1px solid #ddd">${i.product_name}</td><td style="padding:8px;border:1px solid #ddd;text-align:center">${i.quantity}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">$${(i.unit_cost || 0).toLocaleString()}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">$${(i.total_cost || 0).toLocaleString()}</td></tr>`
    ).join("");

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "timonfx@hotmail.com",
      subject: `AUTORIZAR: Compra ${requisition.folio} - $${total.toLocaleString()}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#7c3aed;color:white;padding:20px;text-align:center">
            <h1 style="margin:0">Autorización de Compra</h1>
          </div>
          <div style="padding:20px;background:#f8fafc">
            <div style="background:white;padding:15px;border-radius:8px;margin-bottom:20px">
              <p style="margin:5px 0"><strong>Folio:</strong> ${requisition.folio}</p>
              <p style="margin:5px 0"><strong>Obra:</strong> ${requisition.cost_center_name}</p>
              <p style="margin:5px 0"><strong>Proveedor:</strong> ${supplier.name}</p>
              <p style="margin:5px 0"><strong>Forma de pago:</strong> ${supplier.payment_method}${supplier.credit_days > 0 ? ` (${supplier.credit_days} días)` : ""}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <tr style="background:#1e3a5f;color:white">
                <th style="padding:10px;text-align:left">Material</th>
                <th style="padding:10px">Cant.</th>
                <th style="padding:10px;text-align:right">P.Unit</th>
                <th style="padding:10px;text-align:right">Total</th>
              </tr>
              ${itemsHtml}
              <tr style="background:#f0fdf4;font-weight:bold">
                <td colspan="3" style="padding:10px;text-align:right">TOTAL:</td>
                <td style="padding:10px;text-align:right;color:#10b981">$${total.toLocaleString()}</td>
              </tr>
            </table>
            <div style="text-align:center;margin:30px 0">
              <a href="${approveUrl}" style="display:inline-block;background:#10b981;color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold;margin:5px">AUTORIZAR</a>
              <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:12px 30px;text-decoration:none;border-radius:25px;font-weight:bold;margin:5px">RECHAZAR</a>
            </div>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
