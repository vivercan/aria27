/**
 * PATCH /api/actividades/[id] — mover de columna, avance, editar campos, reasignar · 10-Oct-2026
 * DELETE /api/actividades/[id] — borrar (quien la asigno, admin o RH)
 * Cada cambio queda en tarea_actualizaciones y avisa por WhatsApp a quien corresponde (aria_tarea_status).
 */
import { normHora } from "@/lib/actividades-server";
import { NextRequest, NextResponse } from "next/server";
import { pedirAprobacion } from "@/lib/aprobacion";
import { avisarEnApp } from "@/lib/actividades-server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { avisarWA, avisarDependientes, aplicarRecorrido, personaPorEmail, personaPorEmpleado, registrarActualizacion } from "@/lib/actividades-server";
import { COLUMNAS, cambiosPorAvance, cambiosPorColumna, columnaDe, fechaCorta, type Actividad, type ColumnaId } from "@/lib/actividades";
import { logger } from "@/lib/logger";

const log = logger("ACTIVIDADES-PATCH");
const SUPER = ["admin", "Administrador", "rh", "direccion", "validador"];
const PRIOS = ["URGENTE", "ALTA", "MEDIA", "BAJA"];
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

    // Dependencias (Monday): no se puede empezar ni terminar si la que espera no está terminada
    const quiereAvanzar = (b.columna !== undefined && ["EN_PROCESO", "TERMINADA"].includes(String(b.columna))) || (b.avance !== undefined && Number(b.avance) > 0);
    if (quiereAvanzar && t.depende_de && colAntes === "POR_HACER") {
      const { data: p } = await db.from("tareas_asignadas").select("id, titulo, estatus, asignado_nombre").eq("id", t.depende_de).maybeSingle();
      const pp = p as { titulo: string; estatus: string; asignado_nombre: string | null } | null;
      if (pp && pp.estatus !== "COMPLETADA" && pp.estatus !== "CANCELADA" && !(b.forzar === true && SUPER.includes(auth.role))) {
        return NextResponse.json({ error: `Primero se tiene que terminar "${pp.titulo}"${pp.asignado_nombre ? ` (la tiene ${pp.asignado_nombre})` : ""}. Te avisamos cuando quede.`, bloqueada: true, puedeForzar: SUPER.includes(auth.role) }, { status: 409 });
      }
    }

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
    if (typeof b.prioridad === "string" && PRIOS.includes(b.prioridad.toUpperCase()) && b.prioridad.toUpperCase() !== t.prioridad) { cambios.prioridad = b.prioridad.toUpperCase(); notas.push(`Prioridad ${b.prioridad.toLowerCase()}`); }
    for (const k of ["fecha_inicio", "fecha_compromiso"] as const) {
      if (b[k] !== undefined) {
        const v = String(b[k] || "").slice(0, 10);
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
        if ((v || null) !== (t[k] || null)) { cambios[k] = v || null; notas.push(`${k === "fecha_inicio" ? "Inicio" : "Entrega"}: ${v ? fechaCorta(v) : "sin fecha"}`); }
      }
    }
    if (b.hora_compromiso !== undefined) {
      const h = b.hora_compromiso ? normHora(String(b.hora_compromiso)) : null;
      if (b.hora_compromiso && !h) return NextResponse.json({ error: "Hora inválida" }, { status: 400 });
      if ((h || null) !== (t.hora_compromiso ? String(t.hora_compromiso).slice(0, 5) : null)) { cambios.hora_compromiso = h; notas.push(h ? `Hora de entrega: ${h}` : "Sin hora de entrega"); }
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
    if (b.depende_de !== undefined) {
      const dep = String(b.depende_de || "");
      if (!dep) { if (t.depende_de) { cambios.depende_de = null; notas.push("Ya no espera a otra actividad"); } }
      else if (dep !== t.depende_de) {
        if (dep === id) return NextResponse.json({ error: "No puede esperarse a sí misma" }, { status: 400 });
        const { data: p } = await db.from("tareas_asignadas").select("id, titulo, depende_de").eq("id", dep).maybeSingle();
        if (!p) return NextResponse.json({ error: "Esa actividad ya no existe" }, { status: 400 });
        if ((p as { depende_de?: string }).depende_de === id) return NextResponse.json({ error: "Esa actividad ya está esperando a esta; se harían un círculo" }, { status: 400 });
        cambios.depende_de = dep; notas.push(`Espera a "${(p as { titulo: string }).titulo}"`);
      }
    }
    let nuevoAsignado = null as Awaited<ReturnType<typeof personaPorEmpleado>>;
    if (typeof b.asignado_id === "string" && b.asignado_id && b.asignado_id !== t.asignado_id) {
      nuevoAsignado = await personaPorEmpleado(db, b.asignado_id);
      if (!nuevoAsignado) return NextResponse.json({ error: "Esa persona no está en el personal" }, { status: 400 });
      cambios.asignado_id = b.asignado_id; cambios.asignado_nombre = nuevoAsignado.nombre; cambios.asignado_email = nuevoAsignado.email;
      notas.push(`Se la pasó a ${nuevoAsignado.nombre}`);
    }
    if (Object.keys(cambios).length === 0) return NextResponse.json({ ok: true, sinCambios: true, tarea: t });
    if ((t as { por_aprobar?: boolean }).por_aprobar && cambios.estatus && cambios.estatus !== "COMPLETADA") cambios.por_aprobar = false;
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
      if (colDespues === "TERMINADA" && await pedirAprobacion(db, nueva as never, me)) { /* le llegó el aviso para aprobar con la evidencia */ }
      else if (colDespues === "TERMINADA") await avisarEnApp(asignador?.email, { title: "✅ Actividad terminada", body: `${quien} terminó la actividad "${nueva.titulo}"${obraTxt}.`, url: `/dashboard/actividades?abrir=${id}`, tag: `act-${id}` });
      else if (colDespues === "BLOQUEADA") await avisarEnApp(asignador?.email, { title: "⚠️ Actividad atorada", body: `La actividad "${nueva.titulo}"${obraTxt} está atorada: ${nueva.motivo_bloqueo}. Avisó ${quien}.`, url: `/dashboard/actividades?abrir=${id}`, tag: `act-${id}` });
    }
    // Si la entrega se movió a después, o se terminó tarde, se recorren las que siguen
    try {
      const hoy = new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10);
      if (cambios.fecha_compromiso && t.fecha_compromiso && String(cambios.fecha_compromiso) > String(t.fecha_compromiso).slice(0, 10)) await aplicarRecorrido(db, id, String(cambios.fecha_compromiso), me);
      else if (colDespues === "TERMINADA" && colAntes !== "TERMINADA" && t.fecha_compromiso && hoy > String(t.fecha_compromiso).slice(0, 10)) await aplicarRecorrido(db, id, hoy, me);
    } catch (e) { log.warn("recorrido", { error: (e as Error)?.message }); }
    if (colDespues === "TERMINADA" && colAntes !== "TERMINADA") { try { await avisarDependientes(db, nueva, me); } catch (e) { log.warn("dependientes", { error: (e as Error)?.message }); } }
    if (nuevoAsignado && nuevoAsignado.email !== me) {
      await avisarWA(nuevoAsignado, `${quien} te pasó la actividad "${nueva.titulo}"${obraTxt}. Entrega: ${fechaCorta(nueva.fecha_compromiso) || "sin fecha"}. Contesta LISTO, AVANCE 50 o BLOQUEADO y el motivo.`, "actividad-reasignada", me, { title: "📋 Te pasaron una actividad", url: `/dashboard/actividades?abrir=${id}`, tag: `act-${id}` });
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
