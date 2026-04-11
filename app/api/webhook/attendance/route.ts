import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { processAndUploadPhoto } from "@/lib/image-watermark";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppText, verifyWebhookSignature } from "@/lib/whatsapp";
const log = logger("WEBHOOK-ATTENDANCE");

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY_TOKEN = "aria27_webhook_token";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

// ============== CLAUDE API PARA EXTRAER DATOS DE TICKET ==============
async function extractGastoFromImage(imageUrl: string, mediaType: string): Promise<any> {
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
        model: "claude-sonnet-4-20250514",
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
  } catch (error) {
    return null;
  }
}

async function extractGastoFromText(text: string): Promise<any> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
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
  } catch (error) {
    return null;
  }
}

async function getMediaUrl(mediaId: string): Promise<{url: string, mimeType: string} | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}` }
    });
    const data = await response.json();
    return { url: data.url, mimeType: data.mime_type };
  } catch (error) {
    return null;
  }
}

// ============== CLAUDE: EXTRAER DATOS DE INVENTARIO DESDE IMAGEN ==============
async function extractInventarioFromImage(imageUrl: string, mediaType: string, caption: string): Promise<any> {
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
"entrada [MATERIAL] [CANTIDAD] [UNIDAD] [NOMBRE_OBRA]"
Palabras como "entrada", "material", "llegó", "recibí", "inventario" son KEYWORDS del sistema, NO son parte del nombre del material ni de la obra.

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
  } catch (error) {
    log.error("Error extractInventarioFromImage:", error);
    return null;
  }
}

// ============== MANEJAR ENTRADA DE INVENTARIO VÍA WHATSAPP ==============
async function handleInventarioWhatsApp(from: string, phone10: string, invData: any, imageUrl: string) {
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
    obraFinal = ((emp?.centro_trabajo as any)?.[0]?.nombre ?? (emp?.centro_trabajo as any)?.nombre) || null;
  }

  if (!obraFinal) {
    await sendWhatsApp(from, `❌ No pude determinar la obra.\n\nEnvía la foto con el nombre de la obra:\n📦 ENTRADA ${material} ${cantidad} ${unidad} NOMBRE_OBRA`);
    return;
  }

  // Buscar obra en centros_trabajo
  let { data: obraRow } = await supabase
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
      const { data: match } = await supabase
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
  const { data: existe } = await supabase
    .from("inventario_obra")
    .select("*")
    .eq("obra_id", obraRow.id)
    .ilike("producto_nombre", material)
    .single();

  let saldoPost = 0;
  if (existe) {
    saldoPost = Number(existe.cantidad_disponible) + cantidad;
    await supabase.from("inventario_obra").update({
      cantidad_disponible: saldoPost,
      ultimo_movimiento: new Date().toISOString(),
      foto_url: imageUrl,
    }).eq("id", existe.id);
  } else {
    saldoPost = cantidad;
    await supabase.from("inventario_obra").insert({
      obra_id: obraRow.id,
      obra_nombre: obraRow.nombre,
      producto_nombre: material,
      unidad: unidad,
      cantidad_disponible: cantidad,
      cantidad_usada: 0,
      ultimo_movimiento: new Date().toISOString(),
      foto_url: imageUrl,
    });
  }

  // Registrar movimiento con foto
  await supabase.from("inventario_movimientos").insert({
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

  const provLine = invData.proveedor ? `🏪 ${invData.proveedor}\n` : "";
  await sendWhatsApp(from, `✅ *INVENTARIO ACTUALIZADO*\n\n📦 ${material}\n📏 +${cantidad} ${unidad}\n🏗️ ${obraRow.nombre}\n${provLine}📊 Saldo: ${saldoPost} ${unidad}\n📷 Foto guardada\n\n¡Registrado!`);
}

// ============== BUSCAR EMPLEADO ==============
async function findEmpleado(phone10: string, fullPhone: string) {
  // Usar tabla base "employees" - PostgREST no resuelve JOINs en VIEWs
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_number, full_name, centro_trabajo_id, geocerca_libre, centro_trabajo:centros_trabajo(nombre)")
    .or(`whatsapp.eq.${phone10},whatsapp.eq.${fullPhone}`)
    .eq("status", "ACTIVO")
    .limit(1);

  return data?.[0] || null;
}

// ============== MANEJAR GASTO ==============
async function handleGasto(from: string, phone10: string, gastoData: any, imageUrl?: string) {
  const today = new Date();
  const fecha = gastoData.fecha || today.toISOString().split("T")[0];
  const semana = getWeekNumber(today);

  const emp = await findEmpleado(phone10, from);
  const nombreSolicitante = emp?.full_name || `WhatsApp ${phone10}`;
  const obraDefault = ((emp?.centro_trabajo as any)?.[0]?.nombre ?? (emp?.centro_trabajo as any)?.nombre) || gastoData.obra || "PENDIENTE";

  const { error } = await supabase.from("gastos").insert({
    fecha: fecha,
    semana: semana,
    obra: obraDefault,
    solicitante: nombreSolicitante,
    descripcion: gastoData.descripcion || "Sin descripción",
    proveedor: gastoData.proveedor || "No especificado",
    razon: gastoData.descripcion,
    monto: gastoData.monto || 0,
    categoria: gastoData.categoria || "OTRO",
    tipo: "GASTO",
    estatus: "PENDIENTE",
    imagen_url: imageUrl || null,
    whatsapp_from: from,
    datos_extraidos: gastoData
  });

  if (error) {
    await sendWhatsApp(from, "❌ Error al guardar el gasto. Intenta de nuevo.");
    return;
  }

  const monto = gastoData.monto ? `$${gastoData.monto.toLocaleString()}` : "Sin monto";
  await sendWhatsApp(from, `✅ GASTO REGISTRADO

📋 ${gastoData.descripcion || "Sin descripción"}
💰 ${monto}
🏪 ${gastoData.proveedor || "No especificado"}
🏗️ ${obraDefault}
👤 ${nombreSolicitante}
📅 Semana ${semana}

Estatus: PENDIENTE de aprobación`);
}

// ============== MANEJAR ASISTENCIA (CORREGIDO) ==============
async function handleAsistencia(from: string, phone10: string, lat: number, lng: number) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const hora = new Date().toLocaleTimeString("es-MX", { 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: false, 
    timeZone: "America/Mexico_City" 
  });

  // 1. Buscar empleado en tabla Personal
  const emp = await findEmpleado(phone10, from);

  if (!emp) {
    await sendWhatsApp(from, "❌ Tu número no está registrado.\n\nContacta a Recursos Humanos para darte de alta en el sistema.");
    return;
  }

  // 2. Buscar centro de trabajo más cercano
  const { data: centers } = await supabase.from("centros_trabajo").select("*").eq("activo", true);
  
  if (!centers || centers.length === 0) {
    await sendWhatsApp(from, "⚠️ No hay centros de trabajo configurados.\n\nContacta a RH.");
    return;
  }

  let workCenter = centers[0];
  let minDist = Infinity;
  for (const c of centers) {
    if (c.latitud && c.longitud) {
      const d = getDistance(lat, lng, c.latitud, c.longitud);
      if (d < minDist) { 
        minDist = d; 
        workCenter = c; 
      }
    }
  }

  const distance = minDist;
  const radius = workCenter.radio_metros || 500;
  // Si el empleado tiene geocerca_libre, siempre está dentro
  const dentroGeocerca = emp.geocerca_libre === true ? true : distance <= radius;

  // 3. Buscar si ya tiene asistencia HOY
  const { data: asistData } = await supabase
    .from("asistencias")
    .select("*")
    .eq("employee_id", emp.id)
    .eq("fecha", today)
    .limit(1);

  const asistenciaHoy = asistData?.[0] || null;

  // ========== LÓGICA CORREGIDA ==========
  // CASO 1: No tiene registro hoy → ENTRADA
  if (!asistenciaHoy) {
    await supabase.from("asistencias").insert({
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
    await supabase.from("asistencias").update({
      hora_salida: hora,
      latitud_salida: lat,
      longitud_salida: lng,
      dentro_geocerca_salida: dentroGeocerca,
      distancia_salida: Math.round(distance),
      notas: (asistenciaHoy.notas || "") + ` | Salida: ${workCenter.nombre} - ${formatDistance(distance)}`
    }).eq("id", asistenciaHoy.id);

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
      await supabase.from("asistencias").delete().eq("id", asistenciaHoy.id);
      
      await supabase.from("asistencias").insert({
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


// ============== MANEJAR FOTO OC ==============
async function handleFotoOC(from: string, folioOC: string, imageUrl: string) {
  // Verificar que la OC existe
  const { data: oc } = await supabase
    .from("purchase_orders")
    .select("id, supplier_name, requisition_id")
    .eq("folio", folioOC)
    .single();

  if (!oc) {
    await sendWhatsApp(from, `❌ No encontré la orden *${folioOC}* en el sistema.\n\nVerifica el folio e intenta de nuevo.`);
    return;
  }

  // Buscar si ya existe entrega para esta OC
  const { data: entregaExistente } = await supabase
    .from("entregas")
    .select("id, folio")
    .eq("purchase_order_folio", folioOC)
    .single();

  if (entregaExistente) {
    // Actualizar con foto
    await supabase
      .from("entregas")
      .update({ foto_url: imageUrl })
      .eq("id", entregaExistente.id);

    await sendWhatsApp(from, `✅ *FOTO GUARDADA*\n\n📦 OC: ${folioOC}\n🎫 Entrega: ${entregaExistente.folio}\n📷 Evidencia actualizada\n\n¡Gracias!`);
  } else {
    // Crear nueva entrega con foto
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
      foto_url: imageUrl,
      recibido_por_nombre: "Via WhatsApp"
    });

    await sendWhatsApp(from, `✅ *ENTREGA REGISTRADA*\n\n📦 OC: ${folioOC}\n🎫 Entrega: ${nuevoFolio}\n📷 Foto guardada\n🏪 ${oc.supplier_name}\n\n¡Gracias!`);
  }
}

// ============== WEBHOOK PRINCIPAL ==============
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge"), { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    // HMAC signature verification (Meta webhook security)
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyWebhookSignature(rawBody, signature)) {
      log.warn("HMAC signature inválida", { signature });
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // RATE LIMIT: webhook publico — 30 req/min por IP (anti-abuso)
    const clientId = getClientIdentifier(request);
    const rl = checkRateLimit(clientId, { key: "wh:attendance", ...RATE_LIMITS.PUBLIC });
    if (!rl.allowed) {
      log.warn("Rate limit excedido", { clientId, retryAfter: rl.retryAfter });
      return rateLimitResponse(rl);
    }

    const body = JSON.parse(rawBody);
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return NextResponse.json({ status: "no message" });

    const from = message.from;
    const phone10 = from.replace(/^521/, "").replace(/^52/, "");

    // ====== UBICACIÓN = ASISTENCIA ======
    if (message.type === "location") {
      const lat = message.location.latitude;
      const lng = message.location.longitude;
      await handleAsistencia(from, phone10, lat, lng);
      return NextResponse.json({ status: "asistencia processed" });
    }

    // ====== IMAGEN = FOTO OC o GASTO CON TICKET ======
    if (message.type === "image") {
      const mediaId = message.image.id;
      const caption = message.image.caption || "";
      const mediaInfo = await getMediaUrl(mediaId);

      if (!mediaInfo) {
        await sendWhatsApp(from, "❌ No pude obtener la imagen. Intenta de nuevo.");
        return NextResponse.json({ status: "media error" });
      }

      // ===== DESCARGAR FOTO → WATERMARK → SUPABASE STORAGE (URL permanente) =====
      const supabaseAdmin = getSupabaseAdmin();
      const ts = Date.now();
      const storagePath = `whatsapp/${phone10}/${ts}.jpg`;
      const permanentUrl = await processAndUploadPhoto({
        mediaUrl: mediaInfo.url,
        whatsappToken: WHATSAPP_TOKEN || "",
        supabase: supabaseAdmin,
        bucket: "inventario",
        storagePath,
      });
      // Si falla el upload, usar URL original como fallback (mejor algo que nada)
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

      // Detectar si es entrada de inventario (palabras clave: ENTRADA, MATERIAL, INV, INVENTARIO, LLEGÓ, LLEGO)
      const captionLower = caption.toLowerCase();
      const esInventario = captionLower.includes("entrada") ||
                           captionLower.includes("material") ||
                           captionLower.includes("inventario") ||
                           captionLower.includes("inv ") ||
                           captionLower.includes("llegó") ||
                           captionLower.includes("llego") ||
                           captionLower.includes("recibí") ||
                           captionLower.includes("recibi");
      if (esInventario) {
        await sendWhatsApp(from, "📦 Analizando material... espera un momento.");
        const invData = await extractInventarioFromImage(mediaInfo.url, mediaInfo.mimeType, caption);
        if (invData && invData.material) {
          invData._caption = caption; // pasar caption original para fallback de obra
          await handleInventarioWhatsApp(from, phone10, invData, imageUrl);
          return NextResponse.json({ status: "inventario processed" });
        }
        // Si no pudo parsear, cae al flujo de gasto
      }

      // Si no es OC ni inventario, procesar como gasto/ticket
      await sendWhatsApp(from, "🔍 Analizando ticket... espera un momento.");
      const gastoData = await extractGastoFromImage(mediaInfo.url, mediaInfo.mimeType);

      if (!gastoData || gastoData.monto === null) {
        await sendWhatsApp(from, "❌ No pude leer el ticket.\n\nEnvía el gasto por texto:\nEjemplo: Gasto 500 OXXO gasolina obra Miravalle");
        return NextResponse.json({ status: "extraction failed" });
      }

      await handleGasto(from, phone10, gastoData, imageUrl);
      return NextResponse.json({ status: "gasto image processed" });
    }

    // ====== TEXTO = POSIBLE GASTO ======
    if (message.type === "text") {
      const texto = message.text.body.toLowerCase();

      const esGasto = texto.includes("gasto") ||
                      texto.includes("compré") ||
                      texto.includes("compre") ||
                      texto.includes("pagué") ||
                      texto.includes("pague") ||
                      /\$?\d+/.test(texto);

      if (esGasto) {
        const gastoData = await extractGastoFromText(message.text.body);
        if (gastoData && gastoData.esGasto !== false && gastoData.monto) {
          await handleGasto(from, phone10, gastoData);
          return NextResponse.json({ status: "gasto text processed" });
        }
      }

      await sendWhatsApp(from, `📱 *ARIA27*

Para registrar *ASISTENCIA*:
📎 > Ubicación > Enviar ubicación actual

Para registrar *GASTO*:
📷 Envía foto del ticket
💬 O escribe: "Gasto 500 OXXO gasolina"

Para *FOTO de ENTREGA OC*:
📷 Envía foto con caption: OC-2026-00001

Para *ENTRADA DE MATERIAL*:
📷 Foto del material con caption:
"Entrada Arena 10 sacos MIRAVALLE"

¿En qué te ayudo?`);
      return NextResponse.json({ status: "help sent" });
    }

    return NextResponse.json({ status: "unhandled type" });
  } catch (error) {
    log.error("Webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}



