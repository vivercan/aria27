/** ARIA Doménica · ejecutor de automatizaciones (servidor) · 10-Oct-2026 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { avisarWA, personaPorEmail, personaPorEmpleado } from "@/lib/actividades-server";
import { componerMensaje, evaluar, type Caso, type Regla } from "@/lib/automatizaciones";

export type Envio = { email: string; nombre: string; casos: number; mensaje: string; enviado: boolean };
export type Resultado = { encontrados: number; nuevos: number; envios: Envio[]; actividadesCreadas: number; prueba: boolean; resumen: string };

const TOPE_CASOS = 25;

export async function correrRegla(db: SupabaseClient, r: Regla, opts: { dry?: boolean; ahora?: Date } = {}): Promise<Resultado> {
  const ahora = opts.ahora || new Date();
  const casos = await evaluar(db, r, ahora);
  // No repetir el mismo caso antes de N horas
  let nuevos: Caso[] = casos;
  if (casos.length) {
    const desde = new Date(ahora.getTime() - Math.max(1, r.repetir_cada_horas || 24) * 3600000).toISOString();
    const { data: recientes } = await db.from("automatizacion_log").select("objeto_id").eq("automatizacion_id", r.id).gte("created_at", desde).in("objeto_id", casos.map(c => c.id).slice(0, 500));
    const ya = new Set(((recientes || []) as { objeto_id: string }[]).map(x => x.objeto_id));
    nuevos = casos.filter(c => !ya.has(c.id)).slice(0, TOPE_CASOS);
  }
  const res: Resultado = { encontrados: casos.length, nuevos: nuevos.length, envios: [], actividadesCreadas: 0, prueba: !!r.modo_prueba, resumen: "" };
  if (!nuevos.length) { res.resumen = casos.length ? `${casos.length} caso(s), todos ya avisados` : "Sin casos"; return res; }

  // Destinatarios
  const porEmail = new Map<string, Caso[]>();
  const add = (email: string | null | undefined, cs: Caso[]) => { const e = String(email || "").toLowerCase().trim(); if (!e || !e.includes("@")) return; porEmail.set(e, [...(porEmail.get(e) || []), ...cs.filter(c => !(porEmail.get(e) || []).some(x => x.id === c.id))]); };
  const roles = (r.destinatarios?.roles || []).filter(Boolean);
  if (roles.length) {
    const { data: us } = await db.from("Users").select("email, role, active").in("role", roles).is("usuario_prueba", null);
    for (const u of (us || []) as { email: string; active: boolean | null }[]) if (u.active !== false) add(u.email, nuevos);
  }
  for (const e of r.destinatarios?.personas || []) add(e, nuevos);
  if (r.destinatarios?.involucrado) for (const c of nuevos) add(c.involucrado, [c]);

  const prueba = !!r.modo_prueba;
  const destinos: [string, Caso[]][] = prueba ? (r.creada_por ? [[r.creada_por.toLowerCase(), nuevos]] : []) : [...porEmail.entries()];

  if (r.accion === "AVISAR") {
    for (const [email, cs] of destinos) {
      const persona = await personaPorEmail(db, email);
      const mensaje = (prueba ? `[PRUEBA: en real le llegaría a ${[...porEmail.keys()].length} persona(s)] ` : "") + `${r.nombre}. ` + componerMensaje(r, cs);
      const url = cs.length === 1 ? cs[0].url : cs[0].tipo === "requi" ? "/dashboard/requisiciones/requisiciones/estatus" : "/dashboard/actividades?vista=mi";
      let enviado = false;
      if (!opts.dry) enviado = await avisarWA(persona, mensaje, "automatizacion", "automatizacion", { title: `⚡ ${r.nombre}`.slice(0, 70), url, tag: `auto-${r.id}` });
      res.envios.push({ email, nombre: persona?.nombre || email, casos: cs.length, mensaje, enviado });
    }
  } else if (r.accion === "CREAR_ACTIVIDAD" && r.accion_params?.empleado_id) {
    const asignado = await personaPorEmpleado(db, r.accion_params.empleado_id);
    for (const c of nuevos) {
      const titulo = `${(r.accion_params.titulo || r.nombre).slice(0, 80)}: ${c.etiqueta}`.slice(0, 200);
      if (!opts.dry && !prueba && asignado) {
        const venc = new Date(ahora.getTime() + 86400000); const f = `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, "0")}-${String(venc.getDate()).padStart(2, "0")}`;
        const { error } = await db.from("tareas_asignadas").insert({ titulo, descripcion: `Creada por la automatización "${r.nombre}". ${c.obra ? `Obra: ${c.obra}. ` : ""}Ver: ${c.url}`, asignado_id: r.accion_params.empleado_id, asignado_nombre: asignado.nombre, asignado_email: asignado.email, asignado_por: "automatizacion", asignado_por_email: r.creada_por || null, obra: c.obra || null, fecha_compromiso: f, prioridad: "ALTA", estatus: "PENDIENTE", avance: 0 });
        if (!error) res.actividadesCreadas++;
      }
      res.envios.push({ email: asignado?.email || "", nombre: asignado?.nombre || "", casos: 1, mensaje: titulo, enviado: !opts.dry && !prueba });
    }
  }

  if (!opts.dry) {
    await db.from("automatizacion_log").insert(nuevos.map(c => ({ automatizacion_id: r.id, objeto_tipo: c.tipo, objeto_id: c.id, destinatarios: destinos.map(d => d[0]).join(", ").slice(0, 500), enviado: res.envios.some(e => e.enviado), prueba, detalle: c.etiqueta })));
  }
  res.resumen = `${nuevos.length} caso(s) nuevo(s) · ${res.envios.filter(e => e.enviado).length} aviso(s) enviado(s)${prueba ? " (modo prueba)" : ""}${res.actividadesCreadas ? ` · ${res.actividadesCreadas} actividad(es) creada(s)` : ""}`;
  return res;
}
