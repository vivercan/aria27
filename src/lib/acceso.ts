/**
 * ¿Esta persona puede abrir esta pantalla? (12-Oct-2026 · JJ: Doménica y ARIA27 con las mismas restricciones)
 * Una sola regla para: el guardián de cada módulo (AccessGuard en los layouts), las herramientas de Doménica por rol,
 * la pantalla Más, las tarjetas de los hubs y cualquier liga dentro de las pantallas (no se muestran ligas a pantallas cerradas).
 */
import { canAccessModule, canAccessSub, type UserPermissions } from "@/lib/permissions";

/** Módulos con guardián (app/dashboard/<modulo>/layout.tsx) y su clave de permiso */
const MODULO: Record<string, string> = {
  admin: "admin_sistema", plantillas: "plantillas", activos: "activos", configuracion: "configuracion", clientes: "clientes",
  whatsapp: "whatsapp", carpetas: "carpetas", talento: "talento", reportes: "reportes", administracion: "administracion",
  import: "import", requisiciones: "requisiciones", ceo: "ceo", inbox: "inbox", finanzas: "finanzas", obras: "obras",
};
/** Submódulos con guardián propio */
const SUB: Record<string, string[] | "todos"> = {
  talento: "todos",
  requisiciones: ["compras", "pagos"],
  finanzas: ["caja", "gastos-obra", "cobranza", "facturacion", "bancos"],
  obras: ["presupuestos", "estimaciones", "contratos"],
};
const SUB_LIBRE: Record<string, string[]> = { talento: ["tareas"] };

/** Herramientas de Doménica que dependen del rol (mismas reglas que la pantalla Más) */
export const ROLES_RUTA: [string, string[]][] = [
  ["/dashboard/campo/autorizar", ["admin", "direccion", "validador", "residente"]],
  ["/dashboard/domenica/carga", ["admin", "rh", "direccion", "validador", "compras"]],
  ["/dashboard/domenica/automatizaciones", ["admin", "rh", "direccion", "validador", "compras"]],
  ["/dashboard/requisiciones/proveedores", ["admin", "compras", "direccion", "rh", "validador"]],
  ["/dashboard/requisiciones/productos", ["admin", "compras", "direccion", "rh"]],
];

/** Pantallas que solo redirigen a otra: se revisa el destino */
const REDIRIGE: Record<string, string> = { "/dashboard/administracion/siroc": "/dashboard/obras/siroc" };

const esAdmin = (r: string) => r === "admin" || r === "Administrador";

/** Solo la regla de rol de Doménica (lo que el guardián de módulo no cubre) */
export function rolPermiteRuta(path: string, role: string): boolean {
  if (esAdmin(role)) return true;
  const p = path.split("?")[0].split("#")[0];
  for (const [pref, roles] of ROLES_RUTA) if (p === pref || p.startsWith(pref + "/")) return roles.includes(role);
  return true;
}

/** Regla completa: guardián de módulo/submódulo + regla de rol */
export function rutaPermitida(href: string, role: string, perms: UserPermissions): boolean {
  if (!href || !href.startsWith("/dashboard")) return true;
  if (!role) return true; // aún no sabemos quién es: no esconder nada
  let p = href.split("?")[0].split("#")[0];
  p = REDIRIGE[p] || p;
  const seg = p.split("/").filter(Boolean); // ["dashboard", mod, sub?]
  const mod = seg[1];
  if (mod && MODULO[mod]) {
    if (!canAccessModule(role, perms, MODULO[mod])) return false;
    const sub = seg[2];
    const reglas = SUB[mod];
    if (sub && reglas && !(SUB_LIBRE[mod] || []).includes(sub) && (reglas === "todos" || reglas.includes(sub))) {
      if (!canAccessSub(role, perms, MODULO[mod], sub)) return false;
    }
  }
  return rolPermiteRuta(p, role);
}
