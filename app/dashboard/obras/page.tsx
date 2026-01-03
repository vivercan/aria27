"use client";
import { Kanban, Gavel, FolderOpen, Scale, Building, Calculator } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Pipeline",
    description: "Seguimiento de proyectos activos.",
    href: "/dashboard/obras/pipeline",
    icon: Kanban,
    color: "bg-blue-500"
  },
  {
    title: "Licitaciones",
    description: "Gestión de licitaciones.",
    href: "/dashboard/obras/licitaciones",
    icon: Gavel,
    color: "bg-amber-500"
  },
  {
    title: "Expedientes",
    description: "Expedientes de obra.",
    href: "/dashboard/obras/expedientes",
    icon: FolderOpen,
    color: "bg-green-500"
  },
  {
    title: "Contratos",
    description: "Contratos y documentación legal.",
    href: "/dashboard/obras/contratos",
    icon: Scale,
    color: "bg-purple-500"
  },
  {
    title: "SIROC",
    description: "Registro IMSS de obras.",
    href: "/dashboard/obras/siroc",
    icon: Building,
    color: "bg-rose-500"
  },
  {
    title: "Presupuestos",
    description: "Presupuestos y estimaciones.",
    href: "/dashboard/obras/presupuestos",
    icon: Calculator,
    color: "bg-cyan-500"
  }
];

export default function ObrasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Obras</h1>
        <p className="text-slate-400 mt-1">Gestión de proyectos y construcción.</p>
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
