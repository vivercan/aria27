/**
 * POST /api/actividades/[id]/actualizacion — comentario, foto o archivo en una actividad (las "Updates" de Monday) · 10-Oct-2026
 * Avisa por WhatsApp a la otra parte (si comenta quien la hace, le llega a quien la asigno, y al reves).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { avisarWA, personaPorEmail, personaPorEmpleado, registrarActualizacion } from "@/lib/actividades-server";
import type { Actividad } from "@/lib/actividades";

const okUrl = (u: unknown) => typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(u);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const texto = String(b.texto || "").trim().slice(0, 2000);
  const foto = okUrl(b.foto_url) ? String(b.foto_url) : null;
  const archivo = okUrl(b.archivo_url) ? String(b.archivo_url) : null;
  if (!texto && !foto && !archivo) return NextResponse.json({ error: "Escribe algo o agrega una foto" }, { status: 400 });

  const db = getSupabaseAdmin();
  const { data } = await db.from("tareas_asignadas").select("*").eq("id", id).maybeSingle();
  const t = data as Actividad | null;
  if (!t) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });

  const me = auth.email.toLowerCase();
  const yo = await personaPorEmail(db, me);
  await registrarActualizacion(db, { tarea_id: id, autor_email: me, autor_nombre: yo?.nombre, tipo: foto ? "foto" : archivo ? "archivo" : "comentario", texto: texto || null, foto_url: foto, archivo_url: archivo, archivo_nombre: archivo ? String(b.archivo_nombre || "archivo").slice(0, 120) : null });
  await db.from("tareas_asignadas").update({ respuesta_ultima: (texto || (foto ? "📷 Foto" : "📎 Archivo")).slice(0, 300), respuesta_ultima_at: new Date().toISOString() }).eq("id", id);

  const esAsignado = (t.asignado_email || "").toLowerCase() === me;
  const destino = esAsignado ? await personaPorEmail(db, t.asignado_por_email || t.asignado_por) : await personaPorEmpleado(db, t.asignado_id);
  let notificado = false;
  if (destino && (destino.email || "") !== me) {
    const que = texto ? `"${texto.slice(0, 200)}"` : foto ? "una foto" : "un archivo";
    notificado = await avisarWA(destino, `${yo?.nombre || me} comentó en "${t.titulo}": ${que}${foto && texto ? " (con foto)" : ""}. Revísalo en ARIA27 › Actividades.`, "actividad-comentario", me);
  }
  return NextResponse.json({ ok: true, notificado });
}
