"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Box, Activity, MapPin, Wrench } from "lucide-react";

const modules = [
  { title: "Activos Master", description: "Catálogo de activos fijos.", icon: Box, href: "/dashboard/Activos/master", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.3)", meta: "Maquinaria" },
  { title: "Activos Status", description: "Estado actual de activos.", icon: Activity, href: "/dashboard/Activos/estatus", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.3)" },
  { title: "Site Allocation", description: "Asignación por obra.", icon: MapPin, href: "/dashboard/Activos/allocation", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.3)" },
  { title: "Maintenance", description: "Mantenimiento preventivo.", icon: Wrench, href: "/dashboard/Activos/maintenance", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.3)" },
];

export default function ActivosPage() {
  return (
    <div>
      <ModuleHeader title="Activos" subtitle="Gestión de activos fijos y maquinaria." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} {...mod} />
        ))}
      </ModuleGrid>
    </div>
  );
}
