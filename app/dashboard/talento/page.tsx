"use client";
import { Users, Clock, DollarSign, AlertCircle, FileText, BarChart3, UserCog, Gift, ClipboardList, FolderOpen } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Personal",
    description: "Expedientes y perfil de cada colaborador.",
    href: "/dashboard/talento/personal",
    icon: Users,
    iconBg: "rgba(37,99,235,0.15)",
    iconColor: "#3b82f6",
  },
  {
    title: "Usuarios",
    description: "Accesos y roles del sistema ARIA.",
    href: "/dashboard/talento/usuarios",
    icon: UserCog,
    iconBg: "rgba(99,102,241,0.14)",
    iconColor: "#818cf8",
  },
  {
    title: "Asistencias",
    description: "Control de entradas y salidas.",
    href: "/dashboard/talento/checadas",
    icon: Clock,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "Nómina",
    description: "Pre-nómina, histórico y recibos.",
    href: "/dashboard/talento/nomina",
    icon: DollarSign,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
  },
  {
    title: "Incidencias",
    description: "Faltas, permisos y ajustes.",
    href: "/dashboard/talento/incidencias",
    icon: AlertCircle,
    iconBg: "rgba(244,63,94,0.14)",
    iconColor: "#f43f5e",
  },
  {
    title: "Prestaciones",
    description: "Préstamos y vacaciones.",
    href: "/dashboard/talento/prestaciones",
    icon: Gift,
    iconBg: "rgba(20,184,166,0.14)",
    iconColor: "#2dd4bf",
  },
  {
    title: "Documentos Legales",
    description: "Contratos y documentos por empleado.",
    href: "/dashboard/talento/legales",
    icon: FileText,
    iconBg: "rgba(168,85,247,0.13)",
    iconColor: "#c084fc",
  },
  {
    title: "Tareas Asignadas",
    description: "Tareas por colaborador, avance y fechas compromiso.",
    href: "/dashboard/talento/tareas",
    icon: ClipboardList,
    iconBg: "rgba(139,92,246,0.14)",
    iconColor: "#a78bfa",
  },
  {
    title: "Matriz Salarial",
    description: "Tabulador de sueldos por puesto.",
    href: "/dashboard/talento/matriz",
    icon: BarChart3,
    iconBg: "rgba(6,182,212,0.13)",
    iconColor: "#22d3ee",
  },
  {
    title: "Mis Documentos",
    description: "Archivos compartidos y privados por usuario.",
    href: "/dashboard/talento/documentos",
    icon: FolderOpen,
    iconBg: "rgba(14,165,233,0.13)",
    iconColor: "#38bdf8",
  },
];

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
      className="group flex items-center gap-3 rounded-[10px] transition-all duration-150 hover:border-white/[0.18] hover:bg-[rgba(12,26,52,0.92)]"
      style={{
        backgroundColor: "rgba(8,18,38,0.80)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.09)",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "34px", height: "34px", borderRadius: "8px",
          backgroundColor: "rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "center",
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

export default function TalentoPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
          Talento
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Gestión de recursos humanos y nómina
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subModules.map((module) => (
          <HubCard key={module.href} module={module} />
        ))}
      </div>
    </div>
  );
}
