"use client";

import {
  Kanban, Gavel, FolderOpen, Scale, Building, Calculator, PackageCheck,
  Layers, Map, ListChecks, Camera, BookOpen, Activity, TrendingUp, ShieldCheck,
  Droplet, ChevronRight
} from "lucide-react";
import Link from "next/link";

/* ─── categorías con color de acento propio ─── */
const grupos = [
  {
    label: "Operación",
    acento: "#3b82f6",
    modulos: [
      {
        title: "Centro de Control",
        description: "Presupuesto vs gasto real (OC + nómina) por obra. Semáforo de avance.",
        href: "/dashboard/obras/control",
        icon: Activity,
        iconColor: "#3b82f6",
        iconBg: "rgba(59,130,246,0.18)",
        hero: true,
      },
      {
        title: "Pipeline",
        description: "Vista kanban operativa de proyectos activos.",
        href: "/dashboard/obras/pipeline",
        icon: Kanban,
        iconColor: "#a78bfa",
        iconBg: "rgba(139,92,246,0.18)",
        hero: true,
      },
      {
        title: "Avance Físico",
        description: "Captura semanal de % de avance físico real por obra.",
        href: "/dashboard/obras/avance",
        icon: TrendingUp,
        iconColor: "#10b981",
        iconBg: "rgba(16,185,129,0.18)",
      },
      {
        title: "Catálogo Maestro",
        description: "Fuente única de obras: alta, edición, archivo, historial.",
        href: "/dashboard/obras/catalogo",
        icon: BookOpen,
        iconColor: "#818cf8",
        iconBg: "rgba(99,102,241,0.18)",
      },
    ],
  },
  {
    label: "Construcción",
    acento: "#22d3ee",
    modulos: [
      {
        title: "Control de Concreto",
        description: "Remisiones de colado, f'c, m³, pruebas de cilindro 7/14/28 días.",
        href: "/dashboard/obras/concreto/remisiones",
        icon: Droplet,
        iconColor: "#22d3ee",
        iconBg: "rgba(6,182,212,0.18)",
      },
      {
        title: "Concreto",
        description: "Control de colados, resistencias y pedidos.",
        href: "/dashboard/obras/concreto",
        icon: Layers,
        iconColor: "#94a3b8",
        iconBg: "rgba(148,163,184,0.18)",
      },
      {
        title: "Presupuestos",
        description: "Presupuestos base y estimaciones de costo.",
        href: "/dashboard/obras/presupuestos",
        icon: Calculator,
        iconColor: "#22d3ee",
        iconBg: "rgba(6,182,212,0.18)",
      },
      {
        title: "Inventario",
        description: "Inventario de materiales por obra.",
        href: "/dashboard/obras/inventario",
        icon: PackageCheck,
        iconColor: "#2dd4bf",
        iconBg: "rgba(20,184,166,0.18)",
      },
    ],
  },
  {
    label: "Legal & IMSS",
    acento: "#f43f5e",
    modulos: [
      {
        title: "SIROC IMSS",
        description: "Registro de obras ante IMSS: fases, incidencias e importes bimestre.",
        href: "/dashboard/obras/siroc/registros",
        icon: ShieldCheck,
        iconColor: "#f43f5e",
        iconBg: "rgba(244,63,94,0.18)",
      },
      {
        title: "SIROC",
        description: "Registro IMSS de obras ante SIROC.",
        href: "/dashboard/obras/siroc",
        icon: Building,
        iconColor: "#fb7185",
        iconBg: "rgba(251,113,133,0.18)",
      },
      {
        title: "Contratos",
        description: "Contratos y documentación legal por obra.",
        href: "/dashboard/obras/contratos",
        icon: Scale,
        iconColor: "#c084fc",
        iconBg: "rgba(168,85,247,0.18)",
      },
      {
        title: "Licitaciones",
        description: "Gestión de licitaciones y concursos.",
        href: "/dashboard/obras/licitaciones",
        icon: Gavel,
        iconColor: "#fbbf24",
        iconBg: "rgba(245,158,11,0.18)",
      },
    ],
  },
  {
    label: "Documentación",
    acento: "#4ade80",
    modulos: [
      {
        title: "Expedientes",
        description: "Expedientes digitales de obra.",
        href: "/dashboard/obras/expedientes",
        icon: FolderOpen,
        iconColor: "#4ade80",
        iconBg: "rgba(34,197,94,0.18)",
      },
      {
        title: "Planos",
        description: "Visor de planos y documentos técnicos.",
        href: "/dashboard/obras/planos",
        icon: Map,
        iconColor: "#818cf8",
        iconBg: "rgba(129,140,248,0.18)",
      },
      {
        title: "Tareas",
        description: "Asignación de tareas y seguimiento de cumplimiento.",
        href: "/dashboard/obras/tareas",
        icon: ListChecks,
        iconColor: "#a3e635",
        iconBg: "rgba(132,204,22,0.18)",
      },
      {
        title: "Fotos de Avance",
        description: "Registro fotográfico de avance por obra.",
        href: "/dashboard/obras/fotos",
        icon: Camera,
        iconColor: "#fb923c",
        iconBg: "rgba(249,115,22,0.18)",
      },
    ],
  },
];

/* ─── tipo ─── */
type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  hero?: boolean;
};

/* ─── página ─── */
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
          className="text-3xl font-extrabold tracking-tight"
          style={{
            background: "linear-gradient(90deg,#ffffff 0%,rgba(255,255,255,0.65) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
          }}
        >
          Obras
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>
          Gestión de proyectos y construcción
        </p>
      </div>

      {/* ── GRUPOS ── */}
      <div className="flex flex-col gap-8">
        {grupos.map((grupo) => (
          <section key={grupo.label}>
            {/* etiqueta de grupo */}
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: grupo.acento }}
              >
                {grupo.label}
              </span>
              <div
                className="flex-1 h-px"
                style={{
                  background: `linear-gradient(90deg, ${grupo.acento}40 0%, transparent 100%)`,
                }}
              />
            </div>

            {/* grid de tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {grupo.modulos.map((mod) =>
                mod.hero ? (
                  <HeroCard key={mod.href} module={mod} />
                ) : (
                  <HubCard key={mod.href} module={mod} />
                )
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ─── TILE HÉROE (primeros 2 de Operación) ─── */
function HeroCard({ module }: { module: ModuleItem }) {
  return (
    <Link
      href={module.href}
      className="group relative flex flex-col gap-3 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
      style={{
        backgroundColor: "rgba(8,18,40,0.90)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${module.iconColor}30`,
        borderTop: `1px solid ${module.iconColor}50`,
        padding: "18px 16px",
        boxShadow: `0 4px 20px rgba(0,0,0,0.40), 0 0 0 0 ${module.iconColor}00`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 8px 28px rgba(0,0,0,0.50), 0 0 18px ${module.iconColor}25`;
        (e.currentTarget as HTMLElement).style.borderColor = `${module.iconColor}60`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 20px rgba(0,0,0,0.40)";
        (e.currentTarget as HTMLElement).style.borderColor = `${module.iconColor}30`;
      }}
    >
      {/* glow top-left */}
      <div
        className="absolute top-0 left-0 w-24 h-24 rounded-full pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(circle, ${module.iconColor} 0%, transparent 70%)`,
          transform: "translate(-30%, -30%)",
        }}
      />
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: 44, height: 44,
          backgroundColor: module.iconBg,
          boxShadow: `0 0 14px ${module.iconColor}30`,
        }}
      >
        <module.icon style={{ width: 20, height: 20, color: module.iconColor }} strokeWidth={1.75} />
      </div>
      <div>
        <h3
          className="text-[14px] font-bold leading-tight group-hover:text-white transition-colors"
          style={{ color: "rgba(255,255,255,0.95)" }}
        >
          {module.title}
        </h3>
        <p className="text-[11.5px] mt-1 leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
          {module.description}
        </p>
      </div>
      <ChevronRight
        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-60 transition-opacity"
        style={{ width: 14, height: 14, color: module.iconColor }}
      />
    </Link>
  );
}

/* ─── TILE NORMAL ─── */
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
        (e.currentTarget as HTMLElement).style.borderColor = `${module.iconColor}35`;
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
