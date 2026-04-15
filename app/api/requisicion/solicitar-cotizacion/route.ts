import { RESEND_FROM } from "@/lib/email-config";
import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { getSupabaseAdmin } from "@/lib/supabase-server";
const supabase = getSupabaseAdmin();
import { sendWhatsAppFallback } from "@/lib/whatsapp";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";

interface LineItem {
  product_name: string;
  unit: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  const resend = getResend();

  try {
    const { folio, obra, fecha_requerida, items, proveedores, user_email } = await request.json();

    // Auth check: verificar usuario y rol
    if (!user_email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { data: callerUser } = await supabase.from("Users").select("role").eq("email", user_email).single();
    if (!callerUser || !["admin", "compras", "direccion"].includes(callerUser.role)) {
      return NextResponse.json({ error: "No autorizado para esta acción" }, { status: 403 });
    }

    // Rate limit: protege contra envío masivo de cotizaciones
    const clientId = getClientIdentifier(request, user_email);
    const rl = checkRateLimit(clientId, { key: "req:solicitar-cotizacion", ...RATE_LIMITS.EMAIL });
    if (!rl.allowed) {
      return rateLimitResponse(rl);
    }

    if (!folio || !items || !proveedores) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const daysUntil = Math.ceil((new Date(fecha_requerida).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MAÑANA" : `${daysUntil} días`;

    const materialesHtml = items.map((i: LineItem) =>
      `<tr><td style="padding:10px;border:1px solid #e2e8f0">${i.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${i.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${i.quantity}</td></tr>`
    ).join("");

    const emailHtml = `<div style="font-family:Arial;max-width:650px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:25px;text-align:center">
        <h1 style="margin:0">Solicitud de Cotización</h1>
        <p style="margin:5px 0 0;opacity:0.8">Grupo Constructor Urbano Avante</p>
      </div>
      <div style="padding:25px">
        <div style="background:#f8fafc;border-radius:8px;padding:15px;margin-bottom:20px">
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Obra:</strong> ${obra}</p>
          <p><strong>Fecha requerida:</strong> ${urgencyText}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <thead><tr style="background:#1e3a5f;color:white">
            <th style="padding:12px;text-align:left">Material</th>
            <th style="padding:12px">Unidad</th>
            <th style="padding:12px">Cantidad</th>
          </tr></thead>
          <tbody>${materialesHtml}</tbody>
        </table>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:15px;margin-top:20px">
          <p style="margin:0"><strong>Favor de enviar su cotización a:</strong></p>
          <p style="margin:5px 0">📧 compras@gcuavante.com</p>
          <p style="margin:5px 0">📱 (449) 588-0244</p>
        </div>
      </div>
      <div style="background:#f1f5f9;padding:15px;text-align:center;font-size:12px;color:#64748b">
        Sistema ARIA27 - Grupo Constructor Urbano Avante
      </div>
    </div>`;

    let emailsSent = 0;
    let whatsappSent = 0;
    let errors: string[] = [];

    for (const prov of proveedores) {
      // Email
      if (prov.email) {
        try {
          await resend.emails.send({
            from: RESEND_FROM,
            to: prov.email,
            subject: `Solicitud de Cotización - ${folio} - ${obra}`,
            html: emailHtml,
          });
          emailsSent++;
        } catch (e: unknown) {
          errors.push(`Email ${prov.name}: ${(e as {message?: string})?.message}`);
        }
      }

      // WhatsApp con plantilla
      if (prov.phone) {
        try {
          const result = await sendWhatsAppFallback(
            "solicitar_cotizacion",
            [folio, obra, urgencyText],
            prov.phone,
            `📋 *Solicitud de Cotización — ARIA27*\n\n🔖 Req: ${folio}\n🏗️ Obra: ${obra}\n⚡ Urgencia: ${urgencyText}\n\nIngresa tu cotización respondiendo este mensaje o contacta a compras.`,
            { origen: "solicitar-cotizacion", enviadoPor: user_email || "solicitar-cotizacion" }
          );
          if (result.success) whatsappSent++;
          else errors.push(`WA ${prov.name}: ${result.error}`);
        } catch (e: unknown) {
          errors.push(`WA ${prov.name}: ${(e as {message?: string})?.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      whatsappSent,
      totalProveedores: proveedores.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (e: unknown) {
    return NextResponse.json({ error: (e as {message?: string})?.message }, { status: 500 });
  }
}
