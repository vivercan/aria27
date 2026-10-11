/** Doménica 27 · notas de voz: qué se entendió (lógica pura, tests/voz.test.ts) · 11-Oct-2026 */
export type VozActividad = { titulo: string; descripcion?: string | null; persona?: string | null; obra?: string | null; fecha?: string | null; prioridad?: string | null; pasos?: string[] };
export type VozResultado = { texto: string; tipo: "actividad" | "material"; actividad?: VozActividad; material?: { obra: string | null; fecha_requerida: string | null; prioridad: string; comentarios: string; materiales: { name: string; qty: number; unit: string; observations?: string | null }[] } };

const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
/** Busca el mejor parecido por nombre (todas las palabras de lo dicho están en el nombre, o al revés) */
export function parecido<T extends { nombre: string }>(dicho: string | null | undefined, lista: T[]): T | null {
  if (!dicho) return null; const d = n(dicho); if (!d) return null;
  const palabras = d.split(/\s+/).filter(w => w.length > 2);
  let mejor: T | null = null; let puntos = 0;
  for (const x of lista) {
    const k = n(x.nombre); if (k === d) return x;
    const p = palabras.filter(w => k.includes(w)).length + (k.includes(d) || d.includes(k) ? 2 : 0);
    if (p > puntos) { puntos = p; mejor = x; }
  }
  return puntos > 0 ? mejor : null;
}
/** ¿Suena a pedir material? (para decidir sin gastar IA en casos obvios) */
export function suenaAMaterial(texto: string): boolean {
  const t = n(texto);
  return /\b(pide|pedir|pidan|necesito|necesitamos|faltan?|manden|mandar|comprar|compren|requisicion|requi)\b/.test(t) && /\b(saco|sacos|bulto|bultos|varilla|cemento|block|tabique|arena|grava|pintura|cubeta|tubo|cable|metros?|m2|m3|piezas?|pzas?|litros?|tramos?|clavos?|alambre|yeso|mortero|concreto|material)\b/.test(t);
}
