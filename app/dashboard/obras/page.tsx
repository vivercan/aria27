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
      { title: "Centro de Control", description: "Presupuesto vs gasto real (OC + nómina) por obra. Semáforo de avance.", href: "/dashboard/obras/control",  icon: Activity,    accent: "#3b82f6", hero: true },
      { title: "Pipeline",          description: "Vista kanban operativa de proyectos activos.",                          href: "/dashboard/obras/pipeline", icon: Kanban,      accent: "#818cf8" },
      { title: "Avance Físico",     description: "Captura semanal de % de avance físico real por obra.",                 href: "/dashboard/obras/avance",   icon: TrendingUp,  accent: "#10b981" },
      { title: "Catálogo Maestro",  description: "Alta, edición, archivo e historial de obras.",                         href: "/dashboard/obras/catalogo", icon: BookOpen,    accent: "#a78bfa" },
    ],
  },
  {
    label: "Construcción",
    modulos: [
      { title: "Control de Concreto", description: "Remisiones de colado, f'c, m³, pruebas de cilindro 7/14/28 días.", href: "/dashboard/obras/concreto/remisiones", icon: Droplet,      accent: "#38bdf8" },
      { title: "Concreto",            description: "Control de colados, resistencias y pedidos.",                       href: "/dashboard/obras/concreto",            icon: Layers,       accent: "#7dd3fc" },
      { title: "Presupuestos",        description: "Presupuestos base y estimaciones de costo.",                        href: "/dashboard/obras/presupuestos",        icon: Calculator,   accent: "#34d399" },
      { title: "Inventario",          description: "Inventario de materiales por obra.",                                 href: "/dashboard/obras/inventario",          icon: PackageCheck, accent: "#2dd4bf" },
    ],
  },
  {
    label: "Legal & IMSS",
    modulos: [
      { title: "SIROC IMSS",   description: "Registro de obras ante IMSS: fases, incidencias e importes bimestrales.", href: "/dashboard/obras/siroc/registros", icon: ShieldCheck, accent: "#f87171" },
      { title: "SIROC",        description: "Registro IMSS de obras ante SIROC.",                                      href: "/dashboard/obras/siroc",           icon: Building,    accent: "#fb923c" },
      { title: "Contratos",    description: "Contratos y documentación legal por obra.",                               href: "/dashboard/obras/contratos",       icon: Scale,       accent: "#c084fc" },
      { title: "Licitaciones", description: "Gestión de licitaciones y concursos.",                                    href: "/dashboard/obras/licitaciones",    icon: Gavel,       accent: "#fbbf24" },
    ],
  },
  {
    label: "Documentación",
    modulos: [
      { title: "Expedientes",    description: "Expedientes digitales de obra.",                         href: "/dashboard/obras/expedientes", icon: FolderOpen, accent: "#4ade80" },
      { title: "Planos",         description: "Visor de planos y documentos técnicos.",                 href: "/dashboard/obras/planos",      icon: Map,        accent: "#818cf8" },
      { title: "Tareas",         description: "Asignación de tareas y seguimiento de cumplimiento.",    href: "/dashboard/obras/tareas",      icon: ListChecks, accent: "#a3e635" },
      { title: "Fotos de Avance",description: "Registro fotográfico de avance por obra.",               href: "/dashboard/obras/fotos",       icon: Camera,     accent: "#fb923c" },
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

      {/* ── 4 SECCIONES iguales que llenan el espacio ── */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {grupos.map((grupo) => (
          <section key={grupo.label} className="flex-1 flex flex-col gap-2 min-h-0">
            {/* etiqueta */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <span
                className="text-[9.5px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                {grupo.label}
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            </div>
            {/* tiles — crecen para llenar sección */}
            <div className="flex-1 grid grid-cols-4 gap-2 min-h-0">
              {grupo.modulos.map((mod) => (
                <div key={mod.href} className={mod.hero ? "col-span-2" : ""} style={{ minHeight: 0 }}>
                  <HubCard module={mod} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── ACCESOS RÁPIDOS — dock centrado abajo ── */}
      <div className="flex-shrink-0 mt-4 flex flex-col items-center gap-2">
        {/* separador con label centrado */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span
            className="text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.20)" }}
          >
            Accesos Rápidos
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        {/* pills centradas */}
        <div className="flex gap-2.5">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-150 hover:-translate-y-0.5"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.09)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.18)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)";
              }}
            >
              <ql.icon style={{ width: 13, height: 13, color: "rgba(255,255,255,0.45)" }} strokeWidth={1.75} />
              <span className="text-[11.5px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
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
   TILE — layout vertical, ícono arriba, texto abajo,
   contenido distribuido para usar todo el espacio del card
══════════════════════════════════════════════════════ */
function HubCard({ module }: { module: ModuleItem }) {
  const isHero = module.hero;
  return (
    <Link
      href={module.href}
      className="group relative flex flex-col rounded-xl transition-all duration-200 hover:-translate-y-0.5"
      style={{
        height: "100%",
        padding: "20px 20px 18px",
        backgroundColor: isHero ? "rgba(59,130,246,0.10)" : "rgba(255,255,255,0.04)",
        border: isHero
          ? "1px solid rgba(59,130,246,0.28)"
          : "1px solid rgba(255,255,255,0.08)",
        borderTop: isHero
          ? "1px solid rgba(59,130,246,0.45)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: isHero
          ? "0 4px 20px rgba(59,130,246,0.10), 0 2px 8px rgba(0,0,0,0.30)"
          : "0 2px 8px rgba(0,0,0,0.25)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = isHero
          ? "rgba(59,130,246,0.16)"
          : "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.borderColor = `${module.accent}38`;
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 6px 22px rgba(0,0,0,0.42), 0 0 12px ${module.accent}14`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = isHero
          ? "rgba(59,130,246,0.10)"
          : "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLElement).style.borderColor = isHero
          ? "rgba(59,130,246,0.28)"
          : "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLElement).style.boxShadow = isHero
          ? "0 4px 20px rgba(59,130,246,0.10), 0 2px 8px rgba(0,0,0,0.30)"
          : "0 2px 8px rgba(0,0,0,0.25)";
      }}
    >
      {/* bloque ícono + texto juntos — sin void en el centro */}
      <div className="flex flex-col gap-3">
        <module.icon
          style={{ width: isHero ? 32 : 28, height: isHero ? 32 : 28, color: module.accent }}
          strokeWidth={1.5}
        />
        <div>
          <h3
            className="font-semibold leading-snug"
            style={{ fontSize: isHero ? "15px" : "14px", color: "rgba(255,255,255,0.95)" }}
          >
            {module.title}
          </h3>
          <p
            className="mt-1 leading-relaxed"
            style={{
              fontSize: "11.5px",
              color: "rgba(255,255,255,0.42)",
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

      {/* chevron hover */}
      <ChevronRight
        className="absolute bottom-3.5 right-3.5 opacity-0 group-hover:opacity-40 transition-opacity duration-200"
        style={{ width: 12, height: 12, color: module.accent }}
      />
    </Link>
  );
}
