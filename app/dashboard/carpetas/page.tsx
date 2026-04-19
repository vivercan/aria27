"use client";
import { FolderTree, HardHat, Users, DollarSign, Landmark, UserCheck, Truck, ClipboardList, FileStack } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Obras",
    description: "Carpetas generales de obras.",
    href: "/dashboard/carpetas/obras-general",
    icon: HardHat,
    iconBg: "rgba(249,115,22,0.13)",
    iconColor: "#fb923c",
  },
  {
    title: "Obras · Expedientes",
    description: "Carpetas para expedientes de obra.",
    href: "/dashboard/carpetas/obras-expedientes",
    icon: FolderTree,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
  },
  {
    title: "Talento",
    description: "Carpetas para recursos humanos.",
    href: "/dashboard/carpetas/talento-general",
    icon: Users,
    iconBg: "rgba(37,99,235,0.15)",
    iconColor: "#64748b",
  },
  {
    title: "Finanzas",
    description: "Carpetas financieras generales.",
    href: "/dashboard/carpetas/finanzas-general",
    icon: DollarSign,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "Finanzas · Bancos",
    description: "Estados de cuenta y conciliaciones.",
    href: "/dashboard/carpetas/finanzas-bancos",
    icon: Landmark,
    iconBg: "rgba(20,184,166,0.14)",
    iconColor: "#2dd4bf",
  },
  {
    title: "Clientes",
    description: "Documentación de clientes.",
    href: "/dashboard/carpetas/clientes-general",
    icon: UserCheck,
    iconBg: "rgba(168,85,247,0.13)",
    iconColor: "#c084fc",
  },
  {
    title: "Activos",
    description: "Activos, vehículos y equipos.",
    href: "/dashboard/carpetas/activos-general",
    icon: Truck,
    iconBg: "rgba(6,182,212,0.13)",
    iconColor: "#8ba6c1",
  },
  {
    title: "Requisiciones",
    description: "Requisiciones y órdenes de compra.",
    href: "/dashboard/carpetas/requisiciones-general",
    icon: ClipboardList,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
  },
  {
    title: "Plantillas",
    description: "Plantillas y formatos.",
    href: "/dashboard/carpetas/plantillas-general",
    icon: FileStack,
    iconBg: "rgba(148,163,184,0.12)",
    iconColor: "#94a3b8",
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
      href={`${module.href}`}
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

export default function CarpetasPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto" style={{ background: "radial-gradient(ellipse at 50% 35%, #1a6bc0 0%, #0e52a0 25%, #083070 55%, #021845 80%, #010c2a 100%)" }}>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
          Carpetas Personalizadas
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Organiza archivos jerárquicamente por módulo
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
