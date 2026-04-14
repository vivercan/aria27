"use client";
import { useState, useEffect } from "react";
import { Settings, Bell, Mail, Database, BookOpen, DatabaseBackup } from "lucide-react";
import Link from "next/link";

const RESTORE_EMAILS = [
  "juanviverosv@gmail.com",
  "recursos.humanos@gcuavante.com",
];

const baseItems = [
  {
    title: "General",
    description: "Parámetros del sistema y usuarios.",
    href: "/dashboard/configuracion/general",
    icon: Settings,
    gradient: "from-blue-500 to-blue-700",
  },
  {
    title: "Datos Maestros",
    description: "Centros de trabajo y nómina.",
    href: "/dashboard/configuracion/maestros",
    icon: Database,
    gradient: "from-violet-500 to-violet-700",
  },
  {
    title: "Correo",
    description: "Configuración de correo y notificaciones.",
    href: "/dashboard/configuracion/correo",
    icon: Mail,
    gradient: "from-emerald-500 to-emerald-700",
  },
  {
    title: "Alertas",
    description: "Alertas de atrasos y vencimientos.",
    href: "/dashboard/configuracion/alertas",
    icon: Bell,
    gradient: "from-amber-400 to-amber-600",
  },
  {
    title: "Recordatorios",
    description: "Recordatorios automáticos por WhatsApp.",
    href: "/dashboard/configuracion/recordatorios",
    icon: BookOpen,
    gradient: "from-rose-400 to-rose-600",
  },
];

const restoreItem = {
  title: "Restaurar Sistema",
  description: "Punto de restauración — snapshot de respaldo.",
  href: "/dashboard/admin/restore",
  icon: DatabaseBackup,
  gradient: "from-red-500 to-red-700",
};

export default function ConfiguracionPage() {
  const [items, setItems] = useState(baseItems);

  useEffect(() => {
    const email =
      localStorage.getItem("userEmail") ||
      sessionStorage.getItem("userEmail") ||
      "";
    if (RESTORE_EMAILS.includes(email)) {
      setItems([...baseItems, restoreItem]);
    }
  }, []);

  return (
    <div className="px-6 pt-6 pb-8 space-y-6 h-full overflow-auto">
      <div className="space-y-1">
        <h1 className="text-[26px] font-bold tracking-tight text-white leading-none">Configuración</h1>
        <p className="text-sm text-[#7f93b0] font-light tracking-wide">Parámetros del sistema y preferencias.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c1d38]/90 hover:border-white/[0.13] hover:scale-[1.014] hover:shadow-xl hover:shadow-black/50 hover:bg-[#0f2448]/90 transition-all duration-200"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-[0.055] transition-opacity duration-200 pointer-events-none`} />
            <div className="relative p-5">
              <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg mb-4`}>
                <item.icon className="w-7 h-7 text-white" strokeWidth={1.6} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-white/90 text-[15px] tracking-wide leading-tight group-hover:text-white transition-colors duration-150">
                  {item.title}
                </h3>
                <p className="text-[13px] text-[#6a84a8] leading-relaxed">{item.description}</p>
              </div>
              <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1.5 group-hover:translate-x-0">
                <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
