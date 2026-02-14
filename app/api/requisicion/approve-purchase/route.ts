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
async function getNextOCFolio(): Promise<string> {
  const { data } = await supabase.from("sequences").select("current_value").eq("id", "OC").single();
  const next = (data?.current_value || 0) + 1;
  await supabase.from("sequences").upsert({ id: "OC", current_value: next });
  return `OC-${new Date().getFullYear()}-${String(next).padStart(5, "0")}`;
}

function buildComparativaHTML(req: any, token: string) {
  const cotData = req.cotizacion_data || {};
  const quotes: any[] = cotData.quotes || [];
  const items: string[] = cotData.items || [];
  const mejor = quotes.length > 0 ? quotes.reduce((min: any, q: any) => (q.total||0) < (min.total||0) ? q : min, quotes[0]) : null;

  const rows = quotes.map((q: any, i: number) => {
    const isBest = mejor && q.total === mejor.total;
    const bg = isBest ? 'background:#064e3b;' : '';
    const tc = isBest ? '#34d399' : 'white';
    const facColor = q.factura !== false ? '#34d399' : '#ef4444';
    const facText = q.factura !== false ? 'Si' : 'No';
    const pago = q.forma_pago || 'transferencia';
    const pagoLabel = pago === 'transferencia' ? 'Transf.' : pago === 'efectivo' ? 'Efectivo' : pago === 'credito' ? 'Credito' : pago;
    return `<tr style="border-bottom:1px solid #334155;${bg}">
      <td style="padding:10px 12px;color:white;font-size:13px">${q.supplier}${isBest ? ' &#9733;' : ''}</td>
      <td style="padding:10px 8px;text-align:right;color:${tc};font-weight:bold;font-size:14px">$${q.total||0}</td>
      <td style="padding:10px 8px;color:#94a3b8;font-size:12px;text-align:center">${q.entrega || '-'}</td>
      <td style="padding:10px 8px;color:#94a3b8;font-size:12px;text-align:center">${pagoLabel}</td>
      <td style="padding:10px 8px;color:${facColor};font-size:12px;text-align:center">${facText}</td>
      <td style="padding:10px 8px;text-align:center"><a href="${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA&proveedor=${encodeURIComponent(q.supplier)}" style="display:inline-block;padding:6px 16px;background:#10b981;color:white;text-decoration:none;border-radius:15px;font-size:11px;font-weight:bold">Elegir</a></td>
    </tr>`;
  }).join('');

  const materialesHtml = items.length > 0 ? `<p style="color:#64748b;font-size:10px;margin:10px 0 0">MATERIALES</p><p style="color:#94a3b8;font-size:13px;margin:4px 0">${items.join(', ')}</p>` : '';
  const mejorHtml = mejor ? `<div style="background:#064e3b;border:1px solid #10b981;border-radius:12px;padding:12px;text-align:center;margin-bottom:20px"><p style="color:#34d399;margin:0;font-size:12px">MEJOR PRECIO</p><p style="color:white;font-weight:bold;font-size:18px;margin:4px 0">${mejor.supplier} - $${mejor.total}</p></div>` : '';

  return `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial;min-height:100vh;background:#0f172a;color:white;margin:0;padding:20px">
<div style="max-width:700px;margin:0 auto">
<div style="text-align:center;margin-bottom:25px"><h1 style="color:#22d3ee;font-size:24px;margin:0">ARIA27</h1><p style="color:#64748b;font-size:11px;letter-spacing:2px">AUTORIZACION DE COMPRA</p></div>
<div style="background:#1e293b;border-radius:12px;padding:15px;margin-bottom:15px"><p style="color:#64748b;font-size:10px;margin:0">FOLIO</p><p style="color:#22d3ee;font-weight:bold;font-size:18px;margin:4px 0">${req.folio}</p><p style="color:#64748b;font-size:10px;margin:10px 0 0">OBRA</p><p style="color:white;font-weight:bold;margin:4px 0">${req.cost_center_name}</p>${materialesHtml}</div>
<div style="background:#1e293b;border-radius:12px;overflow:hidden;margin-bottom:15px">
<table style="width:100%;border-collapse:collapse">
<thead><tr style="background:#0f172a">
<th style="padding:10px;text-align:left;color:#64748b;font-size:10px">Proveedor</th>
<th style="padding:10px;text-align:right;color:#64748b;font-size:10px">Total</th>
<th style="padding:10px;text-align:center;color:#64748b;font-size:10px">Entrega</th>
<th style="padding:10px;text-align:center;color:#64748b;font-size:10px">Pago</th>
<th style="padding:10px;text-align:center;color:#64748b;font-size:10px">Factura</th>
<th style="padding:10px;text-align:center;color:#64748b;font-size:10px">Accion</th>
</tr></thead>
<tbody>${rows}</tbody>
</table></div>
${mejorHtml}
<div style="text-align:center;margin-top:15px"><a href="${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA" style="display:inline-block;padding:12px 40px;background:#ef4444;color:white;text-decoration:none;border-radius:25px;font-weight:bold;font-size:14px">RECHAZAR TODAS</a></div>
<p style="text-align:center;color:#475569;font-size:10px;margin-top:25px">ARIA27 - Grupo Cuavante</p></div></body></html>`;
}

export async function GET(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action");
    const proveedorElegido = searchParams.get("proveedor");

    if (!token) {
      return new Response("Parametros invalidos", { status: 400 });
    }

    const { data: req, error } = await supabase
      .from("requisitions")
      .select("*")
      .eq("authorization_comments", token)
      .single();

    if (error || !req) {
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x274C;</div><h1 style="color:#ef4444">Token Invalido</h1><p style="color:#94a3b8">Esta solicitud ya fue procesada o el enlace expiro.</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    if (!action) {
      return new Response(buildComparativaHTML(req, token), { headers: { "Content-Type": "text/html" } });
    }

    if (req.status !== "EN_AUTORIZACION") {
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x26A0;</div><h1 style="color:#f59e0b">Ya Procesada</h1><p style="color:#94a3b8">${req.folio} ya tiene estado: ${req.status}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    const comprasUser = await getUserByRole("compras");
    const creatorUser = await getUserByEmail(req.user_email);

    if (action === "AUTORIZADA") {
      const ocFolio = await getNextOCFolio();
      const cotData = req.cotizacion_data || {};
      const quotes = cotData.quotes || [];
      const elegido = proveedorElegido
        ? quotes.find((q: any) => q.supplier === proveedorElegido)
        : (quotes.length > 0 ? quotes.reduce((min: any, q: any) => (q.total||0) < (min.total||0) ? q : min, quotes[0]) : null);
      const total = elegido?.total || 0;
      const supplierName = elegido?.supplier || 'N/A';

      await supabase.from("requisitions").update({
        status: "OC_GENERADA",
        authorized_by: "direccion",
        authorized_at: new Date().toISOString(),
        proveedor: supplierName,
        monto: total
      }).eq("id", req.id);

      if (comprasUser) {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
          subject: `OC AUTORIZADA: ${ocFolio} - ${req.folio}`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#10b981;color:white;padding:25px;text-align:center"><h1 style="margin:0">Orden de Compra Autorizada</h1></div><div style="padding:25px"><div style="background:#f0fdf4;border:2px solid #10b981;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center"><div style="font-size:32px;font-weight:bold;color:#10b981">${ocFolio}</div><div style="color:#64748b">Requisicion: ${req.folio}</div></div><p><strong>Obra:</strong> ${req.cost_center_name}</p><p><strong>Proveedor elegido:</strong> ${supplierName}</p><p><strong>Total:</strong> $${total} MXN</p></div></div>`
        });
        if (comprasUser.phone) {
          await sendWhatsAppTemplate("oc_generada", [req.folio, ocFolio, req.cost_center_name, String(total), "NORMAL"], comprasUser.phone);
        }
      }

      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
        subject: `Tu requisicion ${req.folio} fue autorizada - ${ocFolio}`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#10b981;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisicion Autorizada</h1></div><div style="padding:25px"><p>Tu requisicion <strong>${req.folio}</strong> ha sido autorizada.</p><p>OC: <strong>${ocFolio}</strong></p><p>Proveedor: ${supplierName} - $${total}</p></div></div>`
      });

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x2705;</div><h1 style="color:#10b981">Compra Autorizada</h1><p style="font-size:24px;font-weight:bold;color:#10b981">${ocFolio}</p><p style="color:#94a3b8">Requisicion: ${req.folio}</p><p style="color:#94a3b8">Proveedor: ${supplierName} - $${total}</p><p style="color:#64748b">Se notifico a Compras y al Solicitante</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });

    } else {
      await supabase.from("requisitions").update({
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

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x274C;</div><h1 style="color:#ef4444">Compra Rechazada</h1><p style="color:#94a3b8">${req.folio}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
