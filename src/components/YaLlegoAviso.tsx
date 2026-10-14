"use client";
/** Aviso "¿Ya llegaron?" — si la persona tiene solicitudes con 15+ días sin moverse (14-Oct-2026). Se usa en Solicitudes y en Inicio del teléfono. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { IcoCamion } from "@/components/domenica/IconosObra";

export default function YaLlegoAviso({ className = "" }: { className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    fetch("/api/requisicion/seguimiento", { credentials: "include", cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => { if (vivo && j?.lista) setN(j.lista.length); }).catch(() => {});
    return () => { vivo = false; };
  }, []);
  if (!n) return null;
  return (
    <Link href="/dashboard/requisiciones/requisiciones/ya-llego" className={`flex items-center gap-3 rounded-2xl border border-[#0073ea]/40 bg-[#0073ea]/10 px-3.5 py-3 active:scale-[0.99] transition ${className}`}>
      <span className="shrink-0 w-10 h-10 rounded-xl bg-[#0073ea] flex items-center justify-center"><IcoCamion className="w-6 h-6 text-white" color="#fff" fondo="#0073ea" /></span>
      <span className="flex-1 min-w-0"><span className="block text-[14.5px] font-bold text-[var(--d-text,#0f172a)]">¿Ya llegaron? {n} solicitud{n === 1 ? "" : "es"} sin cerrar</span><span className="block text-[12.5px] text-[var(--d-muted,#64748b)]">Llevan 15 días o más sin moverse. Confírmalas con un toque.</span></span>
      <ChevronRight className="w-5 h-5 text-[var(--d-muted,#64748b)]" />
    </Link>
  );
}
