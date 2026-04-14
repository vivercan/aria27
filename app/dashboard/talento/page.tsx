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
    title: "NÃ³mina",
    description: "Pre-nÃ³mina, histÃ³rico y recibos.",
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
    description: "PrÃ©stamos y vacaciones.",
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
      className="group block rounded-[16px] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] hover:border-white/[0.11]"
      style={{
        backgroundColor: "rgba(8,18,36,0.85)",
        border: "1px solid rgba(255,255,255,0.06)",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", inset: "0 0 auto 0", height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        className="flex items-center justify-center mb-4"
        style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: module.iconBg, flexShrink: 0 }}
      >
        <module.icon style={{ width: "20px", height: "20px", color: module.iconColor }} strokeWidth={1.75} />
      </div>
      <h3
        className="text-[14.5px] font-semibold leading-tight mb-1.5 truncate group-hover:text-white transition-colors"
        style={{ color: "rgba(255,255,255,0.88)" }}
      >
        {module.title}
      </h3>
      <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: "#3d5470" }}>
        {module.description}
      </p>
    </Link>
  );
}

export default function TalentoPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
          Talento
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          GestiÃ³n de recursos humanos y nÃ³mina
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
