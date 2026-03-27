import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const BASE_URL = "https://aria.jjcrm27.com";

async function getUserByRole(role: string) {
  const { data } = await supabase.from("Users").select("*").eq("role", role).single();
  return data;
}

async function getUserByEmail(email: string) {
  const { data } = await supabase.from("Users").select("*").eq("email", email).single();
  return data;
}

export async function GET(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action");

    if (!token || !action) {
      return new Response("Parametros invalidos", { status: 400 });
    }

    const ALLOWED_ACTIONS = ["APROBADA", "RECHAZADA"];
    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response("Accion no permitida", { status: 403 });
    }

    const { data: req, error } = await supabase
      .from("Requisiciones")
      .select("*")
      .eq("authorization_comments", token)
      .single();

    if (error || !req) {
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fef2f2"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">❌</div><h1 style="color:#ef4444">Token Invalido</h1><p style="color:#64748b">Esta requisicion ya fue procesada o el enlace expiro.</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    if (req.status !== "PENDIENTE" && req.status !== "EN_VALIDACION") {
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fefce8"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">⚠️</div><h1 style="color:#f59e0b">Ya Procesada</h1><p style="color:#64748b">${req.folio} ya tiene estado: ${req.status}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    await supabase.from("Requisiciones").update({ status: action, authorization_comments: null }).eq("id", req.id);

    if (action === "APROBADA") {
      const comprasUser = await getUserByRole("compras");

      const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MAÑANA" : `${daysUntil} días`;
      const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
      const fechaReq = new Date(req.required_date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      const { data: items } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
      const materialesHtml = (items || []).map((m: any) => `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.quantity}</td><td style="padding:10px;border:1px solid #e2e8f0">${m.comments || "-"}</td></tr>`).join("");
      const tablaHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:left">Obs</th></tr></thead><tbody>${materialesHtml}</tbody></table>`;

      if (comprasUser) {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
          subject: `COTIZAR: ${req.folio} - ${urgencyText}`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#3b82f6;color:white;padding:25px;text-align:center"><h1 style="margin:0">Nueva Requisicion para Compras</h1></div><div style="background:${urgencyColor};color:white;padding:20px;text-align:center"><div style="font-size:36px;font-weight:bold">${urgencyText}</div><div>para surtir - ${fechaReq}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${req.folio}</p><p><strong>Obra:</strong> ${req.cost_center_name}</p><p><strong>Solicitante:</strong> ${req.created_by}</p></div>${tablaHtml}<div style="text-align:center;margin-top:30px"><a href="${BASE_URL}/dashboard/requisiciones/requisiciones/tramite" style="display:inline-block;background:#3b82f6;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">IR A COTIZAR</a></div></div></div>`
        });
        if (comprasUser.phone) {
          const materialesResumen = (items || []).map((m: any) => `${m.product_name} (${m.quantity} ${m.unit})`).join(", ");
        await sendWhatsAppTemplate("requisicion_compras", [req.folio, req.cost_center_name, urgencyText, materialesResumen], comprasUser.phone);
        }
      }

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0fdf4"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">✅</div><h1 style="color:#10b981">Requisicion Validada</h1><p style="color:#64748b">${req.folio}</p><p>Se notifico a Compras (${comprasUser?.email || 'N/A'})</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    } else {
      // RECHAZADA - Notificar al creador por EMAIL + WHATSAPP
      const creatorUser = await getUserByEmail(req.user_email);
      
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
        subject: `Requisicion ${req.folio} rechazada`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisicion Rechazada</h1></div><div style="padding:25px"><p>Tu requisicion <strong>${req.folio}</strong> ha sido rechazada por el validador.</p><p>Contacta a tu supervisor para mas informacion.</p></div></div>`
      });

      // WhatsApp al creador
      if (creatorUser?.phone) {
        await sendWhatsAppTemplate("requisicion_rechazada", [req.folio, req.cost_center_name, "RECHAZADA", "Por validador"], creatorUser.phone);
      }

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fef2f2"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">❌</div><h1 style="color:#ef4444">Requisicion Rechazada</h1><p style="color:#64748b">${req.folio}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }
  } catch (error) {
    console.error("[VALIDATE]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
