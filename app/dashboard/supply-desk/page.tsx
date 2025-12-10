"use client";
import { motion } from "framer-motion";
import {
  Truck,
  Search,
  ShoppingCart,
  Bot,
  PackageCheck,
  CalendarDays,
  Tags
} from "lucide-react";
import { ModuleCard } from "@/components/dashboard/ModuleCard";

export default function SupplyDeskPage() {
  const modules = [
    { title: "Maestro Proveedores", desc: "CRUD de proveedores (150 precargados).", icon: Truck, href: "/dashboard/supply-desk/vendors", badge: "150 registros" },
    { title: "Prospeccion", desc: "Pipeline de validacion de proveedores nuevos.", icon: Search, href: "/dashboard/supply-desk/prospecting" },
    { title: "Requisiciones", desc: "Sistema de pedidos de obra con validacion.", icon: ShoppingCart, href: "/dashboard/supply-desk/requisitions" },
    { title: "Quote Lab AI", desc: "Cotizador inteligente multi-proveedor.", icon: Bot, href: "/dashboard/supply-desk/quotes", badge: "IA" },
    { title: "Entrega y Cierre", desc: "Recepcion de material y evidencias fotograficas.", icon: PackageCheck, href: "/dashboard/supply-desk/delivery" },
    { title: "Calendario Pagos", desc: "Programacion de cuentas por pagar.", icon: CalendarDays, href: "/dashboard/supply-desk/payments" },
    { title: "Catalogo Productos", desc: "Maestro de insumos (224 precargados).", icon: Tags, href: "/dashboard/supply-desk/products", badge: "224 registros" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-slate-300">Supply Desk</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          Supply Desk
        </h1>
        <p className="text-slate-400 text-base max-w-xl">
          Gestion estrategica de compras y cadena de suministro.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {modules.map((mod, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
          >
            <ModuleCard
              title={mod.title}
              description={mod.desc}
              icon={mod.icon}
              href={mod.href}
              badge={mod.badge}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}