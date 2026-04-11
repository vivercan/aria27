"use client";

import { BookOpen, Activity, UserCheck, Wrench, Car } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Catálogo",
    description: "Inventario general de activos fijos.",
    href: "/dashboard/activos/catalogo",
    icon: BookOpen,
    gradient: "from-aria-primary to-aria-primary",
    active: true,
  },
  {
    title: "Estado",
    description: "Estado actual y disponibilidad de activos.",
    href: "/dashboard/activos/estado",
    icon: Activity,
    gradient: "from-emerald-500 to-emerald-600",
    active: true,
  },
  {
    title: "Asignación",
    description: "Asignación de activos a personal u obras.",
    href: "/dashboard/activos/asignacion",
    icon: UserCheck,
    gradient: "from-amber-500 to-orange-500",
    active: true,
  },
  {
    title: "Mantenimiento",
    description: "Programación y registro de mantenimientos.",
    href: "/dashboard/activos/mantenimiento",
    icon: Wrench,
    gradient: "from-purple-500 to-purple-600",
    active: true,
  },
  {
    title: "Vehículos",
    description: "Control de vehículos, llaves y maquinaria.",
    href: "/dashboard/activos/vehiculos",
    icon: Car,
    gradient: "from-rose-500 to-pink-600",
    active: true,
  },
];

export default function ActivosPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Activos</h1>
        <p className="text-slate-400 mt-1">Gestión de activos fijos y equipamiento.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {subModules.map((module) => (
<Link
  key={module.href}
  href={module.href}
  className={`group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border transition-all duration-300 ${
    module.active
      ? "border-slate-700/50 hover:border-slate-600 hover:scale-[1.02] hover:shadow-2xl hover:shadow-aria-primary/10"
      : "border-slate-700/30 opacity-50 pointer-events-none"
  }`}
>
  <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
  <div className="relative p-6">
    <div className={`inline-flex p-3.5 rounded-xl bg-gradient-to-br ${module.gradient} shadow-lg mb-4`}>
      <module.icon className="w-6 h-6 text-white" strokeWidth={1.75} />
    </div>
    <div className="space-y-2">
      <h3 className="font-semibold text-white text-lg group-hover:text-aria-accent transition-colors">
        {module.title}
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed">{module.description}</p>
    </div>
    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
