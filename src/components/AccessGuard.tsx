"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPermissionsFromStorage, canAccessModule, canAccessSub } from "@/lib/permissions";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { UserPermissions } from "@/lib/permissions";

/** Permisos reales desde el servidor (una sola llamada compartida cada 10 s) y se reescriben en el navegador. */
let pendiente: Promise<{ role: string; permissions: UserPermissions } | null> | null = null;
let pendienteT = 0;
function permisosDelServidor(): Promise<{ role: string; permissions: UserPermissions } | null> {
  if (pendiente && Date.now() - pendienteT < 10_000) return pendiente;
  pendienteT = Date.now();
  pendiente = fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
    .then(async r => {
      if (!r.ok) return null;
      const me = await r.json() as { email?: string; role?: string; permissions?: UserPermissions };
      if (!me?.email) return null;
      try {
        localStorage.setItem("userEmail", me.email);
        localStorage.setItem("userRole", me.role || "user");
        localStorage.setItem("userPermissions", JSON.stringify(me.permissions || {}));
      } catch { /* */ }
      return { role: me.role || "user", permissions: me.permissions || {} };
    })
    .catch(() => null);
  return pendiente;
}

interface AccessGuardProps {
  moduleKey: string;
  subKey?: string;
  children: React.ReactNode;
}

export default function AccessGuard({ moduleKey, subKey, children }: AccessGuardProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // 10-Oct-2026: los permisos se refrescan desde /api/auth/me en el layout DESPUES del primer render.
    // 11-Oct-2026: NUNCA se bloquea solo con lo guardado en el navegador. Si lo local dice "no", se confirma con el
    // servidor (fuente de verdad). Causa real: abrir el login u otra cuenta en OTRA pestaña borra/cambia el
    // localStorage y esta pestaña mostraba "Acceso Restringido" a quien sí tiene acceso (RH, 11-Oct).
    let vivo = true;
    const evaluar = async () => {
      const { role, permissions } = getPermissionsFromStorage();
      const ok = subKey ? canAccessSub(role, permissions, moduleKey, subKey) : canAccessModule(role, permissions, moduleKey);
      if (ok) { if (vivo) setAllowed(true); return; }
      if (vivo) setAllowed(null);
      const srv = await permisosDelServidor();
      if (!vivo) return;
      if (!srv) { setAllowed(false); return; }
      setAllowed(subKey ? canAccessSub(srv.role, srv.permissions, moduleKey, subKey) : canAccessModule(srv.role, srv.permissions, moduleKey));
    };
    evaluar();
    const ev = () => { evaluar(); };
    window.addEventListener("aria:perms", ev);
    window.addEventListener("storage", ev);
    return () => { vivo = false; window.removeEventListener("aria:perms", ev); window.removeEventListener("storage", ev); };
  }, [moduleKey, subKey]);

  if (allowed === null) return null; // cargando o confirmando con el servidor
  if (allowed) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-4 rounded-full bg-red-500/10 mb-4">
        <ShieldAlert className="w-12 h-12 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
      <p className="text-[#7f93b0] mb-6 max-w-md">
        No tienes permisos para acceder a este módulo. 
        Contacta al administrador si necesitas acceso.
      </p>
      <Link href="/dashboard" className="px-4 py-2 bg-aria-primary-light text-aria-accent rounded-lg hover:bg-aria-primary-hover/30 transition-colors flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Volver al Dashboard
      </Link>
    </div>
  );
}
