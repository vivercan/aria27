import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const BASE_URL = "https://aria.jjcrm27.com";

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  try {
    const { requisition, items, suppliers, total, token, daysUntil } = await request.json();

    const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MANANA" : `${daysUntil} dias`;
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const fechaReq = new Date(requisition.required_date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const approveUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZAR`;
    const rejectUrl = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZAR`;

    const itemsHtml = items.map((item: any) => {
      const subtotal = (item.selected_price || 0) * item.quantity;
      return `<tr><td style="padding:10px;border:1px solid #e2e8f0">${item.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${item.quantity} ${item.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:right">$${subtotal.toLocaleString()}</td></tr>`;
    }).join("");

    // EMAIL DIRECCION
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>", to: "timonfx@hotmail.com",
      subject: `💰 AUTORIZAR: ${requisition.folio} - $${total.toLocaleString()} MXN`,
      html: `<div style="font-family:Arial;max-width:700px;margin:0 auto"><div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:30px;text-align:center"><h1 style="margin:0">AUTORIZACIÓN DE COMPRA</h1></div><div style="background:${urgencyColor};color:white;padding:20px;text-align:center"><div style="font-size:36px;font-weight:bold">${urgencyText}</div><div>${fechaReq}</div></div><div style="padding:25px"><table style="width:100%;margin-bottom:20px"><tr><td style="padding:8px;background:#f1f5f9;border-radius:4px"><div style="color:#64748b;font-size:12px">FOLIO</div><div style="font-weight:bold;font-size:18px">${requisition.folio}</div></td><td style="padding:8px;background:#f1f5f9;border-radius:4px"><div style="color:#64748b;font-size:12px">OBRA</div><div style="font-weight:bold">${requisition.cost_center_name}</div></td><td style="padding:8px;background:#10b981;border-radius:4px;text-align:center"><div style="color:white;font-size:12px">TOTAL</div><div style="font-weight:bold;font-size:24px;color:white">$${total.toLocaleString()}</div></td></tr></table><table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:right">Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table><div style="text-align:center;margin:30px 0"><a href="${approveUrl}" style="display:inline-block;background:#10b981;color:white;padding:18px 50px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:18px;margin:10px">✅ AUTORIZAR</a><a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:white;padding:18px 50px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:18px;margin:10px">❌ RECHAZAR</a></div></div></div>`
    });

    // WHATSAPP DIRECCION - PLANTILLA compra_autorizar
    await sendWhatsAppTemplate("compra_autorizar", [
      requisition.folio,
      requisition.cost_center_name,
      total.toLocaleString(),
      urgencyText,
      token
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
