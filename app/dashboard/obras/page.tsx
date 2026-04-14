"use client";

import {
  Kanban, Gavel, FolderOpen, Scale, Building, Calculator, PackageCheck,
  Layers, Map, ListChecks, Camera, BookOpen, Activity, TrendingUp, ShieldCheck, Droplet
} from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Centro de Control",
    description: "Presupuesto vs gasto real (OC + nÃ³mina) por obra. SemÃ¡foro de avance.",
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
    description: "Remisiones de colado, f'c, mÂ³, pruebas de cilindro 7/14/28 dÃ­as.",
    href: "/dashboard/obras/concreto/remisiones",
    icon: Droplet,
    iconBg: "rgba(100,116,139,0.15)",
    iconColor: "#94a3b8",
  },
  {
    title: "Avance FÃ­sico",
    description: "Captura semanal de % de avance fÃ­sico real por obra.",
    href: "/dashboard/obras/avance",
    icon: TrendingUp,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "CatÃ¡logo Maestro",
    description: "Fuente Ãºnica de obras: alta, ediciÃ³n, archivo, historial.",
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
    description: "GestiÃ³n de licitaciones y concursos.",
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
    description: "Contratos y documentaciÃ³n legal por obra.",
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
    description: "Visor de planos y documentos tÃ©cnicos.",
    href: "/dashboard/obras/planos",
    icon: Map,
    iconBg: "rgba(129,140,248,0.13)",
    iconColor: "#818cf8",
  },
  {
    title: "Tareas",
    description: "AsignaciÃ³n de tareas y seguimiento de cumplimiento.",
    href: "/dashboard/obras/tareas",
    icon: ListChecks,
    iconBg: "rgba(132,204,22,0.13)",
    iconColor: "#a3e635",
  },
  {
    title: "Fotos de Avance",
    description: "Registro fotogrÃ¡fico de avance por obra.",
    href: "/dashboard/obras/fotos",
    icon: Camera,
    iconBg: "rgba(249,115,22,0.13)",
    iconColor: "#fb923c",
  },
];

export default function ObrasPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
          Obras
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          GestiÃ³n de proyectos y construcciÃ³n
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
      className="group block rounded-[16px] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] hover:border-white/[0.11]"
      style={{
        backgroundColor: "rgba(8,18,36,0.85)",
        border: "1px solid rgba(255,255,255,0.06)",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top highlight line */}
      <div
        style={{
          position: "absolute", inset: "0 0 auto 0", height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
          pointerEvents: "none",
        }}
      />
      {/* Icon */}
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: "44px", height: "44px", borderRadius: "12px",
          backgroundColor: module.iconBg, flexShrink: 0,
        }}
      >
        <module.icon style={{ width: "20px", height: "20px", color: module.iconColor }} strokeWidth={1.75} />
      </div>
      {/* Text */}
      <h3
        className="text-[14.5px] font-semibold leading-tight mb-1.5 truncate group-hover:text-white transition-colors"
        style={{ color: "rgba(255,255,255,0.88)" }}
      >
        {module.title}
      </h3>
      <p
        className="text-[12px] leading-relaxed line-clamp-2"
        style={{ color: "#3d5470" }}
      >
        {module.description}
      </p>
    </Link>
  );
}
