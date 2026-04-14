"use client";

import { Receipt, PieChart, FileSpreadsheet, Landmark, Wallet, CreditCard, HandCoins, Building2, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Gastos de Obra",
    description: "Registro y control de gastos por obra.",
    href: "/dashboard/finanzas/gastos-obra",
    icon: Receipt,
    gradient: "from-blue-500 to-blue-700",
    active: true,
  },
  {
    title: "Costeo",
    description: "Costeo por obra y partida.",
    href: "/dashboard/finanzas/costeo",
    icon: PieChart,
    gradient: "from-emerald-500 to-emerald-700",
    active: true,
  },
  {
    title: "Facturación",
    description: "Emisión y seguimiento de facturas.",
    href: "/dashboard/finanzas/facturacion",
    icon: FileSpreadsheet,
    gradient: "from-amber-400 to-amber-600",
    active: true,
  },
  {
    title: "Caja Chica",
    description: "Control de fondo revolvente.",
    href: "/dashboard/finanzas/caja",
    icon: Wallet,
    gradient: "from-violet-500 to-violet-700",
    active: true,
  },
  {
    title: "Bancos",
    description: "Conciliaciones y movimientos bancarios.",
    href: "/dashboard/finanzas/bancos",
    icon: Landmark,
    gradient: "from-cyan-500 to-cyan-700",
    active: true,
  },
  {
    title: "Por Pagar",
    description: "Cuentas por pagar a proveedores.",
    href: "/dashboard/finanzas/por-pagar",
    icon: CreditCard,
    gradient: "from-rose-400 to-rose-600",
    active: true,
  },
  {
    title: "Cobranza",
    description: "Seguimiento de cuentas por cobrar.",
    href: "/dashboard/finanzas/cobranza",
    icon: HandCoins,
    gradient: "from-teal-500 to-teal-600",
    active: true,
  },
  {
    title: "SUA / Infonavit",
    description: "Control de aportaciones SUA e Infonavit.",
    href: "/dashboard/finanzas/sua",
    icon: Building2,
    gradient: "from-indigo-500 to-indigo-700",
    active: true,
  },
  {
    title: "Ingreso - Egresos",
    description: "Reporte consolidado de ingresos y egresos.",
    href: "/dashboard/finanzas/ingreso-egresos",
    icon: ArrowLeftRight,
    gradient: "from-lime-500 to-green-600",
    active: true,
  },
];

export default function FinanzasPage() {
  return (
    <div className="px-6 pt-6 pb-8 space-y-6 h-full overflow-auto">
      <div className="space-y-1">
        <h1 className="text-[26px] font-bold tracking-tight text-white leading-none">Finanzas</h1>
        <p className="text-sm text-[#7f93b0] font-light tracking-wide">Gestión financiera y contable.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {subModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${
              module.active
                ? "bg-[#0c1d38]/90 border-white/[0.07] hover:border-white/[0.13] hover:scale-[1.014] hover:shadow-xl hover:shadow-black/50 hover:bg-[#0f2448]/90"
                : "bg-[#0a1628]/60 border-white/[0.04] opacity-45 pointer-events-none"
            }`}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-[0.055] transition-opacity duration-200 pointer-events-none`} />
            <div className="relative p-5">
              <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${module.gradient} shadow-lg mb-4`}>
                <module.icon className="w-7 h-7 text-white" strokeWidth={1.6} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white/90 text-[15px] tracking-wide leading-tight group-hover:text-white transition-colors duration-150">
                    {module.title}
                  </h3>
                  {!module.active && (
                    <span className="px-1.5 py-px text-[9px] font-bold tracking-widest bg-slate-500/[0.15] text-[#7f93b0]/70 rounded-full border border-white/[0.1]/20">PRÓXIMO</span>
                  )}
                </div>
                <p className="text-[13px] text-[#6a84a8] leading-relaxed">{module.description}</p>
              </div>
              <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1.5 group-hover:translate-x-0">
                <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
