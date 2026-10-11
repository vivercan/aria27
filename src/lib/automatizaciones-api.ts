/** Validacion compartida de automatizaciones (no puede vivir en route.ts: Next solo permite exportar handlers) */
import { DISPARADORES, type Disparador } from "@/lib/automatizaciones";

export const EDITORES = ["admin", "Administrador", "rh", "direccion", "validador", "compras"];

export function limpiarRegla(b: Record<string, unknown>) {
  const disparador = String(b.disparador || "") as Disparador;
  if (!DISPARADORES[disparador]) return { error: "Elige qué debe pasar" };
  const nombre = String(b.nombre || "").trim().slice(0, 120);
  if (!nombre) return { error: "Ponle nombre a la automatización" };
  const p = (b.params || {}) as Record<string, unknown>;
  const params: Record<string, unknown> = {};
  for (const k of ["dias", "monto", "antiguedad_max"]) if (p[k] !== undefined && p[k] !== "") { const v = Number(p[k]); if (!isFinite(v) || v < 0 || v > 100000000) return { error: "Revisa los números" }; params[k] = v; }
  if (p.estado) params.estado = String(p.estado).slice(0, 40);
  if (p.obra) params.obra = String(p.obra).slice(0, 120);
  const d = (b.destinatarios || {}) as Record<string, unknown>;
  const destinatarios = { roles: Array.isArray(d.roles) ? (d.roles as unknown[]).map(String).slice(0, 10) : [], personas: Array.isArray(d.personas) ? (d.personas as unknown[]).map(x => String(x).toLowerCase().trim()).filter(x => x.includes("@")).slice(0, 20) : [], involucrado: !!d.involucrado };
  const accion = b.accion === "CREAR_ACTIVIDAD" ? "CREAR_ACTIVIDAD" : "AVISAR";
  const ap = (b.accion_params || {}) as Record<string, unknown>;
  if (accion === "AVISAR" && !destinatarios.roles.length && !destinatarios.personas.length && !destinatarios.involucrado) return { error: "Elige a quién avisar" };
  if (accion === "CREAR_ACTIVIDAD" && !ap.empleado_id) return { error: "Elige a quién se le asigna la actividad" };
  const repetir = Math.max(1, Math.min(24 * 60, Number(b.repetir_cada_horas) || 24));
  return { row: { nombre, descripcion: b.descripcion ? String(b.descripcion).slice(0, 500) : null, disparador, params, destinatarios, accion, accion_params: { empleado_id: ap.empleado_id ? String(ap.empleado_id) : undefined, titulo: ap.titulo ? String(ap.titulo).slice(0, 100) : undefined }, mensaje: b.mensaje ? String(b.mensaje).slice(0, 600) : null, repetir_cada_horas: repetir } };
}

