/** Doménica 27 · Bitácora diaria automática: junta lo que pasó en una obra en un día (servidor) · 11-Oct-2026 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normObra } from "@/lib/obras-dom";

export type BitacoraDia = {
  obra: { id: string; nombre: string; cliente: string | null; responsable_email: string | null };
  fecha: string;
  registro: { clima: string | null; personal_en_obra: number | null; maquinaria: string | null; incidentes: string | null; observaciones: string | null; actividades: string | null; residente_nombre: string | null } | null;
  terminadas: { id: string; titulo: string; quien: string | null }[];
  avances: { tarea_id: string; titulo: string; texto: string | null; foto_url: string | null; autor: string | null; hora: string }[];
  fotos: { url: string; de: string; hora: string }[];
  entregas: { proveedor: string | null; recibio: string | null; foto_url: string | null }[];
  solicitudes: { folio: string; status: string | null; total: number | null }[];
};

/** Rango del día en México (UTC-6) para columnas timestamptz */
export function rangoDia(fecha: string) { const ini = new Date(fecha + "T06:00:00Z"); const fin = new Date(ini.getTime() + 864e5); return { ini: ini.toISOString(), fin: fin.toISOString() }; }

export async function armarBitacora(db: SupabaseClient, obraId: string, fecha: string): Promise<BitacoraDia | null> {
  const { data: o } = await db.from("centros_trabajo").select("id, nombre, cliente, responsable_email").eq("id", obraId).maybeSingle();
  if (!o) return null;
  const obra = o as BitacoraDia["obra"]; const n = normObra(obra.nombre); const { ini, fin } = rangoDia(fecha);
  const { data: acts } = await db.from("tareas_asignadas").select("id, titulo, obra, obra_id, estatus, completada_at, asignado_nombre").or(`obra_id.eq.${obraId},obra.ilike.${obra.nombre.replace(/[,()]/g, " ")}`).limit(2000);
  const mias = ((acts || []) as { id: string; titulo: string; obra: string | null; obra_id: string | null; estatus: string; completada_at: string | null; asignado_nombre: string | null }[]).filter(a => a.obra_id === obraId || normObra(a.obra) === n);
  const ids = mias.map(a => a.id); const porId = new Map(mias.map(a => [a.id, a]));
  const [{ data: ups }, { data: bit }, { data: ents }, { data: reqs }, { data: fa }] = await Promise.all([
    ids.length ? db.from("tarea_actualizaciones").select("tarea_id, tipo, texto, foto_url, autor_nombre, created_at").in("tarea_id", ids).gte("created_at", ini).lt("created_at", fin).order("created_at") : Promise.resolve({ data: [] }),
    db.from("bitacora_obra").select("clima, personal_en_obra, maquinaria, incidentes, observaciones, actividades, residente_nombre, fotos, obra_id, obra_nombre, created_at").eq("fecha", fecha).limit(50),
    db.from("entregas").select("proveedor_nombre, recibido_por_nombre, foto_url, obra_nombre, fecha_entrega").eq("fecha_entrega", fecha).limit(100),
    db.from("requisitions").select("folio, status, total, cost_center_name, created_at").gte("created_at", ini.replace("Z", "")).lt("created_at", fin.replace("Z", "")).limit(200),
    db.from("fotos_avance").select("url, descripcion, obra_id, obra_nombre, created_at").eq("fecha", fecha).limit(100),
  ]);
  const regs = ((bit || []) as (NonNullable<BitacoraDia["registro"]> & { fotos: string[] | null; obra_id: string | null; obra_nombre: string | null; created_at: string })[]).filter(b => b.obra_id === obraId || normObra(b.obra_nombre) === n);
  const registro = regs.length ? regs[regs.length - 1] : null;
  const hora = (t: string) => new Date(t).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
  const avances = ((ups || []) as { tarea_id: string; tipo: string; texto: string | null; foto_url: string | null; autor_nombre: string | null; created_at: string }[])
    .filter(u => u.tipo !== "sistema").map(u => ({ tarea_id: u.tarea_id, titulo: porId.get(u.tarea_id)?.titulo || "", texto: u.texto, foto_url: u.foto_url, autor: u.autor_nombre, hora: hora(u.created_at) }));
  const fotos: BitacoraDia["fotos"] = [
    ...avances.filter(a => a.foto_url).map(a => ({ url: a.foto_url as string, de: a.titulo, hora: a.hora })),
    ...((ents || []) as { foto_url: string | null; obra_nombre: string | null; proveedor_nombre: string | null }[]).filter(e => e.foto_url && normObra(e.obra_nombre) === n).map(e => ({ url: e.foto_url as string, de: `Entrega ${e.proveedor_nombre || ""}`.trim(), hora: "" })),
    ...((fa || []) as { url: string; descripcion: string | null; obra_id: string | null; obra_nombre: string | null; created_at: string }[]).filter(f => f.obra_id === obraId || normObra(f.obra_nombre) === n).map(f => ({ url: f.url, de: f.descripcion || "Foto de avance", hora: hora(f.created_at) })),
    ...regs.flatMap(r => (r.fotos || []).map(u => ({ url: u, de: "Bitácora", hora: hora(r.created_at) }))),
  ];
  return {
    obra, fecha,
    registro: registro ? { clima: registro.clima, personal_en_obra: registro.personal_en_obra, maquinaria: registro.maquinaria, incidentes: registro.incidentes, observaciones: registro.observaciones, actividades: registro.actividades, residente_nombre: registro.residente_nombre } : null,
    terminadas: mias.filter(a => a.completada_at && Date.parse(a.completada_at) >= Date.parse(ini) && Date.parse(a.completada_at) < Date.parse(fin)).map(a => ({ id: a.id, titulo: a.titulo, quien: a.asignado_nombre })),
    avances: avances.filter(a => !a.foto_url || a.texto),
    fotos,
    entregas: ((ents || []) as { proveedor_nombre: string | null; recibido_por_nombre: string | null; foto_url: string | null; obra_nombre: string | null }[]).filter(e => normObra(e.obra_nombre) === n).map(e => ({ proveedor: e.proveedor_nombre, recibio: e.recibido_por_nombre, foto_url: e.foto_url })),
    solicitudes: ((reqs || []) as { folio: string; status: string | null; total: number | null; cost_center_name: string | null }[]).filter(r => normObra(r.cost_center_name) === n).map(r => ({ folio: r.folio, status: r.status, total: r.total })),
  };
}
export const hayAlgo = (b: BitacoraDia) => !!(b.registro || b.terminadas.length || b.avances.length || b.fotos.length || b.entregas.length || b.solicitudes.length);
