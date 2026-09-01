"use client";

import {
  Users, UserCog, Clock, DollarSign, AlertCircle, Gift, ScanFace,
  ListChecks, FileText, BarChart2, FolderOpen, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import React from "react";

const quickLinks = [
  { label: "Mis Documentos",  href: "/dashboard/talento/documentos", icon: FolderOpen },
  { label: "Matriz Salarial", href: "/dashboard/talento/matriz",     icon: BarChart2  },
];

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accent: string;
  hero?: boolean;
};

const INDIGO = "#8B9FFF";
const TEAL   = "#3AD8B1";

const grupos: { label: string; modulos: ModuleItem[] }[] = [
  {
    label: "Personal",
    modulos: [
      { title: "Personal",          description: "Expedientes y perfil de cada colaborador.",    href: "/dashboard/talento/personal",    icon: Users,       accent: INDIGO, hero: true },
      { title: "Usuarios",          description: "Accesos y roles del sistema ARIA.",             href: "/dashboard/talento/usuarios",    icon: UserCog,     accent: INDIGO },
      { title: "Asistencias",       description: "Control de entradas y salidas.",                href: "/dashboard/talento/checadas",    icon: Clock,       accent: INDIGO },
      { title: "ARIA27 FaceID",     description: "Dar de alta rostros para checado facial.",     href: "https://104.248.119.60.nip.io/enroll.html", icon: ScanFace,    accent: INDIGO },
      { title: "Nómina",            description: "Pre-nómina, histórico y recibos.",             href: "/dashboard/talento/nomina",      icon: DollarSign,  accent: INDIGO },
    ],
  },
  {
    label: "Operación",
    modulos: [
      { title: "Incidencias",        description: "Faltas, permisos y ajustes.",                  href: "/dashboard/talento/incidencias",  icon: AlertCircle, accent: TEAL },
      { title: "Prestaciones",       description: "Préstamos y vacaciones.",                      href: "/dashboard/talento/prestaciones", icon: Gift,        accent: TEAL },
      { title: "Tareas Asignadas",   description: "Tareas asignadas al personal.",                href: "/dashboard/talento/tareas",       icon: ListChecks,  accent: TEAL },
      { title: "Documentos Legales", description: "Contratos y documentos por empleado.",        href: "/dashboard/talento/legales",      icon: FileText,    accent: TEAL },
    ],
  },
];

const filas = [[grupos[0], grupos[1]]];

export default function TalentoPage() {
  return (
    <div
      className="px-4 pt-4 pb-6 md:px-5 md:pb-4 min-h-full md:h-full flex flex-col md:overflow-hidden"
      style={{
        background: [
          "radial-gradient(circle at 50% 28%, rgba(72,128,230,0.07) 0%, rgba(72,128,230,0.03) 20%, rgba(72,128,230,0.00) 44%)",
          "linear-gradient(180deg, #06152F 0%, #081E46 44%, #0A2450 100%)",
        ].join(", "),
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex-shrink-0 rounded-xl px-5 py-3" style={{ marginBottom: "24px", background: "linear-gradient(180deg, #123E92 0%, #103A86 100%)", borderBottom: "1px solid rgba(150,180,230,0.10)" }}>
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3.5">
          <h1 style={{ fontSize: "clamp(24px, 7vw, 30px)", fontWeight: 800, letterSpacing: "-0.035em", color: "#F4F8FF", lineHeight: 1 }}>Talento</h1>
          <span className="hidden sm:inline" style={{ color: "rgba(145,175,225,0.35)", fontSize: "15px" }}>·</span>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(214,228,255,0.70)" }}>Recursos humanos y personal</span>
        </div>
      </div>

      {/* ── SECCIONES ── */}
      <div className="flex-1 flex flex-col min-h-0" style={{ gap: "22px" }}>
        {filas.map((fila, fi) => (
          <div key={fi} className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0" style={{ gap: "20px" }}>
            {fila.map((grupo) => (
              <section key={grupo.label} className="flex flex-col min-h-0">
                <div className="flex items-center flex-shrink-0" style={{ gap: "12px", marginBottom: "12px" }}>
                  <span className="uppercase" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(188,208,238,0.58)", flexShrink: 0, whiteSpace: "nowrap" }}>{grupo.label}</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.11)" }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "10px" }}>
                  {grupo.modulos.map((mod, idx) => <HubCard key={mod.href} module={mod} spanFull={grupo.modulos.length > 1 && grupo.modulos.length % 2 === 1 && idx === grupo.modulos.length - 1} />)}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>

      {/* ── ACCESOS RÁPIDOS ── */}
      <QuickLinks links={quickLinks} />
    </div>
  );
}

/* ── Accesos Rápidos ── */
function QuickLinks({ links }: { links: { label: string; href: string; icon: React.ElementType }[] }) {
  return (
    <div className="flex-shrink-0 flex flex-col items-center" style={{ marginTop: "22px", gap: "14px" }}>
      <div className="flex items-center w-full" style={{ gap: "16px" }}>
        <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.11)" }} />
        <span className="uppercase" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(205,223,247,0.75)", flexShrink: 0 }}>Accesos Rápidos</span>
        <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.11)" }} />
      </div>
      <div className="flex gap-3">
        {links.map((ql) => (
          <Link key={ql.href} href={ql.href} className="flex items-center gap-2 rounded-full px-5 py-2 transition-all duration-200"
            style={{ background: "linear-gradient(180deg, #1E3E7A 0%, #193670 100%)", border: "1px solid rgba(130,170,230,0.18)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 16px rgba(0,0,0,0.26)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)"; }}
          >
            <ql.icon style={{ width: 13, height: 13, color: "rgba(200,220,255,0.80)" }} strokeWidth={1.6} />
            <span style={{ fontSize: "12px", fontWeight: 500, color: "#E0EEFF" }}>{ql.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── HubCard ── */
function HubCard({ module, spanFull }: { module: ModuleItem; spanFull?: boolean }) {
  const bg     = "linear-gradient(180deg, #2C3D52 0%, #263647 54%, #21303E 100%)";
  const shadow = "inset 0 1px 0 rgba(210,228,252,0.05), 0 8px 20px rgba(0,0,0,0.20)";
  const border = "rgba(120,158,204,0.18)";
  return (
    <Link href={module.href} className="group relative flex flex-col justify-start rounded-2xl transition-all duration-200 ease-out"
      style={{ height: "100%", padding: "20px 18px 18px 20px", background: bg, border: `1px solid ${border}`, boxShadow: shadow, ...(spanFull ? { gridColumn: "1 / -1" } : {}) }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 1px 0 rgba(210,228,252,0.08), 0 16px 32px rgba(0,0,0,0.26)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(140,178,228,0.30)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = shadow; (e.currentTarget as HTMLElement).style.borderColor = border; }}
    >
      <module.icon style={{ width: 28, height: 28, color: module.accent, flexShrink: 0 }} strokeWidth={1.5} />
      <div style={{ height: "14px", flexShrink: 0 }} />
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#EAF2FF", letterSpacing: "-0.018em", lineHeight: 1.2, flexShrink: 0 }}>{module.title}</h3>
      <p style={{ marginTop: "7px", fontSize: "12px", fontWeight: 400, color: "rgba(200,220,248,0.72)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{module.description}</p>
      <ChevronRight className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-25 transition-opacity duration-200" style={{ width: 12, height: 12, color: module.accent }} />
    </Link>
  );
}
