import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token) {
    return new Response("<h1>Token inválido</h1>", { headers: { "Content-Type": "text/html" } });
  }

  // Buscar requisición por token
  const { data: req, error } = await supabase
    .from("requisitions")
    .select("*")
    .eq("authorization_comments", token)
    .single();

  if (error || !req) {
    return new Response("<h1>Requisición no encontrada o ya procesada</h1>", { headers: { "Content-Type": "text/html" } });
  }

  if (action === "AUTORIZAR") {
    // Generar folio de orden de compra
    const { data: lastOC } = await supabase
      .from("purchase_orders")
      .select("folio")
      .order("created_at", { ascending: false })
      .limit(1);
    
    const nextNum = lastOC?.length ? parseInt(lastOC[0].folio.split("-")[2]) + 1 : 1;
    const ocFolio = `OC-${new Date().getFullYear()}-${String(nextNum).padStart(5, "0")}`;

    // Obtener items con precios
    const { data: items } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", req.id);

    const total = (items || []).reduce((sum, i) => sum + ((i.selected_price || 0) * i.quantity), 0);

    // Crear orden de compra
    await supabase.from("purchase_orders").insert({
      folio: ocFolio,
      requisition_id: req.id,
      total,
      status: "AUTORIZADA",
      authorized_by: "timonfx@hotmail.com",
      authorized_at: new Date().toISOString()
    });

    // Actualizar requisición
    await supabase.from("requisitions").update({
      status: "OC_GENERADA",
      purchase_status: "AUTORIZADA",
      authorized_by: "timonfx@hotmail.com",
      authorized_at: new Date().toISOString()
    }).eq("id", req.id);

    // Notificar a Compras
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "juanviverosv@gmail.com",
      subject: `✅ AUTORIZADA: ${req.folio} → ${ocFolio}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#10b981;color:white;padding:20px;text-align:center">
            <h1>✓ COMPRA AUTORIZADA</h1>
          </div>
          <div style="padding:20px">
            <p>La requisición <strong>${req.folio}</strong> ha sido autorizada por Dirección General.</p>
            <div style="background:#f1f5f9;padding:15px;border-radius:8px;margin:20px 0">
              <p><strong>Orden de Compra:</strong> ${ocFolio}</p>
              <p><strong>Total:</strong> $${total.toLocaleString()} MXN</p>
              <p><strong>Autorizado por:</strong> Dirección General</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString("es-MX")}</p>
            </div>
            <p>Procede con la compra y entrega de materiales.</p>
          </div>
        </div>
      `
    });

    return new Response(`
      <html>
        <head><meta charset="UTF-8"><title>Compra Autorizada</title></head>
        <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9">
          <div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)">
            <div style="width:80px;height:80px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
              <span style="font-size:40px;color:white">✓</span>
            </div>
            <h1 style="color:#10b981;margin:0">COMPRA AUTORIZADA</h1>
            <p style="color:#64748b;margin:20px 0">${req.folio}</p>
            <p style="font-size:24px;font-weight:bold;color:#1e3a5f">${ocFolio}</p>
            <p style="color:#64748b">Se ha notificado al área de Compras</p>
          </div>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

  } else if (action === "RECHAZAR") {
    await supabase.from("requisitions").update({
      status: "APROBADA",
      purchase_status: "RECHAZADA_DIRECCION"
    }).eq("id", req.id);

    // Notificar rechazo
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "juanviverosv@gmail.com",
      subject: `❌ RECHAZADA: ${req.folio}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#ef4444;color:white;padding:20px;text-align:center">
            <h1>✗ COMPRA RECHAZADA</h1>
          </div>
          <div style="padding:20px">
            <p>La compra para <strong>${req.folio}</strong> ha sido rechazada por Dirección General.</p>
            <p>Revisa los precios o proveedores y vuelve a enviar.</p>
          </div>
        </div>
      `
    });

    return new Response(`
      <html>
        <head><meta charset="UTF-8"><title>Compra Rechazada</title></head>
        <body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9">
          <div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)">
            <div style="width:80px;height:80px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
              <span style="font-size:40px;color:white">✗</span>
            </div>
            <h1 style="color:#ef4444;margin:0">COMPRA RECHAZADA</h1>
            <p style="color:#64748b;margin:20px 0">${req.folio}</p>
            <p style="color:#64748b">Se ha notificado al área de Compras</p>
          </div>
        </body>
      </html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return new Response("<h1>Acción no válida</h1>", { headers: { "Content-Type": "text/html" } });
}
