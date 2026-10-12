/**
 * Datos completos del personal desde el navegador → siempre por /api/personal (con sesión y permiso) · 12-Oct-2026
 * Devuelve la misma forma que supabase ({ data, error }) para cambiar lo mínimo en cada pantalla.
 */
export type Resp<T> = { data: T | null; error: { message: string } | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function leerPersonal<T = any>(o: { campos?: string; status?: string; ids?: string[]; orden?: string; asc?: boolean } = {}): Promise<Resp<T[]>> {
  const sp = new URLSearchParams();
  sp.set("campos", (o.campos || "*").replace(/\s+/g, ""));
  if (o.status) sp.set("status", o.status);
  if (o.ids?.length) sp.set("ids", o.ids.join(","));
  if (o.orden) { sp.set("orden", o.orden); sp.set("asc", o.asc === false ? "0" : "1"); }
  try {
    const r = await fetch(`/api/personal?${sp.toString()}`, { credentials: "include", cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { data: null, error: { message: j.error || `Error ${r.status}` } };
    return { data: (j.data || []) as T[], error: null };
  } catch (e) { return { data: null, error: { message: (e as Error)?.message || "Sin conexión" } }; }
}

export async function guardarEmpleado(id: string | null, datos: Record<string, unknown>): Promise<{ error: { message: string } | null; id?: string }> {
  try {
    const r = await fetch("/api/personal", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { accion: "actualizar", id, datos } : { accion: "insertar", datos }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: { message: j.error || `Error ${r.status}` } };
    return { error: null, id: j.id };
  } catch (e) { return { error: { message: (e as Error)?.message || "Sin conexión" } }; }
}
