// lib/permissions.ts - Sistema de permisos ARIA27
// REGLAS:
// 1. role "admin" = acceso total, SIEMPRE
// 2. Si permissions es null/vacio = acceso solo para roles conocidos del sistema
//    (FIX: antes cualquier rol con permisos vacíos tenía acceso total — spoofable via localStorage)
// 3. Solo se restringe cuando permissions tiene datos configurados

export interface UserPermissions {
  [moduleKey: string]: string[];
}

// FIX: Roles válidos del sistema — previene escalación via localStorage spoofing
const SYSTEM_ROLES = ["admin", "Administrador", "rh", "compras", "almacen", "operador", "residente", "direccion"];

export function canAccessModule(role: string, permissions: UserPermissions, moduleKey: string): boolean {
  if (role === "admin" || role === "Administrador") return true;

  // FIX: Solo roles conocidos del sistema pasan cuando no hay permisos configurados
  // Antes: return true (cualquier string en localStorage = acceso total)
  if (!permissions || Object.keys(permissions).length === 0) {
    return SYSTEM_ROLES.includes(role);
  }

  // 6-May-2026 FIX: ["*"] es wildcard "todos los submodulos" -> permite acceso al modulo.
  return Array.isArray(permissions[moduleKey]) && permissions[moduleKey].length > 0;
}

export function canAccessSub(role: string, permissions: UserPermissions, moduleKey: string, subKey: string): boolean {
  if (role === "admin" || role === "Administrador") return true;

  // FIX: Misma protección contra roles inventados
  if (!permissions || Object.keys(permissions).length === 0) {
    return SYSTEM_ROLES.includes(role);
  }

  const moduleSubs = permissions[moduleKey];
  if (!moduleSubs || moduleSubs.length === 0) return false;
  // 6-May-2026 FIX: "*" es wildcard que concede TODOS los submodulos del modulo.
  // Antes: ["*"] solo hacia match con literal "*" -> usuarios con permission ["*"]
  // veian "Acceso Restringido" en TODOS los submodulos. Reportado por Jessica
  // (rol=compras) en /dashboard/requisiciones/compras.
  if (moduleSubs.includes("*")) return true;
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
