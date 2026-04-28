// Lista central de emails admin del sistema.
// Cualquier nuevo admin se agrega AQUI (no buscar y reemplazar 9 archivos).
//
// Prioridad:
// 1. process.env.ADMIN_EMAIL (singular, principal)
// 2. process.env.ADMIN_EMAILS (lista coma-separada para multi-admin)
// 3. Fallback hardcoded juanviverosv@gmail.com (compat)

const PRIMARY = process.env.ADMIN_EMAIL || "juanviverosv@gmail.com";
const EXTRA = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);

// Lista canonica - ordenada, sin duplicados, todo lowercase.
export const ADMIN_EMAILS: string[] = Array.from(new Set([PRIMARY, ...EXTRA].map(s => s.toLowerCase())));

export const PRIMARY_ADMIN_EMAIL = PRIMARY;

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// Para BCC universal (Deya RH + admin)
export const ADMIN_BCC_EMAIL = process.env.ADMIN_BCC_EMAIL || "recursos.humanos@gcuavante.com";
