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
  const rR=`<tr><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold;color:#7c3aed">ÃÂ¿REBAJAN IVA?</td>${supData.map((s: any)=>`<td style="padding:8px;text-align:center;border:1px solid #e2e8f0;font-weight:bold;${s.rebaja_iva?"background:#16a34a;color:white":"background:#dc2626;color:white"}">${s.rebaja_iva?"SI":"NO"}</td>`).join("")}</tr>`;
  const oR=`<tr><td colspan="4" style="padding:8px;text-align:right;border:1px solid #e2e8f0;font-weight:bold">OBSERVACIONES</td>${supData.map((s: any)=>`<td style="padding:8px;text-align:center;border:1px solid #e2e8f0;font-size:11px">${s.observaciones||s.entrega||"-"}</td>`).join("")}</tr>`;
  const btns=supData.map((s: any)=>{const ib=s.total===bt&&bt>0;return`<a href="${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=AUTORIZADA&proveedor=${encodeURIComponent(s.supplier)}" style="display:inline-block;padding:12px 24px;margin:4px;background:${ib?"#16a34a":"#1e3a5f"};color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px">${ib?"Ã¢ÂÂ ":""}${s.supplier} - $${s.total.toLocaleString("es-MX",{minimumFractionDigits:2})}</a>`;}).join("");
  return`<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial;margin:0;padding:20px;background:#f1f5f9}table{border-collapse:collapse;width:100%}</style></head><body><div style="max-width:950px;margin:0 auto"><div style="background:#1e3a5f;padding:18px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:white;margin:0;font-size:22px">COMPARATIVA DE COTIZACIONES</h1><p style="color:#93c5fd;margin:6px 0 0;font-size:15px;font-weight:600">REQ ${req.folio} ${req.cost_center_name}</p></div><div style="background:white;border-radius:0 0 8px 8px;overflow-x:auto"><table><thead><tr><th style="padding:10px 8px;background:#f1f5f9;border:1px solid #e2e8f0;font-size:11px;color:#64748b">#</th><th style="padding:10px 8px;text-align:left;background:#f1f5f9;border:1px solid #e2e8f0;color:#7c3aed;font-weight:bold">PRODUCTO</th><th style="padding:10px 8px;background:#f1f5f9;border:1px solid #e2e8f0;color:#7c3aed;font-weight:bold">CANT</th><th style="padding:10px 8px;background:#f1f5f9;border:1px solid #e2e8f0;color:#7c3aed;font-weight:bold">UNIDAD</th>${sH}</tr></thead><tbody>${pR}${mR("SUBTOTAL",(s: any)=>s.subtotal,false)}${mR("I.V.A. (16%)",(s: any)=>s.iva,false)}${mR("TOTAL",(s: any)=>s.total,true)}${rR}${oR}</tbody></table></div><div style="margin-top:20px;text-align:center"><p style="color:#64748b;font-size:13px;margin-bottom:15px">Selecciona proveedor para autorizar:</p>${btns}</div><div style="margin-top:15px;text-align:center"><a href="${BASE_URL}/api/requisicion/approve-purchase?token=${token}&action=RECHAZADA" style="display:inline-block;padding:10px 30px;background:#dc2626;color:white;text-decoration:none;border-radius:8px;font-weight:bold">RECHAZAR TODAS</a></div><p style="text-align:center;color:#94a3b8;font-size:10px;margin-top:20px">ARIA27 - Grupo Cuavante</p></div></body></html>`;
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
      .from("Requisiciones")
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

      await supabase.from("Requisiciones").update({
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
      await supabase.from("Requisiciones").update({
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

