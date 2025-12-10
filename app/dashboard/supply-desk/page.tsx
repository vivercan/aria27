"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  FileCheck,
  Package,
  Users,
  ClipboardList,
  Truck,
  Settings,
  ShoppingCart,
  CreditCard
} from "lucide-react";

const modules = [
  { 
    title: "Requisiciones", 
    description: "Solicitudes de materiales para obra.", 
    icon: FileCheck, 
    href: "/dashboard/supply-desk/requisitions", 
    color: "from-emerald-500 to-emerald-600",
    badge: "Activo",
    badgeColor: "bg-emerald-500/20 text-emerald-300"
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
    color: "from-violet-500 to-violet-600",
    badge: "CRUD",
    badgeColor: "bg-violet-500/20 text-violet-300"
  },
  { 
    title: "Órdenes de Compra", 
    description: "Gestión de órdenes autorizadas.", 
    icon: ClipboardList, 
    href: "/dashboard/supply-desk/requisitions/orders", 
    color: "from-amber-500 to-amber-600" 
  },
  { 
    title: "Compras", 
    description: "Cotizaciones y comparativas.", 
    icon: ShoppingCart, 
    href: "/dashboard/supply-desk/requisitions/purchasing", 
    color: "from-cyan-500 to-cyan-600" 
  },
  { 
    title: "Pagos", 
    description: "Control de pagos a proveedores.", 
    icon: CreditCard, 
    href: "/dashboard/supply-desk/payments", 
    color: "from-rose-500 to-rose-600" 
  },
  { 
    title: "Logística", 
    description: "Entregas y seguimiento.", 
    icon: Truck, 
    href: "/dashboard/supply-desk/delivery", 
    color: "from-teal-500 to-teal-600" 
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
    <div>
      <ModuleHeader 
        title="Supply Desk" 
        subtitle="Gestión de compras, inventario y proveedores."
      />
      <ModuleGrid columns={4}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
            badge={mod.badge}
            badgeColor={mod.badgeColor}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
