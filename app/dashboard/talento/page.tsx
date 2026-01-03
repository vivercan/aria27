"use client";
import { Users, Clock, DollarSign, AlertCircle, FileText, BarChart3, UserCog } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "HR Personal",
    description: "Expedientes de colaboradores.",
    href: "/dashboard/talento/personal",
    icon: Users,
    color: "bg-blue-500"
  },
  {
    title: "Asistencias",
    description: "Control de entradas y salidas.",
    href: "/dashboard/talento/checadas",
    icon: Clock,
    color: "bg-green-500"
  },
  {
    title: "Nómina",
    description: "Gestión de nómina.",
    href: "/dashboard/talento/nomina",
    icon: DollarSign,
    color: "bg-amber-500"
  },
  {
    title: "Incidencias",
    description: "Faltas, permisos y ajustes.",
    href: "/dashboard/talento/incidencias",
    icon: AlertCircle,
    color: "bg-rose-500"
  },
  {
    title: "Legal HR",
    description: "Contratos y documentos legales.",
    href: "/dashboard/talento/legales",
    icon: FileText,
    color: "bg-purple-500"
  },
  {
    title: "Salary Matrix",
    description: "Tabulador de sueldos.",
    href: "/dashboard/talento/matriz",
    icon: BarChart3,
    color: "bg-cyan-500"
  },
  {
    title: "User Access",
    description: "Usuarios del sistema.",
    href: "/dashboard/talento/usuarios",
    icon: UserCog,
    color: "bg-indigo-500"
  }
];

export default function TalentoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Talento</h1>
        <p className="text-slate-400 mt-1">Gestión de recursos humanos y nómina.</p>
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
