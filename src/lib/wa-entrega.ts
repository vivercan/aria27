/**
 * Estado real de entrega de cada WhatsApp (12/14-Oct-2026 · JJ: "cuando se asignan las tareas no están llegando")
 * Meta avisa por el webhook si el mensaje se envió, se entregó, se leyó o falló. Antes eso se ignoraba:
 * solo sabíamos que Meta lo había aceptado. Ahora se guarda en wa_log y en la actividad, y si falla se le avisa a quien la encargó.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type EstadoMeta = { id?: string; status?: string; recipient_id?: string; errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[] };
const ORDEN: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: 4 };
export const TXT_ESTADO: Record<string, string> = { sent: "enviado", delivered: "entregado", read: "leído", failed: "no le llegó" };

/** Traduce los errores comunes de Meta a palabras de casa */
export function motivoFalla(e?: EstadoMeta["errors"]): string | null {
  const x = e?.[0]; if (!x) return null;
  const c = Number(x.code || 0);
  const m: Record<number, string> = {
    131026: "ese número no tiene WhatsApp o no puede recibir mensajes",
    131047: "pasaron más de 24 h sin que la persona escribiera; se necesita plantilla aprobada",
    131049: "Meta frenó el mensaje para no saturar a la persona; se reintenta mañana",
    131050: "la persona bloqueó o dejó de recibir mensajes de la empresa",
    131051: "tipo de mensaje no soportado",
    131053: "no se pudo subir el archivo",
    130472: "Meta frenó el mensaje (experimento de Meta con ese número)",
    131000: "error de Meta, se puede reintentar",
    131021: "el número de destino es el mismo que el de la empresa",
    132000: "faltan o sobran datos en la plantilla",
    132001: "la plantilla no existe o no está aprobada",
    132012: "un dato de la plantilla viene en formato incorrecto",
  };
  return `${m[c] || (x.title || x.message || "error de Meta")} (${c || "?"})`;
}

export async function registrarEstados(db: SupabaseClient, estados: EstadoMeta[]): Promise<number> {
  let n = 0;
  for (const s of estados || []) {
    if (!s?.id || !s.status) continue;
    const motivo = s.status === "failed" ? motivoFalla(s.errors) : null;
    const { data: fila } = await db.from("wa_log").select("id, estado_entrega").eq("message_id", s.id).maybeSingle();
    const actual = (fila as { estado_entrega?: string | null } | null)?.estado_entrega || "";
    if (fila && (ORDEN[actual] || 0) >= (ORDEN[s.status] || 0) && s.status !== "failed") continue; // no retroceder (leído > entregado)
    if (fila) await db.from("wa_log").update({ estado_entrega: s.status, error_entrega: motivo, estado_at: new Date().toISOString() }).eq("id", (fila as { id: string }).id);
    const { data: tareas } = await db.from("tareas_asignadas").select("id, titulo, asignado_nombre, asignado_por_email, wa_estado").eq("wa_message_id", s.id);
    for (const t of (tareas || []) as { id: string; titulo: string; asignado_nombre?: string | null; asignado_por_email?: string | null; wa_estado?: string | null }[]) {
      if ((ORDEN[t.wa_estado || ""] || 0) >= (ORDEN[s.status] || 0) && s.status !== "failed") continue;
      await db.from("tareas_asignadas").update({ wa_estado: s.status, wa_error: motivo, wa_estado_at: new Date().toISOString() }).eq("id", t.id);
      if (s.status === "failed" && t.asignado_por_email) {
        // Reportar a quien la encargó: no le llegó el WhatsApp y por qué
        try {
          const { avisarEnApp } = await import("@/lib/actividades-server");
          await avisarEnApp(t.asignado_por_email, { title: "⚠️ No le llegó el WhatsApp", body: `${t.asignado_nombre || "La persona"} no recibió el aviso de "${t.titulo}": ${motivo}. La actividad sí quedó en Doménica; avísale por otro medio.`, url: `/dashboard/actividades?abrir=${t.id}`, tag: `wa-falla-${t.id}` });
        } catch { /* best effort */ }
      }
    }
    n++;
  }
  return n;
}
