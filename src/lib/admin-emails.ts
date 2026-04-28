// Lista central de emails admin del sistema.
// Cualquier nuevo admin se agrega AQUI o en env vars (ADMIN_EMAIL / ADMIN_EMAILS).

const PRIMARY = process.env.ADMIN_EMAIL || "juanviverosv@gmail.com";
const EXTRA = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);

export const ADMIN_EMAILS: string[] = Array.from(new Set([PRIMARY, ...EXTRA].map(s => s.toLowerCase())));

export const PRIMARY_ADMIN_EMAIL = PRIMARY;

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export const ADMIN_BCC_EMAIL = process.env.ADMIN_BCC_EMAIL || "recursos.humanos@gcuavante.com";
