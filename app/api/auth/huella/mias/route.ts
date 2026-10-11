/** Mis teléfonos con huella/rostro: ver y quitar · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { data } = await getSupabaseAdmin().from("auth_passkeys").select("id, device_name, created_at, last_used_at").eq("user_email", auth.email.toLowerCase()).is("revoked_at", null).order("created_at", { ascending: false });
  return NextResponse.json({ llaves: data || [] });
}
export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  await getSupabaseAdmin().from("auth_passkeys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_email", auth.email.toLowerCase());
  return NextResponse.json({ ok: true });
}
