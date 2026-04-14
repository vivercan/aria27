"use client";
import Link from "next/link";
import { MessageCircle, Inbox, Upload, Bell } from "lucide-react";

const moduleItems = [
  {
    title: "WhatsApp Log",
    description: "Historial de mensajes enviados por el sistema.",
    href: "/dashboard/whatsapp/log",
    icon: MessageCircle,
    iconBg: "rgba(34,197,94,0.15)",
    iconColor: "#22c55e",
  },
  {
    title: "Inbox",
    description: "Bandeja de entrada de correo Zoho.",
    href: "/dashboard/inbox",
    icon: Inbox,
    iconBg: "rgba(59,130,246,0.15)",
    iconColor: "#3b82f6",
  },
  {
    title: "Importar CSV",
    description: "Importación masiva de datos desde archivo.",
    href: "/dashboard/import",
    icon: Upload,
    iconBg: "rgba(168,85,247,0.15)",
    iconColor: "#a855f7",
  },
  {
    title: "Alertas",
    description: "Configuración de alertas y notificaciones.",
    href: "/dashboard/configuracion/alertas",
    icon: Bell,
    iconBg: "rgba(251,191,36,0.15)",
    iconColor: "#fbbf24",
  },
];

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
        backgroundColor: "rgba(4,13,40,0.82)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "13px 14px",
      }}
    >
      <div
        className="flex items-center justify-center rounded-[8px] shrink-0"
        style={{ width: "36px", height: "36px", backgroundColor: module.iconBg }}
      >
        <module.icon style={{ width: "17px", height: "17px", color: module.iconColor }} strokeWidth={1.75} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="text-[13px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.92)" }}>
          {module.title}
        </p>
        <p className="text-[11.5px] mt-[3px] truncate" style={{ color: "rgba(255,255,255,0.42)" }}>
          {module.description}
        </p>
      </div>
    </Link>
  );
}

export default function ComunicacionHub() {
  return (
    <div className="h-full overflow-auto relative" style={{ background: "#040d1e" }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "-8%", width: "420px", height: "420px", background: "linear-gradient(135deg, #0d2060 0%, #081540 100%)", transform: "rotate(45deg)", borderRadius: "18px", opacity: 0.85 }} />
        <div style={{ position: "absolute", top: "18%", left: "4%", width: "300px", height: "300px", background: "linear-gradient(135deg, #0a1a50 0%, #05102e 100%)", transform: "rotate(45deg)", borderRadius: "14px", opacity: 0.9 }} />
        <div style={{ position: "absolute", bottom: "-12%", right: "-6%", width: "480px", height: "480px", background: "linear-gradient(135deg, #0c1e5a 0%, #071236 100%)", transform: "rotate(45deg)", borderRadius: "20px", opacity: 0.75 }} />
        <div style={{ position: "absolute", top: "-5%", right: "12%", width: "200px", height: "200px", background: "linear-gradient(135deg, #0f2468 0%, #091845 100%)", transform: "rotate(45deg)", borderRadius: "10px", opacity: 0.7 }} />
        <div style={{ position: "absolute", top: "40%", right: "20%", width: "260px", height: "260px", background: "linear-gradient(135deg, #0b1b55 0%, #06103a 100%)", transform: "rotate(45deg)", borderRadius: "12px", opacity: 0.6 }} />
      </div>
      <div className="relative px-6 pt-6 pb-8" style={{ zIndex: 1 }}>
        <h1 className="text-[22px] font-bold tracking-tight mb-1" style={{ color: "rgba(255,255,255,0.93)" }}>
          Comunicación
        </h1>
        <p className="text-[12.5px] mb-6" style={{ color: "rgba(255,255,255,0.42)" }}>
          Mensajería, correo y notificaciones del sistema
        </p>
        <div className="grid grid-cols-1 gap-2.5" style={{ maxWidth: "480px" }}>
          {moduleItems.map((item) => (
            <HubCard key={item.href} module={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
