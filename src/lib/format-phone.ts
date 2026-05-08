// Formato estándar México: (LADA) NNN-NNNN o (LADA) NNNN-NNNN
// Acepta cualquier input con o sin guiones, paréntesis, espacios.

export function formatPhoneMx(input: string | null | undefined): string {
  if (!input) return "";
  // Solo dígitos
  const d = String(input).replace(/\D/g, "");
  if (!d) return "";

  // Quitar prefijo país 52 / 521 si existe
  let n = d;
  if (n.length === 13 && n.startsWith("521")) n = n.slice(3);
  else if (n.length === 12 && n.startsWith("52")) n = n.slice(2);
  else if (n.length === 11 && n.startsWith("1")) n = n.slice(1);

  // 10 dígitos: LADA 3 + 7 = (XXX) XXX-XXXX
  if (n.length === 10) {
    return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  // 8 dígitos (sin LADA): XXXX-XXXX
  if (n.length === 8) {
    return `${n.slice(0, 4)}-${n.slice(4)}`;
  }
  // 7 dígitos: XXX-XXXX
  if (n.length === 7) {
    return `${n.slice(0, 3)}-${n.slice(3)}`;
  }
  // Otros: devolver tal cual
  return String(input);
}
