// Title Case canon ARIA27: primera letra mayúscula por palabra, palabras de
// unión en minúscula, siglas conocidas en mayúscula.

const LOWER_WORDS = new Set([
  "de", "del", "la", "las", "los", "el", "y", "e", "en", "a", "al",
  "con", "por", "para", "sin", "o", "u", "que",
]);

const UPPER_TOKENS = new Set([
  "SA", "CV", "S.A.", "S.A", "C.V.", "C.V", "S.C.", "S.C", "RFC", "IMSS",
  "INFONAVIT", "SAR", "SAT", "ISR", "IVA", "AFIRME", "ISSSTE", "BBVA",
  "HSBC", "CFE", "DIF", "PEMEX", "STPS", "DOF", "SEP",
]);

export function formatProperName(input: string | null | undefined): string {
  if (!input) return "";
  const cleaned = String(input).trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word, idx) => {
      const upper = word.toUpperCase();
      // Siglas conocidas se mantienen en mayúscula
      if (UPPER_TOKENS.has(upper)) return upper;
      // Si tiene dígitos o caracteres especiales mixtos, conservar tal cual
      if (/\d/.test(word) && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(word)) return word;
      // Primera palabra siempre con mayúscula inicial (aunque sea preposición)
      const lower = word.toLowerCase();
      if (idx > 0 && LOWER_WORDS.has(lower)) return lower;
      // Capitalizar primera letra
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

// Para casos donde solo queremos limpiar SIN aplicar reglas (ej: usuario captura
// con sus mayúsculas exactas y quiere preservarlas)
export function cleanWhitespace(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).trim().replace(/\s+/g, " ");
}
