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
    color: "from-[#22C55E] to-[#16A34A]",
    badge: "Activo",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    meta: "Flujo completo de requisiciones"
  },
  { 
    title: "Inventario", 
    description: "Control de stock y almacén.", 
    icon: Package, 
    href: "/dashboard/supply-desk/products", 
    color: "from-[#38BDF8] to-[#2563EB]",
    meta: "Próximamente"
  },
  { 
    title: "Maestro Proveedores", 
    description: "Catálogo de proveedores.", 
    icon: Users, 
    href: "/dashboard/supply-desk/vendors", 
    color: "from-[#A855F7] to-[#7C3AED]",
    badge: "CRUD",
    badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30"
  },
  { 
    title: "Órdenes de Compra", 
    description: "Gestión de órdenes autorizadas.", 
    icon: ClipboardList, 
    href: "/dashboard/supply-desk/requisitions/orders", 
    color: "from-[#F59E0B] to-[#D97706]"
  },
  { 
    title: "Compras", 
    description: "Cotizaciones y comparativas.", 
    icon: ShoppingCart, 
    href: "/dashboard/supply-desk/requisitions/purchasing", 
    color: "from-[#06B6D4] to-[#0891B2]"
  },
  { 
    title: "Pagos", 
    description: "Control de pagos a proveedores.", 
    icon: CreditCard, 
    href: "/dashboard/supply-desk/payments", 
    color: "from-[#FB7185] to-[#EF4444]"
  },
  { 
    title: "Logística", 
    description: "Entregas y seguimiento.", 
    icon: Truck, 
    href: "/dashboard/supply-desk/delivery", 
    color: "from-[#14B8A6] to-[#0D9488]"
  },
  { 
    title: "Configuración", 
    description: "Ajustes del módulo.", 
    icon: Settings, 
    href: "/dashboard/supply-desk/settings", 
    color: "from-[#64748B] to-[#475569]"
  },
];

export default function SupplyDeskPage() {
  return (
    <div>
      <ModuleHeader 
        title="Supply Desk" 
        subtitle="Gestión de compras, inventario y proveedores."
      />
      <ModuleGrid>
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
