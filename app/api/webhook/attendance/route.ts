import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "963627606824867";
const VERIFY_TOKEN = "aria27_webhook_token";

// Calcular distancia entre 2 puntos (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
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
  try {
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
  } catch (e) {
    console.error("Error enviando WhatsApp:", e);
  }
}

// GET - Verificacion del webhook
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
    const from = message.from;
    const phone10 = from.startsWith("521") ? from.substring(3) : from.startsWith("52") ? from.substring(2) : from;

    // Solo procesar mensajes de ubicacion
    if (message.type !== "location") {
      await sendWhatsApp(from, "Para registrar asistencia, envia tu ubicacion actual usando el clip > Ubicacion > Enviar ubicacion actual");
      return NextResponse.json({ status: "not location" });
    }

    const lat = message.location.latitude;
    const lng = message.location.longitude;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    console.log(`Ubicacion recibida de ${phone10}: ${lat}, ${lng}`);

    // Buscar empleado por telefono (10 digitos)
    const { data: employee } = await supabase
      .from("employees")
      .select("*")
      .or(`phone.eq.${phone10},whatsapp.eq.${phone10}`)
      .eq("active", true)
      .single();

    if (!employee) {
      await sendWhatsApp(from, "Tu numero no esta registrado en el sistema. Contacta a Recursos Humanos.");
      return NextResponse.json({ status: "employee not found" });
    }

    // Buscar centro de trabajo del empleado
    let workCenter = null;
    if (employee.work_center_id) {
      const { data: wc } = await supabase
        .from("work_centers")
        .select("*")
        .eq("id", employee.work_center_id)
        .single();
      workCenter = wc;
    }

    // Si no tiene centro asignado, buscar el mas cercano
    if (!workCenter) {
      const { data: allCenters } = await supabase.from("work_centers").select("*");
      if (allCenters && allCenters.length > 0) {
        let minDist = Infinity;
        for (const wc of allCenters) {
          if (wc.latitude && wc.longitude) {
            const d = getDistance(lat, lng, wc.latitude, wc.longitude);
            if (d < minDist) {
              minDist = d;
              workCenter = wc;
            }
          }
        }
      }
    }

    if (!workCenter || !workCenter.latitude || !workCenter.longitude) {
      await sendWhatsApp(from, "No hay centros de trabajo configurados con GPS. Contacta a Recursos Humanos.");
      return NextResponse.json({ status: "no work center gps" });
    }

    const distance = getDistance(lat, lng, workCenter.latitude, workCenter.longitude);
    const radius = workCenter.radius_meters || 500;
    const isValid = distance <= radius;

    console.log(`Distancia: ${distance.toFixed(0)}m, Radio: ${radius}m, Valido: ${isValid}`);

    // Buscar asistencia de hoy
    const { data: existingAttendance } = await supabase
      .from("asistencias")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("fecha", today)
      .single();

    const hora = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });

    if (!existingAttendance) {
      // ENTRADA
      const { error } = await supabase.from("asistencias").insert({
        employee_id: employee.id,
        employee_name: employee.name,
        employee_phone: phone10,
        fecha: today,
        hora_entrada: now,
        lat_entrada: lat,
        lng_entrada: lng,
        entrada_valida: isValid,
        work_center_id: workCenter.id,
        work_center_name: workCenter.name,
        distancia_entrada: Math.round(distance)
      });

      if (error) {
        console.error("Error insertando entrada:", error);
        await sendWhatsApp(from, "Error al registrar entrada. Intenta de nuevo.");
        return NextResponse.json({ status: "error", error });
      }

      if (isValid) {
        await sendWhatsApp(from, `ENTRADA REGISTRADA\n\n${employee.name}\n${workCenter.name}\nHora: ${hora}\nUbicacion valida\n\nQue tengas excelente dia!`);
      } else {
        await sendWhatsApp(from, `ENTRADA REGISTRADA (FUERA DE ZONA)\n\n${employee.name}\n${workCenter.name}\nHora: ${hora}\nEstas a ${distance.toFixed(0)}m del centro\n\nSe notificara a RH`);
      }

    } else if (!existingAttendance.hora_salida) {
      // SALIDA
      const { error } = await supabase
        .from("asistencias")
        .update({
          hora_salida: now,
          lat_salida: lat,
          lng_salida: lng,
          salida_valida: isValid,
          distancia_salida: Math.round(distance)
        })
        .eq("id", existingAttendance.id);

      if (error) {
        console.error("Error actualizando salida:", error);
        await sendWhatsApp(from, "Error al registrar salida. Intenta de nuevo.");
        return NextResponse.json({ status: "error", error });
      }

      const horaEntrada = new Date(existingAttendance.hora_entrada).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
      const entrada = new Date(existingAttendance.hora_entrada);
      const salida = new Date();
      const horasTrabajadas = ((salida.getTime() - entrada.getTime()) / (1000 * 60 * 60)).toFixed(1);

      if (isValid) {
        await sendWhatsApp(from, `SALIDA REGISTRADA\n\n${employee.name}\n${workCenter.name}\nEntrada: ${horaEntrada}\nSalida: ${hora}\nHoras: ${horasTrabajadas}h\n\nHasta manana!`);
      } else {
        await sendWhatsApp(from, `SALIDA REGISTRADA (FUERA DE ZONA)\n\n${employee.name}\n${workCenter.name}\nEntrada: ${horaEntrada}\nSalida: ${hora}\nHoras: ${horasTrabajadas}h\nEstas a ${distance.toFixed(0)}m\n\nSe notificara a RH`);
      }

    } else {
      const horaE = new Date(existingAttendance.hora_entrada).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
      const horaS = new Date(existingAttendance.hora_salida).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
      await sendWhatsApp(from, `Ya registraste entrada y salida hoy.\n\nEntrada: ${horaE}\nSalida: ${horaS}`);
    }

    return NextResponse.json({ status: "ok" });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
