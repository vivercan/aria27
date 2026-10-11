"use client";
/**
 * Regresar en el teléfono (Doménica 27 · 11-Oct-2026)
 * Siempre en el mismo lugar (arriba a la izquierda), del mismo tamaño y con su palabra.
 * Regresa a la pantalla anterior; si no hay anterior, a la pantalla "madre" (nunca a un menú de computadora).
 */
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Pantallas principales (las 4 de la barra de abajo): ahí no hay "Regresar", ahí va el logo */
export const RAICES_TEL = ["/dashboard/campo", "/dashboard/requisiciones/requisiciones/estatus", "/dashboard/actividades", "/dashboard/campo/mas"];
export const esRaizTel = (p: string) => RAICES_TEL.includes((p || "").replace(/\/$/, ""));

function madre(p: string): string {
  if (p.startsWith("/dashboard/actividades")) return "/dashboard/actividades";
  if (p.startsWith("/dashboard/requisiciones/requisiciones")) return "/dashboard/requisiciones/requisiciones/estatus";
  if (p.startsWith("/dashboard/domenica/obras/")) return "/dashboard/domenica/obras";
  if (p.startsWith("/dashboard/domenica/planos/")) return "/dashboard/domenica/planos";
  if (p.startsWith("/dashboard/campo/autorizar") || p.startsWith("/dashboard/campo/evidencia")) return "/dashboard/campo";
  return "/dashboard/campo/mas";
}

export default function RegresarTel() {
  const router = useRouter(); const path = usePathname() || "";
  const ir = () => {
    let pasos = 0; try { pasos = Number(sessionStorage.getItem("dom:nav") || 0); } catch { /* */ }
    if (pasos > 1 && window.history.length > 1) { router.back(); return; }
    router.push(madre(path));
  };
  return (
    <button type="button" onClick={ir} className="-ml-2 h-11 pl-2.5 pr-3.5 inline-flex items-center gap-1.5 rounded-xl text-[16px] font-bold text-[var(--d-text)] active:bg-[var(--d-hover)]">
      <ArrowLeft className="w-[22px] h-[22px]" strokeWidth={2.4} />Regresar
    </button>
  );
}
