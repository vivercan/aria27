/**
 * ARIA Doménica · Dependencias (11-Oct-2026): recorrer las que siguen cuando una se atrasa, y ruta crítica.
 * Lógica pura (tests/dependencias.test.ts).
 */
export type ActDep = { id: string; titulo?: string; depende_de?: string | null; fecha_inicio?: string | null; fecha_compromiso?: string | null; estatus?: string | null; obra?: string | null; obra_id?: string | null };
export type Recorrido = { id: string; fecha_inicio: string; fecha_compromiso: string; dias: number };

const DIA = 86400000;
const t = (f: string) => Date.parse(f.slice(0, 10) + "T12:00:00Z");
const f = (n: number) => new Date(n).toISOString().slice(0, 10);
const sumar = (fecha: string, d: number) => f(t(fecha) + d * DIA);
const terminada = (a: ActDep) => ["COMPLETADA", "CANCELADA"].includes(String(a.estatus || "").toUpperCase());

/**
 * La actividad `id` ahora termina en `nuevoFin`. Las que dependen de ella (y las que siguen en cadena) se recorren
 * para empezar al día siguiente, conservando su duración. Nunca se adelantan, y las terminadas no se tocan.
 */
export function recorrerSiguientes(acts: ActDep[], id: string, nuevoFin: string): Recorrido[] {
  const porPadre = new Map<string, ActDep[]>();
  for (const a of acts) if (a.depende_de) porPadre.set(a.depende_de, [...(porPadre.get(a.depende_de) || []), a]);
  const cambios = new Map<string, Recorrido>();
  const cola: { id: string; fin: string }[] = [{ id, fin: nuevoFin }];
  const vistos = new Set<string>([id]);
  while (cola.length) {
    const { id: padre, fin } = cola.shift()!;
    for (const h of porPadre.get(padre) || []) {
      if (vistos.has(h.id) || terminada(h)) continue;
      vistos.add(h.id);
      const ini = h.fecha_inicio || h.fecha_compromiso; const entrega = h.fecha_compromiso || h.fecha_inicio;
      if (!ini || !entrega) continue;
      const debeEmpezar = sumar(fin, 1);
      if (ini >= debeEmpezar) continue; // ya empieza después: no se mueve (ni ella ni las suyas)
      const dias = Math.round((t(debeEmpezar) - t(ini)) / DIA);
      const r = { id: h.id, fecha_inicio: debeEmpezar, fecha_compromiso: sumar(entrega, dias), dias };
      cambios.set(h.id, r);
      cola.push({ id: h.id, fin: r.fecha_compromiso });
    }
  }
  return [...cambios.values()];
}

/** ¿Se puede empezar? (la que espera ya está terminada o no espera a ninguna) */
export function bloqueadaPor(a: ActDep, acts: ActDep[]): ActDep | null {
  if (!a.depende_de) return null;
  const p = acts.find(x => x.id === a.depende_de);
  return p && !terminada(p) ? p : null;
}

/**
 * Ruta crítica por obra: la cadena de "espera a" que termina en la entrega más tardía de la obra.
 * Si esa cadena se atrasa un día, se atrasa la obra. Devuelve los ids que la forman.
 */
export function rutaCritica(acts: ActDep[]): Set<string> {
  const porId = new Map(acts.map(a => [a.id, a]));
  const fin = (a: ActDep) => (a.fecha_compromiso || a.fecha_inicio || "");
  const grupos = new Map<string, ActDep[]>();
  for (const a of acts) { const k = a.obra_id || a.obra || "—"; grupos.set(k, [...(grupos.get(k) || []), a]); }
  const out = new Set<string>();
  for (const lista of grupos.values()) {
    const conDeps = lista.filter(a => a.depende_de || lista.some(b => b.depende_de === a.id));
    if (!conDeps.length) continue;
    const ultima = [...conDeps].sort((x, y) => fin(y).localeCompare(fin(x)))[0];
    let cur: ActDep | undefined = ultima; const vistos = new Set<string>();
    while (cur && !vistos.has(cur.id)) { vistos.add(cur.id); out.add(cur.id); cur = cur.depende_de ? porId.get(cur.depende_de) : undefined; }
  }
  return out;
}
