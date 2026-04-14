"use client";
import { Building2, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";

const items = [
  {
    title: "Centros de Trabajo",
    description: "Obras, oficinas y ubicaciones GPS",
    href: "/dashboard/configuracion/maestros/centros",
    icon: Building2,
    iconColor: "#3b82f6",
  },
  {
    title: "Configuración Nómina",
    description: "Salarios, horarios y parámetros",
    href: "/dashboard/configuracion/maestros/nomina",
    icon: DollarSign,
    iconColor: "#10b981",
  },
];

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconColor: string;
};

function HubCard({ item }: { item: ModuleItem }) {
  return (
    <Link
      href={item.href}
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
        <item.icon style={{ width: "17px", height: "17px", color: item.iconColor }} strokeWidth={1.75} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          className="text-[13px] font-semibold leading-tight truncate group-hover:text-white transition-colors"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {item.title}
        </h3>
        <p className="text-[11.5px] mt-[3px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
          {item.description}
        </p>
      </div>
    </Link>
  );
}

export default function MaestrosPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto" style={{ background: "radial-gradient(ellipse at 50% 35%, #1a6bc0 0%, #0e52a0 25%, #083070 55%, #021845 80%, #010c2a 100%)" }}>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/configuracion"
          className="p-2 rounded-xl transition"
          style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: "#1a2535" }} />
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
            Datos Maestros
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
            Configuración base del sistema
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <HubCard key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}
