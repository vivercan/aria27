"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 27-Abr-2026: modulo Plantillas eliminado del menu principal por decision JJ.
// Las plantillas viven ahora dentro de Doc Legales (Talento) y formatos en Talento > Personal.
export default function PlantillasRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/talento/legales");
  }, [router]);
  return (
    <div className="aria-bg-canon h-full flex items-center justify-center text-[#7f93b0]">
      Redirigiendo a Documentos Legales…
    </div>
  );
}
