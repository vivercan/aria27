"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Shield, Bell, Sliders, Database, Mail, Clock } from "lucide-react";

const modules = [
  { title: "Access Control", description: "Permisos y roles.", icon: Shield, href: "/dashboard/configuracion/access", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.3)", meta: "Seguridad" },
  { title: "Alert Engine", description: "Configuración de alertas.", icon: Bell, href: "/dashboard/configuracion/alerts", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.3)" },
  { title: "Configuración Matrix", description: "Parámetros del sistema.", icon: Sliders, href: "/dashboard/configuracion/Configuración", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.3)" },
  { title: "Maestros", description: "Catálogos maestros.", icon: Database, href: "/dashboard/configuracion/maestros", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.3)" },
  { title: "Mail Configuración", description: "Configuración de correo.", icon: Mail, href: "/dashboard/configuracion/mail", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.3)", badge: "Resend", badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { title: "Reminders", description: "Recordatorios automáticos.", icon: Clock, href: "/dashboard/configuracion/reminders", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.3)" },
];

export default function ConfiguraciónPage() {
  return (
    <div>
      <ModuleHeader title="Configuración" subtitle="Configuración general del sistema." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} {...mod} />
        ))}
      </ModuleGrid>
    </div>
  );
}
