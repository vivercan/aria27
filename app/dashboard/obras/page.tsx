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
};

const operacion: ModuleItem[] = [
  { title: "Centro de Control", description: "Presupuesto vs gasto real (OC + nómina) por obra. Semáforo de avance.", href: "/dashboard/obras/control",  icon: Activity,   accent: "#3b82f6" },
  { title: "Pipeline",          description: "Vista kanban operativa de proyectos activos.",                          href: "/dashboard/obras/pipeline", icon: Kanban,     accent: "#818cf8" },
  { title: "Avance Físico",     description: "Captura semanal de % de avance físico real por obra.",                 href: "/dashboard/obras/avance",   icon: TrendingUp, accent: "#10b981" },
  { title: "Catálogo Maestro",  description: "Alta, edición, archivo e historial de obras.",                         href: "/dashboard/obras/catalogo", icon: BookOpen,   accent: "#a78bfa" },
];

const grupos: { label: string; modulos: ModuleItem[] }[] = [
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
      { title: "SIROC IMSS",   description: "Registro ante IMSS: fases e incidencias.",  href: "/dashboard/obras/siroc/registros", icon: ShieldCheck, accent: "#f87171" },
      { title: "SIROC",        description: "Registro de obras ante SIROC.",              href: "/dashboard/obras/siroc",           icon: Building,    accent: "#fb923c" },
      { title: "Contratos",    description: "Contratos y documentación legal por obra.", href: "/dashboard/obras/contratos",       icon: Scale,       accent: "#c084fc" },
      { title: "Licitaciones", description: "Gestión de licitaciones y concursos.",      href: "/dashboard/obras/licitaciones",    icon: Gavel,       accent: "#fbbf24" },
    ],
  },
  {
    label: "Documentación",
    modulos: [
      { title: "Expedientes",    description: "Expedientes digitales de obra.",           href: "/dashboard/obras/expedientes", icon: FolderOpen, accent: "#4ade80" },
      { title: "Planos",         description: "Visor de planos y documentos técnicos.",   href: "/dashboard/obras/planos",      icon: Map,        accent: "#818cf8" },
      { title: "Tareas",         description: "Asignación y seguimiento de tareas.",      href: "/dashboard/obras/tareas",      icon: ListChecks, accent: "#a3e635" },
      { title: "Fotos de Avance",description: "Registro fotográfico de avance por obra.", href: "/dashboard/obras/fotos",       icon: Camera,     accent: "#fb923c" },
    ],
  },
];

/* ── estilos de tile compartidos ── */
const tileBase: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderTop: "1px solid rgba(255,255,255,0.13)",
};

export default function ObrasPage() {
  return (
    <div
      className="px-5 pt-5 pb-5 h-full flex flex-col overflow-hidden gap-4"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #1565c0 0%, #0d47a1 20%, #072a6e 50%, #021440 75%, #010b22 100%)",
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex-shrink-0">
        <h1
          className="text-[28px] font-extrabold tracking-tight leading-none"
          style={{
            background: "linear-gradient(90deg,#fff 0%,rgba(255,255,255,0.55) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Obras
        </h1>
        <p className="text-[12.5px] mt-1" style={{ color: "rgba(255,255,255,0.38)" }}>
          Gestión de proyectos y construcción
        </p>
      </div>

      {/* ── OPERACIÓN ── */}
      <section className="flex-shrink-0 flex flex-col gap-2">
        <SectionLabel label="Operación" />

        {/* CC — ancho completo */}
        <CCHero module={operacion[0]} />

        {/* Pipeline · Avance · Catálogo */}
        <div className="grid grid-cols-3 gap-2">
          {operacion.slice(1).map((m) => (
            <HubCard key={m.href} module={m} />
          ))}
        </div>
      </section>

      {/* ── GRUPOS (Construcción / Legal / Documentación) ── */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {grupos.map((grupo) => (
          <section key={grupo.label} className="flex-1 flex flex-col gap-2 min-h-0">
            <SectionLabel label={grupo.label} />
            <div className="flex-1 grid grid-cols-4 gap-2">
              {grupo.modulos.map((mod) => (
                <HubCard key={mod.href} module={mod} stretch />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── ACCESOS RÁPIDOS ── */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.20)" }}>
            Accesos Rápidos
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div className="flex gap-2">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-150 hover:-translate-y-0.5"
              style={{ ...tileBase }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.07)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)";
              }}
            >
              <ql.icon style={{ width: 12, height: 12, color: "rgba(255,255,255,0.38)" }} strokeWidth={1.75} />
              <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>
                {ql.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Etiqueta de sección ── */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 flex-shrink-0">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.28)" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

/* ── Centro de Control — ancho completo, compacto ── */
function CCHero({ module }: { module: ModuleItem }) {
  return (
    <Link
      href={module.href}
      className="group relative flex items-center gap-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
      style={{
        padding: "16px 20px",
        background: "linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(8,20,55,0.97) 70%)",
        border: "1px solid rgba(59,130,246,0.22)",
        borderTop: "1px solid rgba(59,130,246,0.40)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.40)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 8px 28px rgba(0,0,0,0.55), 0 0 20px rgba(59,130,246,0.12)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.42)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.40)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.22)";
      }}
    >
      <module.icon style={{ width: 26, height: 26, color: module.accent, flexShrink: 0 }} strokeWidth={1.5} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 className="text-[15px] font-bold" style={{ color: "#fff" }}>
          {module.title}
        </h3>
        <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.42)" }}>
          {module.description}
        </p>
      </div>
      <ChevronRight
        className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity"
        style={{ width: 15, height: 15, color: module.accent }}
      />
    </Link>
  );
}

/* ── Tile normal ── */
function HubCard({ module, stretch }: { module: ModuleItem; stretch?: boolean }) {
  return (
    <Link
      href={module.href}
      className="group flex items-center gap-3 rounded-xl transition-all duration-150 hover:-translate-y-0.5"
      style={{
        padding: "14px 14px",
        height: stretch ? "100%" : undefined,
        ...tileBase,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.borderColor = `${module.accent}30`;
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 4px 16px rgba(0,0,0,0.38), 0 0 8px ${module.accent}12`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
      }}
    >
      <module.icon
        style={{ width: 20, height: 20, color: module.accent, flexShrink: 0 }}
        strokeWidth={1.65}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          className="text-[13.5px] font-semibold leading-tight truncate"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {module.title}
        </h3>
        <p className="text-[11.5px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.38)" }}>
          {module.description}
        </p>
      </div>
      <ChevronRight
        className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
        style={{ width: 12, height: 12, color: "rgba(255,255,255,0.5)" }}
      />
    </Link>
  );
}
