/**
 * POST /api/actividades — crear actividad (tablero tipo Monday) · 10-Oct-2026
 * Fuente: tareas_asignadas. Avisa al responsable por WhatsApp (plantilla con boton si Meta ya la aprobo; si no, aria_tarea_status).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { sendWhatsAppTemplateOrFallback } from "@/lib/whatsapp";
import { personaPorEmail, personaPorEmpleado, registrarActualizacion } from "@/lib/actividades-server";
import { fechaCorta } from "@/lib/actividades";
import { logger } from "@/lib/logger";

const log = logger("ACTIVIDADES-CREAR");
const PRIOS = ["URGENTE", "ALTA", "MEDIA", "BAJA"];

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  try {
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const titulo = String(b.titulo || "").trim().slice(0, 200);
    const asignadoId = String(b.asignado_id || "").trim();
    const fechaCompromiso = String(b.fecha_compromiso || "").slice(0, 10);
    if (!titulo) return NextResponse.json({ error: "Escribe qué hay que hacer" }, { status: 400 });
    if (!asignadoId) return NextResponse.json({ error: "Elige quién la hace" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCompromiso)) return NextResponse.json({ error: "Elige la fecha de entrega" }, { status: 400 });

    const db = getSupabaseAdmin();
    const asignado = await personaPorEmpleado(db, asignadoId);
    if (!asignado) return NextResponse.json({ error: "Esa persona no está en el personal" }, { status: 400 });
    const yo = await personaPorEmail(db, auth.email);

    let obra: string | null = null; let obraId: string | null = null;
    if (b.obra_id) {
      const { data: o } = await db.from("centros_trabajo").select("id, nombre").eq("id", String(b.obra_id)).maybeSingle();
      if (o) { obraId = (o as { id: string }).id; obra = (o as { nombre: string }).nombre; }
    }
    const prioridad = PRIOS.includes(String(b.prioridad).toUpperCase()) ? String(b.prioridad).toUpperCase() : "MEDIA";
    const fechaInicio = /^\d{4}-\d{2}-\d{2}$/.test(String(b.fecha_inicio || "")) ? String(b.fecha_inicio) : null;

    const { data: ins, error } = await db.from("tareas_asignadas").insert({
      titulo, descripcion: String(b.descripcion || "").trim().slice(0, 2000) || null,
      asignado_id: asignadoId, asignado_nombre: asignado.nombre, asignado_email: asignado.email,
      asignado_por: auth.email, asignado_por_email: auth.email,
      obra: obra || (String(b.obra || "").trim() || null), obra_id: obraId,
      fecha_inicio: fechaInicio, fecha_compromiso: fechaCompromiso,
      prioridad, estatus: "PENDIENTE", avance: 0,
    }).select("id").single();
    if (error || !ins) return NextResponse.json({ error: error?.message || "No se pudo crear" }, { status: 500 });
    const id = (ins as { id: string }).id;

    const checklist = Array.isArray(b.checklist) ? (b.checklist as unknown[]).map(x => String(x || "").trim()).filter(Boolean).slice(0, 30) : [];
    if (checklist.length) await db.from("tarea_checklist").insert(checklist.map((texto, i) => ({ tarea_id: id, texto: texto.slice(0, 200), orden: i })));

    await registrarActualizacion(db, { tarea_id: id, autor_email: auth.email, autor_nombre: yo?.nombre, tipo: "sistema", texto: `Creó la actividad y se la asignó a ${asignado.nombre}` });

    let notificado = false;
    if (asignado.phone && (asignado.email || "") !== auth.email.toLowerCase()) {
      const nombre = (asignado.nombre || "").split(" ")[0] || "Hola";
      const fecha = fechaCorta(fechaCompromiso);
      const r = await sendWhatsAppTemplateOrFallback(
        { template: "aria_actividad_asignada", params: [nombre, titulo.slice(0, 80), (obra || "oficina").slice(0, 60), fecha], buttonToken: id },
        { template: "aria_tarea_status", params: [nombre, "1", `Nueva actividad de ${yo?.nombre || auth.email}: ${titulo.slice(0, 120)}${obra ? ` en ${obra}` : ""}. Entrega: ${fecha}. Contesta LISTO, AVANCE 50 o BLOQUEADO y el motivo.`] },
        asignado.phone, { origen: "actividad-asignada", enviadoPor: auth.email },
      );
      notificado = r.success;
    }
    return NextResponse.json({ ok: true, id, notificado });
  } catch (e: unknown) {
    log.error("crear actividad", { error: (e as Error)?.message });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
