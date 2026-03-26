import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "ARIA27 <noreply@mail.jjcrm27.com>", to, subject, html }),
    });
  } catch (e) { console.error("Error email:", e); }
}

async function actualizarInventario(obraId: number, obraNombre: string, materiales: any[]): Promise<number> {
  let itemsActualizados = 0;

  for (const mat of materiales) {
    const productoNombre = mat.product_name || mat.producto || "";
    const cantidad = mat.quantity || mat.cantidad_recibida || 0;
    const unidad = mat.unit || mat.unidad || "PZA";

    if (!productoNombre || cantidad <= 0) continue;

    const { data: existe } = await supabase
      .from("inventario_obra")
      .select("*")
      .eq("obra_id", obraId)
      .eq("producto_nombre", productoNombre)
      .single();

    if (existe) {
      const { error } = await supabase
        .from("inventario_obra")
        .update({
          cantidad_disponible: (existe.cantidad_disponible || 0) + cantidad,
          ultimo_movimiento: new Date().toISOString(),
        })
        .eq("id", existe.id);
      if (!error) itemsActualizados++;
    } else {
      const { error } = await supabase.from("inventario_obra").insert({
        obra_id: obraId,
        obra_nombre: obraNombre,
        producto_nombre: productoNombre,
        unidad: unidad,
        cantidad_disponible: cantidad,
        cantidad_usada: 0,
        ultimo_movimiento: new Date().toISOString(),
      });
      if (!error) itemsActualizados++;
    }
  }

  return itemsActualizados;
}

export async function POST(req: NextRequest) {
  try {
  // AUTH CHECK removido 23-Mar-2026: sistema usa login Zoho SMTP, no Supabase Auth.
  // Auth real se implementará cuando se migre a Supabase Auth (decisión aprobada, pendiente).

    const body = await req.json();
    const {
      purchase_order_id,
      purchase_order_folio,
      supplier_name,
      obra_id,
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
      purchase_order_id: purchase_order_id || null,
      purchase_order_folio,
      solicitante_email,
    }).select().single();

    if (error) throw error;

    // Actualizar inventario
    let itemsInventario = 0;
    let obraIdFinal = obra_id;

    if (!obraIdFinal && obra_nombre) {
      const { data: obraData } = await supabase
        .from("centros_trabajo")
        .select("id")
        .eq("nombre", obra_nombre)
        .single();
      obraIdFinal = obraData?.id;

      if (!obraData) {
        console.warn("[ENTREGA] Obra no encontrada en centros_trabajo:", obra_nombre);
      }
    }

    if (obraIdFinal && materiales && materiales.length > 0) {
      itemsInventario = await actualizarInventario(obraIdFinal, obra_nombre, materiales);

    } else {
      console.warn("[ENTREGA] Sin obra_id o sin materiales \u2014 inventario no actualizado. obra_id:", obraIdFinal, "materiales:", materiales?.length);
    }

    // WhatsApp con plantilla al solicitante
    if (solicitante_phone) {
      await sendWhatsAppTemplate(
        "entrega_material",
        [purchase_order_folio, obra_nombre, supplier_name, folioEntrega],
        solicitante_phone
      );
    }

    // Email al solicitante
    if (solicitante_email) {
      const inventarioHtml = itemsInventario > 0
        ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Inventario:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong style="color:#10b981;">${itemsInventario} items actualizados \u2713</strong></td></tr>`
        : `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Inventario:</td><td style="padding:8px;border-bottom:1px solid #eee;"><span style="color:#f59e0b;">Pendiente de procesar</span></td></tr>`;

      await sendEmail(
        solicitante_email,
        `\u2705 Material Recibido - ${purchase_order_folio}`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#10b981;">\u2705 Material Recibido</h2>
          <p>Tu material de la orden <strong>${purchase_order_folio}</strong> ha sido recibido.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Obra:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${obra_nombre}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Proveedor:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${supplier_name}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Entrega:</td><td style="padding:8px;border-bottom:1px solid #eee;"><strong>${folioEntrega}</strong></td></tr>
            ${inventarioHtml}
          </table>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#999;font-size:12px;">ARIA27 - Grupo Constructor Urbano Avante</p>
        </div>`
      );
    }

    return NextResponse.json({
      success: true,
      entrega,
      folio: folioEntrega,
      inventario_actualizado: itemsInventario,
      obra_id_usado: obraIdFinal
    });
  } catch (error: any) {
    console.error("Error registrar entrega:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
