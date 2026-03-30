// lib/permissions.ts - Sistema de permisos ARIA27
// REGLAS:
// 1. role "admin" = acceso total, SIEMPRE
// 2. Si permissions es null/vacio = acceso solo para roles conocidos del sistema
//    (FIX: antes cualquier rol con permisos vacÃ­os tenÃ­a acceso total â spoofable via localStorage)
// 3. Solo se restringe cuando permissions tiene datos configurados

export interface UserPermissions {
  [moduleKey: string]: string[];
}

// FIX: Roles vÃ¡lidos del sistema â previene escalaciÃ³n via localStorage spoofing
const SYSTEM_ROLES = ["admin", "Administrador", "rh", "compras", "almacen", "operador", "residente", "direccion"];

export function canAccessModule(role: string, permissions: UserPermissions, moduleKey: string): boolean {
  if (role === "admin" || role === "Administrador") return true;

  // FIX: Solo roles conocidos del sistema pasan cuando no hay permisos configurados
  // Antes: return true (cualquier string en localStorage = acceso total)
  if (!permissions || Object.keys(permissions).length === 0) {
    return SYSTEM_ROLES.includes(role);
  }

  return Array.isArray(permissions[moduleKey]) && permissions[moduleKey].length > 0;
}

export function canAccessSub(role: string, permissions: UserPermissions, moduleKey: string, subKey: string): boolean {
  if (role === "admin" || role === "Administrador") return true;

  // FIX: Misma protecciÃ³n contra roles inventados
  if (!permissions || Object.keys(permissions).length === 0) {
    return SYSTEM_ROLES.includes(role);
  }

  const moduleSubs = permissions[moduleKey];
  if (!moduleSubs || moduleSubs.length === 0) return false;
  return moduleSubs.includes(subKey);
}

export function getPermissionsFromStorage(): { role: string; permissions: UserPermissions } {
  if (typeof window === "undefined") return { role: "user", permissions: {} };
  const role = localStorage.getItem("userRole") || "user";
  let permissions: UserPermissions = {};
  try {
    const raw = localStorage.getItem("userPermissions");
    if (raw) permissions = JSON.parse(raw);
  } catch {
    permissions = {};
  }
  return { role, permissions };
}
