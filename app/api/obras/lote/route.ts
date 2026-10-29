/**
 * POST /api/obras/lote — cambios a una, varias o todas las obras (11-Oct-2026 · JJ: Deyanira debe poder agregar, editar y borrar)
 * body { ids: string[], accion: "eliminar" | "editar" | "restaurar", cambios?: { estado?, responsable_email?, cliente?, empresa?, radio_metros? } }
 * Eliminar: si la obra no tiene historial (requisiciones, personal, tareas, fotos…) se borra de verdad;
 * si tiene historial se manda a "Eliminadas": desaparece de todo el sistema pero se puede recuperar (no se rompe lo ya registrado).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
const PUEDEN = ["admin", "rh", "direccion"];
const ESTADOS = ["EN_PLANEACION", "ACTIVA", "PAUSADA", "TERMINADA", "CANCELADA"];
// Tablas que apuntan a la obra (si alguna tiene registros, la obra tiene historial)
const REFS: [string, string][] = [
  ["employees", "centro_trabajo_id"], ["documentos_plantilla", "obra_id"], ["concreto", "obra_id"], ["planos", "obra_id"], ["fotos_avance", "obra_id"],
  ["sua_aportaciones", "obra_id"], ["polizas_seguro", "obra_id"], ["siroc", "obra_id"], ["obra_avances", "obra_id"], ["caja_chica_fondos", "obra_id"],
  ["sua_lineas_captura", "obra_id"], ["arquitecto_obras", "centro_trabajo_id"], ["obra_avances_inbox", "suggested_obra_id"], ["obra_avances_inbox", "confirmed_obra_id"],
  ["equipo_combustible_obras", "centro_trabajo_id"], ["combustible_solicitudes", "obra_id"], ["tareas_obra", "centro_trabajo_id"], ["tareas_asignadas", "obra_id"],
];

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  if (!PUEDEN.includes(String(auth.role || "").toLowerCase())) return NextResponse.json({ error: "Solo Administración, RH o Dirección pueden cambiar obras en grupo" }, { status: 403 });
  let b: { ids?: unknown; accion?: unknown; cambios?: Record<string, unknown> };
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos" }, { status: 400 }); }
  const ids = Array.isArray(b.ids) ? (b.ids as unknown[]).map(String).filter(x => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 500) : [];
  if (!ids.length) return NextResponse.json({ error: "Elige al menos una obra" }, { status: 400 });
  const db = getSupabaseAdmin();
  const me = auth.email.toLowerCase();
  const { data: obras } = await db.from("centros_trabajo").select("id, nombre").in("id", ids);
  const lista = (obras || []) as { id: string; nombre: string }[];
  if (!lista.length) return NextResponse.json({ error: "No encontré esas obras" }, { status: 404 });

  // 29-Oct-2026 (Deya: "Fracc. Villas" → "Parque Villas"): el nombre de la obra está copiado en 47 tablas (requisiciones, tareas,
  // entregas, gastos…). Renombrar solo el catálogo rompía saldos, filtros y "¿Ya llegó?". La función renombrar_obra lo cambia en todas.
  if (b.accion === "renombrar") {
    const nuevo = String((b.cambios as { nombre?: string } | undefined)?.nombre || "").trim().slice(0, 200);
    if (!nuevo || lista.length !== 1) return NextResponse.json({ error: "Elige una sola obra y escribe el nombre nuevo" }, { status: 400 });
    const { data, error } = await db.rpc("renombrar_obra", { p_id: lista[0].id, p_nuevo: nuevo });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, resultado: data });
  }
  if (b.accion === "editar") {
    const c = b.cambios || {};
    const up: Record<string, unknown> = {};
    if (typeof c.estado === "string" && ESTADOS.includes(c.estado)) up.estado = c.estado;
    // vacío = sin cambio; "__ninguno__" = quitar responsable
    if (typeof c.responsable_email === "string" && c.responsable_email.trim()) up.responsable_email = c.responsable_email === "__ninguno__" ? null : c.responsable_email.trim().toLowerCase();
    if (typeof c.cliente === "string" && c.cliente.trim()) up.cliente = c.cliente.trim().slice(0, 200);
    if (typeof c.empresa === "string" && c.empresa.trim()) up.empresa = c.empresa.trim().slice(0, 200);
    if (c.radio_metros != null && c.radio_metros !== "") { const r = parseInt(String(c.radio_metros)); if (r >= 1 && r <= 5000) up.radio_metros = r; }
    if (!Object.keys(up).length) return NextResponse.json({ error: "No elegiste ningún cambio" }, { status: 400 });
    up.updated_at = new Date().toISOString();
    const { error } = await db.from("centros_trabajo").update(up).in("id", lista.map(o => o.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.from("event_log").insert({ tipo: "OBRAS_EDITADAS", resumen: `${lista.length} obra(s) editadas: ${Object.keys(up).filter(k => k !== "updated_at").join(", ")}`, actor: me, metadata: { ids: lista.map(o => o.id), cambios: up } });
    return NextResponse.json({ ok: true, editadas: lista.length });
  }

  if (b.accion === "restaurar") {
    const { error } = await db.from("centros_trabajo").update({ eliminada_at: null, eliminada_por: null, activo: true, estado: "ACTIVA", updated_at: new Date().toISOString() }).in("id", lista.map(o => o.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.from("event_log").insert({ tipo: "OBRAS_RESTAURADAS", resumen: `${lista.length} obra(s) recuperadas: ${lista.map(o => o.nombre).join(", ")}`.slice(0, 500), actor: me });
    return NextResponse.json({ ok: true, restauradas: lista.length });
  }

  if (b.accion === "eliminar") {
    const borradas: string[] = [], archivadas: string[] = [];
    for (const o of lista) {
      let usos = 0;
      for (const [t, col] of REFS) { const { count } = await db.from(t).select("*", { count: "exact", head: true }).eq(col, o.id); usos += count || 0; if (usos) break; }
      if (!usos) { const { count } = await db.from("requisitions").select("*", { count: "exact", head: true }).or(`cost_center_id.eq.${o.id},cost_center_name.eq."${o.nombre.replace(/"/g, "")}"`); usos += count || 0; }
      if (!usos) {
        const { error } = await db.from("centros_trabajo").delete().eq("id", o.id);
        if (!error) { borradas.push(o.nombre); continue; }
      }
      await db.from("centros_trabajo").update({ eliminada_at: new Date().toISOString(), eliminada_por: me, activo: false, updated_at: new Date().toISOString() }).eq("id", o.id);
      archivadas.push(o.nombre);
    }
    await db.from("event_log").insert({ tipo: "OBRAS_ELIMINADAS", resumen: `Borradas: ${borradas.join(", ") || "—"} · A Eliminadas (con historial): ${archivadas.join(", ") || "—"}`.slice(0, 900), actor: me });
    return NextResponse.json({ ok: true, borradas: borradas.length, aEliminadas: archivadas.length, nombresEliminadas: archivadas });
  }
  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
