"use client";

import {
  Kanban, Gavel, FolderOpen, Scale, Building, Calculator, PackageCheck,
  Layers, Map, ListChecks, Camera, BookOpen, Activity, TrendingUp,
  ShieldCheck, Droplet, ChevronRight, FileText, BarChart2, BookMarked,
} from "lucide-react";
import Link from "next/link";
import React from "react";

/* ─── accesos rápidos ─── */
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

const grupos: { label: string; layout: "mosaic" | "grid"; modulos: ModuleItem[] }[] = [
  {
    label: "Operación",
    layout: "mosaic",
    modulos: [
      { title: "Centro de Control", description: "Presupuesto vs gasto real (OC + nómina) por obra. Semáforo de avance.", href: "/dashboard/obras/control",  icon: Activity,   accent: "#3b82f6" },
      { title: "Pipeline",          description: "Vista kanban operativa de proyectos activos.",                          href: "/dashboard/obras/pipeline", icon: Kanban,     accent: "#6366f1" },
      { title: "Avance Físico",     description: "Captura semanal de % de avance físico real por obra.",                 href: "/dashboard/obras/avance",   icon: TrendingUp, accent: "#10b981" },
      { title: "Catálogo Maestro",  description: "Fuente única de obras: alta, edición, archivo, historial.",            href: "/dashboard/obras/catalogo", icon: BookOpen,   accent: "#8b5cf6" },
    ],
  },
  {
    label: "Construcción",
    layout: "grid",
    modulos: [
      { title: "Control de Concreto", description: "Remisiones de colado, f'c, m³, pruebas de cilindro.",  href: "/dashboard/obras/concreto/remisiones", icon: Droplet,     accent: "#38bdf8" },
      { title: "Concreto",            description: "Control de colados, resistencias y pedidos.",           href: "/dashboard/obras/concreto",            icon: Layers,      accent: "#94a3b8" },
      { title: "Presupuestos",        description: "Presupuestos base y estimaciones de costo.",            href: "/dashboard/obras/presupuestos",        icon: Calculator,  accent: "#38bdf8" },
      { title: "Inventario",          description: "Inventario de materiales por obra.",                    href: "/dashboard/obras/inventario",          icon: PackageCheck, accent: "#2dd4bf" },
    ],
  },
  {
    label: "Legal & IMSS",
    layout: "grid",
    modulos: [
      { title: "SIROC IMSS",   description: "Registro ante IMSS: fases, incidencias e importes bimestrales.", href: "/dashboard/obras/siroc/registros", icon: ShieldCheck, accent: "#f43f5e" },
      { title: "SIROC",        description: "Registro IMSS de obras ante SIROC.",                             href: "/dashboard/obras/siroc",            icon: Building,    accent: "#fb7185" },
      { title: "Contratos",    description: "Contratos y documentación legal por obra.",                      href: "/dashboard/obras/contratos",        icon: Scale,       accent: "#a78bfa" },
      { title: "Licitaciones", description: "Gestión de licitaciones y concursos.",                           href: "/dashboard/obras/licitaciones",     icon: Gavel,       accent: "#fbbf24" },
    ],
  },
  {
    label: "Documentación",
    layout: "grid",
    modulos: [
      { title: "Expedientes",    description: "Expedientes digitales de obra.",                         href: "/dashboard/obras/expedientes", icon: FolderOpen, accent: "#4ade80" },
      { title: "Planos",         description: "Visor de planos y documentos técnicos.",                 href: "/dashboard/obras/planos",      icon: Map,        accent: "#818cf8" },
      { title: "Tareas",         description: "Asignación de tareas y seguimiento de cumplimiento.",    href: "/dashboard/obras/tareas",      icon: ListChecks, accent: "#a3e635" },
      { title: "Fotos de Avance",description: "Registro fotográfico de avance por obra.",               href: "/dashboard/obras/fotos",       icon: Camera,     accent: "#fb923c" },
    ],
  },
];

/* ══════════════════════════════════════════════════
   PÁGINA
══════════════════════════════════════════════════ */
export default function ObrasPage() {
  return (
    <div
      className="px-6 pt-6 pb-10 h-full overflow-auto"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, #1a6bc0 0%, #0e52a0 25%, #083070 55%, #021845 80%, #010c2a 100%)",
      }}
    >
      {/* HEADER */}
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

      {/* GRUPOS */}
      <div className="flex flex-col gap-8">
        {grupos.map((grupo) => (
          <section key={grupo.label}>
            {/* etiqueta — todas neutras, sin colores de sección */}
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                {grupo.label}
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            </div>

            {grupo.layout === "mosaic" ? (
              <MosaicGrid modulos={grupo.modulos} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {grupo.modulos.map((mod) => (
                  <HubCard key={mod.href} module={mod} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: "rgba(255,255,255,0.18)" }}
          >
            Accesos Rápidos
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="group flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all duration-150 hover:-translate-y-0.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <ql.icon style={{ width: 13, height: 13, color: "rgba(255,255,255,0.42)" }} strokeWidth={1.75} />
              <span className="text-[11.5px] font-medium" style={{ color: "rgba(255,255,255,0.52)" }}>
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
   MOSAICO
   Row 1: [CC 2×2] [Pipeline 2×1]
   Row 2: [CC 2×2] [Avance 1×1] [Catálogo 1×1]
══════════════════════════════════════════════════ */
function MosaicGrid({ modulos }: { modulos: ModuleItem[] }) {
  const [cc, pipeline, avance, catalogo] = modulos;
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-2.5"
      style={{ gridTemplateRows: "minmax(148px,auto) minmax(100px,auto)" }}
    >
      {/* ── Centro de Control — hero 2×2 ── */}
      <Link
        href={cc.href}
        className="group relative flex flex-col justify-between rounded-2xl overflow-hidden col-span-2 row-span-2 transition-all duration-200 hover:-translate-y-1"
        style={{
          padding: "26px 24px",
          background: "linear-gradient(145deg, rgba(59,130,246,0.16) 0%, rgba(10,22,50,0.98) 60%)",
          border: "1px solid rgba(59,130,246,0.20)",
          borderTop: "1px solid rgba(59,130,246,0.38)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.50)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 14px 44px rgba(0,0,0,0.62), 0 0 32px rgba(59,130,246,0.12)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.42)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.50)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.20)";
        }}
      >
        {/* mesh glow top-left */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 5% 10%, rgba(59,130,246,0.10) 0%, transparent 65%)",
          }}
        />
        {/* glow top-right */}
        <div
          className="absolute top-0 right-0 pointer-events-none"
          style={{
            width: 130,
            height: 130,
            background:
              "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
          }}
        />

        {/* ícono — libre, sin caja */}
        <cc.icon
          style={{ width: 42, height: 42, color: "rgba(255,255,255,0.82)" }}
          strokeWidth={1.35}
        />

        <div>
          <h3
            className="text-[21px] font-bold leading-tight"
            style={{ color: "#ffffff" }}
          >
            {cc.title}
          </h3>
          <p
            className="text-[12.5px] mt-1.5 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.40)" }}
          >
            {cc.description}
          </p>
        </div>

        <ChevronRight
          className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-45 transition-opacity duration-200"
          style={{ width: 15, height: 15, color: "rgba(255,255,255,0.7)" }}
        />
      </Link>

      {/* ── Pipeline — 2×1 ancho ── */}
      <Link
        href={pipeline.href}
        className="group relative flex items-center gap-4 rounded-2xl col-span-2 row-span-1 transition-all duration-200 hover:-translate-y-0.5"
        style={{
          padding: "0 22px",
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderTop: "1px solid rgba(255,255,255,0.11)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.28)";
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 6px 22px rgba(0,0,0,0.44), 0 0 14px rgba(99,102,241,0.07)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.35)";
        }}
      >
        <pipeline.icon
          style={{ width: 20, height: 20, color: "rgba(255,255,255,0.48)", flexShrink: 0 }}
          strokeWidth={1.55}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
            {pipeline.title}
          </h3>
          <p className="text-[11.5px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.34)" }}>
            {pipeline.description}
          </p>
        </div>
        <ChevronRight
          className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
          style={{ width: 14, height: 14, color: "rgba(255,255,255,0.6)" }}
        />
      </Link>

      {/* ── tiles normales ── */}
      <HubCard module={avance} />
      <HubCard module={catalogo} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TILE NORMAL — glassmorphism, sin caja de ícono
══════════════════════════════════════════════════ */
function HubCard({ module }: { module: ModuleItem }) {
  return (
    <Link
      href={module.href}
      className="group relative flex items-center gap-3 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        padding: "14px 14px",
        backgroundColor: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderTop: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.055)";
        (e.currentTarget as HTMLElement).style.borderColor = `${module.accent}25`;
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 4px 16px rgba(0,0,0,0.40), 0 0 10px ${module.accent}10`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.28)";
      }}
    >
      {/* ícono sin caja, flotan libre */}
      <module.icon
        style={{ width: 17, height: 17, color: "rgba(255,255,255,0.42)", flexShrink: 0 }}
        strokeWidth={1.75}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          className="text-[13px] font-semibold leading-tight truncate"
          style={{ color: "rgba(255,255,255,0.90)" }}
        >
          {module.title}
        </h3>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.33)" }}>
          {module.description}
        </p>
      </div>
      <ChevronRight
        className="flex-shrink-0 opacity-0 group-hover:opacity-38 transition-opacity"
        style={{ width: 12, height: 12, color: "rgba(255,255,255,0.55)" }}
      />
    </Link>
  );
}
