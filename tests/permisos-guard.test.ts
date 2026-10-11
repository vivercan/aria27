/**
 * 11-Oct-2026 · Que no vuelva a pasar "Acceso Restringido" a quien sí tiene acceso.
 * 1) Toda llave de AccessGuard debe existir en el catálogo de permisos de Talento > Usuarios
 *    (si no existe, nadie puede recibir ese permiso desde la pantalla y queda bloqueado para siempre).
 * 2) El comodín "*" abre todos los submódulos.
 * 3) El guard nunca bloquea sin confirmar con el servidor.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { canAccessModule, canAccessSub } from "@/lib/permissions";

const raiz = join(__dirname, "..");
function layouts(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) layouts(p, out);
    else if (f === "layout.tsx") out.push(p);
  }
  return out;
}
const pagUsuarios = readFileSync(join(raiz, "app/dashboard/talento/usuarios/page.tsx"), "utf8");
const catalogo = new Set([...pagUsuarios.matchAll(/\{ id: "([^"]+)", nombre:/g)].map(m => m[1]));
// Solo administradores del sistema (respaldos, monitoreo); se documenta aquí a propósito
const SOLO_ADMIN = new Set(["admin_sistema"]);

describe("permisos y AccessGuard", () => {
  it("cada llave de AccessGuard existe en el catálogo de permisos", () => {
    const faltan: string[] = [];
    for (const f of layouts(join(raiz, "app/dashboard"))) {
      const s = readFileSync(f, "utf8");
      for (const m of s.matchAll(/moduleKey="([^"]+)"/g)) if (!catalogo.has(m[1]) && !SOLO_ADMIN.has(m[1])) faltan.push(`${f.replace(raiz, "")}: ${m[1]}`);
    }
    expect(faltan).toEqual([]);
  });
  it("comodín * abre submódulos y módulo", () => {
    const p = { requisiciones: ["*"] };
    expect(canAccessModule("rh", p, "requisiciones")).toBe(true);
    expect(canAccessSub("rh", p, "requisiciones", "estatus")).toBe(true);
    expect(canAccessSub("rh", p, "finanzas", "caja")).toBe(false);
  });
  it("AccessGuard confirma con el servidor antes de bloquear", () => {
    const g = readFileSync(join(raiz, "src/components/AccessGuard.tsx"), "utf8");
    expect(g).toContain("permisosDelServidor");
    expect(g).toContain("/api/auth/me");
  });
  it("el login solo ofrece huella en teléfono", () => {
    const l = readFileSync(join(raiz, "app/page.tsx"), "utf8");
    expect(l).toContain("if (tel && hDisp && !huellaActivada())");
  });
});
