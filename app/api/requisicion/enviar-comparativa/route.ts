import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { requisition_id, folio, obra, quotes, items } = await req.json();

    console.log("[COMPARATIVA] Recibido:", { requisition_id, folio, obra, quotesCount: quotes?.length, items });

    const { data: director, error: dirError } = await supabase
      .from("Users").select("*").eq("role", "direccion").single();

    if (!director) {
      console.log("[COMPARATIVA] No hay director:", dirError?.message);
      return NextResponse.json({ error: "No se encontro director" }, { status: 404 });
    }

    // Generar token único para autorización pública
    const token = crypto.randomUUID();

    // Guardar cotizaciones y token en la requisición
    await supabase.from("requisitions").update({
      status: "EN_AUTORIZACION",
      authorization_comments: token,
      cotizacion_data: { quotes, items, obra, folio }
    }).eq("id", requisition_id);

    const mejor = quotes.reduce((min: any, q: any) => q.total < min.total ? q : min, quotes[0]);
    const linkAutorizar = `https://aria.jjcrm27.com/autorizar/${token}`;

    // EMAIL con comparativa y botones
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: director.email,
      subject: `Autorizar: ${folio} - ${obra} (${quotes.length} cotizaciones)`,
      html: `
        <div style="font-family:Arial;max-width:650px;margin:0 auto;background:#0f172a;color:white;padding:30px;border-radius:12px;">
          <h2 style="color:#22d3ee;margin:0 0 5px;">Comparativa de Cotizaciones</h2>
          <p style="color:#94a3b8;margin:0 0 20px;">Requiere tu autorización</p>
          <p><strong>Requisición:</strong> ${folio}</p>
          <p><strong>Obra:</strong> ${obra}</p>
          <p><strong>Materiales:</strong> ${items?.join(", ") || "N/A"}</p>
          <hr style="border-color:#334155;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#1e293b;">
              <th style="padding:10px;text-align:left;color:#94a3b8;">Proveedor</th>
              <th style="padding:10px;text-align:right;color:#94a3b8;">Total</th>
            </tr>
            ${quotes.map((q: any) => `
              <tr style="border-bottom:1px solid #334155;${q.total === mejor.total ? "background:#064e3b;" : ""}">
                <td style="padding:10px;color:white;">${q.supplier}${q.total === mejor.total ? " ★" : ""}</td>
                <td style="padding:10px;text-align:right;color:${q.total === mejor.total ? "#34d399" : "white"};font-weight:bold;">$${q.total?.toLocaleString?.() || q.total}</td>
              </tr>
            `).join("")}
          </table>
          <hr style="border-color:#334155;margin:20px 0;">
          <p style="color:#22d3ee;">Mejor precio: <strong>${mejor.supplier} - $${mejor.total?.toLocaleString?.() || mejor.total}</strong></p>
          <div style="text-align:center;margin-top:25px;">
            <a href="${linkAutorizar}" style="display:inline-block;padding:15px 40px;background:linear-gradient(135deg,#10b981,#059669);color:white;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px;">VER COMPARATIVA Y AUTORIZAR</a>
          </div>
        </div>
      `
    });

    // WhatsApp
    if (director.phone) {
      await sendWhatsAppTemplate(
        "comparativa_enviar",
        [folio, obra, `${mejor.supplier} $${mejor.total?.toLocaleString?.() || mejor.total}`, String(quotes.length)],
        director.phone,
        requisition_id
      );
    }

    console.log("[COMPARATIVA] Enviado a:", director.email, director.phone);
    return NextResponse.json({ success: true, enviado_a: director.email });
  } catch (error: any) {
    console.error("[COMPARATIVA] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
