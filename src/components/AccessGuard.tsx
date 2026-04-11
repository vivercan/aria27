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
      <Link href="/dashboard" className="px-4 py-2 bg-aria-primary-light text-aria-accent rounded-lg hover:bg-aria-primary-hover/30 transition-colors flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Volver al Dashboard
      </Link>
    </div>
  );
}
