"use client";
import { FileText, Package, Users, ClipboardList, ShoppingCart, CreditCard, Truck, Search } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Requisiciones",
    description: "Solicitudes de materiales para obra.",
    href: "/dashboard/requisiciones/requisiciones",
    icon: FileText,
    color: "bg-blue-500",
    badge: "ACTIVO"
  },
  {
    title: "Productos",
    description: "Control de stock y almacén.",
    href: "/dashboard/requisiciones/productos",
    icon: Package,
    color: "bg-teal-500"
  },
  {
    title: "Proveedores",
    description: "Catálogo de proveedores.",
    href: "/dashboard/requisiciones/proveedores",
    icon: Users,
    color: "bg-green-500",
    badge: "CRUD"
  },
  {
    title: "Órdenes de Compra",
    description: "Gestión de órdenes autorizadas.",
    href: "/dashboard/requisiciones/requisiciones/ordenes",
    icon: ClipboardList,
    color: "bg-amber-500"
  },
  {
    title: "Compras",
    description: "Cotizaciones y comparativas.",
    href: "/dashboard/requisiciones/compras",
    icon: ShoppingCart,
    color: "bg-cyan-500"
  },
  {
    title: "Pagos",
    description: "Control de pagos a proveedores.",
    href: "/dashboard/requisiciones/pagos",
    icon: CreditCard,
    color: "bg-rose-500"
  },
  {
    title: "Entregas",
    description: "Entregas y seguimiento.",
    href: "/dashboard/requisiciones/entregas",
    icon: Truck,
    color: "bg-indigo-500"
  },
  {
    title: "Prospección",
    description: "Búsqueda de nuevos proveedores.",
    href: "/dashboard/requisiciones/prospeccion",
    icon: Search,
    color: "bg-purple-500"
  }
];

export default function RequisicionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Requisiciones</h1>
        <p className="text-slate-400 mt-1">Gestión de compras, inventario y proveedores.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${module.color}/20`}>
                <module.icon className={`w-6 h-6 text-white`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {module.title}
                  </h3>
                  {module.badge && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                      {module.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">{module.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
