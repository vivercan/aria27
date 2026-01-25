import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
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
}
