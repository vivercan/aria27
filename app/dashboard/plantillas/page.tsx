"use client";
import { Library, FileText, Presentation, ClipboardList } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Plantillas",
    description: "Plantillas de documentos.",
    href: "/dashboard/plantillas/biblioteca",
    icon: Library,
    gradient: "from-aria-primary to-aria-primary"
  },
  {
    title: "Documentos",
    description: "Centro de documentación.",
    href: "/dashboard/plantillas/documentos",
    icon: FileText,
    gradient: "from-emerald-500 to-emerald-600"
  },
  {
    title: "Propuestas",
    description: "Paquetes de licitación.",
    href: "/dashboard/plantillas/propuestas",
    icon: Presentation,
    gradient: "from-amber-500 to-orange-500"
  },
  {
    title: "Órdenes",
    description: "Formatos de órdenes de compra.",
    href: "/dashboard/plantillas/ordenes",
    icon: ClipboardList,
    gradient: "from-purple-500 to-purple-600"
  }
];

export default function PlantillasPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Plantillas</h1>
        <p className="text-[#7f93b0] mt-1">Biblioteca de documentos y formatos.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {subModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group relative overflow-hidden rounded-2xl bg-[#0c1d38]/50  border border-white/[0.05] hover:border-white/[0.07] transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-aria-primary/10"
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
                <p className="text-sm text-[#7f93b0] leading-relaxed">{module.description}</p>
              </div>
              
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <svg className="w-5 h-5 text-[#7f93b0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
