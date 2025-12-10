"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Shield, Bell, Sliders, Database, Mail, Clock, Rocket } from "lucide-react";

const modules = [
  { title: "Access Control", description: "Permisos y roles.", icon: Shield, href: "/dashboard/settings/access", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.4)", meta: "Seguridad" },
  { title: "Alert Engine", description: "Configuración de alertas.", icon: Bell, href: "/dashboard/settings/alerts", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)" },
  { title: "Config Matrix", description: "Parámetros del sistema.", icon: Sliders, href: "/dashboard/settings/config", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)" },
  { title: "Master Data", description: "Catálogos maestros.", icon: Database, href: "/dashboard/settings/master-data", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)" },
  { title: "Mail Config", description: "Configuración de correo.", icon: Mail, href: "/dashboard/settings/mail", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.4)", badge: "Resend", badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { title: "Reminders", description: "Recordatorios automáticos.", icon: Clock, href: "/dashboard/settings/reminders", color: "from-cyan-500 to-cyan-600", glowColor: "rgba(6,182,212,0.4)" },
  { title: "Deploy", description: "Estado del sistema.", icon: Rocket, href: "/dashboard/settings/deploy", color: "from-slate-500 to-slate-600", glowColor: "rgba(100,116,139,0.3)", badge: "Prod", badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
];

export default function SettingsPage() {
  return (
    <div>
      <ModuleHeader title="Settings" subtitle="Configuración general del sistema." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} badge={mod.badge} badgeColor={mod.badgeColor} meta={mod.meta} />
        ))}
      </ModuleGrid>
    </div>
  );
}
