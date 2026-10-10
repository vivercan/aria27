"use client";
/** ARIA27 Campo F4 — barra inferior fija para celular (Inicio · Solicitudes · Actividades · Más) */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, ClipboardList, MoreHorizontal } from "lucide-react";

const TABS = [
  { href: "/dashboard/campo", label: "Inicio", icon: Home, match: (p: string) => p === "/dashboard/campo" },
  { href: "/dashboard/requisiciones/requisiciones/estatus", label: "Solicitudes", icon: FileText, match: (p: string) => p.startsWith("/dashboard/requisiciones/requisiciones") },
  { href: "/dashboard/obras/tareas", label: "Actividades", icon: ClipboardList, match: (p: string) => p.startsWith("/dashboard/obras/tareas") || p.startsWith("/dashboard/campo/calendario") },
  { href: "/dashboard", label: "Más", icon: MoreHorizontal, match: () => false },
];

export default function CampoNav() {
  const path = usePathname() || "";
  return (
    <nav aria-label="Navegación Campo" className="md:hidden fixed left-0 right-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#071122]/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="grid grid-cols-4">
        {TABS.map(t => { const active = t.match(path); const Icon = t.icon; return (
          <li key={t.href}><Link href={t.href} onClick={() => { try { sessionStorage.setItem("aria:entro", "1"); } catch {} }} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-white" : "text-[#7f93b0]"}`} aria-current={active ? "page" : undefined}>
            <Icon className={`w-5 h-5 ${active ? "text-aria-accent" : ""}`} />{t.label}</Link></li>); })}
      </ul>
    </nav>
  );
}
