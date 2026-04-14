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
    title: "Facturación",
    description: "Emisión y seguimiento de facturas CFDI.",
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
    title: "Ingreso – Egresos",
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
      className="group flex items-center gap-3 rounded-[10px] transition-all duration-150 hover:border-white/[0.18] hover:bg-[rgba(12,26,52,0.92)]"
      style={{
        backgroundColor: "rgba(8,18,38,0.80)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.09)",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "34px", height: "34px", borderRadius: "8px",
          backgroundColor: "rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "center",
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

export default function FinanzasPage() {
  return (
    <div className="px-6 pt-6 pb-8 h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "#1a2535" }}>
          Finanzas
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "#3d5470" }}>
          Gestión financiera y contable
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subModules.map((module) => (
          <HubCard key={module.href} module={module} />
        ))}
      </div>
    </div>
  );
}
