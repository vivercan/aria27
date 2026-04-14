"use client";

import { BookOpen, Activity, UserCheck, Wrench, Car } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Catálogo",
    description: "Inventario general de activos fijos.",
    href: "/dashboard/activos/catalogo",
    icon: BookOpen,
    iconBg: "rgba(37,99,235,0.15)",
    iconColor: "#3b82f6",
  },
  {
    title: "Estado",
    description: "Estado actual y disponibilidad de activos.",
    href: "/dashboard/activos/estado",
    icon: Activity,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "Asignación",
    description: "Asignación de activos a personal u obras.",
    href: "/dashboard/activos/asignacion",
    icon: UserCheck,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
  },
  {
    title: "Mantenimiento",
    description: "Programación y registro de mantenimientos.",
    href: "/dashboard/activos/mantenimiento",
    icon: Wrench,
    iconBg: "rgba(139,92,246,0.14)",
    iconColor: "#a78bfa",
  },
  {
    title: "Vehículos",
    description: "Control de vehículos, llaves y maquinaria.",
    href: "/dashboard/activos/vehiculos",
    icon: Car,
    iconBg: "rgba(244,63,94,0.14)",
    iconColor: "#f43f5e",
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

export default function ActivosPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
          Activos
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Gestión de activos fijos y equipamiento
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
