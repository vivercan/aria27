"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { FileCheck, Package, Users, ClipboardList, Truck, Settings, ShoppingCart, CreditCard } from "lucide-react";

const modules = [
  { title: "Requisiciones", description: "Solicitudes de materiales para obra.", icon: FileCheck, href: "/dashboard/requisiciones/Requisiciones", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.3)", badge: "Activo", badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", meta: "Flujo completo" },
  { title: "Inventario", description: "Control de stock y almacén.", icon: Package, href: "/dashboard/requisiciones/Productos", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.3)" },
  { title: "Maestro Proveedores", description: "Catálogo de proveedores.", icon: Users, href: "/dashboard/requisiciones/vendors", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.3)", badge: "CRUD", badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { title: "Órdenes de Compra", description: "Gestión de órdenes autorizadas.", icon: ClipboardList, href: "/dashboard/requisiciones/Requisiciones/ordenes", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.3)" },
  { title: "Compras", description: "Cotizaciones y comparativas.", icon: ShoppingCart, href: "/dashboard/requisiciones/Requisiciones/Compras", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.3)" },
  { title: "Pagos", description: "Control de pagos a proveedores.", icon: CreditCard, href: "/dashboard/requisiciones/payments", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.3)" },
  { title: "Logística", description: "Entregas y seguimiento.", icon: Truck, href: "/dashboard/requisiciones/delivery", color: "from-teal-500 to-teal-600", glowColor: "rgba(20,184,166,0.3)" },
  { title: "Configuraciónuración", description: "Ajustes del módulo.", icon: Settings, href: "/dashboard/requisiciones/Configuración", color: "from-slate-500 to-slate-600", glowColor: "rgba(100,116,139,0.2)" },
];

export default function SupplyDeskPage() {
  return (
    <div>
      <ModuleHeader title="Requisiciones" subtitle="Gestión de compras, inventario y proveedores." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} {...mod} />
        ))}
      </ModuleGrid>
    </div>
  );
}
