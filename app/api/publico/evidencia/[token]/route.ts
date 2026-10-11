/**
 * Público (sin usuario) · el destajista o proveedor sube fotos y avance de una actividad · 11-Oct-2026
 * Misma seguridad que el link de cotización: token aleatorio (solo hash), vence, límite por IP y por link, archivos revisados por contenido.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rate-limit";
import { hashToken, tokenValido, tipoArchivo, MAX_ARCHIVO } from "@/lib/cotizacion-link";
import { avisarWA, personaPorEmail, personaPorEmpleado, registrarActualizacion } from "@/lib/actividades-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function enlace(token: string) {
  if (!tokenValido(token)) return null;
  const db = getSupabaseAdmin();
  const { data } = await db.from("enlaces_cotizacion").select("*").eq("token_hash", hashToken(token)).eq("tipo", "EVIDENCIA").maybeSingle();
  const e = data as { id: string; tarea_id: string; supplier_name: string; expira: string; activo: boolean; usado_veces: number; creado_por: string } | null;
  if (!e || !e.tarea_id) return null;
  return { db, e, vencido: !e.activo || new Date(e.expira).getTime() < Date.now() };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const rl = checkRateLimit(getClientIdentifier(req), { key: "publico:evidencia:get", max: 30, windowMs: 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  const { token } = await ctx.params; const x = await enlace(token);
  if (!x) return NextResponse.json({ error: "Este link no existe. Pide uno nuevo a quien te lo mandó." }, { status: 404 });
  if (x.vencido) return NextResponse.json({ error: "Este link ya venció. Pide uno nuevo a quien te lo mandó." }, { status: 410 });
  const { data: t } = await x.db.from("tareas_asignadas").select("titulo, obra, fecha_compromiso, avance").eq("id", x.e.tarea_id).maybeSingle();
  const tt = t as { titulo: string; obra: string | null; fecha_compromiso: string | null; avance: number | null } | null;
  if (!tt) return NextResponse.json({ error: "La actividad ya no existe." }, { status: 404 });
  return NextResponse.json({ quien: x.e.supplier_name, titulo: tt.titulo, obra: tt.obra, entrega: tt.fecha_compromiso, avance: Number(tt.avance) || 0, enviadas: x.e.usado_veces, vence: x.e.expira });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const rl = checkRateLimit(getClientIdentifier(req), { key: "publico:evidencia:post", max: 10, windowMs: 10 * 60_000 }); if (!rl.allowed) return rateLimitResponse(rl);
  const { token } = await ctx.params; const x = await enlace(token);
  if (!x) return NextResponse.json({ error: "Este link no existe." }, { status: 404 });
  if (x.vencido) return NextResponse.json({ error: "Este link ya venció." }, { status: 410 });
  if (x.e.usado_veces >= 30) return NextResponse.json({ error: "Este link ya se usó muchas veces. Pide uno nuevo." }, { status: 429 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  const fotos = fd.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 5);
  if (!fotos.length) return NextResponse.json({ error: "Sube al menos una foto" }, { status: 400 });
  const comentario = String(fd.get("comentario") || "").trim().slice(0, 1000);
  const avRaw = String(fd.get("avance") || "");
  const avance = avRaw === "" ? null : Math.max(0, Math.min(100, Math.round(Number(avRaw))));
  const urls: string[] = [];
  for (const f of fotos) {
    if (f.size > MAX_ARCHIVO) return NextResponse.json({ error: `"${f.name}" pesa más de 10 MB` }, { status: 400 });
    const bytes = new Uint8Array(await f.arrayBuffer()); const tp = tipoArchivo(bytes);
    if (!tp) return NextResponse.json({ error: "Solo se aceptan fotos (JPG, PNG, WEBP) o PDF" }, { status: 400 });
    const path = `actividades/${x.e.tarea_id}/link-${Date.now()}-${urls.length}.${tp.ext}`;
    const { error } = await x.db.storage.from("expedientes").upload(path, bytes, { contentType: tp.tipo, upsert: false });
    if (error) return NextResponse.json({ error: "No se pudo guardar una foto, intenta de nuevo" }, { status: 500 });
    urls.push(x.db.storage.from("expedientes").getPublicUrl(path).data.publicUrl);
  }
  const autor = `${x.e.supplier_name} (por link)`;
  for (let i = 0; i < urls.length; i++) {
    const esPdf = urls[i].endsWith(".pdf");
    await registrarActualizacion(x.db, { tarea_id: x.e.tarea_id, autor_email: `link:${x.e.id}`, autor_nombre: autor, tipo: esPdf ? "archivo" : "foto", texto: i === 0 ? (comentario || (avance !== null ? `Avance ${avance}%` : null)) : null, foto_url: esPdf ? null : urls[i], archivo_url: esPdf ? urls[i] : null, archivo_nombre: esPdf ? "evidencia.pdf" : null });
  }
  const { data: t } = await x.db.from("tareas_asignadas").select("titulo, obra, avance, estatus, asignado_id, asignado_por_email, asignado_por").eq("id", x.e.tarea_id).maybeSingle();
  const tt = t as { titulo: string; obra: string | null; avance: number | null; estatus: string; asignado_id: string | null; asignado_por_email: string | null; asignado_por: string | null } | null;
  const cambios: Record<string, unknown> = { respuesta_ultima: `📷 ${autor}: ${comentario || `${urls.length} foto${urls.length === 1 ? "" : "s"}`}`.slice(0, 300), respuesta_ultima_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (avance !== null && tt && avance > (Number(tt.avance) || 0) && tt.estatus !== "COMPLETADA") { cambios.avance = avance; if (tt.estatus === "PENDIENTE" && avance > 0) cambios.estatus = "EN_PROGRESO"; }
  await x.db.from("tareas_asignadas").update(cambios).eq("id", x.e.tarea_id);
  await x.db.from("enlaces_cotizacion").update({ usado_veces: x.e.usado_veces + 1, ultimo_uso: new Date().toISOString() }).eq("id", x.e.id);
  if (tt && !/^QA\b/i.test(x.e.supplier_name)) {
    try {
      const destinos = [await personaPorEmpleado(x.db, tt.asignado_id), await personaPorEmail(x.db, tt.asignado_por_email || tt.asignado_por || x.e.creado_por)];
      const vistos = new Set<string>();
      for (const p of destinos) { if (!p?.email || vistos.has(p.email)) continue; vistos.add(p.email);
        await avisarWA(p, `${x.e.supplier_name} subió ${urls.length} foto${urls.length === 1 ? "" : "s"} de "${tt.titulo}"${tt.obra ? ` (${tt.obra})` : ""}${avance !== null ? `: avance ${avance}%` : ""}${comentario ? `. "${comentario.slice(0, 120)}"` : ""}.`, "evidencia-link", "evidencia-link", { title: `📷 Evidencia de ${x.e.supplier_name}`, url: `/dashboard/actividades?abrir=${x.e.tarea_id}`, tag: `act-${x.e.tarea_id}` }); }
    } catch { /* aviso best effort */ }
  }
  return NextResponse.json({ ok: true, fotos: urls.length });
}
