import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { sendWhatsAppLogged } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";
const log = logger("REQ-VALIDATE");

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://aria.jjcrm27.com";

interface User {
  id: string;
  email: string;
  role: string;
  phone?: string;
  [key: string]: unknown;
}

async function getUserByRole(role: string): Promise<User | null> {
  const { data } = await supabase.from("Users").select("*").eq("role", role).single();
  return (data as User) || null;
}

async function getUserByEmail(email: string): Promise<User | null> {
  const { data } = await supabase.from("Users").select("*").eq("email", email).single();
  return (data as User) || null;
}

export async function GET(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action");

    if (!token) {
      return new Response("Token requerido", { status: 400 });
    }

    // Buscar la requisición por token
    const { data: req, error } = await supabase
      .from("requisitions")
      .select("*")
      .eq("authorization_comments", token)
      .single();

    if (error || !req) {
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3)"><div style="font-size:80px">â</div><h1 style="color:#f87171">Token Invalido</h1><p style="color:#94a3b8">Esta requisicion ya fue procesada o el enlace expiro.</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    if (req.status !== "PENDIENTE" && req.status !== "EN_VALIDACION") {
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3)"><div style="font-size:80px">â ï¸</div><h1 style="color:#fbbf24">Ya Procesada</h1><p style="color:#94a3b8">${req.folio} ya tiene estado: ${req.status}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    // Si no viene action, mostrar página de validación con botones
    if (!action) {
      const { data: items } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
      const materialesHtml = (items || []).map((m: Record<string, unknown>) => `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.quantity}</td><td style="padding:10px;border:1px solid #e2e8f0">${m.comments || "-"}</td></tr>`).join("");

      return new Response(`<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Validar ${req.folio}</title></head>
<body style="font-family:Arial,sans-serif;margin:0;background:#0f172a;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:20px">
<div style="background:#0f172a;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.3);max-width:600px;width:100%;overflow:hidden">
  <div style="background:#1e3a5f;color:white;padding:25px;text-align:center">
    <h1 style="margin:0;font-size:22px">Validar Requisicion</h1>
    <p style="margin:8px 0 0;opacity:0.8;font-size:14px">${req.folio}</p>
  </div>
  <div style="padding:25px">
    <div style="background:#f8fafc;border-radius:8px;padding:15px;margin-bottom:20px">
      <p style="margin:5px 0"><strong>Obra:</strong> ${req.cost_center_name || "N/A"}</p>
      <p style="margin:5px 0"><strong>Solicitante:</strong> ${req.created_by || "N/A"}</p>
      <p style="margin:5px 0"><strong>Fecha requerida:</strong> ${req.required_date ? new Date(req.required_date).toLocaleDateString("es-MX") : "N/A"}</p>
      <p style="margin:5px 0"><strong>Estado:</strong> ${req.status}</p>
    </div>
    <h3 style="color:#1e3a5f;margin:15px 0 10px">Materiales</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:25px">
      <thead><tr style="background:#1e3a5f;color:white"><th style="padding:10px;text-align:left">Material</th><th style="padding:10px">Unidad</th><th style="padding:10px">Cant</th><th style="padding:10px;text-align:left">Obs</th></tr></thead>
      <tbody>${materialesHtml}</tbody>
    </table>
    <div style="display:flex;gap:15px;justify-content:center">
      <a href="${BASE_URL}/api/requisicion/validate?token=${token}&action=APROBADA" style="display:inline-block;background:#10b981;color:white;padding:15px 35px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px">â APROBAR</a>
      <a href="${BASE_URL}/api/requisicion/validate?token=${token}&action=RECHAZADA" style="display:inline-block;background:#ef4444;color:white;padding:15px 35px;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px">â RECHAZAR</a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:15px;text-align:center;color:#94a3b8;font-size:12px">ARIA27 - CUAVANTE</div>
</div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    const ALLOWED_ACTIONS = ["APROBADA", "RECHAZADA"];
    if (!ALLOWED_ACTIONS.includes(action)) {
      return new Response("Accion no permitida", { status: 403 });
    }

    const { error: validateUpdErr } = await supabase.from("requisitions").update({ status: action, authorization_comments: null }).eq("id", req.id);
    if (validateUpdErr) {
      log.error("Error update validate", { id: req.id, action, error: validateUpdErr.message });
      return new Response(`<html><body style="font-family:Arial;padding:40px;text-align:center"><h1 style="color:#ef4444">Error</h1><p>No se pudo actualizar la requisición: ${validateUpdErr.message}</p></body></html>`, { status: 500, headers: { "Content-Type": "text/html" } });
    }

    if (action === "APROBADA") {
      const comprasUser = await getUserByRole("compras");

      const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MAÑANA" : `${daysUntil} días`;
      const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
      const fechaReq = new Date(req.required_date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      const { data: items } = await supabase.from("requisition_items").select("*").eq("requisition_id", req.id);
      const materialesHtml = (items || []).map((m: Record<string, unknown>) => `<tr><td style="padding:10px;border:1px solid #e2e8f0">${m.product_name}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.unit}</td><td style="padding:10px;border:1px solid #e2e8f0;text-align:center">${m.quantity}</td><td style="padding:10px;border:1px solid #e2e8f0">${m.comments || "-"}</td></tr>`).join("");
      const tablaHtml = `<table style="width:100%;border-collapse:collapse;margin:20px 0"><thead><tr style="background:#1e3a5f;color:white"><th style="padding:12px;text-align:left">Material</th><th style="padding:12px">Unidad</th><th style="padding:12px">Cantidad</th><th style="padding:12px;text-align:left">Obs</th></tr></thead><tbody>${materialesHtml}</tbody></table>`;

      if (comprasUser) {
        try {
          await resend.emails.send({
            from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
            subject: `COTIZAR: ${req.folio} - ${urgencyText}`,
            html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#3b82f6;color:white;padding:25px;text-align:center"><h1 style="margin:0">Nueva Requisicion para Compras</h1></div><div style="background:${urgencyColor};color:white;padding:20px;text-align:center"><div style="font-size:36px;font-weight:bold">${urgencyText}</div><div>para surtir - ${fechaReq}</div></div><div style="padding:25px"><div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:20px"><p><strong>Folio:</strong> ${req.folio}</p><p><strong>Obra:</strong> ${req.cost_center_name}</p><p><strong>Solicitante:</strong> ${req.created_by}</p></div>${tablaHtml}<div style="text-align:center;margin-top:30px"><a href="${BASE_URL}/dashboard/requisiciones/requisiciones/tramite" style="display:inline-block;background:#3b82f6;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">IR A COTIZAR</a></div></div></div>`
          });
        } catch (emailErr: unknown) {
          log.error("Email compras cotizar exception", { folio: req.folio, error: (emailErr as Error).message });
        }
        if (comprasUser.phone) {
          const materialesResumen = (items || []).map((m: Record<string, unknown>) => `${m.product_name} (${m.quantity} ${m.unit})`).join(", ");
          await sendWhatsAppLogged("requisicion_compras", [req.folio, req.cost_center_name, urgencyText, materialesResumen], comprasUser.phone, { origen: "req-validada", enviadoPor: "validate-link" });
        }
      }

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0fdf4"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3)"><div style="font-size:80px">â</div><h1 style="color:#10b981">Requisicion Validada</h1><p style="color:#94a3b8">${req.folio}</p><p>Se notifico a Compras (${comprasUser?.email || 'N/A'})</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    } else {
      // RECHAZADA - Notificar al creador por EMAIL + WHATSAPP
      const creatorUser = await getUserByEmail(req.user_email);
      
      try {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
          subject: `Requisicion ${req.folio} rechazada`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisicion Rechazada</h1></div><div style="padding:25px"><p>Tu requisicion <strong>${req.folio}</strong> ha sido rechazada por el validador.</p><p>Contacta a tu supervisor para mas informacion.</p></div></div>`
        });
      } catch (emailErr: unknown) {
        log.error("Email solicitante rechazada exception", { folio: req.folio, error: (emailErr as Error).message });
      }

      // WhatsApp al creador
      if (creatorUser?.phone) {
        await sendWhatsAppLogged("requisicion_rechazada", [req.folio, req.cost_center_name, "RECHAZADA", "Por validador"], creatorUser.phone, { origen: "req-rechazada-validador", enviadoPor: "validate-link" });
      }

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3)"><div style="font-size:80px">â</div><h1 style="color:#ef4444">Requisicion Rechazada</h1><p style="color:#94a3b8">${req.folio}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }
  } catch (error) {
    log.error("[VALIDATE]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
