import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { processAndUploadPhoto } from "@/lib/image-watermark";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppText, verifyWebhookSignature, verifyWebhookUrlToken } from "@/lib/whatsapp";
const log = logger("WEBHOOK-OC-FOTO");

// (!) ZONA CRITICA META/WHATSAPP -- NO cambiar 'db' a cliente anon.
// El anon client tiene RLS activo -- bloquea lectura de purchase_orders y entregas.
const db = getSupabaseAdmin();

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const VERIFY_TOKEN = "aria27_oc_foto_verify";

async function sendWhatsApp(phone: string, message: string) {
  await sendWhatsAppText(phone, message, { origen: "webhook-oc-foto", enviadoPor: "system" });
}

// Verificación del webhook
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {

    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Recibir mensajes
export async function POST(req: NextRequest) {
  try {
    // HMAC signature verification (Meta webhook security)
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    if (!verifyWebhookSignature(rawBody, signature)) {
      // Fallback: URL token (cuando Supabase router strips x-hub-signature-256)
      const urlToken = req.nextUrl.searchParams.get("token");
      if (!verifyWebhookUrlToken(urlToken)) {
        log.warn("Auth fallida: HMAC inválido y token URL ausente/incorrecto");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
      log.info("Auth via URL token (HMAC header ausente por proxy)");
    }

    // RATE LIMIT: webhook publico — 30 req/min por IP (anti-abuso)
    const clientId = getClientIdentifier(req);
    const rl = checkRateLimit(clientId, { key: "wh:oc-foto", ...RATE_LIMITS.PUBLIC });
    if (!rl.allowed) {
      log.warn("Rate limit excedido", { clientId, retryAfter: rl.retryAfter });
      return rateLimitResponse(rl);
    }

    const body = JSON.parse(rawBody);
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
    const { data: oc } = await db.from("purchase_orders").select("*").eq("folio", folioOC).single();
    
    if (!oc) {
      await sendWhatsApp(from, `❌ No encontré la orden ${folioOC} en el sistema.`);
      return NextResponse.json({ status: "oc_not_found" });
    }

    // Si hay imagen, descargar → hash check → watermark → Storage (URL permanente)
    let fotoUrl = "";
    let fotoHash = "";

    if (imageId) {
      const mediaRes = await fetch(`https://graph.facebook.com/v22.0/${imageId}`, {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      });
      const mediaData = await mediaRes.json();
      const tempUrl = mediaData.url || "";

      if (tempUrl) {
        // Descargar imagen para hash y watermark
        const imgRes = await fetch(tempUrl, { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } });
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

        // Calcular hash SHA-256 de los primeros 32KB para detección de duplicados
        const { createHash } = await import("crypto");
        const sampleSize = Math.min(imgBuffer.length, 32 * 1024);
        fotoHash = createHash("sha256")
          .update(imgBuffer.subarray(0, sampleSize))
          .digest("hex")
          .substring(0, 16); // primeros 16 chars son suficientes para detección rápida

        // ── Cotejo de foto existente ─────────────────────────────────────────
        const existingEntrega = await db
          .from("entregas")
          .select("folio, foto_url, foto_hash")
          .eq("purchase_order_folio", folioOC)
          .maybeSingle();

        const existing = existingEntrega.data;

        if (existing?.foto_hash && existing.foto_hash === fotoHash) {
          // MISMA FOTO — rechazar silenciosamente, no guardar duplicado
          log.warn("Foto duplicada detectada — no se guardó", { folioOC, fotoHash });
          await sendWhatsApp(from,
            `⚠️ *FOTO DUPLICADA*\n\nEsta imagen ya está registrada para la entrega de *${folioOC}*.\n\nNo se guardó de nuevo. Si es una foto diferente, intenta de nuevo con mejor iluminación o ángulo distinto.`
          );
          return NextResponse.json({ status: "foto_duplicada", folio: folioOC });
        }

        const storagePath = `oc-fotos/${folioOC}/${Date.now()}.jpg`;
        const permanentUrl = await processAndUploadPhoto({
          mediaUrl: tempUrl,
          whatsappToken: WHATSAPP_TOKEN || "",
          supabase: db,
          bucket: "inventario",
          storagePath,
        });
        fotoUrl = permanentUrl || tempUrl;
        if (!permanentUrl) {
          log.warn("No se pudo guardar foto OC en Storage", { folioOC });
        }
      }
    }

    // Buscar o crear entrega para esta OC
    const { data: entrega } = await db
      .from("entregas")
      .select("*")
      .eq("purchase_order_folio", folioOC)
      .maybeSingle();

    if (entrega) {
      const yaTeníaFoto = !!entrega.foto_url;
      const fotoAnteriorUrl = entrega.foto_url || null;

      // Actualizar con nueva foto + hash + timestamp + preservar historial
      await db.from("entregas").update({
        foto_url: fotoUrl,
        foto_hash: fotoHash || null,
        foto_uploaded_at: new Date().toISOString(),
        // Preservar URL anterior en notas para auditoría
        ...(yaTeníaFoto && fotoAnteriorUrl
          ? { notas: `[Foto anterior preservada: ${fotoAnteriorUrl}]` }
          : {}),
      }).eq("id", entrega.id);

      const reemplazadaLine = yaTeníaFoto
        ? "\n♻️ Foto anterior preservada en auditoría"
        : "";
      await sendWhatsApp(from,
        `✅ *FOTO GUARDADA*\n\n🛒 OC: ${folioOC}\n📋 Entrega: ${entrega.folio}\n📷 Foto con timestamp registrada${reemplazadaLine}\n\n✅ Registrado en ARIA27`
      );
    } else {
      // Crear entrega nueva con foto
      const { count } = await db
        .from("entregas")
        .select("*", { count: "exact", head: true });
      const nuevoFolio = `ENT-${String((count || 0) + 1).padStart(5, "0")}`;

      await db.from("entregas").insert({
        folio: nuevoFolio,
        fecha_entrega: new Date().toISOString().split("T")[0],
        hora_entrega: new Date().toTimeString().slice(0, 5),
        proveedor_nombre: oc.supplier_name,
        status: "COMPLETA",
        purchase_order_id: oc.id,
        purchase_order_folio: folioOC,
        requisition_id: oc.requisition_id,
        foto_url: fotoUrl,
        foto_hash: fotoHash || null,
        foto_uploaded_at: new Date().toISOString(),
      });

      await sendWhatsApp(from,
        `✅ *ENTREGA CREADA*\n\n🛒 OC: ${folioOC}\n📋 Nueva entrega: ${nuevoFolio}\n📷 Foto con watermark y timestamp\n\n✅ Registrado en ARIA27`
      );
    }

    return NextResponse.json({ status: "ok", folio: folioOC });
  } catch (error: unknown) {
    log.error("Error webhook OC-foto:", error);
    return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  }
}
