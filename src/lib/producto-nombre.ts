/** Nombre válido para un producto nuevo del catálogo (20-Oct-2026 · REQ-00863 traía productos llamados "4", "1", "2":
 *  el residente escribió la cantidad donde va el nombre). Devuelve el motivo si no sirve; null si está bien. */
export function motivoNombreInvalido(nombre: string): string | null {
  const n = String(nombre || "").trim();
  if (!n) return "Escribe el nombre del producto";
  if (/^[\d\s.,/x×-]+$/i.test(n)) return "Eso es una cantidad. La cantidad se pone en Tu lista con + y −, no aquí";
  if ((n.match(/[a-záéíóúñ]/gi) || []).length < 3) return "Escribe el nombre completo, por ejemplo: Cepillos para pintar";
  return null;
}
/** "4 cepillos para pintar" → cantidad 4 + nombre "cepillos para pintar" (si viene junto) */
export function separarCantidad(texto: string): { qty: number; nombre: string } {
  const m = String(texto || "").trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:pzas?|piezas?|unidades?|x)?\s+(.+)$/i);
  if (m) return { qty: Number(m[1].replace(",", ".")), nombre: m[2].trim() };
  return { qty: 1, nombre: String(texto || "").trim() };
}
