/**
 * POST /api/actividades — crear actividad (tablero tipo Monday) · 10-Oct-2026
 * Fuente: tareas_asignadas. Avisa al responsable por WhatsApp (plantilla con boton si Meta ya la aprobo; si no, aria_tarea_status).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { crearActividad } from "@/lib/actividades-server";
import { logger } from "@/lib/logger";

const log = logger("ACTIVIDADES-CREAR");

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  try {
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const db = getSupabaseAdmin();
    const r = await crearActividad(db, {
      titulo: String(b.titulo || ""), descripcion: b.descripcion ? String(b.descripcion) : null, asignado_id: String(b.asignado_id || "").trim(),
      fecha_compromiso: String(b.fecha_compromiso || "").slice(0, 10), fecha_inicio: b.fecha_inicio ? String(b.fecha_inicio) : null,
      obra_id: b.obra_id ? String(b.obra_id) : null, obra: b.obra ? String(b.obra) : null, prioridad: b.prioridad ? String(b.prioridad) : null,
      checklist: Array.isArray(b.checklist) ? (b.checklist as unknown[]).map(String) : [], depende_de: b.depende_de ? String(b.depende_de) : null,
      hora: b.hora ? String(b.hora) : null,
    }, auth.email, "todo");
    // 11-Oct-2026: dejar rastro de por qué se rechazó (antes un 400 no dejaba nada en los registros y no se podía saber qué le pasó a la persona)
    if (!r.ok) { log.warn("actividad no creada", { por: auth.email, motivo: r.error, status: r.status, asignado_id: String(b.asignado_id || ""), fecha: String(b.fecha_compromiso || "") }); return NextResponse.json({ error: r.error }, { status: r.status }); }
    const { id, notificado } = r;
    return NextResponse.json({ ok: true, id, notificado });
  } catch (e: unknown) {
    log.error("crear actividad", { error: (e as Error)?.message });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
