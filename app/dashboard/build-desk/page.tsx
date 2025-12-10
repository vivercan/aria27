"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Briefcase, FileSearch, PackageCheck, Scale, ClipboardCheck, Calculator } from "lucide-react";

const modules = [
  { title: "Obra Pipeline", description: "Seguimiento de proyectos activos.", icon: Briefcase, href: "/dashboard/build-desk/pipeline", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)", badge: "5 Obras", badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30", meta: "Proyectos activos" },
  { title: "Tender Hub", description: "Gestión de licitaciones.", icon: FileSearch, href: "/dashboard/build-desk/tender", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)" },
  { title: "Packing List", description: "Control de envíos y materiales.", icon: PackageCheck, href: "/dashboard/build-desk/packing", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)" },
  { title: "Legal Pack", description: "Documentación legal de obras.", icon: Scale, href: "/dashboard/build-desk/legal", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.4)" },
  { title: "SIROC Desk", description: "Registro IMSS obras.", icon: ClipboardCheck, href: "/dashboard/build-desk/siroc", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.4)" },
  { title: "Estimate Flow", description: "Presupuestos y estimaciones.", icon: Calculator, href: "/dashboard/build-desk/estimates", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.4)" },
];

export default function BuildDeskPage() {
  return (
    <div>
      <ModuleHeader title="Build Desk" subtitle="Control de obras, licitaciones y documentación." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} badge={mod.badge} badgeColor={mod.badgeColor} meta={mod.meta} />
        ))}
      </ModuleGrid>
    </div>
  );
}
