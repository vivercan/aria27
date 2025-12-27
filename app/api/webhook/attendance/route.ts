import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID || "963627606824867";
const VERIFY_TOKEN = "aria27_webhook_token";

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
    console.log("Mensaje de:", from, "Phone10:", phone10, "Tipo:", message.type);

    if (message.type !== "location") {
      await sendWhatsApp(from, "Para registrar asistencia, envia tu ubicacion actual.\n\nPresiona el clip 📎 > Ubicacion > Enviar ubicacion actual");
      return NextResponse.json({ status: "not location" });
    }

    const lat = message.location.latitude;
    const lng = message.location.longitude;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    // Buscar empleado
    const { data, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .or(`whatsapp.eq.${phone10},whatsapp.eq.${from}`)
      .eq("status", "ACTIVO")
      .limit(1);

    const emp = data?.[0];
    console.log("Empleado encontrado:", emp?.full_name, "Error:", empErr?.message);

    if (!emp) {
      await sendWhatsApp(from, "Tu numero no esta registrado. Contacta a Recursos Humanos.");
      return NextResponse.json({ status: "not found" });
    }

    // Buscar centro mas cercano en work_centers
    const { data: centers } = await supabase.from("work_centers").select("*").eq("active", true);
    if (!centers || centers.length === 0) {
      await sendWhatsApp(from, "No hay centros de trabajo configurados. Contacta a RH.");
      return NextResponse.json({ status: "no centers" });
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
    const hora = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });

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
        ? `ENTRADA REGISTRADA\n\n${emp.full_name}\n${workCenter.name}\nHora: ${hora}\nUbicacion valida\n\nExcelente dia!`
        : `ENTRADA REGISTRADA\n(Fuera de zona: ${distance.toFixed(0)}m)\n\n${emp.full_name}\n${workCenter.name}\nHora: ${hora}`;
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

      const horaE = new Date(asist.hora_entrada).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
      const horas = ((Date.now() - new Date(asist.hora_entrada).getTime()) / 3600000).toFixed(1);

      const msg = isValid
        ? `SALIDA REGISTRADA\n\n${emp.full_name}\n${workCenter.name}\nEntrada: ${horaE}\nSalida: ${hora}\nHoras: ${horas}h\n\nHasta manana!`
        : `SALIDA REGISTRADA\n(Fuera de zona: ${distance.toFixed(0)}m)\n\n${emp.full_name}\nEntrada: ${horaE}\nSalida: ${hora}\nHoras: ${horas}h`;
      await sendWhatsApp(from, msg);

    } else {
      const horaE = new Date(asist.hora_entrada).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
      const horaS = new Date(asist.hora_salida).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
      await sendWhatsApp(from, `Ya registraste asistencia hoy.\n\nEntrada: ${horaE}\nSalida: ${horaS}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}








