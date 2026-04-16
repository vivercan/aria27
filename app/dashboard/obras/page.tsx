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
  tag: string;
  hero?: boolean;
};

/* ── Paleta enterprise ── */
const BLUE    = "#66AFFF";   // Operación
const CYAN    = "#33D1FF";   // Construcción
const ROSE    = "#FF6F6F";   // Legal & IMSS
const EMERALD = "#2CE0AE";   // Documentación

const grupos: { label: string; accent: string; modulos: ModuleItem[] }[] = [
  {
    label: "Operación", accent: BLUE,
    modulos: [
      { title: "Centro de Control", description: "Presupuesto vs gasto real (OC + nómina) por obra. Semáforo de avance.", href: "/dashboard/obras/control",  icon: Activity,   accent: BLUE, tag: "CONTROL",   hero: true },
      { title: "Pipeline",          description: "Vista kanban operativa de proyectos activos.",                          href: "/dashboard/obras/pipeline", icon: Kanban,     accent: BLUE, tag: "PIPELINE"          },
      { title: "Avance Físico",     description: "Captura semanal de % de avance físico real por obra.",                 href: "/dashboard/obras/avance",   icon: TrendingUp, accent: BLUE, tag: "AVANCE"            },
      { title: "Catálogo Maestro",  description: "Alta, edición, archivo e historial de obras.",                         href: "/dashboard/obras/catalogo", icon: BookOpen,   accent: BLUE, tag: "CATÁLOGO"          },
    ],
  },
  {
    label: "Construcción", accent: CYAN,
    modulos: [
      { title: "Control de Concreto", description: "Remisiones de colado, f'c, m³, pruebas de cilindro 7/14/28 días.", href: "/dashboard/obras/concreto/remisiones", icon: Droplet,      accent: CYAN, tag: "CONCRETO"   },
      { title: "Concreto",            description: "Control de colados, resistencias y pedidos.",                       href: "/dashboard/obras/concreto",            icon: Layers,       accent: CYAN, tag: "COLADOS"    },
      { title: "Presupuestos",        description: "Presupuestos base y estimaciones de costo.",                        href: "/dashboard/obras/presupuestos",        icon: Calculator,   accent: CYAN, tag: "COSTOS"     },
      { title: "Inventario",          description: "Inventario de materiales por obra.",                                 href: "/dashboard/obras/inventario",          icon: PackageCheck, accent: CYAN, tag: "INVENTARIO" },
    ],
  },
  {
    label: "Legal & IMSS", accent: ROSE,
    modulos: [
      { title: "SIROC IMSS",   description: "Registro de obras ante IMSS: fases, incidencias e importes bimestrales.", href: "/dashboard/obras/siroc/registros", icon: ShieldCheck, accent: ROSE, tag: "IMSS"       },
      { title: "SIROC",        description: "Registro IMSS de obras ante SIROC.",                                      href: "/dashboard/obras/siroc",           icon: Building,    accent: ROSE, tag: "SIROC"      },
      { title: "Contratos",    description: "Contratos y documentación legal por obra.",                               href: "/dashboard/obras/contratos",       icon: Scale,       accent: ROSE, tag: "LEGAL"      },
      { title: "Licitaciones", description: "Gestión de licitaciones y concursos.",                                    href: "/dashboard/obras/licitaciones",    icon: Gavel,       accent: ROSE, tag: "LICITACIÓN" },
    ],
  },
  {
    label: "Documentación", accent: EMERALD,
    modulos: [
      { title: "Expedientes",    description: "Expedientes digitales de obra.",                         href: "/dashboard/obras/expedientes", icon: FolderOpen, accent: EMERALD, tag: "EXPEDIENTES" },
      { title: "Planos",         description: "Visor de planos y documentos técnicos.",                 href: "/dashboard/obras/planos",      icon: Map,        accent: EMERALD, tag: "PLANOS"      },
      { title: "Tareas",         description: "Asignación de tareas y seguimiento de cumplimiento.",    href: "/dashboard/obras/tareas",      icon: ListChecks, accent: EMERALD, tag: "TAREAS"      },
      { title: "Fotos de Avance",description: "Registro fotográfico de avance por obra.",               href: "/dashboard/obras/fotos",       icon: Camera,     accent: EMERALD, tag: "FOTOS"       },
    ],
  },
];

export default function ObrasPage() {
  return (
    <div
      className="px-5 pt-4 pb-4 h-full flex flex-col overflow-hidden"
      style={{
        background: [
          "radial-gradient(circle at 50% 34%, rgba(76,140,255,0.10) 0%, rgba(76,140,255,0.05) 18%, rgba(76,140,255,0.00) 44%)",
          "linear-gradient(180deg, #06152F 0%, #08204A 42%, #0A2553 100%)",
        ].join(", "),
      }}
    >
      {/* ── HEADER ── */}
      <div
        className="flex-shrink-0 mb-3 px-4 py-3 rounded-xl"
        style={{
          background: "linear-gradient(180deg, #113A8D 0%, #0E357F 100%)",
          borderBottom: "1px solid rgba(145,175,225,0.12)",
        }}
      >
        <div className="flex items-baseline gap-3.5">
          <h1
            className="leading-none"
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
              letterSpacing: 0,
            }}
          >
            Gestión de proyectos y construcción
          </span>
        </div>
      </div>

      {/* ── 4 SECCIONES ── */}
      <div className="flex-1 flex flex-col gap-2.5 min-h-0">
        {grupos.map((grupo) => (
          <section key={grupo.label} className="flex-1 flex flex-col min-h-0" style={{ gap: "10px" }}>
            {/* Label de sección */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <span
                className="uppercase"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: "rgba(188,208,238,0.68)",
                  flexShrink: 0,
                }}
              >
                {grupo.label}
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.14)", marginLeft: "10px" }} />
            </div>
            {/* Grid de cards */}
            <div className="flex-1 grid grid-cols-4 gap-2 min-h-0" style={{ alignItems: "stretch" }}>
              {grupo.modulos.map((mod) => (
                <HubCard key={mod.href} module={mod} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── ACCESOS RÁPIDOS ── */}
      <div className="flex-shrink-0 mt-3 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.14)" }} />
          <span
            className="uppercase"
            style={{
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "rgba(205,223,247,0.82)",
            }}
          >
            Accesos Rápidos
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.14)" }} />
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
                boxShadow: "0 2px 8px rgba(0,0,0,0.20)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 5px 14px rgba(0,0,0,0.26)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.20)";
              }}
            >
              <ql.icon style={{ width: 14, height: 14, color: "rgba(215,230,255,0.82)" }} strokeWidth={1.6} />
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
   HUBCARD — panel corporativo premium
══════════════════════════════════════════════════ */
function HubCard({ module }: { module: ModuleItem }) {
  const isHero = module.hero;
  const iconSize = isHero ? 36 : 30;

  return (
    <Link
      href={module.href}
      className="group relative flex flex-col justify-start rounded-[18px] transition-all duration-[220ms] ease-out"
      style={{
        height: "100%",
        padding: "18px 18px",
        background: "linear-gradient(180deg, #1B4599 0%, #173D8A 58%, #1E427B 100%)",
        border: "1px solid rgba(132,170,235,0.18)",
        boxShadow: "0 12px 28px rgba(0,0,0,0.18), inset 0 1px 0 rgba(210,228,255,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 18px 34px rgba(0,0,0,0.24), inset 0 1px 0 rgba(210,228,255,0.08)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(160,192,245,0.24)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 12px 28px rgba(0,0,0,0.18), inset 0 1px 0 rgba(210,228,255,0.06)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(132,170,235,0.18)";
      }}
    >
      {/* Fila superior: ícono + microetiqueta */}
      <div className="flex items-center flex-shrink-0" style={{ gap: "10px" }}>
        <module.icon
          style={{ width: iconSize, height: iconSize, color: module.accent, flexShrink: 0 }}
          strokeWidth={1.4}
        />
        <span
          className="uppercase"
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: "rgba(214,228,255,0.50)",
          }}
        >
          {module.tag}
        </span>
      </div>

      {/* Separación entre fila superior y título */}
      <div style={{ height: "18px", flexShrink: 0 }} />

      {/* Título */}
      <h3
        style={{
          fontSize: isHero ? "20px" : "18px",
          fontWeight: 800,
          color: "#F4F8FF",
          letterSpacing: "-0.020em",
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        {module.title}
      </h3>

      {/* Descripción */}
      <p
        style={{
          marginTop: "10px",
          fontSize: "13px",
          fontWeight: 500,
          color: "rgba(220,232,250,0.78)",
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
