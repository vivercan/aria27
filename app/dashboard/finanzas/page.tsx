"use client";

import {
  Receipt, PieChart, FileSpreadsheet, Wallet,
  Landmark, CreditCard, HandCoins, Building2, ArrowLeftRight, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import React from "react";

const quickLinks = [
  { label: "Ingreso / Egresos", href: "/dashboard/finanzas/ingreso-egresos", icon: ArrowLeftRight },
];

type ModuleItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accent: string;
  hero?: boolean;
};

const GREEN = "#3AD8B1";
const GOLD  = "#FFD074";

const grupos: { label: string; modulos: ModuleItem[] }[] = [
  {
    label: "Control",
    modulos: [
      { title: "Gastos de Obra", description: "Registro y control de gastos por proyecto.", href: "/dashboard/finanzas/gastos-obra",  icon: Receipt,         accent: GREEN, hero: true },
      { title: "Costeo",         description: "Costeo por obra y partida presupuestal.",    href: "/dashboard/finanzas/costeo",        icon: PieChart,        accent: GREEN },
      { title: "Facturación",    description: "Emisión y seguimiento de facturas CFDI.",    href: "/dashboard/finanzas/facturacion",   icon: FileSpreadsheet, accent: GREEN },
      { title: "Caja Chica",     description: "Control de fondo revolvente por obra.",      href: "/dashboard/finanzas/caja",          icon: Wallet,          accent: GREEN },
    ],
  },
  {
    label: "Tesorería",
    modulos: [
      { title: "Bancos",          description: "Conciliaciones y movimientos bancarios.",     href: "/dashboard/finanzas/bancos",      icon: Landmark,   accent: GOLD },
      { title: "Por Pagar",       description: "Cuentas por pagar a proveedores.",            href: "/dashboard/finanzas/por-pagar",   icon: CreditCard, accent: GOLD },
      { title: "Cobranza",        description: "Seguimiento de cuentas por cobrar.",          href: "/dashboard/finanzas/cobranza",    icon: HandCoins,  accent: GOLD },
      { title: "SUA / Infonavit", description: "Control de aportaciones y créditos.",         href: "/dashboard/finanzas/sua",         icon: Building2,  accent: GOLD },
    ],
  },
];

const filas = [[grupos[0], grupos[1]]];

export default function FinanzasPage() {
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
          <h1 style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-0.035em", color: "#F4F8FF", lineHeight: 1 }}>Finanzas</h1>
          <span style={{ color: "rgba(145,175,225,0.35)", fontSize: "15px" }}>·</span>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "rgba(214,228,255,0.70)" }}>Control financiero y tesorería</span>
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

      {/* ── ACCESOS RÁPIDOS ── */}
      <div className="flex-shrink-0 flex flex-col items-center" style={{ marginTop: "22px", gap: "14px" }}>
        <div className="flex items-center w-full" style={{ gap: "16px" }}>
          <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.11)" }} />
          <span className="uppercase" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(205,223,247,0.75)", flexShrink: 0 }}>Accesos Rápidos</span>
          <div className="flex-1 h-px" style={{ background: "rgba(145,175,225,0.11)" }} />
        </div>
        <div className="flex gap-3">
          {quickLinks.map((ql) => (
            <Link key={ql.href} href={ql.href} className="flex items-center gap-2 rounded-full px-5 py-2 transition-all duration-200"
              style={{ background: "linear-gradient(180deg, #1E3E7A 0%, #193670 100%)", border: "1px solid rgba(130,170,230,0.18)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 16px rgba(0,0,0,0.26)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)"; }}
            >
              <ql.icon style={{ width: 13, height: 13, color: "rgba(200,220,255,0.80)" }} strokeWidth={1.6} />
              <span style={{ fontSize: "12px", fontWeight: 500, color: "#E0EEFF" }}>{ql.label}</span>
            </Link>
          ))}
        </div>
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
