"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  Shield, 
  Bell, 
  Sliders, 
  Database, 
  Mail, 
  Clock,
  Rocket
} from "lucide-react";

const modules = [
  { 
    title: "Access Control", 
    description: "Permisos y roles.", 
    icon: Shield, 
    href: "/dashboard/settings/access", 
    color: "from-violet-500 to-purple-600",
    meta: "Seguridad del sistema"
  },
  { 
    title: "Alert Engine", 
    description: "Configuración de alertas.", 
    icon: Bell, 
    href: "/dashboard/settings/alerts", 
    color: "from-amber-500 to-orange-600"
  },
  { 
    title: "Config Matrix", 
    description: "Parámetros del sistema.", 
    icon: Sliders, 
    href: "/dashboard/settings/config", 
    color: "from-blue-500 to-blue-600"
  },
  { 
    title: "Master Data", 
    description: "Catálogos maestros.", 
    icon: Database, 
    href: "/dashboard/settings/master-data", 
    color: "from-emerald-500 to-emerald-600"
  },
  { 
    title: "Mail Config", 
    description: "Configuración de correo.", 
    icon: Mail, 
    href: "/dashboard/settings/mail", 
    color: "from-rose-500 to-pink-600",
    badge: "Resend",
    badgeColor: "bg-rose-500/20 text-rose-300"
  },
  { 
    title: "Reminders", 
    description: "Recordatorios automáticos.", 
    icon: Clock, 
    href: "/dashboard/settings/reminders", 
    color: "from-cyan-500 to-cyan-600"
  },
  { 
    title: "Deploy", 
    description: "Estado del sistema.", 
    icon: Rocket, 
    href: "/dashboard/settings/deploy", 
    color: "from-slate-500 to-slate-600",
    badge: "Prod",
    badgeColor: "bg-emerald-500/20 text-emerald-300"
  },
];

export default function SettingsPage() {
  return (
    <div>
      <ModuleHeader 
        title="Settings" 
        subtitle="Configuración general del sistema."
      />
      <ModuleGrid columns={4}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
            badge={mod.badge}
            badgeColor={mod.badgeColor}
            meta={mod.meta}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
