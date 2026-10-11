/** Modo prueba (solo administrador): ver y prender/apagar · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { esActorPrueba } from "@/lib/modo-prueba";
export const dynamic = "force-dynamic";
async function yo(email: string) { const { data } = await getSupabaseAdmin().from("users").select("role, modo_prueba").eq("email", email.toLowerCase()).maybeSingle(); return data as { role?: string; modo_prueba?: boolean | null } | null; }
export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const u = await yo(auth.email); if (u?.role !== "admin") return NextResponse.json({ disponible: false });
  return NextResponse.json({ disponible: true, activo: u.modo_prueba === true || (u.modo_prueba == null && esActorPrueba(auth.email)) });
}
export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const u = await yo(auth.email); if (u?.role !== "admin") return NextResponse.json({ error: "Solo administrador" }, { status: 403 });
  const b = await req.json().catch(() => ({})) as { activo?: boolean };
  await getSupabaseAdmin().from("users").update({ modo_prueba: b.activo === true }).eq("email", auth.email.toLowerCase());
  return NextResponse.json({ ok: true, activo: b.activo === true });
}
