import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "963627606824867";
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

async function sendWhatsApp(phone: string, message: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: message } })
    });
    console.log("WhatsApp enviado:", await res.json());
  } catch (e) { console.error("Error WhatsApp:", e); }
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// ============== CLAUDE API PARA EXTRAER DATOS DE TICKET ==============
async function extractGastoFromImage(imageUrl: string, mediaType: string): Promise<any> {
  try {
    // Descargar imagen de WhatsApp
    const imageResponse = await fetch(imageUrl, {
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}` }
    });
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    // Llamar a Claude para extraer datos
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
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Image }
            },
            {
              type: "text",
              text: `Analiza este ticket/recibo y extrae la información en formato JSON.
              
Responde SOLO con el JSON, sin explicaciones ni markdown:
{
  "proveedor": "nombre del negocio/tienda",
  "monto": 123.45,
  "fecha": "2025-01-04",
  "descripcion": "descripción breve de la compra",
  "categoria": "una de: MATERIAL, GASOLINA, COMIDA, HERRAMIENTA, SERVICIO, OTRO"
}

Si no puedes leer algo, pon null en ese campo. El monto debe ser número sin signo de pesos.`
            }
          ]
        }]
      })
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || "{}";
    
    // Limpiar el JSON de posibles caracteres extra
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Error extrayendo datos con Claude:", error);
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
          
Responde SOLO con JSON, sin explicaciones:
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
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Error extrayendo gasto de texto:", error);
    return null;
  }
}

// ============== OBTENER MEDIA URL DE WHATSAPP ==============
async function getMediaUrl(mediaId: string): Promise<{url: string, mimeType: string} | null> {
  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}` }
    });
    const data = await response.json();
    return { url: data.url, mimeType: data.mime_type };
  } catch (error) {
    console.error("Error obteniendo media URL:", error);
    return null;
  }
}

// ============== BUSCAR EMPLEADO/SOLICITANTE ==============
async function findSolicitante(phone10: string, fullPhone: string) {
  // Buscar en Personal (empleados)
  const { data: empData } = await supabase
    .from("Personal")
    .select("id, full_name, obra")
    .or(`whatsapp.eq.${phone10},whatsapp.eq.${fullPhone}`)
    .limit(1);
  
  if (empData?.[0]) {
    return { nombre: empData[0].full_name, obra: empData[0].obra, tipo: "empleado" };
  }

  // Buscar en users
  const { data: userData } = await supabase
    .from("users")
    .select("id, name, display_name")
    .or(`phone.eq.${phone10},phone.eq.${fullPhone}`)
    .limit(1);

  if (userData?.[0]) {
    return { nombre: userData[0].display_name || userData[0].name, obra: null, tipo: "usuario" };
  }

  return null;
}

// ============== MANEJAR GASTO ==============
async function handleGasto(from: string, phone10: string, gastoData: any, imageUrl?: string) {
  const today = new Date();
  const fecha = gastoData.fecha || today.toISOString().split("T")[0];
  const semana = getWeekNumber(today);

  // Buscar quién envió
  const solicitante = await findSolicitante(phone10, from);
  const nombreSolicitante = solicitante?.nombre || `WhatsApp ${phone10}`;
  const obraDefault = solicitante?.obra || gastoData.obra || "PENDIENTE";

  // Guardar en BD
  const { data, error } = await supabase.from("gastos").insert({
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
  }).select().single();

  if (error) {
    console.error("Error guardando gasto:", error);
    await sendWhatsApp(from, "❌ Error al guardar el gasto. Intenta de nuevo.");
    return;
  }

  // Confirmar por WhatsApp
  const monto = gastoData.monto ? `$${gastoData.monto.toLocaleString()}` : "Sin monto";
  const msg = `✅ GASTO REGISTRADO

📋 ${gastoData.descripcion || "Sin descripción"}
💰 ${monto}
🏪 ${gastoData.proveedor || "No especificado"}
🏗️ ${obraDefault}
👤 ${nombreSolicitante}
📅 Semana ${semana}

Estatus: PENDIENTE de aprobación`;

  await sendWhatsApp(from, msg);
}

// ============== MANEJAR ASISTENCIA (código original) ==============
async function handleAsistencia(from: string, phone10: string, lat: number, lng: number) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

  // Buscar empleado
  const { data, error: empErr } = await supabase
    .from("Personal")
    .select("*")
    .or(`whatsapp.eq.${phone10},whatsapp.eq.${from}`)
    .eq("status", "ACTIVO")
    .limit(1);

  const emp = data?.[0];
  console.log("Empleado encontrado:", emp?.full_name, "Error:", empErr?.message);

  if (!emp) {
    await sendWhatsApp(from, "Tu numero no esta registrado. Contacta a Recursos Humanos.");
    return;
  }

  // Buscar centro mas cercano
  const { data: centers } = await supabase.from("work_centers").select("*").eq("active", true);
  if (!centers || centers.length === 0) {
    await sendWhatsApp(from, "No hay centros de trabajo configurados. Contacta a RH.");
    return;
  }

  let workCenter = centers[0];
  let minDist = Infinity;
  for (const c of centers) {
    if (c.latitude && c.longitude) {
      const d = getDistance(lat, lng, c.latitude, c.longitude);
      if (d < minDist) { minDist = d; workCenter = c; }
    }
  }

  const distance = minDist;
  const radius = workCenter.radius_meters || 500;
  const isValid = distance <= radius;
  console.log("Centro:", workCenter.name, "Distancia:", distance.toFixed(0), "m");

  // Buscar asistencia de hoy
  const { data: asistData } = await supabase
    .from("asistencias")
    .select("*")
    .eq("employee_id", emp.id)
    .eq("fecha", today)
    .limit(1);
  const asist = asistData?.[0];
  const hora = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Mexico_City" });

  if (!asist) {
    // ENTRADA
    await supabase.from("asistencias").insert({
      employee_id: emp.id,
      fecha: today,
      hora_entrada: hora,
      latitud_entrada: lat,
      longitud_entrada: lng,
      dentro_geocerca_entrada: isValid,
      notas: `${workCenter.name} - ${Math.round(distance)}m`
    });

    const msg = isValid
      ? `✅ ENTRADA REGISTRADA\n\n${emp.full_name}\n📍 ${workCenter.name}\n🕐 ${hora}\n\n¡Excelente día!`
      : `⚠️ ENTRADA REGISTRADA\n(Fuera de zona: ${distance.toFixed(0)}m)\n\n${emp.full_name}\n📍 ${workCenter.name}\n🕐 ${hora}`;
    await sendWhatsApp(from, msg);

  } else if (!asist.hora_salida) {
    // SALIDA
    await supabase.from("asistencias").update({
      hora_salida: hora,
      latitud_salida: lat,
      longitud_salida: lng,
      dentro_geocerca_salida: isValid,
      notas: asist.notas + ` | Salida: ${workCenter.name} - ${Math.round(distance)}m`
    }).eq("id", asist.id);

    const horaE = asist.hora_entrada.substring(0, 5);
    const [hE, mE] = asist.hora_entrada.split(":").map(Number);
    const [hS, mS] = hora.split(":").map(Number);
    const horas = ((hS * 60 + mS) - (hE * 60 + mE)) / 60;
    const horasStr = horas > 0 ? horas.toFixed(1) : "0";

    const msg = isValid
      ? `✅ SALIDA REGISTRADA\n\n${emp.full_name}\n📍 ${workCenter.name}\n🕐 Entrada: ${horaE}\n🕐 Salida: ${hora}\n⏱️ Horas: ${horasStr}h\n\n¡Hasta mañana!`
      : `⚠️ SALIDA REGISTRADA\n(Fuera de zona: ${distance.toFixed(0)}m)\n\n${emp.full_name}\n🕐 Entrada: ${horaE}\n🕐 Salida: ${hora}\n⏱️ Horas: ${horasStr}h`;
    await sendWhatsApp(from, msg);

  } else {
    const horaE = asist.hora_entrada.substring(0, 5);
    const horaS = asist.hora_salida ? asist.hora_salida.substring(0, 5) : "N/A";
    await sendWhatsApp(from, `Ya registraste asistencia hoy.\n\n🕐 Entrada: ${horaE}\n🕐 Salida: ${horaS}`);
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
    const body = await request.json();
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return NextResponse.json({ status: "no message" });

    const from = message.from;
    const phone10 = from.replace(/^521/, "").replace(/^52/, "");
    console.log("📱 Mensaje de:", from, "Tipo:", message.type);

    // ====== UBICACIÓN = ASISTENCIA ======
    if (message.type === "location") {
      const lat = message.location.latitude;
      const lng = message.location.longitude;
      await handleAsistencia(from, phone10, lat, lng);
      return NextResponse.json({ status: "asistencia processed" });
    }

    // ====== IMAGEN = GASTO CON TICKET ======
    if (message.type === "image") {
      console.log("📷 Procesando imagen como gasto...");
      const mediaId = message.image.id;
      const mediaInfo = await getMediaUrl(mediaId);
      
      if (!mediaInfo) {
        await sendWhatsApp(from, "❌ No pude obtener la imagen. Intenta de nuevo.");
        return NextResponse.json({ status: "media error" });
      }

      await sendWhatsApp(from, "🔍 Analizando ticket... espera un momento.");
      
      const gastoData = await extractGastoFromImage(mediaInfo.url, mediaInfo.mimeType);
      
      if (!gastoData || gastoData.monto === null) {
        await sendWhatsApp(from, "❌ No pude leer el ticket. Envía el gasto por texto:\n\nEjemplo: Gasto 500 OXXO gasolina obra Miravalle");
        return NextResponse.json({ status: "extraction failed" });
      }

      await handleGasto(from, phone10, gastoData, mediaInfo.url);
      return NextResponse.json({ status: "gasto image processed" });
    }

    // ====== TEXTO = POSIBLE GASTO ======
    if (message.type === "text") {
      const texto = message.text.body.toLowerCase();
      
      // Detectar si es un gasto
      const esGasto = texto.includes("gasto") || 
                      texto.includes("compré") || 
                      texto.includes("compre") ||
                      texto.includes("pagué") ||
                      texto.includes("pague") ||
                      /\$?\d+/.test(texto);

      if (esGasto) {
        console.log("💬 Procesando texto como posible gasto...");
        const gastoData = await extractGastoFromText(message.text.body);
        
        if (gastoData && gastoData.esGasto !== false && gastoData.monto) {
          await handleGasto(from, phone10, gastoData);
          return NextResponse.json({ status: "gasto text processed" });
        }
      }

      // Si no es gasto, mostrar menú de ayuda
      await sendWhatsApp(from, `📱 *ARIA27*

Para registrar *ASISTENCIA*:
📎 > Ubicación > Enviar ubicación actual

Para registrar *GASTO*:
📷 Envía foto del ticket
💬 O escribe: "Gasto 500 OXXO gasolina"

¿En qué te ayudo?`);
      return NextResponse.json({ status: "help sent" });
    }

    return NextResponse.json({ status: "unhandled type" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
