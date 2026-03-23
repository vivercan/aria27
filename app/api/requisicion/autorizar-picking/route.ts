import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
  // AUTH CHECK removido 23-Mar-2026: sistema usa login Zoho SMTP, no Supabase Auth.
  // Auth real se implementará cuando se migre a Supabase Auth (decisión aprobada, pendiente).

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { requisition_id, folio, obra, urgency, selections } = await req.json();

    // Group by supplier
    const grouped: Record<string, any[]> = {};
    for (const sel of selections) {
      if (!grouped[sel.supplier_name]) grouped[sel.supplier_name] = [];
      grouped[sel.supplier_name].push(sel);
    }

    // Get next OC number
    const { count } = await supabase.from("purchase_orders").select("*", { count: "exact", head: true });
    let nextNum = (count || 0) + 1;
    const ocFolios: string[] = [];
    let grandTotal = 0;

    // Create one PO per supplier
    for (const [supplierName, supplierItems] of Object.entries(grouped)) {
      const ocFolio = `OC-${new Date().getFullYear()}-${String(nextNum).padStart(5, "0")}`;
      const total = supplierItems.reduce((s: number, i: any) => s + i.total_price, 0);
      grandTotal += total;

      await supabase.from("purchase_orders").insert({
        folio: ocFolio,
        requisition_id: Number(requisition_id),
        supplier_name: supplierName,
        total: total,
        status: "GENERADA",
        payment_method: supplierItems[0].forma_pago,
        credit_days: supplierItems[0].dias_credito,
        created_by: "direccion",
        authorized_by: "direccion",
        authorized_at: new Date().toISOString(),
      });

      // Update each item
      for (const item of supplierItems) {
        await supabase.from("requisition_items").update({
          selected_supplier_name: supplierName,
          selected_price: item.unit_price,
          director_comments: `OC: ${ocFolio}`,
        }).eq("id", item.item_id);
      }

      ocFolios.push(`${ocFolio} - ${supplierName}: $${total.toLocaleString()}`);
      nextNum++;
    }

    // Update requisition status
    await supabase.from("Requisiciones").update({ status: "AUTORIZADA" }).eq("id", requisition_id);

    // Notify Compras
    const { data: compras } = await supabase.from("Users").select("*").eq("role", "compras").single();
    const ocList = ocFolios.join("\n");

    const materialesText = selections.map((s: any) =>
      `• ${s.product_name} (${s.quantity} ${s.unit}) → ${s.supplier_name} $${s.unit_price.toLocaleString()}`
    ).join("\n");

    // WhatsApp — usar template aprobado oc_generada
    if (compras?.phone) {
      const firstOcFolio = ocFolios[0]?.split(" - ")[0] || "OC";
      await sendWhatsAppTemplate(
        "oc_generada",
        [folio, firstOcFolio, obra, `$${grandTotal.toLocaleString()}`, urgency || "normal"],
        compras.phone
      );
    }

    // Email
    if (compras?.email) {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: compras.email,
        subject: `Compra Autorizada ${folio} - ${obra} ($${grandTotal.toLocaleString()})`,
        html: `
          <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0f172a;color:white;padding:30px;border-radius:8px;">
            <div style="text-align:center;margin-bottom:20px;">
              <div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#22d3ee">ARIA</div>
              <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;letter-spacing:3px">Operations OS</div>
            </div>
            <div style="background:#064e3b;padding:15px;border-radius:8px;text-align:center;margin-bottom:20px;">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#34d399">COMPRA AUTORIZADA</p>
            </div>
            <p><strong style="color:#94a3b8">Requisición:</strong> ${folio}</p>
            <p><strong style="color:#94a3b8">Obra:</strong> ${obra}</p>
            <p><strong style="color:#94a3b8">Total:</strong> <span style="color:#34d399;font-size:20px;font-weight:bold">$${grandTotal.toLocaleString()}</span></p>
            <hr style="border-color:#334155;margin:20px 0">
            <p style="color:#94a3b8;font-weight:bold">Órdenes de Compra:</p>
            ${Object.entries(grouped).map(([name, sitems]: [string, any[]]) => {
              const t = sitems.reduce((s: number, i: any) => s + i.total_price, 0);
              return `<div style="background:#1e293b;padding:12px;border-radius:6px;margin:8px 0">
                <p style="margin:0;color:white;font-weight:bold">${name} - $${t.toLocaleString()}</p>
                ${sitems.map((i: any) => `<p style="margin:4px 0 0;color:#94a3b8;font-size:13px">• ${i.product_name} (${i.quantity} ${i.unit}) @ $${i.unit_price.toLocaleString()}</p>`).join("")}
              </div>`;
            }).join("")}
          </div>
        `
      });
    }

    return NextResponse.json({ success: true, purchase_orders: ocFolios.length, folios: ocFolios });
  } catch (error: any) {
    console.error("Error autorizar picking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
  // AUTH CHECK - agregado 22-Feb-2026
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { requisition_id, folio, obra, urgency, selections } = await req.json();

    // Group by supplier
    const grouped: Record<string, any[]> = {};
    for (const sel of selections) {
      if (!grouped[sel.supplier_name]) grouped[sel.supplier_name] = [];
      grouped[sel.supplier_name].push(sel);
    }

    // Get next OC number
    const { count } = await supabase.from("purchase_orders").select("*", { count: "exact", head: true });
    let nextNum = (count || 0) + 1;
    const ocFolios: string[] = [];
    let grandTotal = 0;

    // Create one PO per supplier
    for (const [supplierName, supplierItems] of Object.entries(grouped)) {
      const ocFolio = `OC-${new Date().getFullYear()}-${String(nextNum).padStart(5, "0")}`;
      const total = supplierItems.reduce((s: number, i: any) => s + i.total_price, 0);
      grandTotal += total;

      await supabase.from("purchase_orders").insert({
        folio: ocFolio,
        requisition_id: Number(requisition_id),
        supplier_name: supplierName,
        total: total,
        status: "GENERADA",
        payment_method: supplierItems[0].forma_pago,
        credit_days: supplierItems[0].dias_credito,
        created_by: "direccion",
        authorized_by: "direccion",
        authorized_at: new Date().toISOString(),
      });

      // Update each item
      for (const item of supplierItems) {
        await supabase.from("requisition_items").update({
          selected_supplier_name: supplierName,
          selected_price: item.unit_price,
          director_comments: `OC: ${ocFolio}`,
        }).eq("id", item.item_id);
      }

      ocFolios.push(`${ocFolio} - ${supplierName}: $${total.toLocaleString()}`);
      nextNum++;
    }

    // Update requisition status
    await supabase.from("Requisiciones").update({ status: "AUTORIZADA" }).eq("id", requisition_id);

    // Notify Compras
    const { data: compras } = await supabase.from("Users").select("*").eq("role", "compras").single();
    const ocList = ocFolios.join("\n");

    const materialesText = selections.map((s: any) =>
      `• ${s.product_name} (${s.quantity} ${s.unit}) → ${s.supplier_name} $${s.unit_price.toLocaleString()}`
    ).join("\n");

    // WhatsApp — usar template aprobado oc_generada
    if (compras?.phone) {
      const firstOcFolio = ocFolios[0]?.split(" - ")[0] || "OC";
      await sendWhatsAppTemplate(
        "oc_generada",
        [folio, firstOcFolio, obra, `$${grandTotal.toLocaleString()}`, urgency || "normal"],
        compras.phone
      );
    }

    // Email
    if (compras?.email) {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: compras.email,
        subject: `Compra Autorizada ${folio} - ${obra} ($${grandTotal.toLocaleString()})`,
        html: `
          <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0f172a;color:white;padding:30px;border-radius:8px;">
            <div style="text-align:center;margin-bottom:20px;">
              <div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#22d3ee">ARIA</div>
              <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;letter-spacing:3px">Operations OS</div>
            </div>
            <div style="background:#064e3b;padding:15px;border-radius:8px;text-align:center;margin-bottom:20px;">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#34d399">COMPRA AUTORIZADA</p>
            </div>
            <p><strong style="color:#94a3b8">Requisición:</strong> ${folio}</p>
            <p><strong style="color:#94a3b8">Obra:</strong> ${obra}</p>
            <p><strong style="color:#94a3b8">Total:</strong> <span style="color:#34d399;font-size:20px;font-weight:bold">$${grandTotal.toLocaleString()}</span></p>
            <hr style="border-color:#334155;margin:20px 0">
            <p style="color:#94a3b8;font-weight:bold">Órdenes de Compra:</p>
            ${Object.entries(grouped).map(([name, sitems]: [string, any[]]) => {
              const t = sitems.reduce((s: number, i: any) => s + i.total_price, 0);
              return `<div style="background:#1e293b;padding:12px;border-radius:6px;margin:8px 0">
                <p style="margin:0;color:white;font-weight:bold">${name} - $${t.toLocaleString()}</p>
                ${sitems.map((i: any) => `<p style="margin:4px 0 0;color:#94a3b8;font-size:13px">• ${i.product_name} (${i.quantity} ${i.unit}) @ $${i.unit_price.toLocaleString()}</p>`).join("")}
              </div>`;
            }).join("")}
          </div>
        `
      });
    }

    return NextResponse.json({ success: true, purchase_orders: ocFolios.length, folios: ocFolios });
  } catch (error: any) {
    console.error("Error autorizar picking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

async function sendWhatsApp(phone: string, message: string) {
  const full = phone.replace(/[^0-9]/g, "").startsWith("52")
    ? phone.replace(/[^0-9]/g, "") : "52" + phone.replace(/[^0-9]/g, "");
  await fetch(`https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: full, type: "text", text: { body: message } })
  });
}

export async function POST(req: Request) {
  try {
  // AUTH CHECK - agregado 22-Feb-2026
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { requisition_id, folio, obra, urgency, selections } = await req.json();

    // Group by supplier
    const grouped: Record<string, any[]> = {};
    for (const sel of selections) {
      if (!grouped[sel.supplier_name]) grouped[sel.supplier_name] = [];
      grouped[sel.supplier_name].push(sel);
    }

    // Get next OC number
    const { count } = await supabase.from("purchase_orders").select("*", { count: "exact", head: true });
    let nextNum = (count || 0) + 1;
    const ocFolios: string[] = [];
    let grandTotal = 0;

    // Create one PO per supplier
    for (const [supplierName, supplierItems] of Object.entries(grouped)) {
      const ocFolio = `OC-${new Date().getFullYear()}-${String(nextNum).padStart(5, "0")}`;
      const total = supplierItems.reduce((s: number, i: any) => s + i.total_price, 0);
      grandTotal += total;

      await supabase.from("purchase_orders").insert({
        folio: ocFolio,
        requisition_id: Number(requisition_id),
        supplier_name: supplierName,
        total: total,
        status: "GENERADA",
        payment_method: supplierItems[0].forma_pago,
        credit_days: supplierItems[0].dias_credito,
        created_by: "direccion",
        authorized_by: "direccion",
        authorized_at: new Date().toISOString(),
      });

      // Update each item
      for (const item of supplierItems) {
        await supabase.from("requisition_items").update({
          selected_supplier_name: supplierName,
          selected_price: item.unit_price,
          director_comments: `OC: ${ocFolio}`,
        }).eq("id", item.item_id);
      }

      ocFolios.push(`${ocFolio} - ${supplierName}: $${total.toLocaleString()}`);
      nextNum++;
    }

    // Update requisition status
    await supabase.from("Requisiciones").update({ status: "AUTORIZADA" }).eq("id", requisition_id);

    // Notify Compras
    const { data: compras } = await supabase.from("Users").select("*").eq("role", "compras").single();
    const ocList = ocFolios.join("\n");

    const materialesText = selections.map((s: any) =>
      `• ${s.product_name} (${s.quantity} ${s.unit}) → ${s.supplier_name} $${s.unit_price.toLocaleString()}`
    ).join("\n");

    // WhatsApp
    if (compras?.phone) {
      const msg = `✅ *COMPRA AUTORIZADA*\n📋 ${folio}\n📍 ${obra}\n\n🛒 ${Object.keys(grouped).length} orden(es) de compra:\n${ocList}\n\n📦 Materiales:\n${materialesText}\n\n💰 *Total: $${grandTotal.toLocaleString()}*`;
      await sendWhatsApp(compras.phone, msg);
    }

    // Email
    if (compras?.email) {
      await resend.emails.send({
        from: "ARIA27 <noreply@mail.jjcrm27.com>",
        to: compras.email,
        subject: `Compra Autorizada ${folio} - ${obra} ($${grandTotal.toLocaleString()})`,
        html: `
          <div style="font-family:Arial;max-width:600px;margin:0 auto;background:#0f172a;color:white;padding:30px;border-radius:8px;">
            <div style="text-align:center;margin-bottom:20px;">
              <div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#22d3ee">ARIA</div>
              <div style="font-size:10px;text-transform:uppercase;color:#94a3b8;letter-spacing:3px">Operations OS</div>
            </div>
            <div style="background:#064e3b;padding:15px;border-radius:8px;text-align:center;margin-bottom:20px;">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#34d399">COMPRA AUTORIZADA</p>
            </div>
            <p><strong style="color:#94a3b8">Requisición:</strong> ${folio}</p>
            <p><strong style="color:#94a3b8">Obra:</strong> ${obra}</p>
            <p><strong style="color:#94a3b8">Total:</strong> <span style="color:#34d399;font-size:20px;font-weight:bold">$${grandTotal.toLocaleString()}</span></p>
            <hr style="border-color:#334155;margin:20px 0">
            <p style="color:#94a3b8;font-weight:bold">Órdenes de Compra:</p>
            ${Object.entries(grouped).map(([name, sitems]: [string, any[]]) => {
              const t = sitems.reduce((s: number, i: any) => s + i.total_price, 0);
              return `<div style="background:#1e293b;padding:12px;border-radius:6px;margin:8px 0">
                <p style="margin:0;color:white;font-weight:bold">${name} - $${t.toLocaleString()}</p>
                ${sitems.map((i: any) => `<p style="margin:4px 0 0;color:#94a3b8;font-size:13px">• ${i.product_name} (${i.quantity} ${i.unit}) @ $${i.unit_price.toLocaleString()}</p>`).join("")}
              </div>`;
            }).join("")}
          </div>
        `
      });
    }

    return NextResponse.json({ success: true, purchase_orders: ocFolios.length, folios: ocFolios });
  } catch (error: any) {
    console.error("Error autorizar picking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

