/** ¿Quién está usando Doménica? (14-Oct-2026 · JJ) — reglas puras para el tablero (tests/uso.test.ts) */
export type FilaUso = {
  email: string | null; nombre: string; rol: string; telefono: string | null;
  ultimoIngreso: string | null; diasSinEntrar: number | null;
  actividadesAbiertas: number; actividadesAtrasadas: number; leTocanSolicitudes: number; solicitudesViejas: number; porRevisar: number;
  ultimoWhatsApp: { estado: string | null; at: string | null } | null; soloWhatsApp: boolean;
};
export type Nivel = "activo" | "poco" | "no-entra" | "nunca";
export function nivelUso(dias: number | null, soloWhatsApp = false): Nivel {
  if (soloWhatsApp) return "activo";
  if (dias === null) return "nunca";
  if (dias <= 2) return "activo";
  if (dias <= 7) return "poco";
  return "no-entra";
}
export const atoradas = (f: Pick<FilaUso, "actividadesAtrasadas" | "leTocanSolicitudes" | "solicitudesViejas" | "porRevisar">) =>
  f.actividadesAtrasadas + f.leTocanSolicitudes + f.solicitudesViejas + f.porRevisar;
/** Orden: primero quien más frena (atoradas) y no entra; al final quien está al día */
export function ordenarUso(filas: FilaUso[]): FilaUso[] {
  const peso = (f: FilaUso) => { const n = nivelUso(f.diasSinEntrar, f.soloWhatsApp); return (n === "nunca" ? 3 : n === "no-entra" ? 2 : n === "poco" ? 1 : 0) * 1000 + atoradas(f); };
  return [...filas].sort((a, b) => peso(b) - peso(a) || a.nombre.localeCompare(b.nombre));
}
export function diasDesde(iso: string | null | undefined, hoy = new Date()): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((hoy.getTime() - new Date(iso).getTime()) / 864e5));
}
