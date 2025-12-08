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
import { SubModuleCard } from "@/components/dashboard/SubModuleCard";

export default function SupplyDeskPage() {
  const modules = [
    { title: "Maestro Proveedores", desc: "CRUD de proveedores (150 precargados).", icon: Truck, href: "/dashboard/supply-desk/vendors" },
    { title: "Prospección", desc: "Pipeline de validación de proveedores nuevos.", icon: Search, href: "/dashboard/supply-desk/prospecting" },
    { title: "Requisiciones", desc: "Sistema de pedidos de obra con validación.", icon: ShoppingCart, href: "/dashboard/supply-desk/requisitions" },
    { title: "Quote Lab AI", desc: "Cotizador inteligente multi-proveedor.", icon: Bot, href: "/dashboard/supply-desk/quotes" },
    { title: "Entrega y Cierre", desc: "Recepción de material y evidencias fotográficas.", icon: PackageCheck, href: "/dashboard/supply-desk/delivery" },
    { title: "Calendario Pagos", desc: "Programación de cuentas por pagar.", icon: CalendarDays, href: "/dashboard/supply-desk/payments" },
    { title: "Catálogo Productos", desc: "Maestro de insumos (224 precargados).", icon: Tags, href: "/dashboard/supply-desk/products" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Supply Desk</h1>
        <p className="text-slate-400">Gestión estratégica de compras y cadena de suministro.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {modules.map((mod, idx) => (
          <SubModuleCard key={idx} title={mod.title} description={mod.desc} icon={mod.icon} href={mod.href} />
        ))}
      </motion.div>
    </div>
  );
}
