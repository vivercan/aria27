/**
 * formas-pago.ts — 25-Nov-2026
 *
 * Catalogo UNICO de formas de pago de ARIA27 / Domenica 27.
 * Antes cada pantalla tenia su propia lista pegada a mano (Efectivo /
 * Transferencia / Cheque) y por eso no coincidian entre si.
 *
 * Pedido de Valeria Pena (Administracion, 24-Nov-2026):
 *   "me podria agregar el formas de pago la opcion de tarjeta de credito"
 *
 * Si manana hay que agregar otra forma de pago, se agrega AQUI y aparece
 * sola en todas las pantallas.
 */

export type FormaPago = {
  /** Lo que se guarda en la base. No cambiar: hay datos historicos. */
  valor: string;
  /** Como se le muestra a la gente. */
  etiqueta: string;
  /** Version corta para tablas apretadas. */
  corta: string;
  /** Emoji para los filtros que ya lo usaban. */
  emoji: string;
  /** Color del badge. */
  color: string;
};

export const FORMAS_PAGO: FormaPago[] = [
  { valor: "EFECTIVO",        etiqueta: "Efectivo",            corta: "Efectivo", emoji: "💵", color: "#b85507" },
  { valor: "TRANSFERENCIA",   etiqueta: "Transferencia",       corta: "Transf.",  emoji: "🏦", color: "#0060c7" },
  { valor: "TARJETA_CREDITO", etiqueta: "Tarjeta de crédito",  corta: "T. créd.", emoji: "💳", color: "#0a7f8c" },
  { valor: "TARJETA_DEBITO",  etiqueta: "Tarjeta de débito",   corta: "T. déb.",  emoji: "💳", color: "#1a6b4f" },
  { valor: "CHEQUE",          etiqueta: "Cheque",              corta: "Cheque",   emoji: "📄", color: "#007f48" },
  { valor: "CREDITO",         etiqueta: "Crédito del proveedor", corta: "Crédito", emoji: "🧾", color: "#7e3bdd" },
];

/** Las que se le ofrecen a quien captura un gasto o un pago ya hecho. */
export const FORMAS_PAGO_CAJA = FORMAS_PAGO.filter(f => f.valor !== "CREDITO");

const POR_VALOR = new Map(FORMAS_PAGO.map(f => [f.valor, f]));

/**
 * Resuelve cualquier texto historico a una forma del catalogo.
 * En la base hay cosas como "CONTADO/TARJETA", "CONTADO/TARJETA/CRÉDITO",
 * "Efectivo" y "TRANSFERENCIA " (con espacio). Esto las acomoda sin
 * tener que tocar los datos viejos.
 */
export function resolverFormaPago(texto?: string | null): FormaPago | null {
  const t = String(texto || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!t) return null;
  const exacta = POR_VALOR.get(t);
  if (exacta) return exacta;
  const sinAcentos = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Hay valores compuestos ("CONTADO/TARJETA/CREDITO", "EFECTIVO/TRANSFERENCIA"):
  // son varias formas que el proveedor acepta. Gana la que se menciona primero.
  // "Tarjeta de debito": la palabra TARJETA aparece primero, pero manda DEBITO.
  const tarjeta = sinAcentos.includes("DEBITO") ? "TARJETA_DEBITO" : "TARJETA_CREDITO";
  const pistas: Array<[string, string]> = [
    ["DEBITO", "TARJETA_DEBITO"],
    ["TARJETA", tarjeta],
    ["TRANSFER", "TRANSFERENCIA"],
    ["CHEQUE", "CHEQUE"],
    ["CREDITO", "CREDITO"],
    ["EFECTIVO", "EFECTIVO"],
    ["CONTADO", "EFECTIVO"], // "contado" en la operacion siempre fue efectivo
  ];
  let mejor: { pos: number; valor: string } | null = null;
  for (const [pista, valor] of pistas) {
    const pos = sinAcentos.indexOf(pista);
    if (pos === -1) continue;
    // A igual posicion gana la pista mas especifica (DEBITO antes que TARJETA).
    if (!mejor || pos < mejor.pos) mejor = { pos, valor };
  }
  return mejor ? POR_VALOR.get(mejor.valor) || null : null;
}

/** Etiqueta amable; si no se reconoce, devuelve el texto tal cual. */
export function etiquetaFormaPago(texto?: string | null): string {
  return resolverFormaPago(texto)?.etiqueta || String(texto || "").trim() || "—";
}

/** Etiqueta corta para tablas. */
export function etiquetaCortaFormaPago(texto?: string | null): string {
  return resolverFormaPago(texto)?.corta || String(texto || "").trim() || "—";
}

/** Color del badge; gris si no se reconoce. */
export function colorFormaPago(texto?: string | null): string {
  return resolverFormaPago(texto)?.color || "#475569";
}

/** ¿Hace falta CLABE / datos bancarios para pagar asi? */
export function requiereDatosBancarios(texto?: string | null): boolean {
  const f = resolverFormaPago(texto);
  return f?.valor === "TRANSFERENCIA" || f?.valor === "CHEQUE";
}
