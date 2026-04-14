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
    iconBg: "rgba(37,99,235,0.15)",
    iconColor: "#3b82f6",
  },
  {
    title: "Datos Maestros",
    description: "Centros de trabajo y nómina.",
    href: "/dashboard/configuracion/maestros",
    icon: Database,
    iconBg: "rgba(139,92,246,0.14)",
    iconColor: "#a78bfa",
  },
  {
    title: "Correo",
    description: "Configuración de correo y notificaciones.",
    href: "/dashboard/configuracion/correo",
    icon: Mail,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "Alertas",
    description: "Alertas de atrasos y vencimientos.",
    href: "/dashboard/configuracion/alertas",
    icon: Bell,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
  },
  {
    title: "Recordatorios",
    description: "Recordatorios automáticos por WhatsApp.",
    href: "/dashboard/configuracion/recordatorios",
    icon: BookOpen,
    iconBg: "rgba(244,63,94,0.14)",
    iconColor: "#f43f5e",
  },
];

const restoreItem = {
  title: "Restaurar Sistema",
  description: "Punto de restauración — snapshot de respaldo.",
  href: "/dashboard/admin/restore",
  icon: DatabaseBackup,
  iconBg: "rgba(239,68,68,0.15)",
  iconColor: "#ef4444",
};

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
};

function HubCard({ module }: { module: ModuleItem }) {
  return (
    <Link
      href={module.href}
      className="group flex items-center gap-3 rounded-[10px] transition-all duration-150 hover:-translate-y-0.5"
      style={{
        backgroundColor: "rgba(8,18,38,0.85)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderTop: "1px solid rgba(255,255,255,0.14)",
        borderBottom: "1px solid rgba(0,0,0,0.30)",
        padding: "15px 14px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "36px", height: "36px", borderRadius: "8px",
          backgroundColor: "rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
        }}
      >
        <module.icon style={{ width: "17px", height: "17px", color: module.iconColor }} strokeWidth={1.75} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h3
          className="text-[13px] font-semibold leading-tight truncate group-hover:text-white transition-colors"
          style={{ color: "rgba(255,255,255,0.92)" }}
        >
          {module.title}
        </h3>
        <p className="text-[11.5px] mt-[3px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
          {module.description}
        </p>
      </div>
    </Link>
  );
}

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
    <div className="px-6 pt-6 pb-8 h-full overflow-auto" style={{ background: "radial-gradient(ellipse at 50% 35%, #1a6bc0 0%, #0e52a0 25%, #083070 55%, #021845 80%, #010c2a 100%)" }}>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
          Configuración
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Parámetros del sistema y preferencias
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <HubCard key={item.href} module={item} />
        ))}
      </div>
    </div>
  );
}
