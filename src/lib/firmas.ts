/**
 * Firmas digitales en el PDF de requisición (16-Oct-2026 · pidió Jessica/Compras, autorizó JJ)
 * Quien hace la requisición la firma automáticamente en su espacio del PDF: firma + nombre a mano en tinta azul.
 * Las imágenes viven en la tabla firmas_usuarios (solo el servidor las lee; no están en la web pública).
 * Cajas del PDF: compras (Jessica), revision (Daisy), validacion (Deyanira). Quien no tiene caja (Valeria,
 * residentes) firma en una caja "SOLICITANTE" junto al Director. El Director no firma (no hay firma registrada).
 */
export type CajaFirma = "compras" | "revision" | "validacion" | "solicitante";
export type FirmaImg = { nombre: string; dataUrl: string };
export type FirmasRequi = Partial<Record<CajaFirma, FirmaImg>>;

export const CAJA_POR_CORREO: Record<string, CajaFirma> = {
  "compras@gcuavante.com": "compras",
  "superintendencia@gcuavante.com": "revision",
  "recursos.humanos@gcuavante.com": "validacion",
};
const norm = (e?: string | null) => String(e || "").toLowerCase().trim();

/** Qué caja le toca a quien hizo la requisición (null = no firma, p. ej. perfil de prueba o sin firma registrada) */
export function cajaDe(email?: string | null, tieneFirma = true): CajaFirma | null {
  const e = norm(email);
  if (!e || !tieneFirma) return null;
  return CAJA_POR_CORREO[e] || "solicitante";
}

/** Decide las firmas del PDF a partir de la requisición y las firmas disponibles (por correo) */
export function firmasDeRequi(r: { user_email?: string | null; created_by?: string | null; descripcion_corta?: string | null; instructions?: string | null },
  disponibles: Record<string, FirmaImg>): FirmasRequi {
  if (/\bqa\b[\s\S]*no procesar/i.test(`${r.descripcion_corta || ""} ${r.instructions || ""}`)) return {};
  const creador = norm(r.user_email) || norm(r.created_by);
  const img = disponibles[creador];
  const caja = cajaDe(creador, !!img);
  return caja && img ? { [caja]: img } : {};
}
