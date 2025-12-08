"use client";

import { motion } from "framer-motion";
import { 
  Users, 
  Clock, 
  Banknote, 
  Scale, 
  FileText, 
  TrendingUp 
} from "lucide-react";
import { SubModuleCard } from "@/components/dashboard/SubModuleCard";

export default function TalentHubPage() {
  const modules = [
    {
      title: "HR People",
      desc: "Maestro de empleados y colaboradores activos.",
      icon: Users,
      href: "/dashboard/talent-hub/people",
    },
    {
      title: "Clock-In Hub",
      desc: "Control de asistencia, retardos y checador biométrico.",
      icon: Clock,
      href: "/dashboard/talent-hub/clock-in",
    },
    {
      title: "Payroll Flow",
      desc: "Cálculo y dispersión de nómina semanal automática.",
      icon: Banknote,
      href: "/dashboard/talent-hub/payroll",
    },
    {
      title: "Adjustments",
      desc: "Gestión de incidencias, préstamos y descuentos.",
      icon: TrendingUp,
      href: "/dashboard/talent-hub/adjustments",
    },
    {
      title: "Legal HR",
      desc: "Altas IMSS, bajas, contratos y finiquitos.",
      icon: FileText,
      href: "/dashboard/talent-hub/legal",
    },
    {
      title: "Salary Matrix",
      desc: "Catálogo de puestos, tarifas y tabuladores.",
      icon: Scale,
      href: "/dashboard/talent-hub/matrix",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Talent Hub</h1>
        <p className="text-slate-400">Capital humano, nómina y control de asistencia.</p>
      </div>

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
