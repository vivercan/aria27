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
  const suppliers: any[] = cotData.suppliers || [];
  const itemsDet: any[] = cotData.items_detail || (cotData.items || []).map((n: string) => ({product_name:n,quantity:1,unit:"PZA"}));
  const quotes: any[] = cotData.quotes || [];
  let supData: any[] = [];
  if (suppliers.length > 0) {
    supData = suppliers.map((s: any) => {
      const sub = itemsDet.reduce((sum: number, it: any) => sum + ((s.items_prices?.[it.product_name]||0)*(it.quantity||1)),0);
      return {...s, subtotal:sub, iva:sub*0.16, total:sub*1.16};
    });
  } else {
    const grp: Record<string,any> = {};
    quotes.forEach((q: any) => {
      if(!grp[q.supplier]) grp[q.supplier]={supplier:q.supplier,subtotal:0,entrega:q.entrega||"-",forma_pago:q.forma_pago||"-",factura:q.factura,rebaja_iva:false,observaciones:"",items_prices:{}};
      grp[q.supplier].subtotal+=(q.total||0);
    });
    supData = Object.values(grp).map((s: any)=>({...s,iva:s.subtotal*0.16,total:s.subtotal*1.16}));
  }
  const bt = supData.length>0?Math.min(...supData.filter((s: any)=>s.subtotal>0).map((s: any)=>s.total)):0;
  const sH = supData.map((s: any)=>`<th style="padding:10px 8px;text-align:center;font-size:12px;border:1px solid #334155;${s.total===bt&&bt>0?"background:#16a34a;color:white":"background:#1e3a5f;color:white"}">${s.supplier}</th>`).join("");
  const pR = itemsDet.map((it: any,idx: number)=>{
    const ap=supData.map((s: any)=>s.items_prices?.[it.product_name]||0).filter((p: number)=>p>0);
    const bp=ap.length>0?Math.min(...ap):0;
    const cells=supData.map((s: any)=>{const p=s.items_prices?.[it.product_name]||0;const ib=p>0&&p===bp;const ic=s.total===bt&&bt>0;const bg=ib?"background:#bbf7d0;font-weight:bold;color:#16a34a;":ic?"background:#f0fdf4;":"";return`<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-size:13px;${bg}">${p>0?"$ "+p.toLocaleString("es-MX",{minimumFractionDigits:2}):"-"}</td>`;}).join("");
    return`<tr style="background:${idx%2===0?"white":"#f8fafc"}"><td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;color:#7c3aed">${idx+1}</td><td style="padding:8px;border:1px solid #e2e8f0">${it.product_name}</td><td style="padding:8px;text-align:center;border:1px solid #e2e8f0">${it.quantity}</td><td style="padding:8px;text-align:center;border:1px solid #e2e8f0">${it.unit||"PZA"}</td>${cells}</tr>`;
  }).join("");
  const mR=(l: string,fn: (s: any)=>number,b: boolean)=>`<tr style="background:#f1f5f9"><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold">${l}</td>${supData.map((s: any)=>{const v=fn(s);const ic=s.total===bt&&bt>0;const bg=ic?(b?"background:#16a34a;color:white;":"background:#dcfce7;"):"";return`<td style="padding:8px;text-align:right;border:1px solid #e2e8f0;${b?"font-weight:bold;":""}${bg}">$ ${v.toLocaleString("es-MX",{minimumFractionDigits:2})}</td>`;}).join("")}</tr>`;

  const rebajaR = `<tr><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:#7c3aed">\u00bfREBAJAN IVA?</td>${supData.map((s: any)=>`<td style="padding:8px;text-align:center;border:1px solid #e2e8f0;font-weight:bold;${s.rebaja_iva?"background:#16a34a;color:white":"background:#dc2626;color:white"}">${s.rebaja_iva?"SI":"NO"}</td>`).join("")}</tr>`;
  const obsR = `<tr><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold">OBSERVACIONES</td>${supData.map((s: any)=>`<td style="padding:8px;text-align:center;border:1px solid #e2e8f0;font-size:11px">${s.observaciones||s.entrega||"-"}</td>`).join("")}</tr>`;

  const linkAprobar = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=aprobar`;
  const linkRechazar = `${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=rechazar`;

  return `<div style="font-family:Arial;max-width:900px;margin:0 auto"><div style="background:#1e3a5f;padding:15px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:white;margin:0;font-size:20px">COMPARATIVA DE COTIZACIONES</h1><p style="color:#93c5fd;margin:4px 0 0;font-size:14px">REQ ${req.folio} \u00d7 ${req.cost_center_name}</p></div><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px">#</th><th style="padding:8px;text-align:left;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">PRODUCTO</th><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">CANT</th><th style="padding:8px;border:1px solid #e2e8f0;font-size:11px;color:#7c3aed">UNIDAD</th>${sH}</tr></thead><tbody>${pR}${mR("SUBTOTAL",(s: any)=>s.subtotal,false)}${mR("I.V.A. (16%)",(s: any)=>s.iva,false)}${mR("TOTAL",(s: any)=>s.total,true)}${rebajaR}${obsR}</tbody></table><div style="text-align:center;padding:20px"><a href="${linkAprobar}" style="display:inline-block;padding:14px 48px;background:#16a34a;color:white;text-decoration:none;border-radius:6px;font-weight:bold;margin:0 10px">APROBAR COMPRA</a><a href="${linkRechazar}" style="display:inline-block;padding:14px 48px;background:#ef4444;color:white;text-decoration:none;border-radius:6px;font-weight:bold;margin:0 10px">RECHAZAR</a></div><p style="text-align:center;color:#94a3b8;font-size:10px">ARIA27 \u00d7 Grupo Constructor Urbano Avante</p></div>`;
}

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action");
    const proveedorElegido = searchParams.get("proveedor");

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    // Si no viene action, redirigir a la pÃ¡gina de autorizaciÃ³n
    if (!action) {
      return NextResponse.redirect(`${BASE_URL}/autorizar/${token}`);
    }

    const { data: req, error: reqError } = await supabase
      .from("Requisiciones")
      .select("*")
      .eq("authorization_comments", token)
      .single();

    if (reqError || !req) {
      console.error("[APPROVE-PURCHASE] Token lookup failed:", reqError?.message);
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x26A0;</div><h1 style="color:#f59e0b">Token Inv\u00e1lido o Expirado</h1></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    if (req.status !== "EN_AUTORIZACION") {
      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x2139;</div><h1 style="color:#3b82f6">Ya Procesada</h1><p style="color:#94a3b8">Esta requisici\u00f3n ya fue procesada.</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    const comprasUser = await getUserByRole("compras");
    // Query items separately (no FK relationship between Requisiciones and requisition_items)
    const { data: reqItemsData } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", req.id);
    const reqItems = reqItemsData || [];

    if (action === "aprobar" || action === "AUTORIZADA") {
      const ocFolio = await getNextOCFolio();
      const cotData = req.cotizacion_data || {};
      const suppliers: any[] = cotData.suppliers || [];
      const quotes: any[] = cotData.quotes || [];

      let supplierName = "N/A";
      let total = 0;
      let elegidoData: any = {};

      if (proveedorElegido) {
        elegidoData = suppliers.find((s: any) => s.supplier === proveedorElegido) || {};
      }
      if (!elegidoData.supplier && suppliers.length > 0) {
        const itemsDet = cotData.items_detail || [];
        elegidoData = suppliers.reduce((best: any, s: any) => {
          const sub = itemsDet.reduce((sum: number, it: any) => sum + ((s.items_prices?.[it.product_name]||0)*(it.quantity||1)),0);
          const tot = sub * 1.16;
          if (!best.total || (tot > 0 && tot < best.total)) return {...s, subtotal: sub, total: tot};
          return best;
        }, {});
      }
      if (!elegidoData.supplier && quotes.length > 0) {
        elegidoData = quotes.reduce((m: any, q: any) => q.total < m.total ? q : m, quotes[0]);
      }

      supplierName = elegidoData.supplier || "N/A";
      total = elegidoData.total || elegidoData.subtotal * 1.16 || 0;

      await supabase.from("Requisiciones").update({
        status: "OC_GENERADA",
        authorization_comments: null,
        approved_by: "direccion",
        authorized_at: new Date().toISOString(),
        proveedor: supplierName,
        monto: total
      }).eq("id", req.id);

      await supabase.from("purchase_orders").insert({
        folio: ocFolio,
        requisition_id: req.id,
        supplier_name: supplierName,
        total: total,
        status: "GENERADA",
        payment_method: elegidoData.forma_pago || "Transferencia",
        credit_days: elegidoData.dias_credito || 0,
        authorized_at: new Date().toISOString()
      });

      if (proveedorElegido && elegidoData.items_prices && reqItems) {
        for (const item of reqItems) {
          const price = elegidoData.items_prices?.[item.product_name] || 0;
          if (price > 0) {
            await supabase.from("requisition_items").update({
              selected_supplier_name: supplierName,
              selected_price: price
            }).eq("id", item.id);
          }
        }
      }

      if (comprasUser) {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
          subject: `OC AUTORIZADA: ${ocFolio} - ${req.folio}`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#10b981;color:white;padding:25px;text-align:center"><h1 style="margin:0">Orden de Compra Autorizada</h1></div><div style="padding:25px"><div style="background:#f0fdf4;border:2px solid #10b981;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center"><div style="font-size:32px;font-weight:bold;color:#10b981">${ocFolio}</div><div style="color:#64748b">Requisici\u00f3n: ${req.folio}</div></div><p><strong>Obra:</strong> ${req.cost_center_name}</p><p><strong>Proveedor elegido:</strong> ${supplierName}</p><p><strong>Total:</strong> $${total} MXN</p></div></div>`
        });
        if (comprasUser.phone) {
          await sendWhatsAppTemplate("oc_generada", [req.folio, ocFolio, req.cost_center_name, supplierName, String(total), elegidoData.forma_pago || "Transferencia"], comprasUser.phone);
        }
      }

      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
        subject: `Tu requisici\u00f3n ${req.folio} fue autorizada - ${ocFolio}`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#10b981;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisici\u00f3n Autorizada</h1></div><div style="padding:25px"><p>Tu requisici\u00f3n <strong>${req.folio}</strong> ha sido autorizada.</p><p>OC: <strong>${ocFolio}</strong></p><p>Proveedor: ${supplierName} - $${total}</p></div></div>`
      });

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x2705;</div><h1 style="color:#10b981">Compra Autorizada</h1><p style="font-size:24px;font-weight:bold;color:#10b981">${ocFolio}</p><p style="color:#94a3b8">Requisici\u00f3n: ${req.folio}</p><p style="color:#94a3b8">Proveedor: ${supplierName} - $${total}</p><p style="color:#64748b">Se notific\u00f3 a Compras y al Solicitante</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });

    } else if (action === "rechazar" || action === "RECHAZADA") {
      await supabase.from("Requisiciones").update({
        status: "RECHAZADA_DIRECCION",
        authorization_comments: null
      }).eq("id", req.id);

      if (comprasUser) {
        await resend.emails.send({
          from: "ARIA27 <noreply@mail.jjcrm27.com>", to: comprasUser.email,
          subject: `RECHAZADA: ${req.folio}`,
          html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">Compra Rechazada</h1></div><div style="padding:25px"><p>La requisici\u00f3n <strong>${req.folio}</strong> fue rechazada por Direcci\u00f3n.</p></div></div>`
        });
      }

      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>", to: req.user_email,
        subject: `Requisici\u00f3n ${req.folio} rechazada por Direcci\u00f3n`,
        html: `<div style="font-family:Arial;max-width:650px;margin:0 auto"><div style="background:#ef4444;color:white;padding:25px;text-align:center"><h1 style="margin:0">Requisici\u00f3n Rechazada</h1></div><div style="padding:25px"><p>Tu requisici\u00f3n <strong>${req.folio}</strong> fue rechazada por Direcci\u00f3n.</p></div></div>`
      });

      return new Response(`<html><head><meta charset="utf-8"></head><body style="font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a"><div style="text-align:center;background:#1e293b;padding:50px;border-radius:20px"><div style="font-size:80px">&#x274C;</div><h1 style="color:#ef4444">Compra Rechazada</h1><p style="color:#94a3b8">${req.folio}</p></div></body></html>`, { headers: { "Content-Type": "text/html" } });
    } else {
      return NextResponse.json({ error: `AcciÃ³n no vÃ¡lida: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[APPROVE-PURCHASE]", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
