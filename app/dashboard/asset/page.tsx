"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  Box, 
  Activity, 
  MapPin, 
  Wrench 
} from "lucide-react";

const modules = [
  { 
    title: "Asset Master", 
    description: "Catálogo de activos fijos.", 
    icon: Box, 
    href: "/dashboard/asset/master", 
    color: "from-[#FB7185] to-[#EF4444]",
    meta: "Maquinaria y equipo"
  },
  { 
    title: "Asset Status", 
    description: "Estado actual de activos.", 
    icon: Activity, 
    href: "/dashboard/asset/status", 
    color: "from-[#38BDF8] to-[#2563EB]"
  },
  { 
    title: "Site Allocation", 
    description: "Asignación por obra.", 
    icon: MapPin, 
    href: "/dashboard/asset/allocation", 
    color: "from-[#22C55E] to-[#16A34A]"
  },
  { 
    title: "Maintenance", 
    description: "Mantenimiento preventivo.", 
    icon: Wrench, 
    href: "/dashboard/asset/maintenance", 
    color: "from-[#F59E0B] to-[#D97706]"
  },
];

export default function AssetPage() {
  return (
    <div>
      <ModuleHeader 
        title="Asset" 
        subtitle="Gestión de activos fijos y maquinaria."
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
