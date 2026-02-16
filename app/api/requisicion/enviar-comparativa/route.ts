import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

    // Obtener quien creo la requisicion
    const { data: reqData } = await supabase
      .from("requisitions").select("created_by, urgency").eq("id", requisition_id).single();
    const solicitante = reqData?.created_by || "N/A";
    const urgencia = reqData?.urgency || "normal";

    const token = crypto.randomUUID();

    await supabase.from("requisitions").update({
      status: "EN_AUTORIZACION",
      authorization_comments: token,
      cotizacion_data: { quotes, items, obra, folio }
    }).eq("id", requisition_id);

    const mejor = quotes.reduce((min: any, q: any) => q.total < min.total ? q : min, quotes[0]);
    const linkAutorizar = `https://aria.jjcrm27.com/autorizar/${token}`;

    const urgBadge = urgencia === "critico" 
      ? '<span style="background:#dc2626;color:white;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:1px">CRITICO</span>'
      : urgencia === "urgente"
      ? '<span style="background:#d97706;color:white;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:1px">URGENTE</span>'
      : '';

    // EMAIL estilo Tesla - azul/gris/slate
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: director.email,
      subject: `Autorizar: ${folio} - ${obra} (${quotes.length} cotizaciones)`,
      html: `
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#0f172a;border-radius:8px;overflow:hidden;">
          
          <div style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #1e293b;">
            <div style="display:inline-flex;align-items:center;gap:8px;">
              <div style="width:28px;height:2px;background:#475569;border-radius:1px;"></div>
              <span style="color:#64748b;font-size:11px;font-weight:600;letter-spacing:3px;">ARIA27</span>
              <div style="width:28px;height:2px;background:#475569;border-radius:1px;"></div>
            </div>
            <h1 style="color:#e2e8f0;font-size:20px;font-weight:700;margin:8px 0 0;letter-spacing:-0.3px;">Autorizacion de Compra</h1>
          </div>

          <div style="padding:24px 32px;">
            <table style="width:100%;margin-bottom:20px;">
              <tr>
                <td style="padding:0 0 12px;">
                  <span style="color:#475569;font-size:9px;font-weight:600;letter-spacing:2px;display:block;margin-bottom:2px;">FOLIO</span>
                  <span style="color:#94a3b8;font-size:16px;font-weight:700;">${folio}</span>
                </td>
                <td style="padding:0 0 12px;text-align:right;">
                  <span style="color:#475569;font-size:9px;font-weight:600;letter-spacing:2px;display:block;margin-bottom:2px;">OBRA</span>
                  <span style="color:#e2e8f0;font-size:14px;font-weight:600;">${obra}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 12px;">
                  <span style="color:#475569;font-size:9px;font-weight:600;letter-spacing:2px;display:block;margin-bottom:2px;">SOLICITANTE</span>
                  <span style="color:#94a3b8;font-size:13px;font-weight:500;">${solicitante}</span>
                </td>
                <td style="padding:0 0 12px;text-align:right;">
                  ${urgBadge}
                </td>
              </tr>
            </table>

            <div style="background:#1e293b;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <span style="color:#475569;font-size:9px;font-weight:600;letter-spacing:2px;">MATERIALES</span>
              <p style="color:#94a3b8;font-size:13px;margin:4px 0 0;line-height:1.5;">${items?.join(", ") || "N/A"}</p>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <tr style="border-bottom:1px solid #1e293b;">
                <td style="padding:10px 0;color:#475569;font-size:9px;font-weight:600;letter-spacing:1.5px;">PROVEEDOR</td>
                <td style="padding:10px 0;color:#475569;font-size:9px;font-weight:600;letter-spacing:1.5px;text-align:right;">TOTAL</td>
                <td style="padding:10px 0;color:#475569;font-size:9px;font-weight:600;letter-spacing:1.5px;text-align:center;">ENTREGA</td>
                <td style="padding:10px 0;color:#475569;font-size:9px;font-weight:600;letter-spacing:1.5px;text-align:center;">PAGO</td>
              </tr>
              ${quotes.map((q: any) => `
              <tr style="border-bottom:1px solid #1e293b;${q.total === mejor.total ? "background:#172033;" : ""}">
                <td style="padding:12px 0;">
                  <span style="color:#e2e8f0;font-size:13px;font-weight:600;">${q.supplier}</span>
                  ${q.total === mejor.total ? '<span style="display:inline-block;margin-left:6px;background:#334155;color:#94a3b8;padding:2px 8px;border-radius:3px;font-size:9px;font-weight:600;letter-spacing:1px;">MEJOR</span>' : ''}
                </td>
                <td style="padding:12px 0;text-align:right;color:${q.total === mejor.total ? "#e2e8f0" : "#94a3b8"};font-size:14px;font-weight:${q.total === mejor.total ? "700" : "500"};">$${q.total?.toLocaleString?.() || q.total}</td>
                <td style="padding:12px 0;text-align:center;color:#64748b;font-size:12px;">${q.entrega || q.delivery || "-"}</td>
                <td style="padding:12px 0;text-align:center;color:#64748b;font-size:12px;">${q.forma_pago || q.payment || "-"}</td>
              </tr>
              `).join("")}
            </table>

            <div style="text-align:center;padding:20px 0;">
              <a href="${linkAutorizar}" style="display:inline-block;padding:14px 48px;background:#334155;color:#e2e8f0;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;letter-spacing:0.3px;">VER COMPARATIVA Y AUTORIZAR</a>
            </div>
          </div>

          <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
            <span style="color:#334155;font-size:10px;letter-spacing:2px;">ARIA27 · GRUPO CUAVANTE</span>
          </div>
        </div>
      `
    });

    // WhatsApp
    if (director.phone) {
      const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;
      let wp = director.phone.replace(/\D/g, "");
      if (wp.length === 10) wp = "52" + wp;
      await fetch(`https://graph.facebook.com/v22.0/${whatsappPhoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${whatsappToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: wp,
          type: "template",
          template: {
            name: "comparativa_enviar",
            language: { code: "es_MX" },
            components: [
              { type: "body", parameters: [
                { type: "text", text: folio },
                { type: "text", text: obra },
                { type: "text", text: `${mejor.supplier} $${mejor.total?.toLocaleString?.() || mejor.total}` },
                { type: "text", text: String(quotes.length) }
              ]},
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: token }] }
            ]
          }
        })
      }).then(r => r.json()).then(d => console.log("[WA]", JSON.stringify(d))).catch(e => console.error("[WA ERR]", e));
    }

    console.log("[COMPARATIVA] Enviado a:", director.email, director.phone);
    return NextResponse.json({ success: true, enviado_a: director.email });
  } catch (error: any) {
    console.error("[COMPARATIVA] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
