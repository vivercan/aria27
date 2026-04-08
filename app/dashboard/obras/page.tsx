"use client";

import { Kanban, Gavel, FolderOpen, Scale, Building, Calculator, PackageCheck, Layers, Map, ListChecks, Camera, BookOpen, Activity, TrendingUp, ShieldCheck, Droplet } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Centro de Control",
    description: "Presupuesto vs Gasto Real (OC + Nómina) por obra. Semáforo de avance.",
    href: "/dashboard/obras/control",
    icon: Activity,
    gradient: "from-cyan-500 to-blue-600",
    active: true,
  },
  {
    title: "SIROC IMSS",
    description: "Registro de obras ante IMSS: fases, incidencias e importes bimestre.",
    href: "/dashboard/obras/siroc/registros",
    icon: ShieldCheck,
    gradient: "from-red-500 to-rose-600",
    active: true,
  },
  {
    title: "Control de Concreto",
    description: "Remisiones de colado, f'c, m³, pruebas de cilindro 7/14/28 días.",
    href: "/dashboard/obras/concreto/remisiones",
    icon: Droplet,
    gradient: "from-slate-500 to-slate-700",
    active: true,
  },
  {
    title: "Avance Físico",
    description: "Captura semanal de % de avance físico real por obra. Compara contra avance financiero.",
    href: "/dashboard/obras/avance",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-teal-600",
    active: true,
  },
  {
    title: "Catálogo Maestro",
    description: "Fuente única de obras: alta, edición, archivo, historial.",
    href: "/dashboard/obras/catalogo",
    icon: BookOpen,
    gradient: "from-sky-500 to-blue-600",
    active: true,
  },
  {
    title: "Pipeline",
    description: "Vista kanban operativa de proyectos activos.",
    href: "/dashboard/obras/pipeline",
    icon: Kanban,
    gradient: "from-blue-500 to-blue-600",
    active: true,
  },
  {
    title: "Licitaciones",
    description: "Gestión de licitaciones.",
    href: "/dashboard/obras/licitaciones",
    icon: Gavel,
    gradient: "from-amber-500 to-orange-500",
    active: true,
  },
  {
    title: "Expedientes",
    description: "Expedientes de obra.",
    href: "/dashboard/obras/expedientes",
    icon: FolderOpen,
    gradient: "from-emerald-500 to-emerald-600",
    active: true,
  },
  {
    title: "Contratos",
    description: "Contratos y documentación legal.",
    href: "/dashboard/obras/contratos",
    icon: Scale,
    gradient: "from-purple-500 to-purple-600",
    active: true,
  },
  {
    title: "SIROC",
    description: "Registro IMSS de obras.",
    href: "/dashboard/obras/siroc",
    icon: Building,
    gradient: "from-rose-500 to-pink-600",
    active: true,
  },
  {
    title: "Presupuestos",
    description: "Presupuestos y estimaciones.",
    href: "/dashboard/obras/presupuestos",
    icon: Calculator,
    gradient: "from-cyan-500 to-cyan-600",
    active: true,
  },
  {
    title: "Inventario",
    description: "Inventario de materiales por obra.",
    href: "/dashboard/obras/inventario",
    icon: PackageCheck,
    gradient: "from-teal-500 to-teal-600",
    active: true,
  },
  {
    title: "Concreto",
    description: "Control de colados, resistencias y pedidos.",
    href: "/dashboard/obras/concreto",
    icon: Layers,
    gradient: "from-gray-500 to-gray-600",
    active: true,
  },
  {
    title: "Planos",
    description: "Visor de planos y documentos técnicos.",
    href: "/dashboard/obras/planos",
    icon: Map,
    gradient: "from-indigo-500 to-indigo-600",
    active: true,
  },
  {
    title: "Tareas",
    description: "Asignación de tareas y seguimiento de cumplimiento.",
    href: "/dashboard/obras/tareas",
    icon: ListChecks,
    gradient: "from-lime-500 to-green-600",
    active: true,
  },
  {
    title: "Fotos de Avance",
    description: "Registro fotográfico de avance por obra.",
    href: "/dashboard/obras/fotos",
    icon: Camera,
    gradient: "from-orange-500 to-red-500",
    active: true,
  },
];

export default function ObrasPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Obras</h1>
        <p className="text-slate-400 mt-1">Gestión de proyectos y construcción.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {subModules.map((module) => (
<Link
  key={module.href}
  href={module.href}
  className={`group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border transition-all duration-300 ${
    module.active
      ? "border-slate-700/50 hover:border-slate-600 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10"
      : "border-slate-700/30 opacity-50 pointer-events-none"
  }`}
>
  <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
  <div className="relative p-6">
    <div className={`inline-flex p-3.5 rounded-xl bg-gradient-to-br ${module.gradient} shadow-lg mb-4`}>
      <module.icon className="w-6 h-6 text-white" strokeWidth={1.75} />
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-white text-lg group-hover:text-blue-300 transition-colors">
          {module.title}
        </h3>
        {!module.active && (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-500/20 text-slate-500 rounded-full border border-slate-500/30">
            PRÓXIMO
          </span>
        )}
      </div>
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
