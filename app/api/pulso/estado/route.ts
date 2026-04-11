import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
const log = logger("PULSO-ESTADO");

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

// Actualizar last_seen y estado
export async function POST(req: NextRequest) {
  try {
    const { email, status, status_message } = await req.json();
    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    // AUTH: Verificar que el email pertenece a un usuario del sistema
    if (!(await verifyUser(email))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const updates: any = { last_seen: new Date().toISOString() };
    if (status) updates.status = status;
    if (status_message !== undefined) updates.status_message = status_message;

    await supabase.from("Users").update(updates).eq("email", email);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    log.error("[PULSO-ESTADO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// Obtener estado de usuarios
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");

    // AUTH: Verificar que quien consulta es un usuario del sistema
    if (!email || !(await verifyUser(email))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { data } = await supabase
      .from("Users")
      .select("email, display_name, name, last_seen, status, status_message")
      .eq("active", true);
    return NextResponse.json({ usuarios: data || [] });
  } catch (error: unknown) {
    log.error("[PULSO-ESTADO]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
