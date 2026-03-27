import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const convId = req.nextUrl.searchParams.get("conversacion_id");
    const email = req.nextUrl.searchParams.get("email");
    
    if (!convId) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

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
    console.error("[PULSO-MENSAJES]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { conversacion_id, sender_email, contenido, tipo, archivo_url, archivo_nombre } = await req.json();

    if (!conversacion_id || !sender_email || !contenido) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pulso_mensajes")
      .insert({
        conversacion_id,
        sender_email,
        contenido,
        tipo: tipo || "texto",
        archivo_url,
        archivo_nombre
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Actualizar timestamp de conversación
    await supabase
      .from("pulso_conversaciones")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversacion_id);

    return NextResponse.json({ mensaje: data });
  } catch (error) {
    console.error("[PULSO-MENSAJES]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
