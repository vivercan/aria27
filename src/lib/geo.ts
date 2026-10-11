/** Doménica 27 · ¿En qué obra estoy? (geocerca simple, lógica pura con tests) · 11-Oct-2026 */
export type ObraGeo = { id: string; nombre: string; latitud: number | null; longitud: number | null; radio_metros: number | null };
export function distanciaM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Obra más cercana dentro de su radio (mínimo 150 m, máximo 800 m para tolerar GPS impreciso) */
export function obraAqui(pos: { lat: number; lng: number; precision?: number }, obras: ObraGeo[]): { obra: ObraGeo; metros: number } | null {
  let mejor: { obra: ObraGeo; metros: number } | null = null;
  for (const o of obras) {
    if (o.latitud == null || o.longitud == null) continue;
    const d = distanciaM(pos, { lat: Number(o.latitud), lng: Number(o.longitud) });
    const radio = Math.min(800, Math.max(150, Number(o.radio_metros) || 250)) + Math.min(200, pos.precision || 0);
    if (d <= radio && (!mejor || d < mejor.metros)) mejor = { obra: o, metros: Math.round(d) };
  }
  return mejor;
}
