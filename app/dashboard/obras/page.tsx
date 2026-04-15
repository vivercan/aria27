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

/* ── Paleta enterprise premium ── */
const BLUE    = "#56A3FF";   // Operación
const CYAN    = "#27D3FF";   // Construcción
const ROSE    = "#FF6B6B";   // Legal & IMSS
const EMERALD = "#27E0A3";   // Documentación

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
        background: [
          "radial-gradient(ellipse at 50% 38%, rgba(17,58,141,0.26) 0%, transparent 60%)",
          "linear-gradient(180deg, #06152F 0%, #08204A 28%, #0A2553 55%, #071840 83%, #06152F 100%)",
        ].join(", "),
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex items-baseline gap-2.5">
          <h1
            className="text-[28px] font-extrabold leading-none"
            style={{ color: "#F4F8FF", letterSpacing: "-0.022em" }}
          >
            Obras
          </h1>
          <span className="text-[13px]" style={{ color: "rgba(190,210,245,0.30)" }}>·</span>
          <span className="text-[13px] font-light" style={{ color: "rgba(190,210,245,0.50)", letterSpacing: "0.01em" }}>
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
                className="text-[9px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "rgba(190,210,245,0.42)" }}
              >
                {grupo.label}
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(140,180,255,0.10)" }} />
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2 min-h-0" style={{ alignItems: "stretch" }}>
              {grupo.modulos.map((mod) => (
                <HubCard key={mod.href} module={mod} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── ACCESOS RÁPIDOS ── */}
      <div className="flex-shrink-0 mt-4 flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px" style={{ background: "rgba(140,180,255,0.10)" }} />
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(190,210,245,0.42)" }}
          >
            Accesos Rápidos
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(140,180,255,0.10)" }} />
        </div>
        <div className="flex gap-3">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 transition-all duration-200"
              style={{
                background: "linear-gradient(160deg, #1D448F 0%, #173A84 100%)",
                border: "1px solid rgba(120,170,255,0.20)",
                boxShadow: "0 2px 8px rgba(4,14,38,0.42), inset 0 1px 0 rgba(120,170,255,0.10)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "linear-gradient(160deg, #2250A8 0%, #1D448F 100%)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(120,170,255,0.34)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(4,14,38,0.52), inset 0 1px 0 rgba(120,170,255,0.14)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "linear-gradient(160deg, #1D448F 0%, #173A84 100%)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(120,170,255,0.20)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(4,14,38,0.42), inset 0 1px 0 rgba(120,170,255,0.10)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <ql.icon style={{ width: 14, height: 14, color: "#56A3FF" }} strokeWidth={1.6} />
              <span className="text-[13px] font-medium" style={{ color: "rgba(214,228,255,0.88)" }}>
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
   HUBCARD — panel corporativo premium
══════════════════════════════════════════════════ */
function HubCard({ module }: { module: ModuleItem }) {
  const isHero = module.hero;
  return (
    <Link
      href={module.href}
      className="group relative flex flex-col justify-start rounded-xl transition-all duration-200"
      style={{
        height: "100%",
        padding: "20px 20px",
        background: isHero
          ? "linear-gradient(160deg, #1B4AA8 0%, #163D8F 58%, #13367F 100%)"
          : "linear-gradient(160deg, #163D8F 0%, #13367F 100%)",
        border: `1px solid rgba(120,170,255,${isHero ? "0.20" : "0.11"})`,
        borderTop: `1px solid rgba(${hexToRgb(module.accent)},${isHero ? "0.48" : "0.28"})`,
        boxShadow: isHero
          ? "0 4px 16px rgba(4,14,38,0.55), inset 0 1px 0 rgba(120,170,255,0.12)"
          : "0 2px 10px rgba(4,14,38,0.44), inset 0 1px 0 rgba(120,170,255,0.07)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = isHero
          ? "linear-gradient(160deg, #2050B8 0%, #1B4AA8 58%, #163D8F 100%)"
          : "linear-gradient(160deg, #1B4AA8 0%, #163D8F 100%)";
        (e.currentTarget as HTMLElement).style.borderColor = `rgba(${hexToRgb(module.accent)},0.32)`;
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 6px 20px rgba(4,14,38,0.62), 0 0 18px rgba(76,140,255,0.09), inset 0 1px 0 rgba(120,170,255,0.16)`;
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = isHero
          ? "linear-gradient(160deg, #1B4AA8 0%, #163D8F 58%, #13367F 100%)"
          : "linear-gradient(160deg, #163D8F 0%, #13367F 100%)";
        (e.currentTarget as HTMLElement).style.borderColor = `rgba(120,170,255,${isHero ? "0.20" : "0.11"})`;
        (e.currentTarget as HTMLElement).style.boxShadow = isHero
          ? "0 4px 16px rgba(4,14,38,0.55), inset 0 1px 0 rgba(120,170,255,0.12)"
          : "0 2px 10px rgba(4,14,38,0.44), inset 0 1px 0 rgba(120,170,255,0.07)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <div className="flex flex-col gap-3">
        <module.icon
          style={{ width: isHero ? 34 : 28, height: isHero ? 34 : 28, color: module.accent }}
          strokeWidth={1.4}
        />
        <div>
          <h3
            className="font-semibold leading-snug"
            style={{ fontSize: isHero ? "20px" : "16px", color: "#F4F8FF", letterSpacing: "-0.012em" }}
          >
            {module.title}
          </h3>
          <p
            className="mt-1.5 leading-relaxed"
            style={{
              fontSize: "13px",
              color: "rgba(214,228,255,0.72)",
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
        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-30 transition-opacity duration-200"
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
