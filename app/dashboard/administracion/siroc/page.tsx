"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 28-Abr-2026: SIROC unificado en /dashboard/obras/siroc por decision JJ.
// Esta pantalla redirige para evitar duplicacion.
export default function SirocAdminRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/obras/siroc"); }, [router]);
  return (
    <div className="aria-bg-canon h-full flex items-center justify-center text-[#7f93b0]">
      Redirigiendo a SIROC unificado...
    </div>
  );
}
