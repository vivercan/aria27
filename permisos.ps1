# =============================================
# PASO 1: CREAR lib/permissions.ts (UTILIDAD)
# =============================================

$permissionsTs = @"
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
"@

$permissionsTs | Set-Content "lib\permissions.ts" -Encoding UTF8
Write-Host "1. lib/permissions.ts CREADO" -ForegroundColor Green

# =============================================
# PASO 2: MODIFICAR layout.tsx (QUIRURGICO)
# =============================================

$layout = Get-Content "app\dashboard\layout.tsx" -Raw

# 2a. Agregar import de permissions
$layout = $layout.Replace(
  'import PulsoMessenger from "@/components/pulso/PulsoMessenger";',
  'import PulsoMessenger from "@/components/pulso/PulsoMessenger";
import { canAccessModule, type UserPermissions } from "@/lib/permissions";'
)
Write-Host "  2a. Import permissions agregado" -ForegroundColor Gray

# 2b. Agregar estado de permissions despues de userRole
$layout = $layout.Replace(
  'const [showPulso, setShowPulso] = useState(false);',
  'const [userPermissions, setUserPermissions] = useState<UserPermissions>({});
  const [showPulso, setShowPulso] = useState(false);'
)
Write-Host "  2b. Estado userPermissions agregado" -ForegroundColor Gray

# 2c. En loadUser, guardar role+permissions en localStorage
$layout = $layout.Replace(
  'setUserRole(data.role || "user");',
  'const userRoleValue = data.role || "user";
      setUserRole(userRoleValue);
      const perms = data.permissions || {};
      setUserPermissions(perms);
      localStorage.setItem("userRole", userRoleValue);
      localStorage.setItem("userPermissions", JSON.stringify(perms));'
)
Write-Host "  2c. loadUser guarda role+permissions en localStorage" -ForegroundColor Gray

# 2d. Limpiar localStorage en logout
$layout = $layout.Replace(
  'const handleLogout = () => {
    localStorage.removeItem("userEmail");
    router.push("/");
  };',
  'const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userPermissions");
    router.push("/");
  };'
)
Write-Host "  2d. Logout limpia role+permissions" -ForegroundColor Gray

# 2e. Filtrar menuItems en el render
# Buscamos donde se mapean los menuItems en el nav
$layout = $layout.Replace(
  '{menuItems.map((item) => {',
  '{menuItems.filter((item) => {
            if (item.href === "#pulso") return true;
            const moduleKey = item.href.replace("/dashboard/", "");
            return canAccessModule(userRole, userPermissions, moduleKey);
          }).map((item) => {'
)
Write-Host "  2e. Sidebar ahora filtra por permisos" -ForegroundColor Gray

$layout | Set-Content "app\dashboard\layout.tsx" -Encoding UTF8
Write-Host "2. layout.tsx MODIFICADO" -ForegroundColor Green

# =============================================
# PASO 3: CREAR componente AccessGuard
# =============================================

$guardTsx = @"
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPermissionsFromStorage, canAccessModule, canAccessSub } from "@/lib/permissions";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AccessGuardProps {
  moduleKey: string;
  subKey?: string;
  children: React.ReactNode;
}

export default function AccessGuard({ moduleKey, subKey, children }: AccessGuardProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const { role, permissions } = getPermissionsFromStorage();
    if (subKey) {
      setAllowed(canAccessSub(role, permissions, moduleKey, subKey));
    } else {
      setAllowed(canAccessModule(role, permissions, moduleKey));
    }
  }, [moduleKey, subKey]);

  if (allowed === null) return null; // loading
  if (allowed) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-4 rounded-full bg-red-500/10 mb-4">
        <ShieldAlert className="w-12 h-12 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
      <p className="text-slate-400 mb-6 max-w-md">
        No tienes permisos para acceder a este módulo. 
        Contacta al administrador si necesitas acceso.
      </p>
      <Link href="/dashboard" className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Volver al Dashboard
      </Link>
    </div>
  );
}
"@

$guardTsx | Set-Content "components\AccessGuard.tsx" -Encoding UTF8
Write-Host "3. components/AccessGuard.tsx CREADO" -ForegroundColor Green

# =============================================
# PASO 4: BUILD
# =============================================
Write-Host "`nEjecutando build..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n BUILD EXITOSO" -ForegroundColor Green
    git add .
    git commit -m "feat: sistema de permisos - sidebar filtrado por rol, AccessGuard, permissions utility"
    git push
    Write-Host " DEPLOY INICIADO" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "CAMBIOS APLICADOS:" -ForegroundColor Yellow
    Write-Host "  lib/permissions.ts - Funciones de verificacion de permisos" -ForegroundColor White
    Write-Host "  components/AccessGuard.tsx - Componente de proteccion por pagina" -ForegroundColor White
    Write-Host "  layout.tsx - Sidebar ahora filtra modulos por rol/permisos" -ForegroundColor White
    Write-Host ""
    Write-Host "REGLAS DE SEGURIDAD:" -ForegroundColor Yellow
    Write-Host "  - Admin = ve TODO siempre" -ForegroundColor White
    Write-Host "  - Sin permisos configurados = ve TODO (backwards compatible)" -ForegroundColor White
    Write-Host "  - Con permisos configurados = solo ve lo asignado" -ForegroundColor White
    Write-Host "  - Logout limpia role + permissions del navegador" -ForegroundColor White
    Write-Host ""
    Write-Host "SIGUIENTE: Configurar permisos de Jessica y Deysi en Talento > Usuarios" -ForegroundColor Magenta
} else {
    Write-Host "`n ERROR EN BUILD - revisa arriba" -ForegroundColor Red
}
