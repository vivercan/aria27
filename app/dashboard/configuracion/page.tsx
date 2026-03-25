"use client";
import { Settings, Bell, Mail, Database, BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";

const items = [
  { title: "General", description: "Parámetros del sistema y usuarios", href: "/dashboard/configuracion/general", icon: Settings, gradient: "from-blue-500 to-blue-600" },
  { title: "Datos Maestros", description: "Centros de trabajo y nómina", href: "/dashboard/configuracion/maestros", icon: Database, gradient: "from-violet-500 to-purple-600" },
  { title: "Correo", description: "Configuración de correo y notificaciones", href: "/dashboard/configuracion/correo", icon: Mail, gradient: "from-emerald-500 to-green-600" },
  { title: "Alertas", description: "Alertas de atrasos y vencimientos", href: "/dashboard/configuracion/alertas", icon: Bell, gradient: "from-amber-500 to-orange-500" },
  { title: "Recordatorios", description: "Recordatorios automáticos por WhatsApp", href: "/dashboard/configuracion/recordatorios", icon: BookOpen, gradient: "from-rose-500 to-pink-500" },
];

export default function ConfiguracionPage() {
  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-auto">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-slate-400">Administra los parámetros del sistema</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <Link key={i} href={item.href} className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${item.gradient} opacity-[0.06] blur-2xl group-hover:opacity-[0.12] transition-opacity`} />
            <div className="relative z-10">
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${item.gradient} mb-4 shadow-lg`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white mb-1">{item.title}</h3>
                <ArrowRight className="w-4 h-4 text-slate-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
              <p className="text-sm text-slate-400">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
