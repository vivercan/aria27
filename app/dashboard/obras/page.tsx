"use client";

import {
  Kanban, Gavel, FolderOpen, Scale, Building, Calculator, PackageCheck,
  Layers, Map, ListChecks, Camera, BookOpen, Activity, TrendingUp, ShieldCheck, Droplet
} from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Centro de Control",
    description: "Presupuesto vs gasto real (OC + nómina) por obra. Semáforo de avance.",
    href: "/dashboard/obras/control",
    icon: Activity,
    iconBg: "rgba(37,99,235,0.15)",
    iconColor: "#3b82f6",
  },
  {
    title: "SIROC IMSS",
    description: "Registro de obras ante IMSS: fases, incidencias e importes bimestre.",
    href: "/dashboard/obras/siroc/registros",
    icon: ShieldCheck,
    iconBg: "rgba(244,63,94,0.14)",
    iconColor: "#f43f5e",
  },
  {
    title: "Control de Concreto",
    description: "Remisiones de colado, f'c, m³, pruebas de cilindro 7/14/28 días.",
    href: "/dashboard/obras/concreto/remisiones",
    icon: Droplet,
    iconBg: "rgba(100,116,139,0.15)",
    iconColor: "#94a3b8",
  },
  {
    title: "Avance Físico",
    description: "Captura semanal de % de avance físico real por obra.",
    href: "/dashboard/obras/avance",
    icon: TrendingUp,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "Catálogo Maestro",
    description: "Fuente única de obras: alta, edición, archivo, historial.",
    href: "/dashboard/obras/catalogo",
    icon: BookOpen,
    iconBg: "rgba(99,102,241,0.14)",
    iconColor: "#818cf8",
  },
  {
    title: "Pipeline",
    description: "Vista kanban operativa de proyectos activos.",
    href: "/dashboard/obras/pipeline",
    icon: Kanban,
    iconBg: "rgba(139,92,246,0.14)",
    iconColor: "#a78bfa",
  },
  {
    title: "Licitaciones",
    description: "Gestión de licitaciones y concursos.",
    href: "/dashboard/obras/licitaciones",
    icon: Gavel,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
    },
  {
    title: "Expedientes",
    description: "Expedientes digitales de obra.",
    href: "/dashboard/obras/expedientes",
    icon: FolderOpen,
    iconBg: "rgba(34,197,94,0.13)",
    iconColor: "#4ade80",
  },
  {
    title: "Contratos",
    description: "Contratos y documentación legal por obra.",
    href: "/dashboard/obras/contratos",
    icon: Scale,
    iconBg: "rgba(168,85,247,0.13)",
    iconColor: "#c084fc",
  },
  {
    title: "SIROC",
    description: "Registro IMSS de obras ante SIROC.",
    href: "/dashboard/obras/siroc",
    icon: Building,
    iconBg: "rgba(251,113,133,0.13)",
    iconColor: "#fb7185",
  },
  {
    title: "Presupuestos",
    description: "Presupuestos base y estimaciones de costo.",
    href: "/dashboard/obras/presupuestos",
    icon: Calculator,
    iconBg: "rgba(6,182,212,0.13)",
    iconColor: "#22d3ee",
  },
  {
    title: "Inventario",
    description: "Inventario de materiales por obra.",
    href: "/dashboard/obras/inventario",
    icon: PackageCheck,
    iconBg: "rgba(20,184,166,0.14)",
    iconColor: "#2dd4bf",
  },
  {
    title: "Concreto",
    description: "Control de colados, resistencias y pedidos.",
    href: "/dashboard/obras/concreto",
    icon: Layers,
    iconBg: "rgba(148,163,184,0.12)",
    iconColor: "#94a3b8",
  },
  {
    title: "Planos",
    description: "Visor de planos y documentos técnicos.",
    href: "/dashboard/obras/planos",
    icon: Map,
    iconBg: "rgba(129,140,248,0.13)",
    iconColor: "#818cf8",
  },
  {
    title: "Tareas",
    description: "Asignación de tareas y seguimiento de cumplimiento.",
    href: "/dashboard/obras/tareas",
    icon: ListChecks,
    iconBg: "rgba(132,204,22,0.13)",
    iconColor: "#a3e635",
  },
  {
    title: "Fotos de Avance",
    description: "Registro fotográfico de avance por obra.",
    href: "/dashboard/obras/fotos",
    icon: Camera,
    iconBg: "rgba(249,115,22,0.13)",
    iconColor: "#fb923c",
  },
];

export default function ObrasPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto" style={{ background: "radial-gradient(ellipse at 50% 0%, #d8dde6 0%, #c0c7d2 35%, #b4bbc7 100%)" }}>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
          Obras
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Gestión de proyectos y construcción
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {subModules.map((module) => (
          <HubCard key={module.href} module={module} />
        ))}
      </div>
    </div>
  );
}

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
};

function HubCard({ module }: { module: ModuleItem }) {
  return (
    <Link
      href={module.href}
      className="group flex items-center gap-3 rounded-[10px] transition-all duration-150 hover:-translate-y-0.5"
      style={{
        backgroundColor: "rgba(8,18,38,0.85)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "1px solid rgba(255,255,255,0.14)",
        borderBottom: "1px solid rgba(0,0,0,0.30)",
        padding: "15px 14px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "36px", height: "36px", borderRadius: "8px",
          backgroundColor: "rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
        }}
      >
        <module.icon style={{ width: "17px", height: "17px", color: module.iconColor }} strokeWidth={1.75} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          className="text-[13px] font-semibold leading-tight truncate group-hover:text-white transition-colors"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {module.title}
        </h3>
        <p className="text-[11.5px] mt-[3px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
          {module.description}
        </p>
      </div>
    </Link>
  );
}
