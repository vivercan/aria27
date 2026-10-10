/**
 * PATCH /api/actividades/[id] — mover de columna, avance, editar campos, reasignar · 10-Oct-2026
 * DELETE /api/actividades/[id] — borrar (quien la asigno, admin o RH)
 * Cada cambio queda en tarea_actualizaciones y avisa por WhatsApp a quien corresponde (aria_tarea_status).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { avisarWA, personaPorEmail, personaPorEmpleado, registrarActualizacion } from "@/lib/actividades-server";
import { COLUMNAS, cambiosPorAvance, cambiosPorColumna, columnaDe, fechaCorta, type Actividad, type ColumnaId } from "@/lib/actividades";
import { logger } from "@/lib/logger";

const log = logger("ACTIVIDADES-PATCH");
const SUPER = ["admin", "Administrador", "rh", "direccion", "validador"];
const PRIOS = ["urgente", "alta", "normal", "baja"];
const COLS: ColumnaId[] = ["POR_HACER", "EN_PROCESO", "BLOQUEADA", "TERMINADA"];

async function cargar(id: string) {
  const db = getSupabaseAdmin();
  const { data } = await db.from("tareas_asignadas").select("*").eq("id", id).maybeSingle();
  return { db, t: data as Actividad | null };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  try {
    const { id } = await ctx.params;
    const { db, t } = await cargar(id);
    if (!t) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
    const me = auth.email.toLowerCase();
    const esAsignado = (t.asignado_email || "").toLowerCase() === me;
    const esAsignador = (t.asignado_por_email || t.asignado_por || "").toLowerCase() === me;
    if (!esAsignado && !esAsignador && !SUPER.includes(auth.role)) return NextResponse.json({ error: "Solo quien la hace, quien la asignó, Superintendencia, Dirección o RH pueden cambiarla" }, { status: 403 });

    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const cambios: Record<string, unknown> = {};
    const notas: string[] = [];
    const colAntes = columnaDe(t);

    if (b.columna !== undefined) {
      const dest = String(b.columna) as ColumnaId;
      if (!COLS.includes(dest)) return NextResponse.json({ error: "Columna inválida" }, { status: 400 });
      const motivo = String(b.motivo || "").trim();
      if (dest === "BLOQUEADA" && !motivo) return NextResponse.json({ error: "Escribe qué la tiene atorada" }, { status: 400 });
      Object.assign(cambios, cambiosPorColumna(dest, t, motivo));
      notas.push(dest === "BLOQUEADA" ? `La marcó atorada: ${motivo}` : `La movió a ${COLUMNAS.find(c => c.id === dest)?.label}`);
    }
    if (b.avance !== undefined && b.avance !== null) {
      const pct = Number(b.avance);
      if (!isFinite(pct)) return NextResponse.json({ error: "Avance inválido" }, { status: 400 });
      Object.assign(cambios, cambiosPorAvance(pct, { ...t, ...cambios } as Actividad));
      notas.push(`Avance ${Math.max(0, Math.min(100, Math.round(pct)))}%`);
    }
    if (typeof b.titulo === "string" && b.titulo.trim() && b.titulo.trim() !== t.titulo) { cambios.titulo = b.titulo.trim().slice(0, 200); notas.push("Cambió el título"); }
    if (typeof b.descripcion === "string" && b.descripcion !== (t.descripcion || "")) { cambios.descripcion = b.descripcion.slice(0, 2000) || null; notas.push("Editó la descripción"); }
    if (typeof b.prioridad === "string" && PRIOS.includes(b.prioridad) && b.prioridad !== t.prioridad) { cambios.prioridad = b.prioridad; notas.push(`Prioridad ${b.prioridad}`); }
    for (const k of ["fecha_inicio", "fecha_compromiso"] as const) {
      if (b[k] !== undefined) {
        const v = String(b[k] || "").slice(0, 10);
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
        if ((v || null) !== (t[k] || null)) { cambios[k] = v || null; notas.push(`${k === "fecha_inicio" ? "Inicio" : "Entrega"}: ${v ? fechaCorta(v) : "sin fecha"}`); }
      }
    }
    if (b.obra_id !== undefined) {
      const oid = String(b.obra_id || "");
      if (!oid) { cambios.obra_id = null; cambios.obra = null; }
      else {
        const { data: o } = await db.from("centros_trabajo").select("id, nombre").eq("id", oid).maybeSingle();
        if (!o) return NextResponse.json({ error: "Obra no encontrada" }, { status: 400 });
        cambios.obra_id = (o as { id: string }).id; cambios.obra = (o as { nombre: string }).nombre;
      }
      notas.push(`Obra: ${cambios.obra || "sin obra"}`);
    }
    let nuevoAsignado = null as Awaited<ReturnType<typeof personaPorEmpleado>>;
    if (typeof b.asignado_id === "string" && b.asignado_id && b.asignado_id !== t.asignado_id) {
      nuevoAsignado = await personaPorEmpleado(db, b.asignado_id);
      if (!nuevoAsignado) return NextResponse.json({ error: "Esa persona no está en el personal" }, { status: 400 });
      cambios.asignado_id = b.asignado_id; cambios.asignado_nombre = nuevoAsignado.nombre; cambios.asignado_email = nuevoAsignado.email;
      notas.push(`Se la pasó a ${nuevoAsignado.nombre}`);
    }
    if (Object.keys(cambios).length === 0) return NextResponse.json({ ok: true, sinCambios: true, tarea: t });
    cambios.updated_at = new Date().toISOString();

    const { data: upd, error } = await db.from("tareas_asignadas").update(cambios).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const nueva = upd as Actividad;

    const yo = await personaPorEmail(db, me);
    await registrarActualizacion(db, { tarea_id: id, autor_email: me, autor_nombre: yo?.nombre, tipo: "estado", texto: notas.join(" · ") });

    // Avisos (solo eventos que importan, como Monday: terminada, atorada, reasignada)
    const colDespues = columnaDe(nueva);
    const quien = yo?.nombre || me;
    const obraTxt = nueva.obra ? ` (${nueva.obra})` : "";
    if (colDespues !== colAntes && !esAsignador) {
      const asignador = await personaPorEmail(db, t.asignado_por_email || t.asignado_por);
      if (colDespues === "TERMINADA") await avisarWA(asignador, `${quien} terminó la actividad "${nueva.titulo}"${obraTxt}.`, "actividad-terminada", me);
      else if (colDespues === "BLOQUEADA") await avisarWA(asignador, `La actividad "${nueva.titulo}"${obraTxt} está atorada: ${nueva.motivo_bloqueo}. Avisó ${quien}.`, "actividad-atorada", me);
    }
    if (nuevoAsignado && nuevoAsignado.email !== me) {
      await avisarWA(nuevoAsignado, `${quien} te pasó la actividad "${nueva.titulo}"${obraTxt}. Entrega: ${fechaCorta(nueva.fecha_compromiso) || "sin fecha"}. Contesta LISTO, AVANCE 50 o BLOQUEADO y el motivo.`, "actividad-reasignada", me);
    }
    return NextResponse.json({ ok: true, tarea: nueva });
  } catch (e: unknown) {
    log.error("patch actividad", { error: (e as Error)?.message });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  const { id } = await ctx.params;
  const { db, t } = await cargar(id);
  if (!t) return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 });
  const me = auth.email.toLowerCase();
  const esAsignador = (t.asignado_por_email || t.asignado_por || "").toLowerCase() === me;
  if (!esAsignador && !["admin", "Administrador", "rh"].includes(auth.role)) return NextResponse.json({ error: "Solo quien la asignó, admin o RH pueden borrarla" }, { status: 403 });
  try { await db.from("deleted_records").insert({ source_table: "tareas_asignadas", source_id: id, data: t, deleted_by: me }); } catch { /* respaldo best effort */ }
  const { error } = await db.from("tareas_asignadas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
