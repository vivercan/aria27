"use client";
import { Shield, Bell, Settings, Database, Mail, Clock } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Accesos",
    description: "Permisos y roles.",
    href: "/dashboard/configuracion/accesos",
    icon: Shield,
    color: "bg-blue-500"
  },
  {
    title: "Alertas",
    description: "Configuración de alertas.",
    href: "/dashboard/configuracion/alertas",
    icon: Bell,
    color: "bg-amber-500"
  },
  {
    title: "General",
    description: "Parámetros del sistema.",
    href: "/dashboard/configuracion/general",
    icon: Settings,
    color: "bg-green-500"
  },
  {
    title: "Maestros",
    description: "Catálogos maestros.",
    href: "/dashboard/configuracion/maestros",
    icon: Database,
    color: "bg-purple-500"
  },
  {
    title: "Correo",
    description: "Configuración de correo.",
    href: "/dashboard/configuracion/correo",
    icon: Mail,
    color: "bg-cyan-500"
  },
  {
    title: "Recordatorios",
    description: "Recordatorios automáticos.",
    href: "/dashboard/configuracion/recordatorios",
    icon: Clock,
    color: "bg-rose-500"
  }
];

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 mt-1">Ajustes del sistema.</p>
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
