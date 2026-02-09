import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { requisition_id, folio, obra, quotes, items } = await req.json();

    const { data: director } = await supabase.from("Users").select("*").eq("role", "direccion").single();
    if (!director) return NextResponse.json({ error: "No se encontro director" }, { status: 404 });

    const mejor = quotes.reduce((min: any, q: any) => q.total < min.total ? q : min, quotes[0]);
    const linkComparativa = `https://aria.jjcrm27.com/dashboard/requisiciones/requisiciones/tramite/capturar?req=${requisition_id}`;

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: director.email,
      subject: `Comparativa ${folio} - ${obra} (${quotes.length} proveedores)`,
      html: `
        <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0f172a;color:white;padding:30px;border-radius:12px;">
          <h2 style="color:#22d3ee;">Comparativa de Cotizaciones</h2>
          <p><strong>Requisicion:</strong> ${folio}</p>
          <p><strong>Obra:</strong> ${obra}</p>
          <p><strong>Materiales:</strong> ${items.join(", ")}</p>
          <hr style="border-color:#334155;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#1e293b;">
              <th style="padding:10px;text-align:left;color:#94a3b8;">Proveedor</th>
              <th style="padding:10px;text-align:right;color:#94a3b8;">Total</th>
              <th style="padding:10px;text-align:center;color:#94a3b8;">Credito</th>
              <th style="padding:10px;text-align:center;color:#94a3b8;">Entrega</th>
            </tr>
            ${quotes.map((q: any) => `
              <tr style="border-bottom:1px solid #334155;${q.total === mejor.total ? "background:#064e3b;" : ""}">
                <td style="padding:10px;color:white;">${q.supplier}${q.total === mejor.total ? " ★" : ""}</td>
                <td style="padding:10px;text-align:right;color:${q.total === mejor.total ? "#34d399" : "white"};font-weight:bold;">$${q.total.toLocaleString()}</td>
                <td style="padding:10px;text-align:center;color:#94a3b8;">${q.credito}d</td>
                <td style="padding:10px;text-align:center;color:#94a3b8;">${q.entrega}d</td>
              </tr>
            `).join("")}
          </table>
          <hr style="border-color:#334155;margin:20px 0;">
          <p style="color:#22d3ee;">Mejor precio: <strong>${mejor.supplier} - $${mejor.total.toLocaleString()}</strong></p>
          <a href="${linkComparativa}" style="display:inline-block;margin-top:15px;padding:12px 30px;background:linear-gradient(135deg,#10b981,#059669);color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Ver Comparativa Completa</a>
        </div>
      `
    });

    // WhatsApp con plantilla + botón dinámico
    if (director.phone) {
      await sendWhatsAppTemplate(
        "comparativa_enviar",
        [folio, obra, `${mejor.supplier} $${mejor.total.toLocaleString()}`, String(quotes.length)],
        director.phone,
        requisition_id
      );
    }

    return NextResponse.json({ success: true, enviado_a: director.email });
  } catch (error: any) {
    console.error("Error enviar comparativa:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
