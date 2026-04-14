"use client";
import { FileText, Package, Users, ShoppingCart, CreditCard, Truck, Search, Receipt } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Requisiciones",
    description: "Solicitudes de materiales para obra.",
    href: "/dashboard/requisiciones/requisiciones",
    icon: FileText,
    iconBg: "rgba(37,99,235,0.15)",
    iconColor: "#3b82f6",
  },
  {
    title: "Productos",
    description: "Control de stock y almacén.",
    href: "/dashboard/requisiciones/productos",
    icon: Package,
    iconBg: "rgba(20,184,166,0.14)",
    iconColor: "#2dd4bf",
  },
  {
    title: "Proveedores",
    description: "Catálogo de proveedores.",
    href: "/dashboard/requisiciones/proveedores",
    icon: Users,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "Compras",
    description: "Cotizaciones y comparativas.",
    href: "/dashboard/requisiciones/compras",
    icon: ShoppingCart,
    iconBg: "rgba(6,182,212,0.13)",
    iconColor: "#22d3ee",
  },
  {
    title: "Pagos",
    description: "Control de pagos a proveedores.",
    href: "/dashboard/requisiciones/pagos",
    icon: CreditCard,
    iconBg: "rgba(244,63,94,0.14)",
    iconColor: "#f43f5e",
  },
  {
    title: "Entregas",
    description: "Entregas y seguimiento de órdenes.",
    href: "/dashboard/requisiciones/entregas",
    icon: Truck,
    iconBg: "rgba(99,102,241,0.14)",
    iconColor: "#818cf8",
  },
  {
    title: "Prospección",
    description: "Búsqueda de nuevos proveedores.",
    href: "/dashboard/requisiciones/prospeccion",
    icon: Search,
    iconBg: "rgba(139,92,246,0.14)",
    iconColor: "#a78bfa",
  },
  {
    title: "Cotizaciones",
    description: "Comparativas y selección de proveedores.",
    href: "/dashboard/requisiciones/cotizaciones",
    icon: Receipt,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
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

export default function RequisicionesPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto" style={{ background: "radial-gradient(ellipse at 50% 0%, #d8dde6 0%, #c0c7d2 35%, #b4bbc7 100%)" }}>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
          Requisiciones
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Gestión de compras, inventario y proveedores
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
