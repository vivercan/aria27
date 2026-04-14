"use client";

import { Receipt, PieChart, FileSpreadsheet, Landmark, Wallet, CreditCard, HandCoins, Building2, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Gastos de Obra",
    description: "Registro y control de gastos por obra.",
    href: "/dashboard/finanzas/gastos-obra",
    icon: Receipt,
    iconBg: "rgba(37,99,235,0.15)",
    iconColor: "#3b82f6",
  },
  {
    title: "Costeo",
    description: "Costeo por obra y partida.",
    href: "/dashboard/finanzas/costeo",
    icon: PieChart,
    iconBg: "rgba(16,185,129,0.14)",
    iconColor: "#10b981",
  },
  {
    title: "FacturaciÃ³n",
    description: "EmisiÃ³n y seguimiento de facturas CFDI.",
    href: "/dashboard/finanzas/facturacion",
    icon: FileSpreadsheet,
    iconBg: "rgba(245,158,11,0.13)",
    iconColor: "#fbbf24",
  },
  {
    title: "Caja Chica",
    description: "Control de fondo revolvente.",
    href: "/dashboard/finanzas/caja",
    icon: Wallet,
    iconBg: "rgba(139,92,246,0.14)",
    iconColor: "#a78bfa",
  },
  {
    title: "Bancos",
    description: "Conciliaciones y movimientos bancarios.",
    href: "/dashboard/finanzas/bancos",
    icon: Landmark,
    iconBg: "rgba(6,182,212,0.13)",
    iconColor: "#22d3ee",
  },
  {
    title: "Por Pagar",
    description: "Cuentas por pagar a proveedores.",
    href: "/dashboard/finanzas/por-pagar",
    icon: CreditCard,
    iconBg: "rgba(244,63,94,0.14)",
    iconColor: "#f43f5e",
  },
  {
    title: "Cobranza",
    description: "Seguimiento de cuentas por cobrar.",
    href: "/dashboard/finanzas/cobranza",
    icon: HandCoins,
    iconBg: "rgba(20,184,166,0.14)",
    iconColor: "#2dd4bf",
  },
  {
    title: "SUA / Infonavit",
    description: "Control de aportaciones SUA e Infonavit.",
    href: "/dashboard/finanzas/sua",
    icon: Building2,
    iconBg: "rgba(99,102,241,0.14)",
    iconColor: "#818cf8",
  },
  {
    title: "Ingreso â Egresos",
    description: "Reporte consolidado de ingresos y egresos.",
    href: "/dashboard/finanzas/ingreso-egresos",
    icon: ArrowLeftRight,
    iconBg: "rgba(34,197,94,0.13)",
    iconColor: "#4ade80",
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
      className="group block rounded-[16px] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] hover:border-white/[0.11]"
      style={{
        backgroundColor: "rgba(8,18,36,0.85)",
        border: "1px solid rgba(255,255,255,0.06)",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", inset: "0 0 auto 0", height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
          pointerEvents: "none",
        }}
      />
      <div
        className="flex items-center justify-center mb-4"
        style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: module.iconBg }}
      >
        <module.icon style={{ width: "20px", height: "20px", color: module.iconColor }} strokeWidth={1.75} />
      </div>
      <h3
        className="text-[14.5px] font-semibold leading-tight mb-1.5 truncate group-hover:text-white transition-colors"
        style={{ color: "rgba(255,255,255,0.88)" }}
      >
        {module.title}
      </h3>
      <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: "#3d5470" }}>
        {module.description}
      </p>
    </Link>
  );
}

export default function FinanzasPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
          Finanzas
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          GestiÃ³n financiera y contable
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subModules.map((module) => (
          <HubCard key={module.href} module={module} />
        ))}
      </div>
    </div>
  );
}
