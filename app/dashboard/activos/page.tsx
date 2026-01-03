"use client";
import { Database, Activity, MapPin, Wrench } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Catálogo",
    description: "Catálogo de activos fijos.",
    href: "/dashboard/activos/catalogo",
    icon: Database,
    color: "bg-blue-500"
  },
  {
    title: "Estado",
    description: "Estado actual de activos.",
    href: "/dashboard/activos/estado",
    icon: Activity,
    color: "bg-green-500"
  },
  {
    title: "Asignación",
    description: "Asignación por obra.",
    href: "/dashboard/activos/asignacion",
    icon: MapPin,
    color: "bg-amber-500"
  },
  {
    title: "Mantenimiento",
    description: "Mantenimiento preventivo.",
    href: "/dashboard/activos/mantenimiento",
    icon: Wrench,
    color: "bg-rose-500"
  }
];

export default function ActivosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Activos</h1>
        <p className="text-slate-400 mt-1">Control de activos fijos y maquinaria.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${module.color}/20`}>
                <module.icon className={`w-6 h-6 text-white`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {module.title}
                </h3>
                <p className="text-sm text-slate-400 mt-1">{module.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
