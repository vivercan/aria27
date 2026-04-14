import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { processAndUploadPhoto } from "@/lib/image-watermark";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppText, verifyWebhookSignature } from "@/lib/whatsapp";
const log = logger("WEBHOOK-ATTENDANCE");

// ⚠️ ZONA CRÍTICA META/WHATSAPP — NO cambiar 'db' a cliente anon.
// El anon client tiene RLS activo → bloquea lectura de employees → "teléfono no registrado".
// Causa raíz del bug 14-Abr-2026. Usar SIEMPRE service role aquí.
const db = getSupabaseAdmin();

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY_TOKEN = "aria27_webhook_token";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ADMIN_PHONE = process.env.ADMIN_WHATSAPP_PHONE || "5218112392266";

(function checkMisconfigOnBoot() {
  const hasMetaSecret  = !!process.env.META_APP_SECRET;
  const hasHmacBypass  = process.env.DISABLE_WEBHOOK_HMAC === "true";
  const missingToken   = !process.env.WHATSAPP_ACCESS_TOKEN;
  const missingAnthro  = !process.env.ANTHROPIC_API_KEY;
  const issues: string[] = [];
  if (hasMetaSecret && !hasHmacBypass) {
    issues.push("\uD83D\uDD34 META_APP_SECRET activo + DISABLE_WEBHOOK_HMAC ausente \u2192 webhook retonar\u00E1 403");
  }
  if (missingToken) issues.push("\uD83D\uDD34 WHATSAPP_ACCESS_TOKEN ausente");
  if (missingAnthro) issues.push("\uD83D\uDD34 ANTHROPIC_API_KEY ausente");
  if (issues.length > 0) {
    const msg = `\u26A0\uFE0F *ARIA27 \u2014 WEBHOOK MAL CONFIGURADO*\\n\\n${issues.join("\\n")}\\n\\nAcci\u00F3n requerida URGENTE.`;
    sendWhatsAppText(ADMIN_PHONE, msg, { origen: "webhook-attendance", enviadoPor: "boot-check" })
      .catch(() => log.error("boot-check: no se pudo enviar alerta"));
    log.error("BOOT MISCONFIGURATION DETECTED", { issues });
  }
})();


// ============== UTILIDADES ==============
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

async function sendWhatsApp(phone: string, message: string) {
  await sendWhatsAppText(phone, message, { origen: "webhook-attendance", enviadoPor: "system" });
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

interface GastoData {
  proveedor?: string;
  monto?: number;
  fecha?: string;
  descripcion?: string;
  categoria?: string;
  obra?: string;
  esGasto?: boolean;
}

interface InventarioData {
  material?: string;
  cantidad?: number;
  unidad?: string;
  obra?: string;
  obra_destino?: string;  // Para transferencias: obra origen = obra, destino = obra_destino
  proveedor?: string;
  descripcion?: string;
  _caption?: string;
}

interface MediaInfo {
  url: string;
  mimeType: string;
}

// ============== CLAUDE API PARA EXTRAER DATOS DE TICKET ==============
async function extractGastoFromImage(imageUrl: string, mediaType: string): Promise<GastoData | null> {
  try {
    const imageResponse = await fetch(imageUrl, {
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}` }
    });
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
            { type: "text", text: `Analiza este ticket/recibo y extrae la información en formato JSON.
Responde SOLO con el JSON, sin explicaciones ni markdown:
{
  "proveedor": "nombre del negocio/tienda",
  "monto": 123.45,
  "fecha": "2025-01-04",
  "descripcion": "descripción breve de la compra",
  "categoria": "una de: MATERIAL, GASOLINA, COMIDA, HERRAMIENTA, SERVICIO, OTRO"
}
Si no puedes leer algo, pon null en ese campo.` }
          ]
        }]
      })
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error: unknown) {
    return null;
  }
}

async function extractGastoFromText(text: string): Promise<GastoData | null> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Extrae información de gasto de este mensaje: "${text}"
Responde SOLO con JSON:
{
  "proveedor": "nombre si lo menciona o null",
  "monto": 123.45,
  "descripcion": "qué compró",
  "categoria": "una de: MATERIAL, GASOLINA, COMIDA, HERRAMIENTA, SERVICIO, OTRO",
  "obra": "nombre de obra si la menciona o null"
}
Si no parece ser un gasto, responde: {"esGasto": false}`
        }]
      })
    });

    const result = await response.json();
    const responseText = result.content?.[0]?.text || "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error: unknown) {
    return null;
  }
}

async function getMediaUrl(mediaId: string): Promise<MediaInfo | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}` }
    });
    const data = await response.json();
    return { url: data.url, mimeType: data.mime_type };
  } catch (error: unknown) {
    return null;
  }
}

// ============== CLAUDE: EXTRAER DATOS DE INVENTARIO DESDE IMAGEN ==============
async function extractInventarioFromImage(imageUrl: string, mediaType: string, caption: string, tipo: "ENTRADA" | "SALIDA" = "ENTRADA"): Promise<InventarioData | null> {
  try {
    const imageResponse = await fetch(imageUrl, {
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}` }
    });
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
            { type: "text", text: `El usuario envió esta foto de material de construcción con el mensaje: "${caption}"

CONTEXTO: Este es un sistema de inventario de obras de construcción. El mensaje típico es:
"${tipo.toLowerCase()} [MATERIAL] [CANTIDAD] [UNIDAD] [NOMBRE_OBRA]"
Palabras como "entrada", "salida", "uso", "material", "llegó", "recibí", "inventario", "consumo" son KEYWORDS del sistema, NO son parte del nombre del material ni de la obra.

Extrae la información del material en formato JSON. Responde SOLO con el JSON:
{
  "material": "nombre del material SIN la palabra entrada/material/llegó/recibí (ej: Cemento, Arena sílica, Varilla 3/8)",
  "cantidad": 10,
  "unidad": "una de: PZA, LITRO, METRO, KILO, TONELADA, SACO, ROLLO, CAJA, PAQUETE, VIAJE, BOLSA, BOTE, CUBETA_19L",
  "obra": "nombre de la OBRA/PROYECTO donde se entrega (ej: OFICINA, MIRAVALLE, PINAR DEL LAGO) o null si no lo dice",
  "proveedor": "nombre del proveedor si lo menciona o null",
  "descripcion": "breve descripción de lo que se ve en la foto"
}
IMPORTANTE: La obra es la ÚLTIMA palabra(s) del mensaje, generalmente un nombre propio en MAYÚSCULAS.
Si no puedes determinar algo, pon null. La cantidad es obligatoria, si no la dice pon 1.` }
          ]
        }]
      })
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error: unknown) {
    log.error("Error extractInventarioFromImage:", error);
    return null;
  }
}

// ============== MANEJAR ENTRADA DE INVENTARIO VÍA WHATSAPP ==============
async function handleInventarioWhatsApp(from: string, phone10: string, invData: InventarioData, imageUrl: string) {
  const material = invData.material;
  const cantidad = invData.cantidad || 1;
  const unidad = invData.unidad || "PZA";
  const obraNombre = invData.obra;

  if (!material) {
    await sendWhatsApp(from, "❌ No pude identificar el material. Envía la foto con un mensaje como:\n\n📦 ENTRADA Arena 10 sacos MIRAVALLE");
    return;
  }

  // Buscar obra — si no la especificó, usar la del empleado
  let obraFinal = obraNombre;
  if (!obraFinal) {
    const emp = await findEmpleado(phone10, from);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obraFinal = (emp?.centro_trabajo as any)?.nombre;
  }

  if (!obraFinal) {
    await sendWhatsApp(from, `❌ No pude determinar la obra.\n\nEnvía la foto con el nombre de la obra:\n📦 ENTRADA ${material} ${cantidad} ${unidad} NOMBRE_OBRA`);
    return;
  }

  // Buscar obra en centros_trabajo
  let { data: obraRow } = await db
    .from("centros_trabajo")
    .select("id, nombre")
    .ilike("nombre", `%${obraFinal}%`)
    .limit(1)
    .single();

  // Fallback: si no encontró, buscar cada palabra del caption original en centros_trabajo
  if (!obraRow && invData._caption) {
    const palabras = invData._caption.split(/\s+/).filter((p: string) => p.length >= 3);
    const skipWords = ["entrada", "material", "inventario", "llegó", "llego", "recibí", "recibi", "sacos", "saco", "kilos", "kilo", "piezas", "metros", "litros", "cajas", "rollos"];
    for (const palabra of palabras) {
      if (skipWords.includes(palabra.toLowerCase()) || /^\d+$/.test(palabra)) continue;
      const { data: match } = await db
        .from("centros_trabajo")
        .select("id, nombre")
        .ilike("nombre", `%${palabra}%`)
        .limit(1)
        .single();
      if (match) { obraRow = match; break; }
    }
  }

  if (!obraRow) {
    await sendWhatsApp(from, `❌ No encontré la obra "${obraFinal}" en el sistema.\n\nVerifica el nombre e intenta de nuevo.\nObras disponibles: envía "ayuda" para ver opciones.`);
    return;
  }

  // Buscar si ya existe en inventario
  const { data: existe } = await db
    .from("inventario_obra")
    .select("*")
    .eq("obra_id", obraRow.id)
    .ilike("producto_nombre", material)
    .single();

  let saldoPost = 0;
  if (existe) {
    saldoPost = Number(existe.cantidad_disponible) + cantidad;
    const { error: errInvUpd } = await db.from("inventario_obra").update({
      cantidad_disponible: saldoPost,
      ultimo_movimiento: new Date().toISOString(),
      foto_url: imageUrl,
    }).eq("id", existe.id);
    if (errInvUpd) log.error("update inventario_obra failed", { error: errInvUpd.message });
  } else {
    saldoPost = cantidad;
    const { error: errInvIns } = await db.from("inventario_obra").insert({
      obra_id: obraRow.id,
      obra_nombre: obraRow.nombre,
      producto_nombre: material,
      unidad: unidad,
      cantidad_disponible: cantidad,
      cantidad_usada: 0,
      ultimo_movimiento: new Date().toISOString(),
      foto_url: imageUrl,
    });
    if (errInvIns) log.error("insert inventario_obra failed", { error: errInvIns.message });
  }

  // Registrar movimiento con foto
  const { error: errMovIns } = await db.from("inventario_movimientos").insert({
    obra_id: obraRow.id,
    obra_nombre: obraRow.nombre,
    producto_nombre: material,
    unidad: unidad,
    tipo: "ENTRADA",
    cantidad: cantidad,
    saldo_post: saldoPost,
    motivo: `Entrada vía WhatsApp${invData.proveedor ? ` — Prov: ${invData.proveedor}` : ""}`,
    referencia_tipo: "WHATSAPP",
    referencia_id: null,
    usuario: `WhatsApp ${phone10}`,
    foto_url: imageUrl,
  });
  if (errMovIns) log.error("insert inventario_movimientos failed", { error: errMovIns.message });

  const provLine = invData.proveedor ? `🏪 ${invData.proveedor}\n` : "";
  await sendWhatsApp(from, `✅ *INVENTARIO ACTUALIZADO*\n\n📦 ${material}\n📏 +${cantidad} ${unidad}\n🏗️ ${obraRow.nombre}\n${provLine}📊 Saldo: ${saldoPost} ${unidad}\n📷 Foto guardada\n\n¡Registrado!`);
}

// ============== CLAUDE: EXTRAER DATOS DE TRANSFERENCIA DESDE IMAGEN/TEXTO ==============
async function extractTransferenciaFromImage(imageUrl: string, mediaType: string, caption: string): Promise<InventarioData | null> {
  try {
    const imageResponse = await fetch(imageUrl, {
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}` }
    });
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
            { type: "text", text: `El usuario envió esta foto de material con el mensaje: "${caption}"

CONTEXTO: Transferencia de material entre obras de construcción.
El mensaje típico es: "TRANSFERENCIA [MATERIAL] [CANTIDAD] [UNIDAD] de [OBRA_ORIGEN] a [OBRA_DESTINO]"
o "TRASLADO [MATERIAL] [CANTIDAD] [OBRA_ORIGEN] → [OBRA_DESTINO]"

Extrae la información en JSON. Responde SOLO con el JSON:
{
  "material": "nombre del material SIN keywords",
  "cantidad": 10,
  "unidad": "una de: PZA, LITRO, METRO, KILO, TONELADA, SACO, ROLLO, CAJA, PAQUETE, VIAJE, BOLSA, BOTE, CUBETA_19L",
  "obra": "nombre de la OBRA ORIGEN (de donde sale el material)",
  "obra_destino": "nombre de la OBRA DESTINO (a donde va el material)",
  "descripcion": "breve descripción"
}}
Si no puedes determinar algo, pon null. La cantidad es obligatoria, si no la dice pon 1.` }
          ]
        }]
      })
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error: unknown) {
    log.error("Error extractTransferenciaFromImage:", error);
    return null;
  }
}

// ============== MANEJAR SALIDA DE INVENTARIO ==============
async function handleSalidaInventario(from: string, phone10: string, invData: InventarioData, imageUrl: string) {
  const material = invData.material;
  const cantidad = invData.cantidad || 1;
  const unidad = invData.unidad || "PZA";
  const obraNombre = invData.obra;

  if (!material) {
    await sendWhatsApp(from, "❌ No pude identificar el material.\n\nEnvía la foto con:\n📦 SALIDA Arena 10 sacos MIRAVALLE");
    return;
  }

  let obraFinal = obraNombre;
  if (!obraFinal) {
    const emp = await findEmpleado(phone10, from);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obraFinal = (emp?.centro_trabajo as any)?.nombre;
  }
  if (!obraFinal) {
    await sendWhatsApp(from, `❌ No pude determinar la obra.\n\nEnvía: SALIDA ${material} ${cantidad} ${unidad} NOMBRE_OBRA`);
    return;
  }

  const { data: obraRow } = await db.from("centros_trabajo").select("id, nombre").ilike("nombre", `%${obraFinal}%`).limit(1).single();
  if (!obraRow) {
    await sendWhatsApp(from, `❌ No encontré la obra "${obraFinal}" en el sistema.`);
    return;
  }

  const { data: existe } = await db.from("inventario_obra").select("*").eq("obra_id", obraRow.id).ilike("producto_nombre", material).single();
  if (!existe) {
    await sendWhatsApp(from, `❌ *${material}* no está registrado en inventario de *${obraRow.nombre}*.\n\nSi quieres registrar una ENTRADA de material nuevo:\n📦 ENTRADA ${material} [cantidad] [unidad] ${obraRow.nombre}`);
    return;
  }

  const saldoActual = Number(existe.cantidad_disponible);
  if (saldoActual < cantidad) {
    await sendWhatsApp(from, `⚠️ *STOCK INSUFICIENTE*\n\n📦 ${material}\n📊 Disponible: ${saldoActual} ${unidad}\n❌ Solicitado: ${cantidad} ${unidad}\n🏗️ ${obraRow.nombre}`);
    return;
  }

  const saldoPost = saldoActual - cantidad;
  const nuevaUsada = Number(existe.cantidad_usada || 0) + cantidad;

  const { error: errInvUpd } = await db.from("inventario_obra").update({
    cantidad_disponible: saldoPost,
    cantidad_usada: nuevaUsada,
    ultimo_movimiento: new Date().toISOString(),
    foto_url: imageUrl,
  }).eq("id", existe.id);
  if (errInvUpd) log.error("update inventario_obra (salida) failed", { error: errInvUpd.message });

  const { error: errMovIns } = await db.from("inventario_movimientos").insert({
    obra_id: obraRow.id,
    obra_nombre: obraRow.nombre,
    producto_nombre: material,
    unidad,
    tipo: "SALIDA",
    cantidad,
    saldo_post: saldoPost,
    motivo: invData.descripcion || `Salida vía WhatsApp`,
    referencia_tipo: "WHATSAPP",
    referencia_id: null,
    usuario: `WhatsApp ${phone10}`,
    foto_url: imageUrl,
  });
  if (errMovIns) log.error("insert inventario_movimientos (salida) failed", { error: errMovIns.message });

  await sendWhatsApp(from, `✅ *SALIDA REGISTRADA*\n\n📦 ${material}\n📏 -${cantidad} ${unidad}\n🏗️ ${obraRow.nombre}\n📊 Saldo restante: ${saldoPost} ${unidad}\n📷 Foto guardada\n\n¡Registrado!`);
}

// ============== MANEJAR TRANSFERENCIA DE INVENTARIO (TRASLADO ENTRE OBRAS) ==============
async function handleTransferenciaInventario(from: string, phone10: string, invData: InventarioData, imageUrl: string) {
  const material = invData.material;
  const cantidad = invData.cantidad || 1;
  const unidad = invData.unidad || "PZA";
  const obraOrigen = invData.obra;
  const obraDestino = invData.obra_destino;

  if (!material) {
    await sendWhatsApp(from, "❌ No pude identificar el material.\n\nEnvía la foto con:\n🔄 TRASLADO Arena 10 sacos MIRAVALLE a JESUS TERAN");
    return;
  }
  if (!obraOrigen || !obraDestino) {
    await sendWhatsApp(from, `❌ Necesito saber origen y destino.\n\nEjemplo:\nTRASLADO ${material} ${cantidad} ${unidad} MIRAVALLE a JESUS TERAN`);
    return;
  }

  // Buscar obras
  const { data: rowOrigen } = await db.from("centros_trabajo").select("id, nombre").ilike("nombre", `%${obraOrigen}%`).limit(1).single();
  const { data: rowDestino } = await db.from("centros_trabajo").select("id, nombre").ilike("nombre", `%${obraDestino}%`).limit(1).single();

  if (!rowOrigen) {
    await sendWhatsApp(from, `❌ No encontré la obra origen "${obraOrigen}".`);
    return;
  }
  if (!rowDestino) {
    await sendWhatsApp(from, `❌ No encontré la obra destino "${obraDestino}".`);
    return;
  }

  // Verificar stock en origen
  const { data: existeOrigen } = await db.from("inventario_obra").select("*").eq("obra_id", rowOrigen.id).ilike("producto_nombre", material).single();
  if (!existeOrigen) {
    await sendWhatsApp(from, `❌ No hay stock de *${material}* en ${rowOrigen.nombre}.`);
    return;
  }
  const saldoOrigen = Number(existeOrigen.cantidad_disponible);
  if (saldoOrigen < cantidad) {
    await sendWhatsApp(from, `⚠️ *STOCK INSUFICIENTE EN ORIGEN*\n\n📦 ${material}\n📊 Disponible en ${rowOrigen.nombre}: ${saldoOrigen} ${unidad}\n❌ Solicitado: ${cantidad} ${unidad}`);
    return;
  }

  // ---- TRASLADO_SALIDA: descontar de origen ----
  const saldoOrigenPost = saldoOrigen - cantidad;
  const nuevaUsadaOrigen = Number(existeOrigen.cantidad_usada || 0) + cantidad;
  await db.from("inventario_obra").update({
    cantidad_disponible: saldoOrigenPost,
    cantidad_usada: nuevaUsadaOrigen,
    ultimo_movimiento: new Date().toISOString(),
  }).eq("id", existeOrigen.id);

  await db.from("inventario_movimientos").insert({
    obra_id: rowOrigen.id,
    obra_nombre: rowOrigen.nombre,
    producto_nombre: material,
    unidad,
    tipo: "TRASLADO_SALIDA",
    cantidad,
    saldo_post: saldoOrigenPost,
    motivo: `Traslado hacia ${rowDestino.nombre} vía WhatsApp`,
    referencia_tipo: "WHATSAPP",
    usuario: `WhatsApp ${phone10}`,
    foto_url: imageUrl,
  });

  // ---- TRASLADO_ENTRADA: agregar a destino ----
  const { data: existeDestino } = await db.from("inventario_obra").select("*").eq("obra_id", rowDestino.id).ilike("producto_nombre", material).single();
  let saldoDestinoPost = 0;
  if (existeDestino) {
    saldoDestinoPost = Number(existeDestino.cantidad_disponible) + cantidad;
    await db.from("inventario_obra").update({
      cantidad_disponible: saldoDestinoPost,
      ultimo_movimiento: new Date().toISOString(),
    }).eq("id", existeDestino.id);
  } else {
    saldoDestinoPost = cantidad;
    await db.from("inventario_obra").insert({
      obra_id: rowDestino.id,
      obra_nombre: rowDestino.nombre,
      producto_nombre: material,
      unidad,
      cantidad_disponible: cantidad,
      cantidad_usada: 0,
      ultimo_movimiento: new Date().toISOString(),
    });
  }

  await db.from("inventario_movimientos").insert({
    obra_id: rowDestino.id,
    obra_nombre: rowDestino.nombre,
    producto_nombre: material,
    unidad,
    tipo: "TRASLADO_ENTRADA",
    cantidad,
    saldo_post: saldoDestinoPost,
    motivo: `Traslado desde ${rowOrigen.nombre} vía WhatsApp`,
    referencia_tipo: "WHATSAPP",
    usuario: `WhatsApp ${phone10}`,
    foto_url: imageUrl,
  });

  await sendWhatsApp(from, `✅ *TRASLADO REGISTRADO*\n\n🔄 ${material} — ${cantidad} ${unidad}\n\n📤 ORIGEN: ${rowOrigen.nombre}\n📊 Saldo: ${saldoOrigenPost} ${unidad}\n\n📥 DESTINO: ${rowDestino.nombre}\n📊 Saldo: ${saldoDestinoPost} ${unidad}\n📷 Foto guardada\n\n¡Traslado completado!`);
}

// ============== BUSCAR EMPLEADO POR TELÉFONO ==============
// ⚠️ ZONA CRÍTICA: usa db (admin/service role). "ACTIVO" = valor real en BD.
async function findEmpleado(phone10: string, from: string) {
  const { data: emp, error: findErr } = await db
    .from("employees")
    .select("id, full_name, centro_trabajo:centros_trabajo(id, nombre, latitud, longitud, radio_metros)")
    .or(`phone.eq.${phone10},whatsapp.eq.${phone10},phone.eq.52${phone10},phone.eq.521${phone10},whatsapp.eq.52${phone10},whatsapp.eq.521${phone10}`)
    .eq("status", "ACTIVO")
    .single();
  if (findErr && findErr.code !== "PGRST116") {
    log.error("findEmpleado DB error", { phone10, error: findErr.message });
  }
  return emp;
}

// ============== MANEJAR GASTO ==============
async function handleGasto(from: string, phone10: string, gastoData: GastoData, imageUrl?: string) {
  const gastoAdmin = getSupabaseAdmin();

  // Buscar empleado
  const emp = await findEmpleado(phone10, from);
  if (!emp) {
    await sendWhatsApp(from, "❌ Teléfono no registrado en ARIA27.\n\nContacta a tu supervisor para registrar tu número.");
    return;
  }

  // Insertar el gasto
  const { error: errGasto } = await gastoAdmin
    .from("gastos_obra")
    .insert({
      employee_id: emp.id,
      monto: gastoData.monto,
      descripcion: gastoData.descripcion || gastoData.proveedor || "Gasto WhatsApp",
      proveedor: gastoData.proveedor,
      categoria: gastoData.categoria || "OTRO",
      fecha: gastoData.fecha || new Date().toISOString().split("T")[0],
      obra_nombre: gastoData.obra || null,
      foto_url: imageUrl || null,
      fuente: "WHATSAPP",
    });

  if (errGasto) {
    log.error("insert gastos_obra failed", { error: errGasto.message });
    await sendWhatsApp(from, "❌ Error al guardar el gasto. Inténtalo de nuevo.");
    return;
  }

  const obraLine = gastoData.obra ? `\n🏗️ Obra: ${gastoData.obra}` : "";
  const fotoLine = imageUrl ? "\n📷 Foto del ticket guardada" : "";
  await sendWhatsApp(from, `✅ *GASTO REGISTRADO*\n\n💰 $${gastoData.monto}${gastoData.proveedor ? `\n🏪 ${gastoData.proveedor}` : ""}${gastoData.descripcion ? `\n📝 ${gastoData.descripcion}` : ""}${obraLine}${fotoLine}\n\n¡Registrado en ARIA27!`);
}

// ============== MANEJAR FOTO OC ==============
async function handleFotoOC(from: string, folioOC: string, imageUrl: string) {
  const { data: oc } = await db
    .from("purchase_orders")
    .select("id, folio, status")
    .eq("folio", folioOC)
    .single();

  if (!oc) {
    await sendWhatsApp(from, `❌ No encontré la OC *${folioOC}* en el sistema.\n\nVerifica el folio e intenta de nuevo.`);
    return;
  }

  const { error: errFoto } = await db
    .from("purchase_orders")
    .update({ foto_entrega_url: imageUrl })
    .eq("id", oc.id);

  if (errFoto) {
    log.error("update purchase_orders foto_entrega_url failed", { error: errFoto.message });
    await sendWhatsApp(from, "❌ Error al guardar la foto. Inténtalo de nuevo.");
    return;
  }

  await sendWhatsApp(from, `✅ *FOTO GUARDADA*\n\n📄 OC: ${folioOC}\n📊 Estado: ${oc.status}\n📷 Foto de entrega guardada\n\n¡Registrado!`);
}

// ============== MANEJAR ASISTENCIA ==============
async function handleAsistencia(from: string, phone10: string, lat: number, lng: number) {
  const now = new Date();
  // Convertir a hora CST (UTC-6)
  const cstOffset = -6 * 60;
  const cstTime = new Date(now.getTime() + cstOffset * 60 * 1000);
  const today = cstTime.toISOString().split("T")[0];
  const hora = cstTime.toISOString().split("T")[1].substring(0, 5);

  // Buscar empleado
  const emp = await findEmpleado(phone10, from);
  if (!emp) {
    await sendWhatsApp(from, "❌ Teléfono no registrado.\n\nContacta a tu supervisor para que registre tu número de WhatsApp.");
    return;
  }

  // Obtener centros de trabajo
  const { data: workCenters } = await db
    .from("centros_trabajo")
    .select("id, nombre, latitud, longitud, radio_metros")
    .eq("activo", true);

  if (!workCenters || workCenters.length === 0) {
    await sendWhatsApp(from, "❌ No hay centros de trabajo configurados.");
    return;
  }

  // Encontrar el centro de trabajo más cercano
  let nearestCenter = workCenters[0];
  let minDistance = getDistance(lat, lng, workCenters[0].latitud, workCenters[0].longitud);

  for (const center of workCenters.slice(1)) {
    const dist = getDistance(lat, lng, center.latitud, center.longitud);
    if (dist < minDistance) {
      minDistance = dist;
      nearestCenter = center;
    }
  }

  const workCenter = nearestCenter;
  const distance = minDistance;
  const dentroGeocerca = distance <= workCenter.radio_metros;

  // Verificar si ya tiene registro hoy
  const { data: asistenciaHoy } = await db
    .from("asistencias")
    .select("id, hora_entrada, hora_salida, tipo_registro, notas")
    .eq("employee_id", emp.id)
    .eq("fecha", today)
    .single();

  // ========== LÓGICA CORREGIDA ==========
  // CASO 1: No tiene registro hoy → ENTRADA
  if (!asistenciaHoy) {
    const { error: errAsis1 } = await db.from("asistencias").insert({
      employee_id: emp.id,
      fecha: today,
      hora_entrada: hora,
      latitud_entrada: lat,
      longitud_entrada: lng,
      dentro_geocerca_entrada: dentroGeocerca,
      distancia_entrada: Math.round(distance),
      centro_nombre: workCenter.nombre,
      notas: `Entrada: ${workCenter.nombre} - ${formatDistance(distance)}`
    });
    if (errAsis1) log.error("insert asistencias (clock-in) failed", { error: errAsis1.message });

    const geoIcon = dentroGeocerca ? "✅" : "⚠️";
    const distText = formatDistance(distance);
    const distLine = dentroGeocerca ? `📏 A ${distText} de ${workCenter.nombre}` : `⚠️ FUERA: ${distText} de ${workCenter.nombre}`;
    
    await sendWhatsApp(from, `${geoIcon} ENTRADA REGISTRADA${distLine}

👤 ${emp.full_name}
📍 ${workCenter.nombre}
🕐 ${hora}

¡Excelente día!`);
    return;
  }

  // CASO 2: Tiene registro SIN salida → SALIDA
  if (asistenciaHoy && !asistenciaHoy.hora_salida) {
    const { error: errAsis2 } = await db.from("asistencias").update({
      hora_salida: hora,
      latitud_salida: lat,
      longitud_salida: lng,
      dentro_geocerca_salida: dentroGeocerca,
      distancia_salida: Math.round(distance),
      notas: (asistenciaHoy.notas || "") + ` | Salida: ${workCenter.nombre} - ${formatDistance(distance)}`
    }).eq("id", asistenciaHoy.id);
    if (errAsis2) log.error("update asistencias (clock-out) failed", { error: errAsis2.message });
    // Calcular horas trabajadas
    const [hE, mE] = asistenciaHoy.hora_entrada.split(":").map(Number);
    const [hS, mS] = hora.split(":").map(Number);
    const totalMins = (hS * 60 + mS) - (hE * 60 + mE);
    const horasStr = totalMins > 0 ? `${Math.floor(totalMins/60)}h ${totalMins%60}m` : "0h";

    const geoIcon = dentroGeocerca ? "✅" : "⚠️";
    const distText = formatDistance(distance);
    const distLine = dentroGeocerca ? `📏 A ${distText} de ${workCenter.nombre}` : `⚠️ FUERA: ${distText} de ${workCenter.nombre}`;

    await sendWhatsApp(from, `${geoIcon} SALIDA REGISTRADA${distLine}

👤 ${emp.full_name}
📍 ${workCenter.nombre}
🕐 Entrada: ${asistenciaHoy.hora_entrada.substring(0,5)}
🕐 Salida: ${hora}
⏱️ Total: ${horasStr}

¡Hasta mañana!`);
    return;
  }

  // CASO 3: Ya tiene entrada Y salida
  if (asistenciaHoy && asistenciaHoy.hora_salida) {
    // Si fue registro automático (MANUAL o con notas de corrección), permitir sobrescribir
    const esAutomatico = asistenciaHoy.tipo_registro === "MANUAL" || 
                         (asistenciaHoy.notas && (
                           asistenciaHoy.notas.includes("automatica") || 
                           asistenciaHoy.notas.includes("masiva") ||
                           asistenciaHoy.notas.includes("Correccion")
                         ));
    
    if (esAutomatico) {
      // Sobrescribir: eliminar el registro automático y crear uno real
      const { error: errAsis3 } = await db.from("asistencias").delete().eq("id", asistenciaHoy.id);
      if (errAsis3) log.error("delete asistencias (replace auto-record) failed", { error: errAsis3.message });

      const { error: errAsis4 } = await db.from("asistencias").insert({
        employee_id: emp.id,
        fecha: today,
        hora_entrada: hora,
        latitud_entrada: lat,
        longitud_entrada: lng,
        dentro_geocerca_entrada: dentroGeocerca,
        tipo_registro: "WHATSAPP",
        distancia_entrada: Math.round(distance),
        centro_nombre: workCenter.nombre,
        notas: `Entrada: ${workCenter.nombre} - ${formatDistance(distance)} (reemplazó registro automático)`
      });
      if (errAsis4) log.error("insert asistencias (replace auto-record) failed", { error: errAsis4.message });

      const geoIcon = dentroGeocerca ? "✅" : "⚠️";
      const distText = formatDistance(distance);
      const distLine = dentroGeocerca ? `📏 A ${distText} de ${workCenter.nombre}` : `⚠️ FUERA: ${distText} de ${workCenter.nombre}`;

      await sendWhatsApp(from, `${geoIcon} ENTRADA REGISTRADA${distLine}

👤 ${emp.full_name}
📍 ${workCenter.nombre}
🕐 ${hora}

(Se actualizó tu registro del día)
¡Excelente día!`);
      return;
    }
    
    // Si fue registro real del empleado, no permitir cambios
    await sendWhatsApp(from, `ℹ️ Ya registraste tu asistencia completa hoy.

👤 ${emp.full_name}
🕐 Entrada: ${asistenciaHoy.hora_entrada.substring(0,5)}
🕐 Salida: ${asistenciaHoy.hora_salida.substring(0,5)}

Si necesitas corregir algo, contacta a RH.`);
    return;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = checkRateLimit(getClientIdentifier(request), { key: "webhook:attendance", ...RATE_LIMITS.WRITE });
    if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult);

    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256") || "";
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      log.warn("Firma inválida o ausente", { signature: signature ? "present" : "absent" });
    }

    const body = JSON.parse(rawBody);
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) {
      return NextResponse.json({ status: "no message" });
    }

    const message = value.messages[0];
    const from = message.from;
    // Normalizar siempre a los últimos 10 dígitos del número mexicano
    // WhatsApp envía "5218112392266" (13 dígitos) — employees.phone guarda "8112392266" (10 dígitos)
    const phone10 = from.replace(/\D/g, "").slice(-10);

    // ====== UBICACIÓN = ASISTENCIA ======
    if (message.type === "location") {
      const { latitude: lat, longitude: lng } = message.location;
      await handleAsistencia(from, phone10, lat, lng);
      return NextResponse.json({ status: "asistencia processed" });
    }

    // ====== IMAGEN = FOTO OC / INVENTARIO / GASTO ======
    if (message.type === "image") {
      const mediaId = message.image.id;
      const caption = message.image.caption || "";

      // Obtener URL de la imagen desde WhatsApp
      const mediaInfo = await getMediaUrl(mediaId);
      if (!mediaInfo) {
        await sendWhatsApp(from, "❌ No pude descargar la imagen. Inténtalo de nuevo.");
        return NextResponse.json({ status: "media url failed" });
      }

      // Procesar y subir la foto a Supabase Storage (con marca de tiempo)
      const permanentUrl = await processAndUploadPhoto({
        mediaUrl: mediaInfo.url,
        whatsappToken: WHATSAPP_TOKEN || "",
        supabase: getSupabaseAdmin(),
        bucket: "inventario",
        storagePath: `wa-fotos/${Date.now()}.jpg`,
      });
      const imageUrl = permanentUrl || mediaInfo.url;

      if (!permanentUrl) {
        log.warn("No se pudo guardar foto en Storage, usando URL temporal", { phone10 });
      }

      // Detectar si es foto de OC (buscar patrón OC-YYYY-NNNNN en caption)
      const folioOCMatch = caption.match(/OC-\d{4}-\d{5}/i);
      if (folioOCMatch) {
        const folioOC = folioOCMatch[0].toUpperCase();
        await handleFotoOC(from, folioOC, imageUrl);
        return NextResponse.json({ status: "foto oc processed" });
      }

      // Clasificar tipo de movimiento de inventario
      const captionLower = caption.toLowerCase();

      // ENTRADA explícita: si el usuario escribió "entrada", "llegó", "recibí" → prioridad máxima
      // (evita que "salida" en el mismo mensaje gane cuando la intención es ENTRADA)
      const tieneEntradaExplicita = captionLower.includes("entrada") ||
                                    captionLower.includes("llegó") ||
                                    captionLower.includes("llego") ||
                                    captionLower.includes("recibí") ||
                                    captionLower.includes("recibi");

      // TRANSFERENCIA (segunda prioridad — antes que salida y entrada genérica)
      const esTransferencia = !tieneEntradaExplicita && (
                              captionLower.includes("transferencia") ||
                              captionLower.includes("traslado") ||
                              captionLower.includes("transfiero") ||
                              captionLower.includes("muevo"));
      if (esTransferencia) {
        await sendWhatsApp(from, "🔄 Procesando traslado... espera un momento.");
        const trasData = await extractTransferenciaFromImage(mediaInfo.url, mediaInfo.mimeType, caption);
        if (trasData && trasData.material) {
          trasData._caption = caption;
          await handleTransferenciaInventario(from, phone10, trasData, imageUrl);
          return NextResponse.json({ status: "traslado processed" });
        }
        // Si no pudo parsear, cae al flujo de gasto
      }

      // SALIDA de inventario — NO aplica si hay palabras de ENTRADA explícita
      const esSalida = !tieneEntradaExplicita && (captionLower.includes("salida") ||
                       captionLower.includes("uso ") ||
                       captionLower.includes("usé") ||
                       captionLower.includes("use ") ||
                       captionLower.includes("con��յ������(��������������������������ѥ��1�ݕȹ����Ց�̠�����յ������(��������������������������ѥ��1�ݕȹ����Ց�̠�ͅ�Ք�����(��������������������������ѥ��1�ݕȹ����Ց�̠��ѥ���������(��������������������������ѥ��1�ݕȹ����Ց�̠��ѥ��������(������������M��������(���������݅�Ё͕��]��������ɽ�����~N��Aɽ��ͅ����ͅ������������Ʉ�ո������Ѽ����(������������Ёͅ��ф��݅�Ё���Ʌ��%�ٕ�хɥ�ɽ�%����������%�����ɰ�������%��������Q��������ѥ�����M1%���(������������ͅ��ф����ͅ��ф���ѕɥ�����(����������ͅ��ф�}���ѥ���􁍅�ѥ���(�����������݅�Ё������M�����%�ٕ�хɥ���ɽ������������ͅ��ф�������Uɰ��(����������ɕ��ɸ�9���I�����͔��ͽ����х���耉ͅ������ɽ���͕������(���������(�����������M������Ց�����͕�Ȱ����������թ��������Ѽ(�������((���������9QI������ٕ�хɥ�(����������Ё��%�ٕ�хɥ��􁍅�ѥ��1�ݕȹ����Ց�̠����Ʌ�������(������������������������������ѥ��1�ݕȹ����Ց�̠���ѕɥ�������(������������������������������ѥ��1�ݕȹ����Ց�̠���ٕ�хɥ������(������������������������������ѥ��1�ݕȹ����Ց�̠���؀�����(������������������������������ѥ��1�ݕȹ����Ց�̠�����̈����(������������������������������ѥ��1�ݕȹ����Ց�̠�����������(������������������������������ѥ��1�ݕȹ����Ց�̠�ɕ���������(������������������������������ѥ��1�ݕȹ����Ց�̠�ɕ�������(������������%�ٕ�хɥ����(���������݅�Ё͕��]��������ɽ�����~N������酹�����ѕɥ����������Ʉ�ո������Ѽ����(������������Ё����ф��݅�Ё���Ʌ��%�ٕ�хɥ�ɽ�%����������%�����ɰ�������%��������Q��������ѥ����(����������������ф��������ф���ѕɥ�����(��������������ф�}���ѥ���􁍅�ѥ��쀼����ͅȁ���ѥ����ɥ��������Ʉ���������������Ʉ(�����������݅�Ё������%�ٕ�хɥ�]��������ɽ����������������ф�������Uɰ��(����������ɕ��ɸ�9���I�����͔��ͽ����х���耉��ٕ�хɥ���ɽ���͕������(���������(�����������M������Ց�����͕�Ȱ����������թ��������Ѽ(�������((���������M������́=������ٕ�хɥ����ɽ��ͅȁ��������Ѽ�ѥ����(�������݅�Ё͕��]��������ɽ�����~R4�����酹���ѥ���и�������Ʉ�ո������Ѽ����(����������Ё���ѽ�ф��݅�Ё���Ʌ����ѽɽ�%����������%�����ɰ�������%��������Q�����((��������������ѽ�ф�������ѽ�ф����Ѽ����ձ����(���������݅�Ё͕��]��������ɽ�����v0�9���Ց�����ȁ���ѥ���йq�q������������Ѽ���ȁѕ�Ѽ�q����������Ѽ�����=aa<���ͽ�������Ʉ�5�Ʌم������(��������ɕ��ɸ�9���I�����͔��ͽ����х���耉���Ʌ�ѥ��������������(�������((�������݅�Ё��������Ѽ��ɽ���������������ѽ�ф�������Uɰ��(������ɕ��ɸ�9���I�����͔��ͽ����х���耉���Ѽ��������ɽ���͕������(�����((�������������QaQ<��A=M%	1�MQ<�������(�����������ͅ�����������ѕ�Ј���(����������Ёѕ�Ѽ�􁵕�ͅ���ѕ�й����ѽ1�ݕ�
�͔���((����������Ё����Ѽ��ѕ�Ѽ�����Ց�̠����Ѽ�����(����������������������ѕ�Ѽ�����Ց�̠������������(����������������������ѕ�Ѽ�����Ց�̠�����ɔ�����(����������������������ѕ�Ѽ�����Ց�̠�����������(����������������������ѕ�Ѽ�����Ց�̠����Ք�����(����������������������ѕ�Ѽ�����Ց�̠�ѥ���Ј����(����������������������ѕ�Ѽ�����Ց�̠����є�����(�����������������������p��q����ѕ�Сѕ�Ѽ��((��������������Ѽ���(������������Ё���ѽ�ф��݅�Ё���Ʌ����ѽɽ�Q��С���ͅ���ѕ�й�����(���������������ѽ�ф�������ѽ�ф�����Ѽ���􁙅�͔�������ѽ�ф����Ѽ���(�����������݅�Ё��������Ѽ��ɽ���������������ѽ�ф��(����������ɕ��ɸ�9���I�����͔��ͽ����х���耉���Ѽ�ѕ�Ё�ɽ���͕������(���������(�������((�������݅�Ё͕��]��������ɽ�����~NĀ�I%�ܨ(+�~N4��M%MQ9
%�)������ԁՉ�����͸����Յ�(+�~J���MQ<���Q%
-P�+�~N܁�Ѽ�����ѥ����+�~J��<��͍ɥ��耉��Ѽ�����=aa<���ͽ�����(+�~N���9QI��5QI%0�+�~N܁�Ѽ������ѥ���(���Ʌ���ɕ������ͅ��́5%IY11�(+�~N���M1%��5QI%0�+�~N܁�Ѽ������ѥ���(�M������
����Ѽ�ԁͅ��́5%IY11�(+�~R��QIM1<���QI9MI9
%�+�~N܁�Ѽ������ѥ���(�QɅͱ����Y�ɥ�������������5%IY11���)MUL�QI8�(+�~����=Q<��9QI�=�+�~N܁�Ѽ������ѥ�������������(�=����ش����Ĉ(+
�������є���Ց�����(������ɕ��ɸ�9���I�����͔��ͽ����х���耉�����͕�Ј����(�����((����ɕ��ɸ�9���I�����͔��ͽ����х���耉չ�����������������(��􁍅э�����ɽ��չ���ݸ���(����������ɽȠ�]���������ɽ�舰���ɽȤ�(����ɕ��ɸ�9���I�����͔��ͽ����х���耉��ɽȈ������х�����������(���)�((((
