"use client";

import { motion } from "framer-motion";
import { 
  Shield, 
  Sliders, 
  Database, 
  Bell, 
  Mail, 
  Clock
} from "lucide-react";
import { SubModuleCard } from "@/components/dashboard/SubModuleCard";

export default function SettingsPage() {
  // Se eliminaron "Integration Hub" y "Deploy" como solicitaste
  const modules = [
    { title: "Access Control", desc: "Gestión de usuarios, roles y permisos.", icon: Shield, href: "/dashboard/settings/access" },
    { title: "Config Matrix", desc: "Parámetros generales del sistema.", icon: Sliders, href: "/dashboard/settings/config" },
    { title: "Master Data", desc: "Catálogos maestros (centros de costo, etc).", icon: Database, href: "/dashboard/settings/master-data" },
    { title: "Alert Engine", desc: "Motor de alertas y notificaciones push.", icon: Bell, href: "/dashboard/settings/alerts" },
    { title: "Mail Config", desc: "Configuración de cuentas (Zoho/Resend).", icon: Mail, href: "/dashboard/settings/mail" },
    { title: "Reminders", desc: "Sistema de recordatorios automáticos.", icon: Clock, href: "/dashboard/settings/reminders" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400">Configuración general y parámetros del sistema.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {modules.map((mod, idx) => (
          <SubModuleCard key={idx} title={mod.title} description={mod.desc} icon={mod.icon} href={mod.href} />
        ))}
      </motion.div>
    </div>
  );
}
