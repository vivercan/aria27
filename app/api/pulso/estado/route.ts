import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Actualizar last_seen y estado
export async function POST(req: NextRequest) {
  const { email, status, status_message } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  const updates: any = { last_seen: new Date().toISOString() };
  if (status) updates.status = status;
  if (status_message !== undefined) updates.status_message = status_message;

  await supabase.from("users").update(updates).eq("email", email);
  return NextResponse.json({ ok: true });
}

// Obtener estado de usuarios
export async function GET(req: NextRequest) {
  const { data } = await supabase
    .from("users")
    .select("email, display_name, name, last_seen, status, status_message")
    .eq("active", true);
  return NextResponse.json({ usuarios: data || [] });
}
