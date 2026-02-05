import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "869940452874474";
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendWhatsApp(phone: string, message: string) {
  const fullPhone = phone.startsWith("52") ? phone : `52${phone}`;
  try {
    await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: fullPhone, type: "text", text: { body: message } }),
    });
  } catch (e) { console.error("Error WA:", e); }
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "ARIA27 <noreply@mail.jjcrm27.com>", to, subject, html }),
    });
  } catch (e) { console.error("Error email:", e); }
}

async function actualizarInventario(obraId: number, obraNombre: string, materiales: any[]) {
  for (const mat of materiales) {
    const productoNombre = mat.product_name || mat.producto || "";
    const cantidad = mat.quantity || mat.cantidad_recibida || 0;
    const unidad = mat.unit || mat.unidad || "PZA";
    
    if (!productoNombre || cantidad <= 0) continue;

    // Buscar si ya existe en inventario
    const { data: existe } = await supabase
      .from("inventario_obra")
      .select("*")
      .eq("obra_id", obraId)
      .eq("producto_nombre", productoNombre)
      .single();

    if (existe) {
      // Actualizar cantidad
      await supabase
        .from("inventario_obra")
        .update({
          cantidad_disponible: (existe.cantidad_disponible || 0) + cantidad,
          ultimo_movimiento: new Date().toISOString(),
        })
        .eq("id", existe.id);
    } else {
      // Crear nuevo registro
      await supabase.from("inventario_obra").insert({
        obra_id: obraId,
        obra_nombre: obraNombre,
        producto_nombre: productoNombre,
        unidad: unidad,
        cantidad_disponible: cantidad,
        cantidad_usada: 0,
        ultimo_movimiento: new Date().toISOString(),
      });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      purchase_order_id, 
      purchase_order_folio, 
      supplier_name, 
      obra_nombre, 
      materiales, 
      requisition_id, 
      solicitante_email, 
      solicitante_phone 
    } = body;

    // Generar folio de entrega
    const { count } = await supabase.from("entregas").select("*", { count: "exact", head: true });
    const folioEntrega = `ENT-${String((count || 0) + 1).padStart(5, "0")}`;

    // Crear registro de entrega
    const { data: entrega, error } = await supabase.from("entregas").insert({
      folio: folioEntrega,
      fecha_entrega: new Date().toISOString().split("T")[0],
      hora_entrega: new Date().toTimeString().slice(0, 5),
      proveedor_nombre: supplier_name,
      obra_nombre: obra_nombre,
      recibido_por_nombre: "Pendiente confirmar",
      status: "COMPLETA",
      materiales_recibidos: materiales,
      purchase_order_id,
      purchase_order_folio,
      requisition_id,
      solicitante_email,
      notificado: true,
    }).select().single();

    if (error) throw error;

    // Obtener obra_id desde cost_centers
    const { data: obraData } = await supabase
      .from("cost_centers")
      .select("id")
      .eq("name", obra_nombre)
      .single();

    // Actualizar inventario si tenemos la obra
    if (obraData && materiales && materiales.length > 0) {
      await actualizarInventario(obraData.id, obra_nombre, materiales);
      console.log(`Inventario actualizado para obra ${obra_nombre}`);
    }

    // Notificar al solicitante
    const mensaje = `✅ *MATERIAL RECIBIDO*\n\nTu material de la OC *${purchase_order_folio}* ha llegado.\n\n📍 Obra: ${obra_nombre}\n📦 Proveedor: ${supplier_name}\n🎫 Entrega: ${folioEntrega}\n📦 Inventario actualizado automáticamente\n\nPuedes pasar a recogerlo o coordinar su uso.`;

    // WhatsApp al solicitante
    if (solicitante_phone) {
      await sendWhatsApp(solicitante_phone, mensaje);
    }

    // Email al solicitante
    if (solicitante_email) {
      await sendEmail(
        solicitante_email,
        `✅ Material Recibido - ${purchase_order_folio}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#10b981;">✅ Material Recibido</h2>
          <p>Tu material de la orden <strong>${purchase_order_folio}</strong> ha sido recibido.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Obra:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${obra_nombre}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Proveedor:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${supplier_name}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Entrega:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${folioEntrega}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Inventario:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong style="color:#10b981;">Actualizado ✓</strong></td></tr>
          </table>
          <p style="color:#666;font-size:14px;">El inventario de la obra ha sido actualizado automáticamente con los materiales recibidos.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#999;font-size:12px;">ARIA27 - Grupo Constructor Urbano Avante</p>
        </div>`
      );
    }

    return NextResponse.json({ 
      success: true, 
      entrega, 
      folio: folioEntrega,
      inventario_actualizado: !!obraData 
    });
  } catch (error: any) {
    console.error("Error registrar entrega:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
