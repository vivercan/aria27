/** GET /api/requisicion/firmas?id=<requisición> → firmas que van en su PDF (16-Oct-2026). Requiere sesión. */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { firmasDeRequi, type FirmaImg } from "@/lib/firmas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: r } = await db.from("requisitions").select("id, user_email, created_by, descripcion_corta, instructions").eq("id", id).maybeSingle();
  if (!r) return NextResponse.json({ error: "Requisición no encontrada" }, { status: 404 });
  const { data: fs } = await db.from("firmas_usuarios").select("email, nombre, png_base64").eq("activa", true);
  const disponibles: Record<string, FirmaImg> = {};
  for (const f of (fs || []) as { email: string; nombre: string; png_base64: string }[]) disponibles[f.email.toLowerCase()] = { nombre: f.nombre, dataUrl: `data:image/png;base64,${f.png_base64}` };
  return NextResponse.json({ ok: true, firmas: firmasDeRequi(r as { user_email?: string | null; created_by?: string | null; descripcion_corta?: string | null; instructions?: string | null }, disponibles) });
}
