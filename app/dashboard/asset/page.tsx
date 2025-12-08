"use client";

import { motion } from "framer-motion";
import { 
  Truck, 
  MapPin, 
  Wrench, 
  Activity 
} from "lucide-react";
import { SubModuleCard } from "@/components/dashboard/SubModuleCard";

export default function AssetPage() {
  const modules = [
    { title: "Asset Master", desc: "Catálogo maestro de maquinaria y equipo.", icon: Truck, href: "/dashboard/asset/master" },
    { title: "Site Allocation", desc: "Asignación de equipo a obras específicas.", icon: MapPin, href: "/dashboard/asset/allocation" },
    { title: "Maintenance", desc: "Programa de mantenimientos preventivos/correctivos.", icon: Wrench, href: "/dashboard/asset/maintenance" },
    { title: "Asset Status", desc: "Estatus operativo en tiempo real (Taller/Obra).", icon: Activity, href: "/dashboard/asset/status" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Asset Management</h1>
        <p className="text-slate-400">Control de maquinaria, vehículos y activos fijos.</p>
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
