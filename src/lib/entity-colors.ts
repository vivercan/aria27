/**
 * entity-colors — paleta determinista de badges sólidos para identificar
 * obras, categorías, proveedores, estatus por nombre. JJ pidió que listas
 * no se vean planas (20-Abr-2026 PM).
 *
 * Uso:
 *   import { getEntityColor } from "@/lib/entity-colors";
 *   <span className={getEntityColor(obra.nombre)}>{obra.nombre}</span>
 *
 * El color se deriva del nombre (hash simple) para que la misma obra
 * siempre tenga el mismo color. Categorías especiales (PRESTAMOS, OFICINA,
 * NOMINA, etc.) tienen colores semánticos hardcoded.
 */

// Paleta de 8 colores sólidos pastel sobre fondo dark, cada uno con bg + text + border
const PALETTE: string[] = [
  "bg-[#1E3E7A]/60 text-[#A5C8FF] border border-[#1E3E7A]",      // azul navy (default / MIRAVALLE)
  "bg-[#1A4E5A]/60 text-[#7EDDE8] border border-[#1A4E5A]",      // teal
  "bg-[#3E2A6B]/60 text-[#C4A8F0] border border-[#3E2A6B]",      // morado
  "bg-[#6B4E1A]/60 text-[#F0D88F] border border-[#6B4E1A]",      // ámbar
  "bg-[#1A5A3E]/60 text-[#7FE0B0] border border-[#1A5A3E]",      // verde bosque
  "bg-[#6B2A4E]/60 text-[#F0A8C4] border border-[#6B2A4E]",      // rosado
  "bg-[#2A3E6B]/60 text-[#A8B8F0] border border-[#2A3E6B]",      // indigo
  "bg-[#5A3E1A]/60 text-[#E8B87F] border border-[#5A3E1A]",      // café
];

// Colores semánticos por tipo de transacción / categoría especial
const SEMANTIC: Record<string, string> = {
  "prestamos": "bg-[#6B1A2A]/60 text-[#F0A8B0] border border-[#6B1A2A]",    // rojo oscuro (salida)
  "prestamo": "bg-[#6B1A2A]/60 text-[#F0A8B0] border border-[#6B1A2A]",
  "oficina":  "bg-[#3A3A3A]/60 text-[#BFBFBF] border border-[#3A3A3A]",    // gris (neutro/indirecto)
  "nomina":   "bg-[#1A5A3E]/60 text-[#7FE0B0] border border-[#1A5A3E]",    // verde (pago a gente)
  "nómina":   "bg-[#1A5A3E]/60 text-[#7FE0B0] border border-[#1A5A3E]",
  "sin asignar": "bg-[#2A2A2A]/60 text-[#8F8F8F] border border-[#2A2A2A]", // gris oscuro
  "—":        "bg-[#2A2A2A]/60 text-[#8F8F8F] border border-[#2A2A2A]",
  "":         "bg-[#2A2A2A]/60 text-[#8F8F8F] border border-[#2A2A2A]",
};

/** Hash determinista simple de un string a un índice de la paleta */
function hashIndex(str: string, max: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & h; // fuerza int32
  }
  return Math.abs(h) % max;
}

/**
 * Devuelve las clases Tailwind para un badge de entidad (obra, categoría, etc.).
 * Si el nombre coincide con un tipo semántico conocido, usa ese color.
 * Si no, deriva el color del hash del nombre (consistente por nombre).
 */
export function getEntityColor(name: string | null | undefined): string {
  if (!name) return SEMANTIC[""];
  const key = name.toLowerCase().trim();
  if (SEMANTIC[key]) return SEMANTIC[key];
  return PALETTE[hashIndex(key, PALETTE.length)];
}

/** Versión solo para el background/border (sin text-color) — útil para hover */
export function getEntityBgBorder(name: string | null | undefined): string {
  const full = getEntityColor(name);
  return full.split(" ").filter(c => c.startsWith("bg-") || c.startsWith("border")).join(" ");
}
