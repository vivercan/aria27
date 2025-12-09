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

  const { data: req, error } = await supabase
    .from("requisitions")
    .select("*")
    .eq("authorization_comments", token)
    .single();

  if (error || !req) {
    return new Response("<h1>Requisición no encontrada o ya procesada</h1>", { headers: { "Content-Type": "text/html" } });
  }

  if (action === "AUTORIZAR") {
    // Generar folio OC
    const { data: lastOC } = await supabase
      .from("purchase_orders")
      .select("folio")
      .order("created_at", { ascending: false })
      .limit(1);
    
    const nextNum = lastOC?.length ? parseInt(lastOC[0].folio.split("-")[2]) + 1 : 1;
    const ocFolio = `OC-${new Date().getFullYear()}-${String(nextNum).padStart(5, "0")}`;

    // Obtener items
    const { data: items } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", req.id);

    const total = (items || []).reduce((sum, i) => sum + ((i.selected_price || 0) * i.quantity), 0);

    // Crear OC
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

    // Calcular deadline
    const daysUntil = Math.ceil((new Date(req.required_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const urgencyColor = daysUntil <= 2 ? "#ef4444" : daysUntil <= 5 ? "#f59e0b" : "#10b981";
    const urgencyText = daysUntil <= 0 ? "¡HOY!" : daysUntil === 1 ? "¡MAÑANA!" : `${daysUntil} días`;
    const fechaReq = new Date(req.required_date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Crear tabla de items
    const itemsHtml = (items || []).map((i: any) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0">${i.product_name}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center">${i.quantity} ${i.unit}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right">$${((i.selected_price || 0) * i.quantity).toLocaleString()}</td>
      </tr>
    `).join("");

    // Email a Compras con countdown
    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "juanviverosv@gmail.com",
      subject: `✅ AUTORIZADA: ${req.folio} → ${ocFolio} | ${urgencyText} para entregar`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto">
          <div style="background:#10b981;color:white;padding:25px;text-align:center">
            <h1 style="margin:0">✓ COMPRA AUTORIZADA</h1>
          </div>
          
          <div style="background:${urgencyColor};color:white;padding:25px;text-align:center">
            <div style="font-size:14px;opacity:0.9">⏰ COUNTDOWN - DEBES ENTREGAR EN</div>
            <div style="font-size:56px;font-weight:bold;letter-spacing:2px">${urgencyText}</div>
            <div style="font-size:14px;margin-top:5px">Fecha límite: ${fechaReq}</div>
          </div>
          
          <div style="padding:25px">
            <div style="background:#d1fae5;border:2px solid #10b981;border-radius:12px;padding:20px;margin-bottom:20px">
              <table style="width:100%">
                <tr>
                  <td style="padding:5px"><strong>Requisición:</strong></td>
                  <td>${req.folio}</td>
                </tr>
                <tr>
                  <td style="padding:5px"><strong>Orden de Compra:</strong></td>
                  <td style="font-size:20px;font-weight:bold;color:#10b981">${ocFolio}</td>
                </tr>
                <tr>
                  <td style="padding:5px"><strong>Obra:</strong></td>
                  <td>${req.cost_center_name}</td>
                </tr>
                <tr>
                  <td style="padding:5px"><strong>Total autorizado:</strong></td>
                  <td style="font-size:24px;font-weight:bold;color:#10b981">$${total.toLocaleString()} MXN</td>
                </tr>
                <tr>
                  <td style="padding:5px"><strong>Autorizado por:</strong></td>
                  <td>Dirección General</td>
                </tr>
                <tr>
                  <td style="padding:5px"><strong>Fecha autorización:</strong></td>
                  <td>${new Date().toLocaleString("es-MX")}</td>
                </tr>
              </table>
            </div>
            
            <h3 style="color:#1e3a5f">Detalle de compra:</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <thead><tr style="background:#1e3a5f;color:white">
                <th style="padding:10px;text-align:left">Producto</th>
                <th style="padding:10px">Cantidad</th>
                <th style="padding:10px;text-align:right">Subtotal</th>
              </tr></thead>
              <tbody>${itemsHtml}</tbody>
              <tfoot><tr style="background:#f1f5f9">
                <td colspan="2" style="padding:12px;text-align:right;font-weight:bold">TOTAL:</td>
                <td style="padding:12px;text-align:right;font-weight:bold;color:#10b981;font-size:18px">$${total.toLocaleString()}</td>
              </tr></tfoot>
            </table>
            
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px">
              <strong>📋 Siguiente paso:</strong> Realizar la compra, recibir el material y registrar la recepción con evidencia fotográfica y factura en el sistema.
            </div>
            
            <div style="text-align:center;margin:30px 0">
              <a href="https://aria.jjcrm27.com/dashboard/supply-desk/requisitions/orders" style="display:inline-block;background:#10b981;color:white;padding:15px 40px;text-decoration:none;border-radius:30px;font-weight:bold">
                Ver Órdenes de Compra
              </a>
            </div>
          </div>
        </div>
      `
    });

    return new Response(`
      <html><head><meta charset="UTF-8"><title>Autorizada</title></head>
      <body style="font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9">
        <div style="text-align:center;background:white;padding:50px;border-radius:20px;box-shadow:0 10px 40px rgba(0,0,0,0.1)">
          <div style="width:80px;height:80px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
            <span style="font-size:40px;color:white">✓</span>
          </div>
          <h1 style="color:#10b981;margin:0">COMPRA AUTORIZADA</h1>
          <p style="color:#64748b;margin:20px 0">${req.folio}</p>
          <p style="font-size:24px;font-weight:bold;color:#1e3a5f">${ocFolio}</p>
          <p style="color:#64748b">Se ha notificado al área de Compras</p>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });

  } else if (action === "RECHAZAR") {
    await supabase.from("requisitions").update({
      status: "APROBADA",
      purchase_status: "RECHAZADA_DIRECCION"
    }).eq("id", req.id);

    await resend.emails.send({
      from: "ARIA27 <noreply@mail.jjcrm27.com>",
      to: "juanviverosv@gmail.com",
      subject: `❌ RECHAZADA: ${req.folio} - Revisar cotización`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#ef4444;color:white;padding:20px;text-align:center">
            <h1>✗ COMPRA RECHAZADA POR DIRECCIÓN</h1>
          </div>
          <div style="padding:20px">
            <p>La compra para <strong>${req.folio}</strong> ha sido rechazada.</p>
            <p>Revisa los precios, proveedores o justificación y vuelve a enviar a autorización.</p>
            <div style="text-align:center;margin:20px 0">
              <a href="https://aria.jjcrm27.com/dashboard/supply-desk/requisitions/purchasing" style="display:inline-block;background:#3b82f6;color:white;padding:12px 30px;text-decoration:none;border-radius:20px">
                Ir a Compras
              </a>
            </div>
          </div>
        </div>
      `
    });

    return new Response(`
      <html><head><meta charset="UTF-8"><title>Rechazada</title></head>
      <body style="font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9">
        <div style="text-align:center;background:white;padding:50px;border-radius:20px">
          <div style="width:80px;height:80px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
            <span style="font-size:40px;color:white">✗</span>
          </div>
          <h1 style="color:#ef4444">COMPRA RECHAZADA</h1>
          <p style="color:#64748b">${req.folio}</p>
          <p style="color:#64748b">Se ha notificado al área de Compras</p>
        </div>
      </body></html>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return new Response("<h1>Acción no válida</h1>", { headers: { "Content-Type": "text/html" } });
}
