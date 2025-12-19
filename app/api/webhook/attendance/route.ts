import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "869940452874474";
const VERIFY_TOKEN = "aria27_webhook_token";

// Calcular distancia entre 2 puntos (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Enviar mensaje de texto por WhatsApp
async function sendWhatsApp(phone: string, message: string) {
  await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message }
    })
  });
}

// GET - Verificación del webhook
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado!");
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST - Recibir mensajes de WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: "no messages" });
    }

    const message = messages[0];
    const from = message.from; // Número del remitente
    const phone = from.startsWith("521") ? from.substring(3) : from.startsWith("52") ? from.substring(2) : from;

    // Solo procesar mensajes de ubicación
    if (message.type !== "location") {
      await sendWhatsApp(from, "📍 Para registrar asistencia, envía tu *ubicación actual* usando el clip 📎 → Ubicación → Enviar ubicación actual");
      return NextResponse.json({ status: "not location" });
    }

    const lat = message.location.latitude;
    const lng = message.location.longitude;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    console.log(`Ubicación recibida de ${phone}: ${lat}, ${lng}`);

    // Buscar empleado por teléfono
    const { data: employee } = await supabase
      .from("employees")
      .select("*, work_centers(*)")
      .eq("phone", phone)
      .eq("active", true)
      .single();

    if (!employee) {
      await sendWhatsApp(from, "❌ Tu número no está registrado en el sistema. Contacta a Recursos Humanos.");
      return NextResponse.json({ status: "employee not found" });
    }

    if (!employee.work_center_id || !employee.work_centers) {
      await sendWhatsApp(from, "❌ No tienes un centro de trabajo asignado. Contacta a Recursos Humanos.");
      return NextResponse.json({ status: "no work center" });
    }

    const workCenter = employee.work_centers;
    const distance = getDistance(lat, lng, workCenter.latitude, workCenter.longitude);
    const isValid = distance <= (workCenter.radius_meters || 1000);

    console.log(`Distancia: ${distance.toFixed(0)}m, Válido: ${isValid}`);

    // Buscar asistencia de hoy
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_phone", phone)
      .eq("date", today)
      .single();

    if (!existingAttendance) {
      // ENTRADA - Primera ubicación del día
      const { error } = await supabase.from("attendance").insert({
        employee_id: employee.id,
        employee_name: employee.name,
        employee_phone: phone,
        date: today,
        check_in_time: now,
        check_in_lat: lat,
        check_in_lng: lng,
        check_in_valid: isValid,
        work_center_id: workCenter.id,
        work_center_name: workCenter.name
      });

      if (error) {
        console.error("Error insertando entrada:", error);
        await sendWhatsApp(from, "❌ Error al registrar entrada. Intenta de nuevo.");
        return NextResponse.json({ status: "error", error });
      }

      const hora = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      
      if (isValid) {
        await sendWhatsApp(from, `✅ *ENTRADA REGISTRADA*\n\n👤 ${employee.name}\n🏢 ${workCenter.name}\n🕐 ${hora}\n📍 Ubicación válida\n\n_Que tengas excelente día!_`);
      } else {
        await sendWhatsApp(from, `⚠️ *ENTRADA REGISTRADA (FUERA DE ZONA)*\n\n👤 ${employee.name}\n🏢 ${workCenter.name}\n🕐 ${hora}\n📍 Estás a ${distance.toFixed(0)}m del centro de trabajo\n\n_Se notificará a RH_`);
      }

    } else if (!existingAttendance.check_out_time) {
      // SALIDA - Segunda ubicación del día
      const { error } = await supabase
        .from("attendance")
        .update({
          check_out_time: now,
          check_out_lat: lat,
          check_out_lng: lng,
          check_out_valid: isValid
        })
        .eq("id", existingAttendance.id);

      if (error) {
        console.error("Error actualizando salida:", error);
        await sendWhatsApp(from, "❌ Error al registrar salida. Intenta de nuevo.");
        return NextResponse.json({ status: "error", error });
      }

      const horaEntrada = new Date(existingAttendance.check_in_time).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      const horaSalida = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      
      // Calcular horas trabajadas
      const entrada = new Date(existingAttendance.check_in_time);
      const salida = new Date();
      const horasTrabajadas = ((salida.getTime() - entrada.getTime()) / (1000 * 60 * 60)).toFixed(1);

      if (isValid) {
        await sendWhatsApp(from, `✅ *SALIDA REGISTRADA*\n\n👤 ${employee.name}\n🏢 ${workCenter.name}\n🕐 Entrada: ${horaEntrada}\n🕐 Salida: ${horaSalida}\n⏱️ Horas: ${horasTrabajadas}h\n📍 Ubicación válida\n\n_Hasta mañana!_`);
      } else {
        await sendWhatsApp(from, `⚠️ *SALIDA REGISTRADA (FUERA DE ZONA)*\n\n👤 ${employee.name}\n🏢 ${workCenter.name}\n🕐 Entrada: ${horaEntrada}\n🕐 Salida: ${horaSalida}\n⏱️ Horas: ${horasTrabajadas}h\n📍 Estás a ${distance.toFixed(0)}m\n\n_Se notificará a RH_`);
      }

    } else {
      // Ya registró entrada y salida
      await sendWhatsApp(from, `ℹ️ Ya registraste entrada y salida hoy.\n\n🕐 Entrada: ${new Date(existingAttendance.check_in_time).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}\n🕐 Salida: ${new Date(existingAttendance.check_out_time).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`);
    }

    return NextResponse.json({ status: "ok" });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
