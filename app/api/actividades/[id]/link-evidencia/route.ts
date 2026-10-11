/** POST /api/actividades/[id]/link-evidencia — link para que un destajista o proveedor (sin usuario) suba fotos y avance · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { generarToken, hashToken, urlEvidencia } from "@/lib/cotizacion-link";

const SUPER = ["admin", "administrador", "rh", "direccion", "validador", "compras"];

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const nombre = String(b.nombre || "").trim().slice(0, 120);
  if (!nombre) return NextResponse.json({ error: "Escribe el nombre del destajista o proveedor" }, { status: 400 });
  const db = getSupabaseAdmin();
  const { data: t } = await db.from("tareas_asignadas").select("id, titulo, obra, asignado_email, asignado_por_email, asignado_por").eq("id", id).maybeSingle();
  const tt = t as { titulo: string; obra: string | null; asignado_email: string | null; asignado_por_email: string | null; asignado_por: string | null } | null;
  if (!tt) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  const me = auth.email.toLowerCase();
  const puede = SUPER.includes(String(auth.role).toLowerCase()) || (tt.asignado_email || "").toLowerCase() === me || (tt.asignado_por_email || tt.asignado_por || "").toLowerCase() === me;
  if (!puede) return NextResponse.json({ error: "Solo quien la hace, quien la asignó o los jefes pueden pedir evidencia" }, { status: 403 });
  const dias = Math.max(1, Math.min(60, Math.round(Number(b.dias) || 14)));
  const token = generarToken();
  const { error } = await db.from("enlaces_cotizacion").insert({ token_hash: hashToken(token), tipo: "EVIDENCIA", tarea_id: id, supplier_name: nombre, expira: new Date(Date.now() + dias * 864e5).toISOString(), creado_por: me });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const url = urlEvidencia(token);
  return NextResponse.json({ ok: true, url, mensaje: `Hola, ${nombre}. Para "${tt.titulo}"${tt.obra ? ` en ${tt.obra}` : ""}, súbenos fotos del avance desde aquí, sin crear cuenta: ${url} — Grupo Constructor Urbano Avante.` });
}
