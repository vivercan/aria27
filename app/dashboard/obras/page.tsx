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

const BLUE    = "#7BB6FF";
const CYAN    = "#46D4FF";
const ROSE    = "#FF7D74";
const EMERALD = "#3AD8B1";

const grupos: { label: string; modulos: ModuleItem[] }[] = [
  {
    label: "Operación",
    modulos: [
      { title: "Centro de Control", description: "Presupuesto vs gasto real por obra. Semáforo de avance.", href: "/dashboard/obras/control",  icon: Activity,   accent: BLUE, hero: true },
      { title: "Pipeline",          description: "Vista kanban de proyectos activos.",                       href: "/dashboard/obras/pipeline", icon: Kanban,     accent: BLUE },
      { title: "Avance Físico",     description: "Captura semanal de % real por obra.",                     href: "/dashboard/obras/avance",   icon: TrendingUp, accent: BLUE },
      { title: "Catálogo Maestro",  description: "Alta, edición y archivo de obras.",                       href: "/dashboard/obras/catalogo", icon: BookOpen,   accent: BLUE },
    ],
  },
  {
    label: "Construcción",
    modulos: [
      { title: "Control de Concreto", description: "Remisiones, f'c, m³, cilindros 7/14/28 días.", href: "/dashboard/obras/concreto/remisiones", icon: Droplet,      accent: CYAN },
      { title: "Concreto",            description: "Colados, resistencias y pedidos.",              href: "/dashboard/obras/concreto",            icon: Layers,       accent: CYAN },
      { title: "Presupuestos",        description: "Presupuestos base y estimaciones de costo.",    href: "/dashboard/obras/presupuestos",        icon: Calculator,   accent: CYAN },
      { title: "Inventario",          description: "Materiales por obra.",                           href: "/dashboard/obras/inventario",          icon: PackageCheck, accent: CYAN },
    ],
  },
  {
    label: "Legal & IMSS",
    modulos: [
      { title: "SIROC IMSS",   description: "Registro ante IMSS: fases e importes bimestrales.", href: "/dashboard/obras/siroc/registros", icon: ShieldCheck, accent: ROSE },
      { title: "SIROC",        description: "Registro de obras ante SIROC.",                    href: "/dashboard/obras/siroc",           icon: Building,    accent: ROSE },
      { title: "Contratos",    description: "Contratos y documentación legal por obra.",         href: "/dashboard/obras/contratos",       icon: Scale,       accent: ROSE },
      { title: "Licitaciones", description: "Licitaciones y concursos.",                         href: "/dashboard/obras/licitaciones",    icon: Gavel,       accent: ROSE },
    ],
  },
  {
    label: "Documentación",
    modulos: [
      { title: "Expedientes",    description: "Expedientes digitales de obra.",              href: "/dashboard/obras/expedientes", icon: FolderOpen, accent: EMERALD },
      { title: "Planos",         description: "Visor de planos y documentos técnicos.",      href: "/dashboard/obras/planos",      icon: Map,        accent: EMERALD },
      { title: "Tareas",         description: "Asignación y seguimiento de tareas.",         href: "/dashboard/obras/tareas",      icon: ListChecks, accent: EMERALD },
      { title: "Fotos de Avance",description: "Registro fotográfico por obra.",              href: "/dashboard/obras/fotos",       icon: Camera,     accent: EMERALD },
    ],
  },
];

/* Agrupa los 4 grupos en 2 filas de 2 */
const filas = [
  [grupos[0], grupos[1]],
  [grupos[2], grupos[3]],
];

export default function ObrasPage() {
  return (
    <div
      className="px-5 pt-4 pb-4 h-full flex flex-col overflow-hidden"
      style={{
        background: [
          "radial-gradient(circle at 50% 28%, rgba(72,128,230,0.07) 0%, rgba(72,128,230,0.03) 20%, rgba(72,128,230,0.00) 44%)",
          "linear-gradient(180deg, #06152F 0%, #081E46 44%, #0A2450 100%)",
        ].join(", "),
      }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex-shrink-0 rounded-xl px-5 py-3"
        style={{
          marginBottom: "24px",
          background: "linear-gradient(180deg, #123E92 0%, #103A86 100%)",
          borderBottom: "1px solid rgba(150,180,230,0.10)",
        }}
      >
        <div className="flex items-baseline gap-3.5">
          <h1
            style={{
              fontSize: "30px",
              fontWeight: 800,
              letterSpacing: "-0.035em",
              color: "#F4F8FF",
              lineHeight: 1,
            }}
          >
            Obras
          </h1>
          <span style={{ color: "rgba(145,175,225,0.35)", fontSize: "15px" }}>·</span>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(214,228,255,0.70)" }}>
            Gestión de proyectos y construcción
          </span>
        </div>
      </div>

      {/* ── GRID 2×2 DE SECCIONES ── */}
      <div className="flex-1 flex flex-col min-h-0" style={{ gap: "22px" }}>
        {filas.map((fila, fi) => (
          <div
            key={fi}
            className="flex-1 grid grid-cols-2 min-h-0"
            style={{ gap: "20px" }}
          >
            {fila.map((grupo) => (
              <section key={grupo.label} className="flex flex-col min-h-0">

                {/* Label */}
                <div
                  className="flex items-center flex-shrink-0"
                  style={{ gap: "12px", marginBottom: "12px" }}
                >
                  <span
                    className="uppercase"
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.16em",
                      color: "rgba(188,208,238,0.58)",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {grupo.label}
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: "rgba(145,175,225,0.11)" }}
                  />
                </div>

                {/* 2×2 card grid */}
                <div
                  className="flex-1 grid grid-cols-2 min-h-0"
                  style={{ gap: "10px", alignItems: "stretch" }}
                >
                  {grupo.modulos.map((mod) => (
                    <HubCard key={mod.href} module={mod} />
                  ))}
                </div>

              </section>
            ))}
          </div>
        ))}
      </div>

      {/* ── ACCESOS RÁPIDOS ── */}
      <div
        className="flex-shrink-0 flex flex-col items-center"
        style={{ marginTop: "22px", gap: "14px" }}
      >
        <div className="flex items-center w-full" style={{ gap: "16px" }}>
          <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.11)" }} />
          <span
            className="uppercase"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "rgba(205,223,247,0.75)",
              flexShrink: 0,
            }}
          >
            Accesos Rápidos
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.11)" }} />
        </div>
        <div className="flex gap-3">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="flex items-center gap-2 rounded-full px-5 py-2 transition-all duration-200"
              style={{
                background: "linear-gradient(180deg, #1E3E7A 0%, #193670 100%)",
                border: "1px solid rgba(130,170,230,0.18)",
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
              <ql.icon style={{ width: 13, height: 13, color: "rgba(200,220,255,0.80)" }} strokeWidth={1.6} />
              <span style={{ fontSize: "12px", fontWeight: 500, color: "#E0EEFF" }}>
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
   HUBCARD — gris ejecutivo con contraste claro
══════════════════════════════════════════════════ */
function HubCard({ module }: { module: ModuleItem }) {
  const isHero  = module.hero;
  const iconSize = isHero ? 34 : 29;

  return (
    <Link
      href={module.href}
      className="group relative flex flex-col justify-start rounded-2xl transition-all duration-200 ease-out"
      style={{
        height: "100%",
        padding: "20px 18px 18px 20px",
        background: isHero
          ? "linear-gradient(180deg, #314357 0%, #2A3C50 54%, #243448 100%)"
          : "linear-gradient(180deg, #2C3D52 0%, #263647 54%, #21303E 100%)",
        border: isHero
          ? `1px solid rgba(120,158,204,0.28)`
          : "1px solid rgba(120,158,204,0.18)",
        boxShadow: isHero
          ? `inset 0 1px 0 rgba(210,228,252,0.08), 0 10px 24px rgba(0,0,0,0.22)`
          : "inset 0 1px 0 rgba(210,228,252,0.05), 0 8px 20px rgba(0,0,0,0.20)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "inset 0 1px 0 rgba(210,228,252,0.08), 0 16px 32px rgba(0,0,0,0.26)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(140,178,228,0.30)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "inset 0 1px 0 rgba(210,228,252,0.05), 0 8px 20px rgba(0,0,0,0.20)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(120,158,204,0.18)";
      }}
    >
      {/* Ícono */}
      <module.icon
        style={{ width: iconSize, height: iconSize, color: module.accent, flexShrink: 0 }}
        strokeWidth={1.6}
      />

      {/* Espaciado icono → título */}
      <div style={{ height: "14px", flexShrink: 0 }} />

      {/* Título */}
      <h3
        style={{
          fontSize: isHero ? "18px" : "16px",
          fontWeight: 700,
          color: "#F0F6FF",
          letterSpacing: "-0.018em",
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        {module.title}
      </h3>

      {/* Descripción */}
      <p
        style={{
          marginTop: "7px",
          fontSize: "12px",
          fontWeight: 400,
          color: "rgba(200,220,248,0.72)",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        } as React.CSSProperties}
      >
        {module.description}
      </p>

      <ChevronRight
        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-25 transition-opacity duration-200"
        style={{ width: 12, height: 12, color: module.accent }}
      />
    </Link>
  );
}
