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
      className="group block rounded-[16px] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] hover:border-white/[0.11]"
      style={{
        backgroundColor: "rgba(10,22,45,0.88)",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.09)",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", inset: "0 0 auto 0", height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        className="flex items-center justify-center mb-4"
        style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: module.iconBg }}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subModules.map((module) => (
          <HubCard key={module.href} module={module} />
        ))}
      </div>
    </div>
  );
}
