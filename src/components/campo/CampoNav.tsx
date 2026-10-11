"use client";
/**
 * Doménica 27 · barra inferior del celular (11-Oct-2026): Inicio · Solicitudes · [+] · Actividades · Más
 * Un solo botón "+" para crear cualquier cosa (menos botones en pantalla = más fácil para todos).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IcoInicio, IcoSolicitudes, IcoActividades, IcoMas, IcoMasGrande } from "@/components/domenica/Iconos";
import AccionRapida from "@/components/campo/AccionRapida";
import SinSenal from "@/components/campo/SinSenal";

const TABS = [
  { href: "/dashboard/campo", label: "Inicio", icon: IcoInicio, match: (p: string) => p === "/dashboard/campo" },
  { href: "/dashboard/requisiciones/requisiciones/estatus", label: "Solicitudes", icon: IcoSolicitudes, match: (p: string) => p.startsWith("/dashboard/requisiciones/requisiciones") },
  null,
  { href: "/dashboard/actividades", label: "Actividades", icon: IcoActividades, match: (p: string) => p.startsWith("/dashboard/actividades") || p.startsWith("/dashboard/campo/calendario") },
  { href: "/dashboard/campo/mas", label: "Más", icon: IcoMas, match: (p: string) => p.startsWith("/dashboard/campo/mas") || p.startsWith("/dashboard/domenica") },
];

export default function CampoNav() {
  const path = usePathname() || "";
  const [abierto, setAbierto] = useState(false); const [auto, setAuto] = useState(false);
  // El micrófono grande de Inicio abre la hoja escuchando de una vez
  useEffect(() => { const f = () => { setAuto(true); setAbierto(true); }; window.addEventListener("dom:hablar", f); return () => window.removeEventListener("dom:hablar", f); }, []);
  return (
    <>
      <SinSenal />
      <nav aria-label="Navegación" className="md:hidden fixed left-0 right-0 bottom-0 z-40 border-t backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)", background: "var(--d-nav)", borderColor: "var(--d-border)" }}>
        <ul className="grid grid-cols-5 items-end">
          {TABS.map((t, i) => {
            if (!t) return (
              <li key="mas-accion" className="flex justify-center">
                <button onClick={() => setAbierto(true)} aria-label="Crear algo nuevo" className="-mt-6 mb-1 w-[60px] h-[60px] rounded-full flex items-center justify-center text-white active:scale-95 transition" style={{ background: "#0060c7", boxShadow: "0 10px 20px -10px #0060c7, 0 0 0 5px var(--d-bg)" }}>
                  <IcoMasGrande />
                </button>
              </li>);
            const active = t.match(path); const Icon = t.icon;
            return (
              <li key={i}><Link href={t.href} className={`flex flex-col items-center gap-0.5 pt-1.5 pb-2 text-[11px] font-semibold ${active ? "text-[var(--d-nav-on)]" : "text-[var(--d-muted)]"}`} aria-current={active ? "page" : undefined}>
                <span className={`flex items-center justify-center h-8 w-12 rounded-full transition-all duration-200 `}><Icon activo={active} className="w-[24px] h-[24px]" /></span>{t.label}</Link></li>);
          })}
        </ul>
      </nav>
      {abierto && <AccionRapida auto={auto} onClose={() => { setAbierto(false); setAuto(false); }} />}
    </>
  );
}
