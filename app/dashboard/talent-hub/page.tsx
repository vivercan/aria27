"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Users, Clock, Wallet, SlidersHorizontal, Scale, Grid3X3, UserCog } from "lucide-react";

const modules = [
  { title: "HR People", description: "Expedientes de colaboradores.", icon: Users, href: "/dashboard/talent-hub/people", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.3)", badge: "16", badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30", meta: "Colaboradores" },
  { title: "Clock-In Hub", description: "Control de asistencia.", icon: Clock, href: "/dashboard/talent-hub/clock-in", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.3)", meta: "WhatsApp" },
  { title: "Payroll Flow", description: "Gestión de nómina.", icon: Wallet, href: "/dashboard/talent-hub/payroll", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.3)" },
  { title: "Adjustments", description: "Incidencias y ajustes.", icon: SlidersHorizontal, href: "/dashboard/talent-hub/adjustments", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.3)" },
  { title: "Legal HR", description: "Contratos y documentos legales.", icon: Scale, href: "/dashboard/talent-hub/legal", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.3)" },
  { title: "Salary Matrix", description: "Tabulador de sueldos.", icon: Grid3X3, href: "/dashboard/talent-hub/matrix", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.3)" },
  { title: "User Access", description: "Control de usuarios del sistema.", icon: UserCog, href: "/dashboard/talent-hub/users", color: "from-slate-500 to-slate-600", glowColor: "rgba(100,116,139,0.2)", badge: "Admin", badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
];

export default function TalentHubPage() {
  return (
    <div>
      <ModuleHeader title="Talent Hub" subtitle="Gestión de recursos humanos y nómina." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} {...mod} />
        ))}
      </ModuleGrid>
    </div>
  );
}
