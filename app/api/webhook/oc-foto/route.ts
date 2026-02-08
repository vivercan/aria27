import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY_TOKEN = "aria27_oc_foto_verify";

async function sendWhatsApp(phone: string, message: string) {
  try {
    await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: message } }),
    });
  } catch (e) { console.error("Error WA:", e); }
}

// Verificación del webhook
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook OC-FOTO verificado");
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Recibir mensajes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: "no_messages" });
    }

    const msg = messages[0];
    const from = msg.from;
    const msgType = msg.type;

    // Buscar folio OC en el texto o caption
    let texto = "";
    let imageId = "";
    
    if (msgType === "text") {
      texto = msg.text?.body || "";
    } else if (msgType === "image") {
      texto = msg.image?.caption || "";
      imageId = msg.image?.id || "";
    }

    // Buscar patrón OC-YYYY-NNNNN
    const folioMatch = texto.match(/OC-\d{4}-\d{5}/i);
    
    if (!folioMatch) {
      await sendWhatsApp(from, "⚠️ No encontré el folio de OC en tu mensaje.\n\nEnvía la foto con el folio en el caption, ejemplo:\nOC-2025-00001");
      return NextResponse.json({ status: "no_folio" });
    }

    const folioOC = folioMatch[0].toUpperCase();

    // Verificar que la OC existe
    const { data: oc } = await supabase.from("purchase_orders").select("*").eq("folio", folioOC).single();
    
    if (!oc) {
      await sendWhatsApp(from, `❌ No encontré la orden ${folioOC} en el sistema.`);
      return NextResponse.json({ status: "oc_not_found" });
    }

    // Si hay imagen, obtener URL
    let fotoUrl = "";
    if (imageId) {
      const mediaRes = await fetch(`https://graph.facebook.com/v22.0/${imageId}`, {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      });
      const mediaData = await mediaRes.json();
      fotoUrl = mediaData.url || "";
    }

    // Buscar o crear entrega para esta OC
    let { data: entrega } = await supabase.from("entregas").select("*").eq("purchase_order_folio", folioOC).single();

    if (entrega) {
      // Actualizar con foto
      await supabase.from("entregas").update({ foto_url: fotoUrl }).eq("id", entrega.id);
      await sendWhatsApp(from, `✅ Foto vinculada a la entrega ${entrega.folio} (${folioOC})`);
    } else {
      // Crear entrega con foto
      const { count } = await supabase.from("entregas").select("*", { count: "exact", head: true });
      const nuevoFolio = `ENT-${String((count || 0) + 1).padStart(5, "0")}`;
      
      await supabase.from("entregas").insert({
        folio: nuevoFolio,
        fecha_entrega: new Date().toISOString().split("T")[0],
        hora_entrega: new Date().toTimeString().slice(0, 5),
        proveedor_nombre: oc.supplier_name,
        status: "COMPLETA",
        purchase_order_id: oc.id,
        purchase_order_folio: folioOC,
        requisition_id: oc.requisition_id,
        foto_url: fotoUrl,
      });

      await sendWhatsApp(from, `✅ Entrega ${nuevoFolio} creada para ${folioOC}\n📷 Foto guardada como evidencia`);
    }

    return NextResponse.json({ status: "ok", folio: folioOC });
  } catch (error: any) {
    console.error("Error webhook OC-foto:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
