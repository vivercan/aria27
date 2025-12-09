import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token || !action) {
    return new NextResponse(htmlPage("Error", "Parametros invalidos", "#ef4444"), { headers: { "Content-Type": "text/html" } });
  }

  try {
    const { data: req } = await supabase
      .from("requisitions")
      .select("*")
      .eq("authorization_comments", token)
      .single();

    if (!req) {
      return new NextResponse(htmlPage("Error", "No encontrada o ya procesada", "#ef4444"), { headers: { "Content-Type": "text/html" } });
    }

    if (action === "APROBADA") {
      // Generar orden de compra
      const { data: lastOrder } = await supabase.from("purchase_orders").select("folio").order("created_at", { ascending: false }).limit(1);
      const nextNum = lastOrder && lastOrder[0] ? parseInt(lastOrder[0].folio.split("-")[2]) + 1 : 1;
      const folio = `OC-${new Date().getFullYear()}-${String(nextNum).padStart(5, "0")}`;

      const { data: quotation } = await supabase.from("quotations").select("*").eq("requisition_id", req.id).order("created_at", { ascending: false }).limit(1).single();

      await supabase.from("purchase_orders").insert({
        folio,
        requisition_id: req.id,
        supplier_id: quotation?.supplier_id,
        supplier_name: quotation?.supplier_name,
        total: quotation?.total,
        status: "GENERADA",
        created_by: "timonfx@hotmail.com"
      });

      await supabase.from("requisitions").update({ purchase_status: "OC_GENERADA", authorization_comments: null }).eq("id", req.id);

      // Notificar a todos
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: ["juanviverosv@gmail.com", "recursos.humanos@gcuavante.com", "vivercan@yahoo.com"],
        subject: `OC GENERADA: ${folio} - ${req.folio}`,
        html: `<div style="font-family:Arial,sans-serif"><div style="background:#10b981;color:white;padding:20px;text-align:center"><h1>Orden de Compra Generada</h1></div><div style="padding:20px"><p><strong>OC:</strong> ${folio}</p><p><strong>Requisición:</strong> ${req.folio}</p><p><strong>Proveedor:</strong> ${quotation?.supplier_name}</p><p><strong>Total:</strong> $${quotation?.total?.toLocaleString()}</p></div></div>`
      });

      return new NextResponse(htmlPage("Autorizado", `Orden de Compra ${folio} generada`, "#10b981"), { headers: { "Content-Type": "text/html" } });
    } else {
      await supabase.from("requisitions").update({ purchase_status: "COTIZACION_RECHAZADA", authorization_comments: null }).eq("id", req.id);
      return new NextResponse(htmlPage("Rechazado", "La cotización fue rechazada", "#ef4444"), { headers: { "Content-Type": "text/html" } });
    }
  } catch (error: any) {
    return new NextResponse(htmlPage("Error", error.message, "#ef4444"), { headers: { "Content-Type": "text/html" } });
  }
}

function htmlPage(title: string, message: string, color: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARIA27</title></head><body style="font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0f172a"><div style="text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.3)"><div style="width:80px;height:80px;border-radius:50%;background:${color};margin:0 auto 20px;display:flex;align-items:center;justify-content:center"><span style="font-size:40px;color:white">${color==="#10b981"?"✓":"!"}</span></div><h1 style="margin:0 0 10px;color:#0f172a">${title}</h1><p style="color:#64748b;margin:0">${message}</p><a href="https://aria.jjcrm27.com" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#0f172a;color:white;text-decoration:none;border-radius:8px">Ir a ARIA27</a></div></body></html>`;
}
