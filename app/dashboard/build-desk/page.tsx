"use client";

import { motion } from "framer-motion";
import { 
  Briefcase, 
  Gavel, 
  HardHat, 
  ClipboardList, 
  FileCheck, 
  Calculator 
} from "lucide-react";
import { SubModuleCard } from "@/components/dashboard/SubModuleCard";

export default function BuildDeskPage() {
  const modules = [
    {
      title: "Obra Pipeline",
      desc: "Pipeline de proyectos y obras activas en tiempo real.",
      icon: HardHat,
      href: "/dashboard/build-desk/pipeline",
    },
    {
      title: "Tender Hub",
      desc: "Seguimiento de licitaciones y concursos en proceso.",
      icon: Gavel,
      href: "/dashboard/build-desk/tender",
    },
    {
      title: "Packing List",
      desc: "Listados maestros de materiales por obra.",
      icon: ClipboardList,
      href: "/dashboard/build-desk/packing",
    },
    {
      title: "Legal Pack",
      desc: "Contratos, fianzas y documentos legales de obra.",
      icon: Briefcase,
      href: "/dashboard/build-desk/legal",
    },
    {
      title: "SIROC Desk",
      desc: "Alta y gestión de obras ante el IMSS (SIROC).",
      icon: FileCheck,
      href: "/dashboard/build-desk/siroc",
    },
    {
      title: "Estimate Flow",
      desc: "Generador y control de estimaciones de obra.",
      icon: Calculator,
      href: "/dashboard/build-desk/estimates",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Build Desk</h1>
        <p className="text-slate-400">Gestión integral de obras y licitaciones.</p>
      </div>

      {/* Grid de Submódulos */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {modules.map((mod, idx) => (
          <SubModuleCard
            key={idx}
            title={mod.title}
            description={mod.desc}
            icon={mod.icon}
            href={mod.href}
          />
        ))}
      </motion.div>
    </div>
  );
}
