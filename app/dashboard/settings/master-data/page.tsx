"use client";
import Link from "next/link";
import { Building2, Users, Settings, MapPin, DollarSign, Clock } from "lucide-react";

const masterDataItems = [
  {
    title: "Centros de Trabajo",
    description: "Obras y ubicaciones con geocerca para control de asistencia",
    icon: Building2,
    href: "/dashboard/settings/master-data/work-centers",
    color: "bg-blue-500"
  },
  {
    title: "Configuración Nómina",
    description: "Parámetros de cálculo: salario mínimo, horas extra, tolerancias",
    icon: DollarSign,
    href: "/dashboard/settings/master-data/payroll-config",
    color: "bg-emerald-500"
  },
  {
    title: "Horarios",
    description: "Definir horarios laborales y días de trabajo",
    icon: Clock,
    href: "/dashboard/settings/master-data/schedules",
    color: "bg-purple-500"
  }
];

export default function MasterDataPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="text-slate-400" />
          Master Data
        </h1>
        <p className="text-slate-400 text-sm">Configuración de catálogos y parámetros del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masterDataItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
          >
            <div className={`${item.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <item.icon className="text-white" size={24} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">{item.title}</h2>
            <p className="text-sm text-slate-400">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
