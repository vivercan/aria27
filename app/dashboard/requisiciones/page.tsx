"use client";
import { FileText, Package, Users, ShoppingCart, CreditCard, Truck, Search, Receipt } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Requisiciones",
    description: "Solicitudes de materiales para obra.",
    href: "/dashboard/requisiciones/requisiciones",
    icon: FileText,
    gradient: "from-blue-500 to-blue-700",
    badge: "ACTIVO",
  },
  {
    title: "Productos",
    description: "Control de stock y almacén.",
    href: "/dashboard/requisiciones/productos",
    icon: Package,
    gradient: "from-teal-500 to-cyan-600",
  },
  {
    title: "Proveedores",
    description: "Catálogo de proveedores.",
    href: "/dashboard/requisiciones/proveedores",
    icon: Users,
    gradient: "from-emerald-500 to-emerald-700",
    badge: "CRUD",
  },
  {
    title: "Compras",
    description: "Cotizaciones y comparativas.",
    href: "/dashboard/requisiciones/compras",
    icon: ShoppingCart,
    gradient: "from-cyan-500 to-cyan-700",
  },
  {
    title: "Pagos",
    description: "Control de pagos a proveedores.",
    href: "/dashboard/requisiciones/pagos",
    icon: CreditCard,
    gradient: "from-rose-400 to-rose-600",
  },
  {
    title: "Entregas",
    description: "Entregas y seguimiento.",
    href: "/dashboard/requisiciones/entregas",
    icon: Truck,
    gradient: "from-indigo-500 to-indigo-700",
  },
  {
    title: "Prospección",
    description: "Búsqueda de nuevos proveedores.",
    href: "/dashboard/requisiciones/prospeccion",
    icon: Search,
    gradient: "from-violet-500 to-violet-700",
  },
  {
    title: "Cotizaciones",
    description: "Comparativas y selección de proveedores.",
    href: "/dashboard/requisiciones/cotizaciones",
    icon: Receipt,
    gradient: "from-amber-400 to-amber-600",
  },
];

export default function RequisicionesPage() {
  return (
    <div className="px-6 pt-6 pb-8 space-y-6 h-full overflow-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-[26px] font-bold tracking-tight text-white leading-none">
          Requisiciones
        </h1>
        <p className="text-sm text-[#7f93b0] font-light tracking-wide">
          Gestión de compras, inventario y proveedores.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {subModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group relative overflow-hidden rounded-2xl bg-[#0c1d38]/90 border border-white/[0.07] hover:border-white/[0.13] transition-all duration-200 hover:scale-[1.014] hover:shadow-xl hover:shadow-black/50 hover:bg-[#0f2448]/90"
          >
            {/* Top micro-highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

            {/* Hover accent wash */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-[0.055] transition-opacity duration-200 pointer-events-none`}
            />

            <div className="relative p-5">
              {/* Icon */}
              <div
                className={`inline-flex p-3.5 rounded-xl bg-gradient-to-br ${module.gradient} shadow-lg mb-4`}
              >
                <module.icon className="w-7 h-7 text-white" strokeWidth={1.6} />
              </div>

              {/* Title + badge */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white/90 text-[15px] tracking-wide leading-tight group-hover:text-white transition-colors duration-150">
                    {module.title}
                  </h3>
                  {module.badge && (
                    <span className="px-1.5 py-px text-[9px] font-bold tracking-widest bg-emerald-500/[0.15] text-emerald-400/90 rounded-full border border-emerald-500/25">
                      {module.badge}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-[#6a84a8] leading-relaxed">
                  {module.description}
                </p>
              </div>

              {/* Hover arrow */}
              <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1.5 group-hover:translate-x-0">
                <svg
                  className="w-4 h-4 text-white/25"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
