import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const BASE_URL = "https://aria.jjcrm27.com";

// Obtener usuario por ROL (dinamico)
async function getUserByRole(role: string) {
  const { data } = await supabase.from("users").select("*").eq("role", role).single();
  return data;
}

async function getNextOCFolio(): Promise<string> {
  const { data } = await supabase.from("sequences").select("current_value").eq("id", "OC").single();
  const next = (data?.current_value || 0) + 1;
  await supabase.from("sequences").upsert({ id: "OC", current_value: next });
  return `OC-${new Date().getFullYear()}-${String(next).padStart(5, "0")}`;
}

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token || !action) {
    return new Response("Parametros invalidos", { status: 400 });
  }

  const { data: req, error } = await supabase
    .from("requisiciones")
    .select("*")
    .eq("authorization_comments", token)
    .single();

  if (error || !req) {
    return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fef2f2"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">❌</div><h1 style="color:#ef4444">Token Invalido</h1><p style="color:#64748b">Esta solicitud ya fue procesada o el enlace expiro.</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  if (req.status !== "EN_AUTORIZACION") {
    return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fefce8"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">⚠️</div><h1 style="color:#f59e0b">Ya Procesada</h1><p style="color:#64748b">${req.folio} ya tiene estado: ${req.status}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  // Obtener compras dinamicamente por ROL
  const comprasUser = await getUserByRole("compras");

  if (action === "AUTORIZADA") {
    const ocFolio = await getNextOCFolio();
    const cotizacion = req.cotizacion_data;
    const total = cotizacion?.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0) || 0;

    await supabase.from("requisiciones").update({
      status: "OC_GENERADA",
      authorization_comments: null,
      oc_folio: ocFolio
    }).eq("id", req.id);

    const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyText = daysUntil <= 0 ? "HOY" : daysUntil === 1 ? "MANANA" : `${daysUntil} dias`;

    if (comprasUser) {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
        subject: `OC AUTORIZADA: ${ocFolio} - ${req.folio}`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#10b981;color:white;padding:25px;text-align:center"><h1 style="margin:0">Orden de Compra Autorizada</h1></div><div style="padding:25px"><div style="background:#f0fdf4;border:2px solid #10b981;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center"><div style="font-size:32px;font-weight:bold;color:#10b981">${ocFolio}</div><div style="color:#64748b">Requisicion: ${req.folio}</div></div><div style="background:#f8fafc;border-radius:8px;padding:20px"><p><strong>Obra:</strong> ${req.cost_center_name}</p><p><strong>Proveedor:</strong> ${cotizacion?.supplier_name || 'N/A'}</p><p><strong>Total:</strong> $${total.toLocaleString()} MXN</p></div><div style="text-align:center;margin-top:30px"><a href="${BASE_URL}/dashboard/requisiciones/requisiciones/ordenes" style="display:inline-block;background:#3b82f6;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">VER ORDENES</a></div></div></div>`
      });

      if (comprasUser.phone) {
        await sendWhatsAppTemplate("oc_generada", [req.folio, ocFolio, req.cost_center_name, total.toLocaleString(), urgencyText], comprasUser.phone);
      }
    }

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
      subject: `Tu requisicion ${req.folio} fue autorizada - ${ocFolio}`,
      html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#10b981;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisicion Autorizada</h1></div><div style="padding:25px"><p>Tu requisicion <strong>${req.folio}</strong> ha sido autorizada.</p><p>Se genero la Orden de Compra: <strong>${ocFolio}</strong></p></div></div>`
    });

    return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#f0fdf4"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">✅</div><h1 style="color:#10b981">Compra Autorizada</h1><p style="font-size:24px;font-weight:bold;color:#10b981">${ocFolio}</p><p style="color:#64748b">Requisicion: ${req.folio}</p><p>Se notifico a Compras (${comprasUser?.email || 'N/A'})</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });

  } else {
    await supabase.from("requisiciones").update({
      status: "RECHAZADA_DIRECCION",
      authorization_comments: null
    }).eq("id", req.id);

    if (comprasUser) {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
        subject: `RECHAZADA: ${req.folio}`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">Compra Rechazada</h1></div><div style="padding:25px"><p>La requisicion <strong>${req.folio}</strong> fue rechazada por Direccion.</p></div></div>`
      });
    }

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
      subject: `Requisicion ${req.folio} rechazada por Direccion`,
      html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisicion Rechazada</h1></div><div style="padding:25px"><p>Tu requisicion <strong>${req.folio}</strong> fue rechazada por Direccion.</p></div></div>`
    });

    return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#fef2f2"><div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)"><div style="font-size:80px">❌</div><h1 style="color:#ef4444">Compra Rechazada</h1><p style="color:#64748b">${req.folio}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
  }
}
