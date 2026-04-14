"use client";

import { BookOpen, Activity, UserCheck, Wrench, Car } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Catálogo",
    description: "Inventario general de activos fijos.",
    href: "/dashboard/activos/catalogo",
    icon: BookOpen,
    gradient: "from-blue-500 to-blue-700",
    active: true,
  },
  {
    title: "Estado",
    description: "Estado actual y disponibilidad de activos.",
    href: "/dashboard/activos/estado",
    icon: Activity,
    gradient: "from-emerald-500 to-emerald-700",
    active: true,
  },
  {
    title: "Asignación",
    description: "Asignación de activos a personal u obras.",
    href: "/dashboard/activos/asignacion",
    icon: UserCheck,
    gradient: "from-amber-400 to-amber-600",
    active: true,
  },
  {
    title: "Mantenimiento",
    description: "Programación y registro de mantenimientos.",
    href: "/dashboard/activos/mantenimiento",
    icon: Wrench,
    gradient: "from-violet-500 to-violet-700",
    active: true,
  },
  {
    title: "Vehículos",
    description: "Control de vehículos, llaves y maquinaria.",
    href: "/dashboard/activos/vehiculos",
    icon: Car,
    gradient: "from-rose-400 to-rose-600",
    active: true,
  },
];

export default function ActivosPage() {
  return (
    <div className="px-6 pt-6 pb-8 space-y-6 h-full overflow-auto">
      <div className="space-y-1">
        <h1 className="text-[26px] font-bold tracking-tight text-white leading-none">Activos</h1>
        <p className="text-sm text-[#7f93b0] font-light tracking-wide">Gestión de activos fijos y equipamiento.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {subModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${
              module.active
                ? "bg-[#0c1d38]/90 border-white/[0.07] hover:border-white/[0.13] hover:scale-[1.014] hover:shadow-xl hover:shadow-black/50 hover:bg-[#0f2448]/90"
                : "bg-[#0a1628]/60 border-white/[0.04] opacity-45 pointer-events-none"
            }`}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-[0.055] transition-opacity duration-200 pointer-events-none`} />
            <div className="relative p-5">
              <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${module.gradient} shadow-lg mb-4`}>
                <module.icon className="w-7 h-7 text-white" strokeWidth={1.6} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white/90 text-[15px] tracking-wide leading-tight group-hover:text-white transition-colors duration-150">
                    {module.title}
                  </h3>
                  {!module.active && (
                    <span className="px-1.5 py-px text-[9px] font-bold tracking-widest bg-slate-500/[0.15] text-slate-400/70 rounded-full border border-slate-500/20">PRÓXIMO</span>
                  )}
                </div>
                <p className="text-[13px] text-[#6a84a8] leading-relaxed">{module.description}</p>
              </div>
              <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1.5 group-hover:translate-x-0">
                <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
