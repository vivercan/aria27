"use client";

import {
  MessageCircle, Inbox, Upload, Bell, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import React from "react";

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accent: string;
  hero?: boolean;
};

const GREEN = "#3AD8B1";

const grupos: { label: string; modulos: ModuleItem[] }[] = [
  {
    label: "Comunicación",
    modulos: [
      { title: "WhatsApp Log",  description: "Historial de mensajes enviados por el sistema.",     href: "/dashboard/whatsapp/log", icon: MessageCircle, accent: GREEN, hero: true },
      { title: "Inbox",         description: "Bandeja de entrada de correo corporativo.",          href: "/dashboard/inbox",        icon: Inbox,         accent: GREEN },
      { title: "Importar CSV",  description: "Importación masiva de datos desde archivo CSV.",     href: "/dashboard/import",       icon: Upload,        accent: GREEN },
      { title: "Alertas",       description: "Configuración de alertas y notificaciones.",         href: "/dashboard/configuracion/alertas", icon: Bell, accent: GREEN },
    ],
  },
];

const filas = [[grupos[0]]];

export default function ComunicacionPage() {
  return (
    <div
      className="px-4 pt-4 pb-6 md:px-5 md:pb-4 min-h-full md:h-full flex flex-col md:overflow-hidden"
      style={{
        background: [
          "radial-gradient(circle at 50% 28%, rgba(72,128,230,0.07) 0%, rgba(72,128,230,0.03) 20%, rgba(72,128,230,0.00) 44%)",
          "linear-gradient(180deg, #06152F 0%, #081E46 44%, #0A2450 100%)",
        ].join(", "),
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex-shrink-0 rounded-xl px-5 py-3" style={{ marginBottom: "24px", background: "linear-gradient(180deg, #123E92 0%, #103A86 100%)", borderBottom: "1px solid rgba(150,180,230,0.10)" }}>
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3.5">
          <h1 style={{ fontSize: "clamp(24px, 7vw, 30px)", fontWeight: 800, letterSpacing: "-0.035em", color: "#F4F8FF", lineHeight: 1 }}>Comunicación</h1>
          <span className="hidden sm:inline" style={{ color: "rgba(145,175,225,0.35)", fontSize: "15px" }}>·</span>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(214,228,255,0.70)" }}>WhatsApp, correo y notificaciones</span>
        </div>
      </div>

      {/* ── SECCIONES ── */}
      <div className="flex-1 flex flex-col min-h-0" style={{ gap: "22px" }}>
        {filas.map((fila, fi) => (
          <div key={fi} className={`flex-1 grid min-h-0 ${fila.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`} style={{ gap: "20px" }}>
            {fila.map((grupo) => (
              <section key={grupo.label} className="flex flex-col min-h-0">
                <div className="flex items-center flex-shrink-0" style={{ gap: "12px", marginBottom: "12px" }}>
                  <span className="uppercase" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(188,208,238,0.58)", flexShrink: 0, whiteSpace: "nowrap" }}>{grupo.label}</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.11)" }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "10px" }}>
                  {grupo.modulos.map((mod, idx) => <HubCard key={mod.href} module={mod} spanFull={grupo.modulos.length > 1 && grupo.modulos.length % 2 === 1 && idx === grupo.modulos.length - 1} />)}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HubCard({ module, spanFull }: { module: ModuleItem; spanFull?: boolean }) {
  const bg     = "linear-gradient(180deg, #2C3D52 0%, #263647 54%, #21303E 100%)";
  const shadow = "inset 0 1px 0 rgba(210,228,252,0.05), 0 8px 20px rgba(0,0,0,0.20)";
  const border = "rgba(120,158,204,0.18)";
  return (
    <Link href={module.href} className="group relative flex flex-col justify-start rounded-2xl transition-all duration-200 ease-out"
      style={{ height: "100%", padding: "20px 18px 18px 20px", background: bg, border: `1px solid ${border}`, boxShadow: shadow, ...(spanFull ? { gridColumn: "1 / -1" } : {}) }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 1px 0 rgba(210,228,252,0.08), 0 16px 32px rgba(0,0,0,0.26)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(140,178,228,0.30)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = shadow; (e.currentTarget as HTMLElement).style.borderColor = border; }}
    >
      <module.icon style={{ width: 28, height: 28, color: module.accent, flexShrink: 0 }} strokeWidth={1.5} />
      <div style={{ height: "14px", flexShrink: 0 }} />
      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#EAF2FF", letterSpacing: "-0.018em", lineHeight: 1.2, flexShrink: 0 }}>{module.title}</h3>
      <p style={{ marginTop: "7px", fontSize: "12px", fontWeight: 400, color: "rgba(200,220,248,0.72)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{module.description}</p>
      <ChevronRight className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-25 transition-opacity duration-200" style={{ width: 12, height: 12, color: module.accent }} />
    </Link>
  );
}
