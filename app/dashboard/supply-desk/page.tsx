"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  FileText, 
  ClipboardList, 
  Users, 
  Truck, 
  Package,
  Settings
} from "lucide-react";

const modules = [
  { 
    title: "Requisiciones", 
    description: "Solicitudes de materiales para obra.", 
    icon: FileText, 
    href: "/dashboard/supply-desk/requisitions", 
    color: "from-emerald-500 to-emerald-600" 
  },
  { 
    title: "Inventario", 
    description: "Control de stock y almacén.", 
    icon: Package, 
    href: "/dashboard/supply-desk/inventory", 
    color: "from-blue-500 to-blue-600" 
  },
  { 
    title: "Maestro Proveedores", 
    description: "Catálogo de proveedores.", 
    icon: Users, 
    href: "/dashboard/supply-desk/vendors", 
    color: "from-purple-500 to-purple-600" 
  },
  { 
    title: "Órdenes de Compra", 
    description: "Gestión de órdenes.", 
    icon: ClipboardList, 
    href: "/dashboard/supply-desk/orders", 
    color: "from-amber-500 to-amber-600" 
  },
  { 
    title: "Logística", 
    description: "Entregas y seguimiento.", 
    icon: Truck, 
    href: "/dashboard/supply-desk/logistics", 
    color: "from-cyan-500 to-cyan-600" 
  },
  { 
    title: "Configuración", 
    description: "Ajustes del módulo.", 
    icon: Settings, 
    href: "/dashboard/supply-desk/settings", 
    color: "from-slate-500 to-slate-600" 
  },
];

export default function SupplyDeskPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Supply Desk</h1>
        <p className="text-slate-400">Gestión de compras, inventario y proveedores.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {modules.map((mod, idx) => (
          <Link key={idx} href={mod.href} className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg transition hover:border-white/20 hover:bg-white/10 h-full">
              <div className={`absolute inset-0 bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-10 transition`} />
              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} mb-4`}>
                  <mod.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{mod.title}</h3>
                <p className="text-sm text-white/60">{mod.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
