"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  Users, 
  Clock, 
  Wallet, 
  SlidersHorizontal, 
  Scale, 
  Grid3X3,
  UserCog
} from "lucide-react";

const modules = [
  { 
    title: "HR People", 
    description: "Expedientes de colaboradores.", 
    icon: Users, 
    href: "/dashboard/talent-hub/people", 
    color: "from-[#A855F7] to-[#7C3AED]",
    badge: "16",
    badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    meta: "Colaboradores registrados"
  },
  { 
    title: "Clock-In Hub", 
    description: "Control de asistencia.", 
    icon: Clock, 
    href: "/dashboard/talent-hub/clock-in", 
    color: "from-[#38BDF8] to-[#2563EB]",
    meta: "WhatsApp integration"
  },
  { 
    title: "Payroll Flow", 
    description: "Gestión de nómina.", 
    icon: Wallet, 
    href: "/dashboard/talent-hub/payroll", 
    color: "from-[#22C55E] to-[#16A34A]"
  },
  { 
    title: "Adjustments", 
    description: "Incidencias y ajustes.", 
    icon: SlidersHorizontal, 
    href: "/dashboard/talent-hub/adjustments", 
    color: "from-[#F59E0B] to-[#D97706]"
  },
  { 
    title: "Legal HR", 
    description: "Contratos y documentos legales.", 
    icon: Scale, 
    href: "/dashboard/talent-hub/legal", 
    color: "from-[#FB7185] to-[#EF4444]"
  },
  { 
    title: "Salary Matrix", 
    description: "Tabulador de sueldos.", 
    icon: Grid3X3, 
    href: "/dashboard/talent-hub/matrix", 
    color: "from-[#06B6D4] to-[#0891B2]"
  },
  { 
    title: "User Access", 
    description: "Control de usuarios del sistema.", 
    icon: UserCog, 
    href: "/dashboard/talent-hub/users", 
    color: "from-[#64748B] to-[#475569]",
    badge: "Admin",
    badgeColor: "bg-slate-500/20 text-slate-400 border-slate-500/30"
  },
];

export default function TalentHubPage() {
  return (
    <div>
      <ModuleHeader 
        title="Talent Hub" 
        subtitle="Gestión de recursos humanos y nómina."
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
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
