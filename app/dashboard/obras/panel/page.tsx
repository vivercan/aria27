"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /obras/panel fue identificado como DUPLICADO de /obras/control en la
 * Auditoría Integral 10-Abr-2026. Esta página redirige automáticamente
 * a Centro de Control que es la versión canónica y más completa.
 */
export default function PanelRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/obras/control"); }, [router]);
  return (
    <div className="aria-bg-canon flex items-center justify-center h-full text-[#7f93b0] text-sm">
      Redirigiendo a Centro de Control...
    </div>
  );
}
