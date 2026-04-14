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

export default function RequisicionesPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
          Requisiciones
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Gestión de compras, inventario y proveedores
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
