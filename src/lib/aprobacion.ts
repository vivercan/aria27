/**
 * Visto bueno del que encargó la actividad (11-Oct-2026 · JJ)
 * Cuando quien la hace dice que terminó (en la app o por WhatsApp "ya quedó"), la actividad se da por terminada
 * (para que lo que sigue pueda avanzar) pero queda "por aprobar": al que la encargó le aparece en la APP (Inicio › Revisar)
 * con la evidencia, y aprueba o regresa ahí (también puede contestar APROBAR/REGRESAR por WhatsApp). Si en 3 días no contesta, se aprueba sola y se avisa.
 * Lógica pura de lectura en leerAprobacionWA (tests/aprobacion.test.ts).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { avisarEnApp, avisarWA, personaPorEmail, registrarActualizacion } from "@/lib/actividades-server";

export const DIAS_AUTOAPROBAR = 3;

type T = { id: string; titulo: string; obra?: string | null; asignado_nombre?: string | null; asignado_email?: string | null; asignado_por?: string | null; asignado_por_email?: string | null; por_aprobar?: boolean | null };

const n = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[👍✅👌]/gu, " aprobar ").replace(/[❌↩️]/gu, " regresar ").replace(/[^a-z0-9#\s]/g, " ").replace(/\s+/g, " ").trim();

/** ¿El que encargó está aprobando o regresando? Solo palabras claras (un "ok" suelto no cuenta, porque también lo usa quien hace la tarea). */
export function leerAprobacionWA(texto: string): { accion: "aprobar" | "regresar"; motivo: string; idx?: number } | null {
  let t = n(texto); let idx: number | undefined;
  const m = t.match(/^(\d{1,2}) (.+)$/) || t.match(/^(.+?) (\d{1,2})$/);
  const mid = t.match(/^(aprobar|apruebo|aprobado|regresar|regresa) (\d{1,2})\b ?(.*)$/);
  if (mid) { idx = Number(mid[2]); t = `${mid[1]} ${mid[3]}`.trim(); }
  else if (m) { const num = Number(/^\d/.test(m[1]) ? m[1] : m[2]); const resto = /^\d/.test(m[1]) ? m[2] : m[1]; if (num >= 1 && num <= 20) { idx = num; t = resto; } }
  if (/^(regresar|regresa|regresala|regresalo|no esta bien|no quedo|no quedo bien|falta|le falta|corregir|corrige|rehacer|rehazlo|todavia no|aun no|no se aprueba|rechazo|rechazar)\b/.test(t)) {
    const motivo = t.replace(/^(regresar|regresa|regresala|regresalo|no esta bien|no quedo bien|no quedo|corregir|corrige|rehacer|rehazlo|todavia no|aun no|no se aprueba|rechazo|rechazar)\s*(porque|por que|que|:)?\s*/, "").trim();
    return { accion: "regresar", motivo: motivo || "Le falta algo; revisa con quien la encargó", idx };
  }
  if (/^(aprobar|apruebo|aprobado|aprobada|aprueba|autorizo|autorizado|esta bien|quedo bien|bien hecho|de acuerdo|si esta bien|ya la revise|ya lo revise|todo bien|perfecto|excelente|va|sale)( aprobar| gracias| jefe)*$/.test(t)) return { accion: "aprobar", motivo: "", idx };
  return null;
}

/** Al terminar: si la encargó otra persona, queda por aprobar y se le pide su visto bueno por WhatsApp. Devuelve true si se pidió. */
export async function pedirAprobacion(db: SupabaseClient, t: T, porEmail: string): Promise<boolean> {
  const dueño = String(t.asignado_por_email || t.asignado_por || "").toLowerCase();
  const hace = String(t.asignado_email || "").toLowerCase();
  if (!dueño.includes("@") || dueño === hace || dueño === "automatizacion") return false;
  await db.from("tareas_asignadas").update({ por_aprobar: true, aprobada_por: null, aprobada_at: null }).eq("id", t.id);
  // 11-Oct-2026 (JJ): al que la encargó le llega en la APP (Inicio › "Revisar" + notificación si la activó), no por WhatsApp
  await avisarEnApp(dueño, { title: "✅ Terminó: revisa y aprueba", body: `${t.asignado_nombre || "Quien la hace"} dice que terminó "${t.titulo}"${t.obra ? ` (${t.obra})` : ""}. Revisa la evidencia y apruébala o regrésala.`, url: `/dashboard/actividades?abrir=${t.id}`, tag: `apr-${t.id}` });
  return true;
}

/** Aprobar o regresar (desde la app o por WhatsApp). */
export async function resolverAprobacion(db: SupabaseClient, t: T, accion: "aprobar" | "regresar", motivo: string, porEmail: string, porNombre?: string | null): Promise<void> {
  const quien = porNombre || (await personaPorEmail(db, porEmail))?.nombre || porEmail;
  const hace = t.asignado_email ? await personaPorEmail(db, t.asignado_email) : null;
  if (accion === "aprobar") {
    await db.from("tareas_asignadas").update({ por_aprobar: false, aprobada_por: porEmail, aprobada_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", t.id);
    await registrarActualizacion(db, { tarea_id: t.id, autor_email: porEmail, autor_nombre: quien, tipo: "estado", texto: "Aprobó: quedó bien" });
    await avisarWA(hace, `✅ ${quien} aprobó tu actividad "${t.titulo}". ¡Gracias!`, "actividad-aprobada", porEmail, { title: "✅ Aprobada", url: `/dashboard/actividades?abrir=${t.id}`, tag: `apr-${t.id}` });
  } else {
    await db.from("tareas_asignadas").update({ por_aprobar: false, aprobada_por: null, aprobada_at: null, estatus: "EN_PROGRESO", avance: 80, completada_at: null, updated_at: new Date().toISOString() }).eq("id", t.id);
    await registrarActualizacion(db, { tarea_id: t.id, autor_email: porEmail, autor_nombre: quien, tipo: "comentario", texto: `La regresó: ${motivo}` });
    await avisarWA(hace, `↩️ ${quien} regresó tu actividad "${t.titulo}": ${motivo}. Cuando quede, contesta LISTO.`, "actividad-regresada", porEmail, { title: "↩️ Te la regresaron", url: `/dashboard/actividades?abrir=${t.id}`, tag: `apr-${t.id}` });
  }
}
