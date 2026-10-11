"use client";
/** ARIA27 Campo F4 — barra inferior fija para celular (Inicio · Solicitudes · Actividades · Más) */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, ClipboardList, MoreHorizontal } from "lucide-react";

const TABS = [
  { href: "/dashboard/campo", label: "Inicio", icon: Home, match: (p: string) => p === "/dashboard/campo" },
  { href: "/dashboard/requisiciones/requisiciones/estatus", label: "Solicitudes", icon: FileText, match: (p: string) => p.startsWith("/dashboard/requisiciones/requisiciones") },
  { href: "/dashboard/actividades", label: "Actividades", icon: ClipboardList, match: (p: string) => p.startsWith("/dashboard/actividades") || p.startsWith("/dashboard/campo/calendario") },
  { href: "/dashboard/campo/mas", label: "Más", icon: MoreHorizontal, match: (p: string) => p.startsWith("/dashboard/campo/mas") },
];

export default function CampoNav() {
  const path = usePathname() || "";
  return (
    <nav aria-label="Navegación Campo" className="md:hidden fixed left-0 right-0 bottom-0 z-40 border-t backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)", background: "var(--d-nav)", borderColor: "var(--d-border)" }}>
      <ul className="grid grid-cols-4">
        {TABS.map(t => { const active = t.match(path); const Icon = t.icon; return (
          <li key={t.href}><Link href={t.href} className={`flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold ${active ? "text-[var(--d-text)]" : "text-[var(--d-faint)]"}`} aria-current={active ? "page" : undefined}>
            <Icon className="w-[22px] h-[22px]" style={active ? { color: "#0073ea" } : undefined} />{t.label}</Link></li>); })}
      </ul>
    </nav>
  );
}
