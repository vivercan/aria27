/**
 * Funciones puras de cálculo de nómina y finiquitos.
 * Basadas en la Ley Federal del Trabajo (LFT) México.
 */

/** Días de antigüedad entre fecha de ingreso y fecha de baja */
export function calcularAntiguedad(fechaIngreso: string, fechaBaja: string): number {
  if (!fechaIngreso || !fechaBaja) return 0;
  const inicio = new Date(fechaIngreso);
  const fin = new Date(fechaBaja);
  return Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
}

/** Tabla LFT de vacaciones por antigüedad (años completos) */
export function calcularDiasVacacionesPorAntiguedad(años: number): number {
  if (años < 1) return 0;
  if (años <= 4) return 6;
  if (años <= 9) return 8;
  if (años <= 14) return 10;
  if (años <= 19) return 12;
  if (años <= 24) return 14;
  if (años <= 29) return 16;
  // Cada 5 años adicionales: +2 días
  const añosAdicionales = años - 29;
  const ciclos = Math.floor(añosAdicionales / 5);
  return 16 + ciclos * 2;
}

/** Prima de antigüedad (LFT art 162): 12 días × salario × años completos */
export function calcularPrimaAntiguedad(
  salarioDiario: number,
  años: number
): number {
  return 12 * salarioDiario * años;
}

/** Aguinaldo proporcional: (días/365) × 15 × salarioDiario */
export function calcularAguinaldoProporcional(
  salarioDiario: number,
  días: number
): number {
  const díasEnAño = 365;
  return (días / díasEnAño) * 15 * salarioDiario;
}
