"use client";
import { FileText, Package, Users, ClipboardList, ShoppingCart, CreditCard, Truck, Search } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Requisiciones",
    description: "Solicitudes de materiales para obra.",
    href: "/dashboard/requisiciones/requisiciones",
    icon: FileText,
    gradient: "from-blue-500 to-blue-600",
    badge: "ACTIVO"
  },
  {
    title: "Productos",
    description: "Control de stock y almacén.",
    href: "/dashboard/requisiciones/productos",
    icon: Package,
    gradient: "from-teal-500 to-teal-600"
  },
  {
    title: "Proveedores",
    description: "Catálogo de proveedores.",
    href: "/dashboard/requisiciones/proveedores",
    icon: Users,
    gradient: "from-green-500 to-green-600",
    badge: "CRUD"
  },
  {
    title: "Órdenes de Compra",
    description: "Gestión de órdenes autorizadas.",
    href: "/dashboard/requisiciones/requisiciones/ordenes",
    icon: ClipboardList,
    gradient: "from-amber-500 to-orange-500"
  },
  {
    title: "Compras",
    description: "Cotizaciones y comparativas.",
    href: "/dashboard/requisiciones/compras",
    icon: ShoppingCart,
    gradient: "from-cyan-500 to-cyan-600"
  },
  {
    title: "Pagos",
    description: "Control de pagos a proveedores.",
    href: "/dashboard/requisiciones/pagos",
    icon: CreditCard,
    gradient: "from-rose-500 to-pink-600"
  },
  {
    title: "Entregas",
    description: "Entregas y seguimiento.",
    href: "/dashboard/requisiciones/entregas",
    icon: Truck,
    gradient: "from-indigo-500 to-indigo-600"
  },
  {
    title: "Prospección",
    description: "Búsqueda de nuevos proveedores.",
    href: "/dashboard/requisiciones/prospeccion",
    icon: Search,
    gradient: "from-purple-500 to-purple-600"
  }
];

export default function RequisicionesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Requisiciones</h1>
        <p className="text-slate-400 mt-1">Gestión de compras, inventario y proveedores.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {subModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10"
          >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
            
            <div className="relative p-6">
              {/* Icon container */}
              <div className={`inline-flex p-3.5 rounded-xl bg-gradient-to-br ${module.gradient} shadow-lg mb-4`}>
                <module.icon className="w-6 h-6 text-white" strokeWidth={1.75} />
              </div>
              
              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-lg group-hover:text-blue-300 transition-colors">
                    {module.title}
                  </h3>
                  {module.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                      {module.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{module.description}</p>
              </div>
              
              {/* Arrow indicator */}
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
