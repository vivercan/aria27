"use client";

import {
  Kanban, Gavel, FolderOpen, Scale, Building, Calculator, PackageCheck,
  Layers, Map, ListChecks, Camera, BookOpen, Activity, TrendingUp,
  ShieldCheck, Droplet, ChevronRight, FileText, BarChart2, BookMarked
} from "lucide-react";
import Link from "next/link";

/* ─── accesos rápidos bottom bar ─── */
const quickLinks = [
  { label: "Reporte Ejecutivo", href: "/dashboard/obras/reporte", icon: BarChart2,  color: "#3b82f6" },
  { label: "Bitácora de Obra",  href: "/dashboard/obras/bitacora", icon: BookMarked, color: "#a78bfa" },
  { label: "Export Excel",      href: "/dashboard/obras/control",  icon: FileText,   color: "#10b981" },
];

/* ─── grupos ─── */
const grupos = [
  {
    label: "Operación",
    acento: "#3b82f6",
    layout: "mosaic" as const,
    modulos: [
      {
        title: "Centro de Control",
        description: "Presupuesto vs gasto real (OC + nómina) por obra. Semáforo de avance.",
        href: "/dashboard/obras/control",
        icon: Activity,
        iconColor: "#3b82f6",
        iconBg: "rgba(59,130,246,0.20)",
      },
      {
        title: "Pipeline",
        description: "Vista kanban operativa de proyectos activos.",
        href: "/dashboard/obras/pipeline",
        icon: Kanban,
        iconColor: "#a78bfa",
        iconBg: "rgba(139,92,246,0.20)",
      },
      {
        title: "Avance Físico",
        description: "Captura semanal de % de avance físico real por obra.",
        href: "/dashboard/obras/avance",
        icon: TrendingUp,
        iconColor: "#10b981",
        iconBg: "rgba(16,185,129,0.20)",
      },
      {
        title: "Catálogo Maestro",
        description: "Fuente única de obras: alta, edición, archivo, historial.",
        href: "/dashboard/obras/catalogo",
        icon: BookOpen,
        iconColor: "#818cf8",
        iconBg: "rgba(99,102,241,0.20)",
      },
    ],
  },
  {
    label: "Construcción",
    acento: "#22d3ee",
    layout: "grid" as const,
    modulos: [
      {
        title: "Control de Concreto",
        description: "Remisiones de colado, f'c, m³, pruebas de cilindro 7/14/28 días.",
        href: "/dashboard/obras/concreto/remisiones",
        icon: Droplet,
        iconColor: "#22d3ee",
        iconBg: "rgba(6,182,212,0.20)",
      },
      {
        title: "Concreto",
        description: "Control de colados, resistencias y pedidos.",
        href: "/dashboard/obras/concreto",
        icon: Layers,
        iconColor: "#94a3b8",
        iconBg: "rgba(148,163,184,0.20)",
      },
      {
        title: "Presupuestos",
        description: "Presupuestos base y estimaciones de costo.",
        href: "/dashboard/obras/presupuestos",
        icon: Calculator,
        iconColor: "#22d3ee",
        iconBg: "rgba(6,182,212,0.20)",
      },
      {
        title: "Inventario",
        description: "Inventario de materiales por obra.",
        href: "/dashboard/obras/inventario",
        icon: PackageCheck,
        iconColor: "#2dd4bf",
        iconBg: "rgba(20,184,166,0.20)",
      },
    ],
  },
  {
    label: "Legal & IMSS",
    acento: "#f43f5e",
    layout: "grid" as const,
    modulos: [
      {
        title: "SIROC IMSS",
        description: "Registro de obras ante IMSS: fases, incidencias e importes bimestre.",
        href: "/dashboard/obras/siroc/registros",
        icon: ShieldCheck,
        iconColor: "#f43f5e",
        iconBg: "rgba(244,63,94,0.20)",
      },
      {
        title: "SIROC",
        description: "Registro IMSS de obras ante SIROC.",
        href: "/dashboard/obras/siroc",
        icon: Building,
        iconColor: "#fb7185",
        iconBg: "rgba(251,113,133,0.20)",
      },
      {
        title: "Contratos",
        description: "Contratos y documentación legal por obra.",
        href: "/dashboard/obras/contratos",
        icon: Scale,
        iconColor: "#c084fc",
        iconBg: "rgba(168,85,247,0.20)",
      },
      {
        title: "Licitaciones",
        description: "Gestión de licitaciones y concursos.",
        href: "/dashboard/obras/licitaciones",
        icon: Gavel,
        iconColor: "#fbbf24",
        iconBg: "rgba(245,158,11,0.20)",
      },
    ],
  },
  {
    label: "Documentación",
    acento: "#4ade80",
    layout: "grid" as const,
    modulos: [
      {
        title: "Expedientes",
        description: "Expedientes digitales de obra.",
        href: "/dashboard/obras/expedientes",
        icon: FolderOpen,
        iconColor: "#4ade80",
        iconBg: "rgba(34,197,94,0.20)",
      },
      {
        title: "Planos",
        description: "Visor de planos y documentos técnicos.",
        href: "/dashboard/obras/planos",
        icon: Map,
        iconColor: "#818cf8",
        iconBg: "rgba(129,140,248,0.20)",
      },
      {
        title: "Tareas",
        description: "Asignación de tareas y seguimiento de cumplimiento.",
        href: "/dashboard/obras/tareas",
        icon: ListChecks,
        iconColor: "#a3e635",
        iconBg: "rgba(132,204,22,0.20)",
      },
      {
        title: "Fotos de Avance",
        description: "Registro fotográfico de avance por obra.",
        href: "/dashboard/obras/fotos",
        icon: Camera,
        iconColor: "#fb923c",
        iconBg: "rgba(249,115,22,0.20)",
      },
    ],
  },
];

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
};

/* ══════════════════════════════════════════════════════
   PÁGINA
══════════════════════════════════════════════════════ */
export default function ObrasPage() {
  return (
    <div
      className="px-6 pt-6 pb-10 h-full overflow-auto"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, #1a6bc0 0%, #0e52a0 25%, #083070 55%, #021845 80%, #010c2a 100%)",
      }}
    >
      {/* ── HEADER ── */}
      <div className="mb-8">
        <h1
          className="text-[32px] font-extrabold tracking-tight leading-none"
          style={{
            background: "linear-gradient(90deg,#ffffff 0%,rgba(255,255,255,0.55) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Obras
        </h1>
        <p className="text-[13px] mt-1.5" style={{ color: "rgba(255,255,255,0.38)" }}>
          Gestión de proyectos y construcción
        </p>
      </div>

      {/* ── GRUPOS ── */}
      <div className="flex flex-col gap-8">
        {grupos.map((grupo) => (
          <section key={grupo.label}>
            {/* etiqueta */}
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-[10.5px] font-bold uppercase tracking-[0.12em]"
                style={{ color: grupo.acento }}
              >
                {grupo.label}
              </span>
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, ${grupo.acento}45 0%, transparent 100%)`,
                }}
              />
            </div>

            {/* LAYOUT MOSAICO para Operación */}
            {grupo.layout === "mosaic" ? (
              <MosaicGrid modulos={grupo.modulos} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {grupo.modulos.map((mod) => (
                  <HubCard key={mod.href} module={mod} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* ── ACCESOS RÁPIDOS (bottom) ── */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[10.5px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            Accesos Rápidos
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: "linear-gradient(90deg,rgba(255,255,255,0.10) 0%,transparent 100%)" }}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="group flex items-center gap-2 rounded-lg px-4 py-2.5 transition-all duration-150 hover:-translate-y-0.5"
              style={{
                backgroundColor: "rgba(8,18,40,0.70)",
                border: `1px solid ${ql.color}25`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${ql.color}55`;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 14px rgba(0,0,0,0.35), 0 0 10px ${ql.color}20`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${ql.color}25`;
                (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
              }}
            >
              <ql.icon style={{ width: 14, height: 14, color: ql.color }} strokeWidth={1.75} />
              <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
                {ql.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MOSAICO — Centro de Control ocupa 2×2, Pipeline 2×1
   Row 1: [CC (col 1-2)] [Pipeline (col 3-4)]
   Row 2: [CC (col 1-2)] [Avance Fís (col 3)] [Catálogo (col 4)]
══════════════════════════════════════════════════════ */
function MosaicGrid({ modulos }: { modulos: ModuleItem[] }) {
  const [cc, pipeline, avance, catalogo] = modulos;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-2 gap-3" style={{ gridAutoRows: "minmax(110px,auto)" }}>
      {/* Centro de Control — 2 cols × 2 rows */}
      <Link
        href={cc.href}
        className="group relative flex flex-col justify-between rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 col-span-2 row-span-2"
        style={{
          backgroundColor: "rgba(8,18,40,0.92)",
          border: `1px solid ${cc.iconColor}35`,
          borderTop: `1px solid ${cc.iconColor}55`,
          padding: "22px 20px",
          boxShadow: `0 6px 24px rgba(0,0,0,0.45)`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 36px rgba(0,0,0,0.55), 0 0 22px ${cc.iconColor}30`;
          (e.currentTarget as HTMLElement).style.borderColor = `${cc.iconColor}65`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(0,0,0,0.45)";
          (e.currentTarget as HTMLElement).style.borderColor = `${cc.iconColor}35`;
        }}
      >
        {/* glow decorativo */}
        <div
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: 180, height: 180, borderRadius: "50%", opacity: 0.15,
            background: `radial-gradient(circle, ${cc.iconColor} 0%, transparent 70%)`,
            transform: "translate(-40%, -40%)",
          }}
        />
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{
            width: 56, height: 56,
            backgroundColor: cc.iconBg,
            boxShadow: `0 0 20px ${cc.iconColor}35`,
          }}
        >
          <cc.icon style={{ width: 26, height: 26, color: cc.iconColor }} strokeWidth={1.6} />
        </div>
        <div>
          <h3
            className="text-[18px] font-bold leading-tight group-hover:text-white transition-colors"
            style={{ color: "rgba(255,255,255,0.97)" }}
          >
            {cc.title}
          </h3>
          <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.48)" }}>
            {cc.description}
          </p>
        </div>
        <ChevronRight
          className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-70 transition-opacity"
          style={{ width: 16, height: 16, color: cc.iconColor }}
        />
      </Link>

      {/* Pipeline — col 3-4, row 1 */}
      <Link
        href={pipeline.href}
        className="group relative flex items-center gap-4 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 col-span-2 row-span-1"
        style={{
          backgroundColor: "rgba(8,18,40,0.90)",
          border: `1px solid ${pipeline.iconColor}30`,
          borderTop: `1px solid ${pipeline.iconColor}50`,
          padding: "16px 18px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.40)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 22px rgba(0,0,0,0.50), 0 0 14px ${pipeline.iconColor}25`;
          (e.currentTarget as HTMLElement).style.borderColor = `${pipeline.iconColor}60`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.40)";
          (e.currentTarget as HTMLElement).style.borderColor = `${pipeline.iconColor}30`;
        }}
      >
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-xl"
          style={{
            width: 48, height: 48,
            backgroundColor: pipeline.iconBg,
            boxShadow: `0 0 16px ${pipeline.iconColor}30`,
          }}
        >
          <pipeline.icon style={{ width: 22, height: 22, color: pipeline.iconColor }} strokeWidth={1.65} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            className="text-[15px] font-bold group-hover:text-white transition-colors"
            style={{ color: "rgba(255,255,255,0.95)" }}
          >
            {pipeline.title}
          </h3>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.42)" }}>
            {pipeline.description}
          </p>
        </div>
        <ChevronRight
          className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ width: 14, height: 14, color: pipeline.iconColor }}
        />
      </Link>

      {/* Avance Físico — col 3, row 2 */}
      <HubCard module={avance} />

      {/* Catálogo Maestro — col 4, row 2 */}
      <HubCard module={catalogo} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TILE NORMAL
══════════════════════════════════════════════════════ */
function HubCard({ module }: { module: ModuleItem }) {
  return (
    <Link
      href={module.href}
      className="group relative flex items-center gap-3 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: "rgba(8,18,40,0.85)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "1px solid rgba(255,255,255,0.13)",
        padding: "14px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.30)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 6px 20px rgba(0,0,0,0.45), 0 0 12px ${module.iconColor}20`;
        (e.currentTarget as HTMLElement).style.borderColor = `${module.iconColor}40`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.30)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-lg"
        style={{
          width: 38, height: 38,
          backgroundColor: module.iconBg,
          boxShadow: `0 0 10px ${module.iconColor}25`,
        }}
      >
        <module.icon style={{ width: 17, height: 17, color: module.iconColor }} strokeWidth={1.75} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          className="text-[13px] font-semibold leading-tight group-hover:text-white transition-colors truncate"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {module.title}
        </h3>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.40)" }}>
          {module.description}
        </p>
      </div>
      <ChevronRight
        className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity"
        style={{ width: 13, height: 13, color: module.iconColor }}
      />
    </Link>
  );
}
