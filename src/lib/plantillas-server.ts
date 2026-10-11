/** ARIA Doménica · servidor de plantillas y recurrentes · 11-Oct-2026 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { avisarWA, crearActividad, personaPorEmpleado } from "@/lib/actividades-server";
import { programar, siguienteFecha, sumarDias, hoyMX, type ItemPlantilla, type Recurrente } from "@/lib/plantillas";

export const SUPER_DOM = ["admin", "Administrador", "rh", "direccion", "validador"];
export const puedeEditar = (role: string, email: string, creadaPor?: string | null) => SUPER_DOM.includes(role) || (!!creadaPor && creadaPor.toLowerCase() === email.toLowerCase());

/** Aplica una plantilla: crea todas sus actividades con fechas, dependencias y un solo aviso por persona. */
export async function aplicarPlantilla(db: SupabaseClient, p: { nombre: string; items: ItemPlantilla[] }, o: { obra_id: string | null; inicio: string; asignado_default: string; asignaciones: Record<string, string> }, porEmail: string) {
  const fechas = programar(p.items, o.inicio);
  const ids: string[] = []; const porPersona = new Map<string, string[]>(); const errores: string[] = [];
  for (let i = 0; i < p.items.length; i++) {
    const it = p.items[i];
    const asignado = o.asignaciones[String(i)] || o.asignado_default;
    const dep = it.depende !== null && it.depende !== undefined ? ids[it.depende] : null;
    const r = await crearActividad(db, { titulo: it.titulo, asignado_id: asignado, obra_id: o.obra_id, prioridad: it.prioridad, checklist: it.checklist, fecha_inicio: fechas[i].fecha_inicio, fecha_compromiso: fechas[i].fecha_compromiso, depende_de: dep || null, origen: `plantilla: ${p.nombre}` }, porEmail, "push");
    if (!r.ok) { errores.push(`${it.titulo}: ${r.error}`); ids.push(""); continue; }
    ids.push(r.id);
    const lista = porPersona.get(asignado) || []; lista.push(it.titulo); porPersona.set(asignado, lista);
  }
  // Un solo WhatsApp por persona (no 7 mensajes seguidos)
  let avisados = 0;
  for (const [empId, titulos] of porPersona) {
    const per = await personaPorEmpleado(db, empId);
    if (!per || per.email === porEmail.toLowerCase()) continue;
    const ok = await avisarWA(per, `Te asignaron ${titulos.length} actividad${titulos.length === 1 ? "" : "es"} de "${p.nombre}": ${titulos.slice(0, 4).join("; ")}${titulos.length > 4 ? "…" : ""}. La primera arranca el ${o.inicio.split("-").reverse().join("/")}. Revísalas en Doménica 27 › Actividades.`, "plantilla-aplicada", porEmail);
    if (ok) avisados++;
  }
  return { creadas: ids.filter(Boolean).length, errores, avisados };
}

/** Crea las actividades recurrentes que ya tocan (cron diario). Idempotente: nunca crea dos veces la misma fecha. */
export async function correrRecurrentes(db: SupabaseClient, hoy = hoyMX()) {
  const { data } = await db.from("actividad_recurrentes").select("*").eq("activa", true).lte("proxima", hoy).limit(200);
  let creadas = 0; const errores: string[] = [];
  for (const r of (data || []) as Recurrente[]) {
    let fecha = r.proxima; let vueltas = 0;
    // si el cron se saltó días, solo crea la de hoy (no inunda con atrasadas)
    while (sumarDias(fecha, 0) < hoy && vueltas < 400) { const sig = siguienteFecha(r.frecuencia, r.dia, sumarDias(fecha, 1)); if (sig > hoy) break; fecha = sig; vueltas++; }
    if (r.ultima_creada !== fecha) {
      const res = await crearActividad(db, { titulo: r.titulo, descripcion: r.descripcion, asignado_id: r.asignado_id, obra_id: r.obra_id, prioridad: r.prioridad, checklist: r.checklist || [], fecha_inicio: fecha, fecha_compromiso: sumarDias(fecha, Math.max(0, r.dias_para_entregar || 0)), origen: "recurrente" }, r.creada_por || "sistema@aria27", "todo");
      if (res.ok) creadas++; else errores.push(`${r.titulo}: ${res.error}`);
    }
    await db.from("actividad_recurrentes").update({ ultima_creada: fecha, proxima: siguienteFecha(r.frecuencia, r.dia, sumarDias(fecha, 1)), updated_at: new Date().toISOString() }).eq("id", r.id);
  }
  return { revisadas: (data || []).length, creadas, errores };
}
