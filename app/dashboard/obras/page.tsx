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

/* ── un solo color por sección — paleta sobria ── */
const BLUE   = "#3b82f6";   // Operación
const CYAN   = "#22d3ee";   // Construcción
const ROSE   = "#f87171";   // Legal & IMSS
const EMERALD= "#34d399";   // Documentación

const grupos: { label: string; accent: string; modulos: ModuleItem[] }[] = [
  {
    label: "Operación", accent: BLUE,
    modulos: [
      { title: "Centro de Control", description: "Presupuesto vs gasto real (OC + nómina) por obra. Semáforo de avance.", href: "/dashboard/obras/control",  icon: Activity,   accent: BLUE, hero: true },
      { title: "Pipeline",          description: "Vista kanban operativa de proyectos activos.",                          href: "/dashboard/obras/pipeline", icon: Kanban,     accent: BLUE },
      { title: "Avance Físico",     description: "Captura semanal de % de avance físico real por obra.",                 href: "/dashboard/obras/avance",   icon: TrendingUp, accent: BLUE },
      { title: "Catálogo Maestro",  description: "Alta, edición, archivo e historial de obras.",                         href: "/dashboard/obras/catalogo", icon: BookOpen,   accent: BLUE },
    ],
  },
  {
    label: "Construcción", accent: CYAN,
    modulos: [
      { title: "Control de Concreto", description: "Remisiones de colado, f'c, m³, pruebas de cilindro 7/14/28 días.", href: "/dashboard/obras/concreto/remisiones", icon: Droplet,      accent: CYAN },
      { title: "Concreto",            description: "Control de colados, resistencias y pedidos.",                       href: "/dashboard/obras/concreto",            icon: Layers,       accent: CYAN },
      { title: "Presupuestos",        description: "Presupuestos base y estimaciones de costo.",                        href: "/dashboard/obras/presupuestos",        icon: Calculator,   accent: CYAN },
      { title: "Inventario",          description: "Inventario de materiales por obra.",                                 href: "/dashboard/obras/inventario",          icon: PackageCheck, accent: CYAN },
    ],
  },
  {
    label: "Legal & IMSS", accent: ROSE,
    modulos: [
      { title: "SIROC IMSS",   description: "Registro de obras ante IMSS: fases, incidencias e importes bimestrales.", href: "/dashboard/obras/siroc/registros", icon: ShieldCheck, accent: ROSE },
      { title: "SIROC",        description: "Registro IMSS de obras ante SIROC.",                                      href: "/dashboard/obras/siroc",           icon: Building,    accent: ROSE },
      { title: "Contratos",    description: "Contratos y documentación legal por obra.",                               href: "/dashboard/obras/contratos",       icon: Scale,       accent: ROSE },
      { title: "Licitaciones", description: "Gestión de licitaciones y concursos.",                                    href: "/dashboard/obras/licitaciones",    icon: Gavel,       accent: ROSE },
    ],
  },
  {
    label: "Documentación", accent: EMERALD,
    modulos: [
      { title: "Expedientes",    description: "Expedientes digitales de obra.",                         href: "/dashboard/obras/expedientes", icon: FolderOpen, accent: EMERALD },
      { title: "Planos",         description: "Visor de planos y documentos técnicos.",                 href: "/dashboard/obras/planos",      icon: Map,        accent: EMERALD },
      { title: "Tareas",         description: "Asignación de tareas y seguimiento de cumplimiento.",    href: "/dashboard/obras/tareas",      icon: ListChecks, accent: EMERALD },
      { title: "Fotos de Avance",description: "Registro fotográfico de avance por obra.",               href: "/dashboard/obras/fotos",       icon: Camera,     accent: EMERALD },
    ],
  },
];

export default function ObrasPage() {
  return (
    <div
      className="px-5 pt-5 pb-5 h-full flex flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #1565c0 0%, #0d47a1 20%, #072a6e 50%, #021440 75%, #010b22 100%)",
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-baseline gap-2.5">
          <h1
            className="text-[28px] font-extrabold tracking-tight leading-none"
            style={{
              background: "linear-gradient(90deg,#fff 0%,rgba(255,255,255,0.60) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Obras
          </h1>
          <span className="text-[14px]" style={{ color: "rgba(255,255,255,0.32)" }}>·</span>
          <span className="text-[14px]" style={{ color: "rgba(255,255,255,0.42)" }}>
            Gestión de proyectos y construcción
          </span>
        </div>
      </div>

      {/* ── 4 SECCIONES ── */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {grupos.map((grupo) => (
          <section key={grupo.label} className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <span
                className="text-[9.5px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                {grupo.label}
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2 min-h-0" style={{ alignItems: "stretch" }}>
              {grupo.modulos.map((mod) => (
                <HubCard key={mod.href} module={mod} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── ACCESOS RÁPIDOS — dock centrado abajo ── */}
      <div className="flex-shrink-0 mt-4 flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          <span className="text-[9.5px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.28)" }}>
            Accesos Rápidos
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>
        <div className="flex gap-3">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 transition-all duration-150 hover:-translate-y-0.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(12px)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.22)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
              }}
            >
              <ql.icon style={{ width: 14, height: 14, color: "rgba(255,255,255,0.75)" }} strokeWidth={1.6} />
              <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>
                {ql.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TILE — ícono + texto centrados verticalmente
══════════════════════════════════════════════════ */
function HubCard({ module }: { module: ModuleItem }) {
  const isHero = module.hero;
  return (
    <Link
      href={module.href}
      className="group relative flex flex-col justify-start rounded-xl transition-all duration-200 hover:-translate-y-0.5"
      style={{
        height: "100%",
        padding: "20px 20px",
        backgroundColor: isHero
          ? `rgba(${hexToRgb(module.accent)},0.10)`
          : "rgba(255,255,255,0.04)",
        border: `1px solid rgba(${hexToRgb(module.accent)},${isHero ? "0.28" : "0.12"})`,
        borderTop: `1px solid rgba(${hexToRgb(module.accent)},${isHero ? "0.45" : "0.20"})`,
        boxShadow: isHero
          ? `0 4px 20px rgba(${hexToRgb(module.accent)},0.08), 0 2px 8px rgba(0,0,0,0.28)`
          : "0 2px 8px rgba(0,0,0,0.22)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          `rgba(${hexToRgb(module.accent)},${isHero ? "0.15" : "0.08"})`;
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 6px 22px rgba(0,0,0,0.38), 0 0 14px rgba(${hexToRgb(module.accent)},0.12)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = isHero
          ? `rgba(${hexToRgb(module.accent)},0.10)`
          : "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLElement).style.boxShadow = isHero
          ? `0 4px 20px rgba(${hexToRgb(module.accent)},0.08), 0 2px 8px rgba(0,0,0,0.28)`
          : "0 2px 8px rgba(0,0,0,0.22)";
      }}
    >
      <div className="flex flex-col gap-3">
        {/* ícono — strokeWidth fino, más elegante */}
        <module.icon
          style={{ width: isHero ? 34 : 28, height: isHero ? 34 : 28, color: module.accent }}
          strokeWidth={1.35}
        />
        <div>
          <h3
            className="font-semibold leading-snug"
            style={{ fontSize: isHero ? "20px" : "16px", color: "rgba(255,255,255,0.96)" }}
          >
            {module.title}
          </h3>
          <p
            className="mt-1.5 leading-relaxed"
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.44)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            } as React.CSSProperties}
          >
            {module.description}
          </p>
        </div>
      </div>

      <ChevronRight
        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-40 transition-opacity duration-200"
        style={{ width: 13, height: 13, color: module.accent }}
      />
    </Link>
  );
}

/* convierte hex a "r,g,b" para usar en rgba() */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
