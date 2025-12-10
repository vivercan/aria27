import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = "869940452874474";

function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function enviarWhatsApp(telefono: string, mensaje: string) {
  try {
    await fetch("https://graph.facebook.com/v21.0/" + PHONE_ID + "/messages", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + WHATSAPP_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefono,
        type: "text",
        text: { body: mensaje }
      })
    });
  } catch (e) {
    console.error("Error enviando WhatsApp:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    
    if (!message) {
      return NextResponse.json({ status: "no_message" });
    }

    const from = message.from;
    const messageType = message.type;
    const textBody = message.text?.body || "";
    const location = message.location;

    if (!location) {
      await enviarWhatsApp(from, "Por favor envia tu ubicacion junto con el mensaje de asistencia.");
      return NextResponse.json({ status: "no_location" });
    }

    const lat = location.latitude;
    const lng = location.longitude;
    const texto = textBody.toLowerCase();
    const esEntrada = texto.includes("entrada");
    const esSalida = texto.includes("salida");

    if (!esEntrada && !esSalida) {
      await enviarWhatsApp(from, "Indica si es ENTRADA o SALIDA. Ejemplo: 'Entrada: Juan, Pedro'");
      return NextResponse.json({ status: "no_type" });
    }

    const nombres = textBody
      .replace(/entrada|salida|:/gi, "")
      .split(",")
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 2);

    if (nombres.length === 0) {
      await enviarWhatsApp(from, "Indica los nombres. Ejemplo: 'Entrada: Juan, Pedro, Carlos'");
      return NextResponse.json({ status: "no_names" });
    }

    const fecha = new Date().toISOString().split("T")[0];
    const hora = new Date().toTimeString().split(" ")[0].substring(0, 5);
    const resultados: string[] = [];

    for (const nombre of nombres) {
      const { data: empleado } = await supabase
        .from("employees")
        .select("*, centros_trabajo(*)")
        .or("full_name.ilike.%" + nombre + "%,employee_number.ilike.%" + nombre + "%")
        .eq("status", "ACTIVO")
        .single();

      if (!empleado) {
        resultados.push("X " + nombre + " - No encontrado");
        continue;
      }

      let dentroGeocerca = true;
      if (empleado.centros_trabajo) {
        const distancia = calcularDistancia(
          lat, lng,
          empleado.centros_trabajo.latitud,
          empleado.centros_trabajo.longitud
        );
        dentroGeocerca = distancia <= empleado.centros_trabajo.radio_metros;
      }

      const { data: asistenciaExistente } = await supabase
        .from("asistencias")
        .select("*")
        .eq("employee_id", empleado.id)
        .eq("fecha", fecha)
        .single();

      if (esEntrada) {
        if (asistenciaExistente?.hora_entrada) {
          resultados.push("! " + empleado.full_name + " - Ya tiene entrada");
          continue;
        }

        let retardo = false;
        let minutosRetardo = 0;
        if (empleado.hora_entrada) {
          const [hEmp, mEmp] = empleado.hora_entrada.split(":").map(Number);
          const [hAct, mAct] = hora.split(":").map(Number);
          const diffMin = (hAct * 60 + mAct) - (hEmp * 60 + mEmp);
          if (diffMin > 10) {
            retardo = true;
            minutosRetardo = diffMin;
          }
        }

        if (asistenciaExistente) {
          await supabase.from("asistencias").update({
            hora_entrada: hora,
            latitud_entrada: lat,
            longitud_entrada: lng,
            dentro_geocerca_entrada: dentroGeocerca,
            retardo: retardo,
            minutos_retardo: minutosRetardo
          }).eq("id", asistenciaExistente.id);
        } else {
          await supabase.from("asistencias").insert({
            employee_id: empleado.id,
            fecha: fecha,
            hora_entrada: hora,
            latitud_entrada: lat,
            longitud_entrada: lng,
            dentro_geocerca_entrada: dentroGeocerca,
            retardo: retardo,
            minutos_retardo: minutosRetardo
          });
        }

        const icon = dentroGeocerca ? "V" : "!";
        const retardoTxt = retardo ? " (Retardo " + minutosRetardo + "min)" : "";
        resultados.push(icon + " " + empleado.full_name + " - Entrada " + hora + retardoTxt);

      } else if (esSalida) {
        if (!asistenciaExistente) {
          resultados.push("X " + empleado.full_name + " - Sin entrada registrada");
          continue;
        }
        if (asistenciaExistente.hora_salida) {
          resultados.push("! " + empleado.full_name + " - Ya tiene salida");
          continue;
        }

        const [hE, mE] = asistenciaExistente.hora_entrada.split(":").map(Number);
        const [hS, mS] = hora.split(":").map(Number);
        const horasTrabajadas = ((hS * 60 + mS) - (hE * 60 + mE)) / 60;

        await supabase.from("asistencias").update({
          hora_salida: hora,
          latitud_salida: lat,
          longitud_salida: lng,
          dentro_geocerca_salida: dentroGeocerca,
          horas_trabajadas: Math.round(horasTrabajadas * 100) / 100
        }).eq("id", asistenciaExistente.id);

        resultados.push("V " + empleado.full_name + " - Salida " + hora + " (" + horasTrabajadas.toFixed(1) + "h)");
      }
    }

    const tipo = esEntrada ? "ENTRADA" : "SALIDA";
    const respuesta = "ASISTENCIA " + tipo + " - " + fecha + "\n\n" + resultados.join("\n");
    await enviarWhatsApp(from, respuesta);

    return NextResponse.json({ status: "ok", resultados });
  } catch (error) {
    console.error("Error webhook asistencia:", error);
    return NextResponse.json({ error: "Error procesando" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  
  if (mode === "subscribe" && token === "aria27_attendance_verify") {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}