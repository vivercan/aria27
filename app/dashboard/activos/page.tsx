"use client";

import {
  PackageOpen, Activity, MapPin, Wrench, Truck, ChevronRight,
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

const BLUE = "#7BB6FF";
const CYAN = "#46D4FF";

const grupos: { label: string; modulos: ModuleItem[] }[] = [
  {
    label: "Inventario",
    modulos: [
      { title: "Catálogo",     description: "Registro maestro de activos de la empresa.",       href: "/dashboard/activos/catalogo",    icon: PackageOpen, accent: BLUE, hero: true },
      { title: "Estado",       description: "Condición y ubicación actual de activos.",         href: "/dashboard/activos/estado",      icon: Activity,    accent: BLUE },
      { title: "Asignación",   description: "Asignar activos a obra y personal.",              href: "/dashboard/activos/asignacion",  icon: MapPin,      accent: BLUE },
      { title: "Mantenimiento",description: "Programación y registro de mantenimiento.",        href: "/dashboard/activos/mantenimiento",icon: Wrench,     accent: BLUE },
    ],
  },
  {
    label: "Flota",
    modulos: [
      { title: "Vehículos", description: "Flota vehicular, conductores y bitácora de uso.", href: "/dashboard/activos/vehiculos", icon: Truck, accent: CYAN },
    ],
  },
];

const filas = [[grupos[0], grupos[1]]];

export default function ActivosPage() {
  return (
    <div
      className="px-5 pt-4 pb-4 h-full flex flex-col overflow-hidden"
      style={{
        background: [
          "radial-gradient(circle at 50% 28%, rgba(72,128,230,0.07) 0%, rgba(72,128,230,0.03) 20%, rgba(72,128,230,0.00) 44%)",
          "linear-gradient(180deg, #06152F 0%, #081E46 44%, #0A2450 100%)",
        ].join(", "),
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex-shrink-0 rounded-xl px-5 py-3" style={{ marginBottom: "24px", background: "linear-gradient(180deg, #123E92 0%, #103A86 100%)", borderBottom: "1px solid rgba(150,180,230,0.10)" }}>
        <div className="flex items-baseline gap-3.5">
          <h1 style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-0.035em", color: "#F4F8FF", lineHeight: 1 }}>Activos</h1>
          <span style={{ color: "rgba(145,175,225,0.35)", fontSize: "15px" }}>·</span>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(214,228,255,0.70)" }}>Inventario, flota y mantenimiento</span>
        </div>
      </div>

      {/* ── SECCIONES ── */}
      <div className="flex-1 flex flex-col min-h-0" style={{ gap: "22px" }}>
        {filas.map((fila, fi) => (
          <div key={fi} className="flex-1 grid grid-cols-2 min-h-0" style={{ gap: "20px" }}>
            {fila.map((grupo) => (
              <section key={grupo.label} className="flex flex-col min-h-0">
                <div className="flex items-center flex-shrink-0" style={{ gap: "12px", marginBottom: "12px" }}>
                  <span className="uppercase" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(188,208,238,0.58)", flexShrink: 0, whiteSpace: "nowrap" }}>{grupo.label}</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.11)" }} />
                </div>
                <div className="flex-1 grid grid-cols-2 min-h-0" style={{ gap: "10px", alignItems: "stretch" }}>
                  {grupo.modulos.map((mod) => <HubCard key={mod.href} module={mod} />)}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HubCard({ module }: { module: ModuleItem }) {
  const isHero     = module.hero;
  const iconSize   = isHero ? 36 : 28;
  const heroBg     = "linear-gradient(180deg, #1D3A5E 0%, #162F4E 54%, #112744 100%)";
  const normalBg   = "linear-gradient(180deg, #2C3D52 0%, #263647 54%, #21303E 100%)";
  const heroShadow = "inset 0 2px 0 rgba(123,182,255,0.38), inset 0 1px 0 rgba(210,228,252,0.10), 0 0 0 1px rgba(123,182,255,0.10), 0 12px 28px rgba(0,0,0,0.26)";
  const normalShadow = "inset 0 1px 0 rgba(210,228,252,0.05), 0 8px 20px rgba(0,0,0,0.20)";
  const heroBorder   = "rgba(123,182,255,0.32)";
  const normalBorder = "rgba(120,158,204,0.18)";
  return (
    <Link href={module.href} className="group relative flex flex-col justify-start rounded-2xl transition-all duration-200 ease-out"
      style={{ height: "100%", padding: "20px 18px 18px 20px", background: isHero ? heroBg : normalBg, border: `1px solid ${isHero ? heroBorder : normalBorder}`, boxShadow: isHero ? heroShadow : normalShadow }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = isHero ? "inset 0 2px 0 rgba(123,182,255,0.45), inset 0 1px 0 rgba(210,228,252,0.12), 0 0 0 1px rgba(123,182,255,0.16), 0 18px 36px rgba(0,0,0,0.30)" : "inset 0 1px 0 rgba(210,228,252,0.08), 0 16px 32px rgba(0,0,0,0.26)"; (e.currentTarget as HTMLElement).style.borderColor = isHero ? "rgba(123,182,255,0.45)" : "rgba(140,178,228,0.30)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = isHero ? heroShadow : normalShadow; (e.currentTarget as HTMLElement).style.borderColor = isHero ? heroBorder : normalBorder; }}
    >
      <module.icon style={{ width: iconSize, height: iconSize, color: module.accent, flexShrink: 0 }} strokeWidth={1.5} />
      <div style={{ height: "14px", flexShrink: 0 }} />
      <h3 style={{ fontSize: isHero ? "18px" : "15px", fontWeight: isHero ? 800 : 700, color: isHero ? "#FFFFFF" : "#EAF2FF", letterSpacing: "-0.018em", lineHeight: 1.2, flexShrink: 0 }}>{module.title}</h3>
      <p style={{ marginTop: "7px", fontSize: "12px", fontWeight: 400, color: "rgba(200,220,248,0.72)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{module.description}</p>
      <ChevronRight className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-25 transition-opacity duration-200" style={{ width: 12, height: 12, color: module.accent }} />
    </Link>
  );
}
