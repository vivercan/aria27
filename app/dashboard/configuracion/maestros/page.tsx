"use client";
import { Building2, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";

const items = [
  { title: "Centros de Trabajo", description: "Obras, oficinas y ubicaciones GPS", href: "/dashboard/configuracion/maestros/centros", icon: Building2, gradient: "from-aria-primary to-aria-accent" },
  { title: "Configuración Nómina", description: "Salarios, horarios y parámetros", href: "/dashboard/configuracion/maestros/nomina", icon: DollarSign, gradient: "from-emerald-500 to-emerald-500" },
];

export default function MaestrosPage() {
  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuracion" className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] transition"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold">Datos Maestros</h1>
          <p className="text-sm text-[#7f93b0]">Configuración base del sistema</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item, i) => (
          <Link key={i} href={item.href} className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${item.gradient} opacity-[0.06] blur-2xl group-hover:opacity-[0.12] transition-opacity`} />
            <div className="relative z-10">
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${item.gradient} mb-4 shadow-lg`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">{item.title}</h3>
              <p className="text-sm text-[#7f93b0]">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
