import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
const log = logger("PULSO-MENSAJES");

// AUTH helper: verificar que el email existe en Users
async function verifyUser(email: string | null): Promise<boolean> {
  if (!email) return false;
  const { data } = await supabase
    .from("Users")
    .select("email")
    .eq("email", email)
    .single();
  return !!data;
}

export async function GET(req: NextRequest) {
  try {
    const convId = req.nextUrl.searchParams.get("conversacion_id");
    const email = req.nextUrl.searchParams.get("email");

    if (!convId) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    // AUTH: Verificar que el email pertenece a un usuario del sistema
    if (!email || !(await verifyUser(email))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { data: mensajes } = await supabase
      .from("pulso_mensajes")
      .select("*")
      .eq("conversacion_id", convId)
      .order("created_at", { ascending: true });

    // Marcar como leídos los mensajes de otros
    if (email) {
      await supabase
        .from("pulso_mensajes")
        .update({ leido: true })
        .eq("conversacion_id", convId)
        .neq("sender_email", email);
    }

    return NextResponse.json({ mensajes: mensajes || [] });
  } catch (error) {
    log.error("[PULSO-MENSAJES]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      conversacion_id,
      sender_email,
      contenido,
      tipo,
      archivo_url,
      archivo_nombre,
    } = await req.json();

    if (!conversacion_id || !sender_email || !contenido) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // AUTH: Verificar que el sender_email es un usuario real del sistema
    if (!(await verifyUser(sender_email))) {
      return NextResponse.json(
        { error: "No autorizado â sender_email no es un usuario registrado" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("pulso_mensajes")
      .insert({
        conversacion_id,
        sender_email,
        contenido,
        tipo: tipo || "texto",
        archivo_url,
        archivo_nombre,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error?.message }, { status: 500 });

    // Actualizar timestamp de conversación
    await supabase
      .from("pulso_conversaciones")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversacion_id);

    return NextResponse.json({ mensaje: data });
  } catch (error) {
    log.error("[PULSO-MENSAJES]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
