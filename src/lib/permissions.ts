// lib/permissions.ts - Sistema de permisos ARIA27
// REGLAS:
// 1. role "admin" = acceso total, SIEMPRE
// 2. Si permissions es null/vacio = acceso total (backwards compatible)
// 3. Solo se restringe cuando permissions tiene datos configurados

export interface UserPermissions {
  [moduleKey: string]: string[];
}

export function canAccessModule(role: string, permissions: UserPermissions, moduleKey: string): boolean {
  if (role === "admin") return true;
  if (!permissions || Object.keys(permissions).length === 0) return true;
  return Array.isArray(permissions[moduleKey]) && permissions[moduleKey].length > 0;
}

export function canAccessSub(role: string, permissions: UserPermissions, moduleKey: string, subKey: string): boolean {
  if (role === "admin") return true;
  if (!permissions || Object.keys(permissions).length === 0) return true;
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
  } catch { permissions = {}; }
  return { role, permissions };
}
