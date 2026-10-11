/** Formularios públicos · link para que un proveedor sin usuario mande su cotización (11-Oct-2026) */
import { createHash, randomBytes } from "crypto";

export const ROLES_LINK = ["admin", "administrador", "compras", "rh", "direccion", "validador"];
export const generarToken = () => randomBytes(24).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const tokenValido = (t: string) => /^[A-Za-z0-9_-]{30,64}$/.test(t);
export function urlCotizar(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://aria.jjcrm27.com").replace(/\/$/, "");
  return `${base}/cotizar/${token}`;
}

const FIRMAS: { tipo: string; ext: string; ok: (b: Uint8Array) => boolean }[] = [
  { tipo: "application/pdf", ext: "pdf", ok: b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  { tipo: "image/jpeg", ext: "jpg", ok: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { tipo: "image/png", ext: "png", ok: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { tipo: "image/webp", ext: "webp", ok: b => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];
export const MAX_ARCHIVO = 10 * 1024 * 1024;
/** Revisa el archivo por su contenido real (no por el nombre). */
export function tipoArchivo(b: Uint8Array): { tipo: string; ext: string } | null {
  const f = FIRMAS.find(x => b.length > 12 && x.ok(b)); return f ? { tipo: f.tipo, ext: f.ext } : null;
}
