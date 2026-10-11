/**
 * GET  /api/revisiones?obra_id= — formatos activos y revisiones recientes
 * POST /api/revisiones — guarda una revisión de calidad/seguridad con firma; lo que salió mal puede volverse actividad · 11-Oct-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { avisarWA, crearActividad, personaPorEmail } from "@/lib/actividades-server";
import { sumarDias, hoyMX } from "@/lib/plantillas";

const okUrl = (u: unknown) => typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(u);

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const obra = new URL(req.url).searchParams.get("obra_id");
  const db = getSupabaseAdmin();
  let q = db.from("revisiones").select("*").order("created_at", { ascending: false }).limit(60);
  if (obra) q = q.eq("obra_id", obra);
  const [{ data: f }, { data: r }] = await Promise.all([db.from("revision_formatos").select("*").eq("activa", true).order("nombre"), q]);
  return NextResponse.json({ formatos: f || [], revisiones: r || [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const db = getSupabaseAdmin();
  const { data: fm } = await db.from("revision_formatos").select("id, nombre, tipo, puntos").eq("id", String(b.formato_id || "")).maybeSingle();
  const formato = fm as { id: string; nombre: string; tipo: string; puntos: string[] } | null;
  if (!formato) return NextResponse.json({ error: "Elige qué revisión vas a hacer" }, { status: 400 });
  type ObraR = { id: string; nombre: string; responsable_email: string | null };
  const { data: od } = b.obra_id ? await db.from("centros_trabajo").select("id, nombre, responsable_email").eq("id", String(b.obra_id)).maybeSingle() : { data: null };
  const obra = od as ObraR | null;
  if (!obra) return NextResponse.json({ error: "Elige la obra" }, { status: 400 });
  const raw = Array.isArray(b.respuestas) ? (b.respuestas as Record<string, unknown>[]) : [];
  const respuestas = raw.slice(0, 80).map(x => ({ texto: String(x.texto || "").slice(0, 200), estado: ["OK", "NO", "NA"].includes(String(x.estado)) ? String(x.estado) : "NA", nota: x.nota ? String(x.nota).slice(0, 500) : null, foto_url: okUrl(x.foto_url) ? String(x.foto_url) : null }));
  if (!respuestas.length || respuestas.some(r => !r.texto)) return NextResponse.json({ error: "Faltan respuestas" }, { status: 400 });
  if (!okUrl(b.firma_url)) return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  const yo = await personaPorEmail(db, auth.email);
  const fallas = respuestas.filter(r => r.estado === "NO");
  const fila = { formato_id: formato.id, formato_nombre: formato.nombre, tipo: formato.tipo, obra_id: obra.id, obra_nombre: obra.nombre, tarea_id: b.tarea_id ? String(b.tarea_id) : null, realizada_por: auth.email.toLowerCase(), realizada_nombre: yo?.nombre || auth.email,
    respuestas, total: respuestas.filter(r => r.estado !== "NA").length, ok: respuestas.filter(r => r.estado === "OK").length, fallas: fallas.length, firma_url: String(b.firma_url), nombre_firma: String(b.nombre_firma || yo?.nombre || "").slice(0, 120), notas: b.notas ? String(b.notas).slice(0, 1000) : null };
  const { data: ins, error } = await db.from("revisiones").insert(fila).select("id").single();
  if (error || !ins) return NextResponse.json({ error: error?.message || "No se pudo guardar" }, { status: 500 });
  // Lo que salió mal → actividades para corregir (opcional)
  let creadas = 0;
  if (b.crear_actividades === true && fallas.length && b.asignar_a) {
    for (const f of fallas.slice(0, 20)) {
      const r = await crearActividad(db, { titulo: `Corregir: ${f.texto}`.slice(0, 200), descripcion: `De la revisión "${formato.nombre}"${f.nota ? `: ${f.nota}` : ""}`, asignado_id: String(b.asignar_a), obra_id: obra.id, fecha_compromiso: sumarDias(hoyMX(), 1), prioridad: formato.tipo === "SEGURIDAD" ? "URGENTE" : "ALTA", origen: `revisión: ${formato.nombre}` }, auth.email, creadas === 0 ? "todo" : "push");
      if (r.ok) creadas++;
    }
  }
  // Avisar al responsable de la obra si algo salió mal
  if (fallas.length && obra.responsable_email && obra.responsable_email.toLowerCase() !== auth.email.toLowerCase()) {
    const p = await personaPorEmail(db, obra.responsable_email);
    await avisarWA(p, `Revisión "${formato.nombre}" en ${obra.nombre}: ${fallas.length} punto${fallas.length === 1 ? "" : "s"} con falla (${fallas.slice(0, 3).map(f => f.texto).join("; ")}). La hizo ${yo?.nombre || auth.email}.`, "revision-fallas", auth.email, { title: `⚠️ Revisión con ${fallas.length} falla${fallas.length === 1 ? "" : "s"}`, url: `/dashboard/domenica/revisiones?ver=${(ins as { id: string }).id}`, tag: `rev-${(ins as { id: string }).id}` });
  }
  return NextResponse.json({ ok: true, id: (ins as { id: string }).id, creadas });
}
