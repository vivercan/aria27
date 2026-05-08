const LOWER_WORDS = new Set([
  "de", "del", "la", "las", "los", "el", "y", "e", "en", "a", "al",
  "con", "por", "para", "sin", "o", "u", "que",
]);
const UPPER_TOKENS = new Set([
  "SA", "CV", "RFC", "IMSS", "INFONAVIT", "SAR", "SAT", "ISR", "IVA",
  "BBVA", "HSBC", "CFE", "DIF", "PEMEX", "SEP",
]);

export function formatProperName(input: string | null | undefined): string {
  if (!input) return "";
  const cleaned = String(input).trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned.split(" ").map((word, idx) => {
    const upper = word.toUpperCase();
    if (UPPER_TOKENS.has(upper)) return upper;
    if (/\d/.test(word) && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(word)) return word;
    const lower = word.toLowerCase();
    if (idx > 0 && LOWER_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}
