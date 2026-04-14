"use client";
import { Library, FileText, Presentation, ClipboardList } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Plantillas",
    description: "Plantillas de documentos.",
    href: "/dashboard/plantillas/biblioteca",
    icon: Library,
    iconBg: "rgba(37,99,235,0.15)",
    iconColor: "#3b82f6",
  },
  {
    title: "Documentos",
    description: "Centro de documentación.",
    href: "/dashboard/plantillas/documentos",
    icon: FileText,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "Propuestas",
    description: "Paquetes de licitación.",
    href: "/dashboard/plantillas/propuestas",
    icon: Presentation,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
  },
  {
    title: "Órdenes",
    description: "Formatos de órdenes de compra.",
    href: "/dashboard/plantillas/ordenes",
    icon: ClipboardList,
    iconBg: "rgba(168,85,247,0.13)",
    iconColor: "#c084fc",
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

export default function PlantillasPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto" style={{ background: "radial-gradient(ellipse at 50% 0%, #d8dde6 0%, #c0c7d2 35%, #b4bbc7 100%)" }}>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
          Plantillas
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Biblioteca de documentos y formatos
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
