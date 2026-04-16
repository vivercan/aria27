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

/* ── Colores exactos por sección ── */
const BLUE    = "#7BB6FF";   // Operación
const CYAN    = "#46D4FF";   // Construcción
const ROSE    = "#FF7D74";   // Legal & IMSS
const EMERALD = "#3AD8B1";   // Documentación

const grupos: { label: string; modulos: ModuleItem[] }[] = [
  {
    label: "Operación",
    modulos: [
      { title: "Centro de Control", description: "Presupuesto vs gasto real (OC + nómina) por obra. Semáforo de avance.", href: "/dashboard/obras/control",  icon: Activity,   accent: BLUE, hero: true },
      { title: "Pipeline",          description: "Vista kanban operativa de proyectos activos.",                          href: "/dashboard/obras/pipeline", icon: Kanban,     accent: BLUE },
      { title: "Avance Físico",     description: "Captura semanal de % de avance físico real por obra.",                 href: "/dashboard/obras/avance",   icon: TrendingUp, accent: BLUE },
      { title: "Catálogo Maestro",  description: "Alta, edición, archivo e historial de obras.",                         href: "/dashboard/obras/catalogo", icon: BookOpen,   accent: BLUE },
    ],
  },
  {
    label: "Construcción",
    modulos: [
      { title: "Control de Concreto", description: "Remisiones de colado, f'c, m³, pruebas de cilindro 7/14/28 días.", href: "/dashboard/obras/concreto/remisiones", icon: Droplet,      accent: CYAN },
      { title: "Concreto",            description: "Control de colados, resistencias y pedidos.",                       href: "/dashboard/obras/concreto",            icon: Layers,       accent: CYAN },
      { title: "Presupuestos",        description: "Presupuestos base y estimaciones de costo.",                        href: "/dashboard/obras/presupuestos",        icon: Calculator,   accent: CYAN },
      { title: "Inventario",          description: "Inventario de materiales por obra.",                                 href: "/dashboard/obras/inventario",          icon: PackageCheck, accent: CYAN },
    ],
  },
  {
    label: "Legal & IMSS",
    modulos: [
      { title: "SIROC IMSS",   description: "Registro de obras ante IMSS: fases, incidencias e importes bimestrales.", href: "/dashboard/obras/siroc/registros", icon: ShieldCheck, accent: ROSE },
      { title: "SIROC",        description: "Registro IMSS de obras ante SIROC.",                                      href: "/dashboard/obras/siroc",           icon: Building,    accent: ROSE },
      { title: "Contratos",    description: "Contratos y documentación legal por obra.",                               href: "/dashboard/obras/contratos",       icon: Scale,       accent: ROSE },
      { title: "Licitaciones", description: "Gestión de licitaciones y concursos.",                                    href: "/dashboard/obras/licitaciones",    icon: Gavel,       accent: ROSE },
    ],
  },
  {
    label: "Documentación",
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
      className="px-5 pt-4 pb-4 h-full flex flex-col overflow-hidden"
      style={{
        background: [
          "radial-gradient(circle at 50% 28%, rgba(72,132,235,0.08) 0%, rgba(72,132,235,0.04) 18%, rgba(72,132,235,0.00) 42%)",
          "linear-gradient(180deg, #06152F 0%, #08204A 44%, #0A2553 100%)",
        ].join(", "),
      }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex-shrink-0 rounded-xl px-5 py-3"
        style={{
          marginBottom: "30px",
          background: "linear-gradient(180deg, #123E92 0%, #103A86 100%)",
          borderBottom: "1px solid rgba(150,180,230,0.10)",
        }}
      >
        <div className="flex items-baseline gap-3.5">
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: "#F4F8FF",
              lineHeight: 1,
            }}
          >
            Obras
          </h1>
          <span style={{ color: "rgba(145,175,225,0.35)", fontSize: "16px" }}>·</span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(214,228,255,0.72)",
            }}
          >
            Gestión de proyectos y construcción
          </span>
        </div>
      </div>

      {/* ── 4 SECCIONES ── */}
      <div className="flex-1 flex flex-col min-h-0" style={{ gap: "26px" }}>
        {grupos.map((grupo) => (
          <section key={grupo.label} className="flex-1 flex flex-col min-h-0">

            {/* Label de sección */}
            <div
              className="flex items-center flex-shrink-0"
              style={{ gap: "12px", marginBottom: "16px" }}
            >
              <span
                className="uppercase"
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  color: "rgba(188,208,238,0.64)",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                {grupo.label}
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "rgba(145,175,225,0.12)" }}
              />
            </div>

            {/* Grid de cards */}
            <div
              className="flex-1 grid grid-cols-4 min-h-0"
              style={{ gap: "10px", alignItems: "stretch" }}
            >
              {grupo.modulos.map((mod) => (
                <HubCard key={mod.href} module={mod} />
              ))}
            </div>

          </section>
        ))}
      </div>

      {/* ── ACCESOS RÁPIDOS ── */}
      <div
        className="flex-shrink-0 flex flex-col items-center"
        style={{ marginTop: "40px", gap: "20px" }}
      >
        <div
          className="flex items-center w-full"
          style={{ gap: "20px" }}
        >
          <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.12)" }} />
          <span
            className="uppercase"
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "rgba(205,223,247,0.82)",
              flexShrink: 0,
            }}
          >
            Accesos Rápidos
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.12)" }} />
        </div>

        <div className="flex gap-3">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 transition-all duration-200"
              style={{
                background: "linear-gradient(180deg, #214A98 0%, #1C428A 100%)",
                border: "1px solid rgba(150,184,236,0.18)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 16px rgba(0,0,0,0.26)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)";
              }}
            >
              <ql.icon
                style={{ width: 14, height: 14, color: "rgba(215,230,255,0.82)" }}
                strokeWidth={1.6}
              />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#EAF2FF" }}>
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
   HUBCARD
══════════════════════════════════════════════════ */
function HubCard({ module }: { module: ModuleItem }) {
  const isHero  = module.hero;
  const iconSize = isHero ? 37 : 31;   // original 36/30 + 4%

  return (
    <Link
      href={module.href}
      className="group relative flex flex-col justify-start rounded-[18px] transition-all duration-[220ms] ease-out"
      style={{
        height: "100%",
        paddingTop: "28px",
        paddingRight: "24px",
        paddingBottom: "24px",
        paddingLeft: "24px",
        background: "linear-gradient(180deg, #294D86 0%, #24457A 54%, #203C69 100%)",
        border: "1px solid rgba(136,166,214,0.14)",
        boxShadow:
          "inset 0 1px 0 rgba(220,232,252,0.04), 0 10px 24px rgba(0,0,0,0.14)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "inset 0 1px 0 rgba(220,232,252,0.07), 0 18px 36px rgba(0,0,0,0.22)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(155,190,245,0.22)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "inset 0 1px 0 rgba(220,232,252,0.04), 0 10px 24px rgba(0,0,0,0.14)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(136,166,214,0.14)";
      }}
    >
      {/* Ícono — solo, sin texto */}
      <module.icon
        style={{
          width: iconSize,
          height: iconSize,
          color: module.accent,
          flexShrink: 0,
        }}
        strokeWidth={1.4}
      />

      {/* 24px entre icono y título */}
      <div style={{ height: "24px", flexShrink: 0 }} />

      {/* Título */}
      <h3
        style={{
          fontSize: isHero ? "20px" : "18px",
          fontWeight: 800,
          color: "#F4F8FF",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        {module.title}
      </h3>

      {/* 12px entre título y descripción */}
      <p
        style={{
          marginTop: "12px",
          fontSize: "14px",
          fontWeight: 500,
          color: "rgba(224,234,248,0.80)",
          lineHeight: 1.55,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        } as React.CSSProperties}
      >
        {module.description}
      </p>

      <ChevronRight
        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-25 transition-opacity duration-200"
        style={{ width: 13, height: 13, color: module.accent }}
      />
    </Link>
  );
}
