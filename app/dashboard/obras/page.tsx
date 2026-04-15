"use client";

import {
  Kanban, Gavel, FolderOpen, Scale, Building, Calculator, PackageCheck,
  Layers, Map, ListChecks, Camera, BookOpen, Activity, TrendingUp,
  ShieldCheck, Droplet, ChevronRight, FileText, BarChart2, BookMarked,
} from "lucide-react";
import Link from "next/link";
import React from "react";

const quickLinks = [
  { label: "Reporte Ejecutivo", href: "/dashboard/obras/reporte",  icon: BarChart2  },
  { label: "Bitácora de Obra",  href: "/dashboard/obras/bitacora", icon: BookMarked },
  { label: "Export Excel",      href: "/dashboard/obras/control",  icon: FileText   },
];

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accent: string;
  hero?: boolean;
};

const grupos: { label: string; modulos: ModuleItem[] }[] = [
  {
    label: "Operación",
    modulos: [
      { title: "Centro de Control", description: "Presupuesto vs gasto real (OC + nómina). Semáforo de avance.", href: "/dashboard/obras/control",  icon: Activity,    accent: "#3b82f6", hero: true },
      { title: "Pipeline",          description: "Vista kanban operativa de proyectos activos.",                 href: "/dashboard/obras/pipeline", icon: Kanban,      accent: "#818cf8" },
      { title: "Avance Físico",     description: "Captura semanal de % de avance físico real.",                 href: "/dashboard/obras/avance",   icon: TrendingUp,  accent: "#10b981" },
      { title: "Catálogo Maestro",  description: "Alta, edición, archivo e historial de obras.",                href: "/dashboard/obras/catalogo", icon: BookOpen,    accent: "#a78bfa" },
    ],
  },
  {
    label: "Construcción",
    modulos: [
      { title: "Control de Concreto", description: "Remisiones, f'c, m³, cilindros 7/14/28 días.", href: "/dashboard/obras/concreto/remisiones", icon: Droplet,      accent: "#38bdf8" },
      { title: "Concreto",            description: "Control de colados, resistencias y pedidos.",   href: "/dashboard/obras/concreto",            icon: Layers,       accent: "#7dd3fc" },
      { title: "Presupuestos",        description: "Presupuestos base y estimaciones de costo.",    href: "/dashboard/obras/presupuestos",        icon: Calculator,   accent: "#34d399" },
      { title: "Inventario",          description: "Inventario de materiales por obra.",             href: "/dashboard/obras/inventario",          icon: PackageCheck, accent: "#2dd4bf" },
    ],
  },
  {
    label: "Legal & IMSS",
    modulos: [
      { title: "SIROC IMSS",   description: "Registro ante IMSS: fases e incidencias.",     href: "/dashboard/obras/siroc/registros", icon: ShieldCheck, accent: "#f87171" },
      { title: "SIROC",        description: "Registro IMSS de obras ante SIROC.",           href: "/dashboard/obras/siroc",           icon: Building,    accent: "#fb923c" },
      { title: "Contratos",    description: "Contratos y documentación legal por obra.",    href: "/dashboard/obras/contratos",       icon: Scale,       accent: "#c084fc" },
      { title: "Licitaciones", description: "Gestión de licitaciones y concursos.",         href: "/dashboard/obras/licitaciones",    icon: Gavel,       accent: "#fbbf24" },
    ],
  },
  {
    label: "Documentación",
    modulos: [
      { title: "Expedientes",    description: "Expedientes digitales de obra.",              href: "/dashboard/obras/expedientes", icon: FolderOpen, accent: "#4ade80" },
      { title: "Planos",         description: "Visor de planos y documentos técnicos.",      href: "/dashboard/obras/planos",      icon: Map,        accent: "#818cf8" },
      { title: "Tareas",         description: "Asignación y seguimiento de tareas.",         href: "/dashboard/obras/tareas",      icon: ListChecks, accent: "#a3e635" },
      { title: "Fotos de Avance",description: "Registro fotográfico de avance por obra.",    href: "/dashboard/obras/fotos",       icon: Camera,     accent: "#fb923c" },
    ],
  },
];

export default function ObrasPage() {
  return (
    <div
      className="px-5 pt-5 pb-4 h-full overflow-hidden flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #1565c0 0%, #0d47a1 20%, #072a6e 50%, #021440 75%, #010b22 100%)",
      }}
    >
      {/* HEADER */}
      <div className="mb-4 flex-shrink-0">
        <h1
          className="text-[26px] font-extrabold tracking-tight leading-none"
          style={{
            background: "linear-gradient(90deg,#fff 0%,rgba(255,255,255,0.55) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Obras
        </h1>
        <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          Gestión de proyectos y construcción
        </p>
      </div>

      {/* GRUPOS */}
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {grupos.map((grupo) => (
          <section key={grupo.label} className="flex-shrink-0">
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className="text-[9.5px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                {grupo.label}
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {grupo.modulos.map((mod) => (
                <HubCard key={mod.href} module={mod} />
              ))}
            </div>
          </section>
        ))}

        {/* ACCESOS RÁPIDOS */}
        <div className="flex-shrink-0 mt-auto pt-2">
          <div className="flex items-center gap-2.5 mb-2">
            <span
              className="text-[9.5px] font-bold uppercase tracking-[0.16em]"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              Accesos Rápidos
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          </div>
          <div className="flex gap-2">
            {quickLinks.map((ql) => (
              <Link
                key={ql.href}
                href={ql.href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-150 hover:-translate-y-0.5"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.13)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <ql.icon style={{ width: 12, height: 12, color: "rgba(255,255,255,0.40)" }} strokeWidth={1.75} />
                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>
                  {ql.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   TILE COMPACTO — ícono con color sólido
══════════════════════════════════════════ */
function HubCard({ module }: { module: ModuleItem }) {
  return (
    <Link
      href={module.href}
      className="group flex items-center gap-2.5 rounded-xl transition-all duration-150 hover:-translate-y-0.5"
      style={{
        padding: "11px 12px",
        backgroundColor: module.hero
          ? "rgba(59,130,246,0.10)"
          : "rgba(255,255,255,0.035)",
        border: module.hero
          ? "1px solid rgba(59,130,246,0.25)"
          : "1px solid rgba(255,255,255,0.07)",
        borderTop: module.hero
          ? "1px solid rgba(59,130,246,0.40)"
          : "1px solid rgba(255,255,255,0.10)",
        boxShadow: module.hero
          ? "0 2px 12px rgba(59,130,246,0.12)"
          : "0 1px 6px rgba(0,0,0,0.25)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = module.hero
          ? "rgba(59,130,246,0.16)"
          : "rgba(255,255,255,0.055)";
        (e.currentTarget as HTMLElement).style.borderColor = `${module.accent}35`;
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 4px 14px rgba(0,0,0,0.35), 0 0 8px ${module.accent}15`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = module.hero
          ? "rgba(59,130,246,0.10)"
          : "rgba(255,255,255,0.035)";
        (e.currentTarget as HTMLElement).style.borderColor = module.hero
          ? "rgba(59,130,246,0.25)"
          : "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.boxShadow = module.hero
          ? "0 2px 12px rgba(59,130,246,0.12)"
          : "0 1px 6px rgba(0,0,0,0.25)";
      }}
    >
      {/* ícono color sólido, sin caja */}
      <module.icon
        style={{ width: 16, height: 16, color: module.accent, flexShrink: 0 }}
        strokeWidth={1.75}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          className="text-[12.5px] font-semibold leading-tight truncate"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {module.title}
        </h3>
        <p className="text-[10.5px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.33)" }}>
          {module.description}
        </p>
      </div>
      <ChevronRight
        className="flex-shrink-0 opacity-0 group-hover:opacity-35 transition-opacity"
        style={{ width: 11, height: 11, color: "rgba(255,255,255,0.5)" }}
      />
    </Link>
  );
}
