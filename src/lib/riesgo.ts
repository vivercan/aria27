/**
 * Doménica 27 · alerta temprana: actividades que probablemente se van a atrasar (antes de que se atrasen) · 11-Oct-2026
 * Reglas simples y explicables (no caja negra): avance contra tiempo transcurrido y días que faltan.
 */
import { columnaDe, diasAtraso, type Actividad } from "@/lib/actividades";

const DIA = 864e5;
const t = (f: string) => Date.parse(f.slice(0, 10) + "T12:00:00Z");

export type Riesgo = { motivo: string; esperado: number; lleva: number } | null;

export function enRiesgo(a: Actividad, hoyISO: string): Riesgo {
  if (columnaDe(a) === "TERMINADA" || !a.fecha_compromiso || diasAtraso(a) > 0) return null;
  const lleva = Number(a.avance) || 0;
  const fin = t(a.fecha_compromiso); const hoy = t(hoyISO);
  const faltan = Math.round((fin - hoy) / DIA);
  if (faltan < 0) return null;
  // 1) Vence pronto y va muy abajo
  if (faltan <= 2 && lleva < 50) return { motivo: faltan === 0 ? `Vence hoy y lleva ${lleva}%` : `Vence en ${faltan} día${faltan === 1 ? "" : "s"} y lleva ${lleva}%`, esperado: 100, lleva };
  // 2) Va lento contra el tiempo que ya pasó
  if (a.fecha_inicio) {
    const ini = t(a.fecha_inicio); const total = fin - ini;
    if (total > 0 && hoy > ini) {
      const esperado = Math.round(Math.min(1, (hoy - ini) / total) * 100);
      if (esperado >= 40 && lleva + 30 <= esperado) return { motivo: `Va lento: lleva ${lleva}% y debería llevar ~${esperado}%`, esperado, lleva };
    }
  }
  // 3) Atorada y con poco margen
  if (columnaDe(a) === "BLOQUEADA" && faltan <= 5) return { motivo: `Atorada y vence en ${faltan} días`, esperado: 100, lleva };
  return null;
}
