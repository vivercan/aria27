"use client";

import { FileText, Shield, ScrollText, Building2, Calculator, HardHat } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Documentación Legal",
    description: "Acta constitutiva, TIP, REPSE, CSF, domicilio fiscal y opiniones.",
    href: "/dashboard/administracion/documentacion",
    icon: FileText,
    iconBg: "rgba(37,99,235,0.15)",
    iconColor: "#3b82f6",
  },
  {
    title: "Pólizas",
    description: "Pólizas de seguro y fianzas subsecuentes.",
    href: "/dashboard/administracion/polizas",
    icon: Shield,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "Opiniones de Cumplimiento",
    description: "IMSS, Iffonavit, SAT, SAR.",
    href: "/dashboard/administracion/opiniones",
    icon: ScrollText,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
  },
  {
    title: "Datos de Empresa",
    description: "Información general de GCU Avante y centros de costo.",
    href: "/dashboard/administracion/empresa",
    icon: Building2,
    iconBg: "rgba(139,92,246,0.14)",
    iconColor: "#a78bfa",
  },
  {
    title: "SUA / Aportaciones",
    description: "Control de aportaciones IMSS, Infonavit y SUA.",
    href: "/dashboard/administracion/sua",
    icon: Calculator,
    iconBg: "rgba(6,182,212,0.13)",
    iconColor: "#22d3ee",
  },
  {
    title: "SIROC",
    description: "Registro IMSS de obras ante SIROC.",
    href: "/dashboard/administracion/siroc",
    icon: HardHat,
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

export default function AdministracionPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
          Administración
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Documentación legal, pólizas y cumplimiento corporativo
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
