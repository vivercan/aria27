"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Briefcase, FileSearch, PackageCheck, Scale, ClipboardCheck, Calculator } from "lucide-react";

const modules = [
  { title: "Obra Pipeline", description: "Seguimiento de proyectos activos.", icon: Briefcase, href: "/dashboard/obras/pipeline", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.3)", badge: "5 Obras", badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30", meta: "Proyectos activos" },
  { title: "Tender Hub", description: "Gestión de licitaciones.", icon: FileSearch, href: "/dashboard/obras/tender", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.3)" },
  { title: "Packing List", description: "Control de envíos y materiales.", icon: PackageCheck, href: "/dashboard/obras/packing", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.3)" },
  { title: "Legal Pack", description: "Documentación legal de obras.", icon: Scale, href: "/dashboard/obras/legal", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.3)" },
  { title: "SIROC Desk", description: "Registro IMSS obras.", icon: ClipboardCheck, href: "/dashboard/obras/siroc", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.3)" },
  { title: "Estimate Flow", description: "Presupuestos y estimaciones.", icon: Calculator, href: "/dashboard/obras/estimates", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.3)" },
];

export default function BuildDeskPage() {
  return (
    <div>
      <ModuleHeader title="Obras" subtitle="Control de obras, licitaciones y documentación." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} {...mod} />
        ))}
      </ModuleGrid>
    </div>
  );
}
