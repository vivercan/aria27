import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Actualizar last_seen y estado
export async function POST(req: NextRequest) {
  try {
    const { email, status, status_message } = await req.json();
    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    const updates: any = { last_seen: new Date().toISOString() };
    if (status) updates.status = status;
    if (status_message !== undefined) updates.status_message = status_message;

    await supabase.from("Users").update(updates).eq("email", email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PULSO-ESTADO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Obtener estado de usuarios
export async function GET(req: NextRequest) {
  try {
    const { data } = await supabase
      .from("Users")
      .select("email, display_name, name, last_seen, status, status_message")
      .eq("active", true);
    return NextResponse.json({ usuarios: data || [] });
  } catch (error) {
    console.error("[PULSO-ESTADO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
