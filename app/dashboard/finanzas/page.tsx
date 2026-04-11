"use client";

import { Receipt, PieChart, FileSpreadsheet, Landmark, Wallet, CreditCard, HandCoins, Building2, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Gastos de Obra",
    description: "Registro y control de gastos por obra.",
    href: "/dashboard/finanzas/gastos-obra",
    icon: Receipt,
    gradient: "from-aria-primary to-aria-primary",
    active: true,
  },
  {
    title: "Costeo",
    description: "Costeo por obra y partida.",
    href: "/dashboard/finanzas/costeo",
    icon: PieChart,
    gradient: "from-emerald-500 to-emerald-600",
    active: true,
  },
  {
    title: "Facturación",
    description: "Emisión y seguimiento de facturas.",
    href: "/dashboard/finanzas/facturacion",
    icon: FileSpreadsheet,
    gradient: "from-amber-500 to-orange-500",
    active: true,
  },
  {
    title: "Caja Chica",
    description: "Control de fondo revolvente.",
    href: "/dashboard/finanzas/caja",
    icon: Wallet,
    gradient: "from-purple-500 to-purple-600",
    active: true,
  },
  {
    title: "Bancos",
    description: "Conciliaciones y movimientos bancarios.",
    href: "/dashboard/finanzas/bancos",
    icon: Landmark,
    gradient: "from-aria-accent to-aria-accent",
    active: true,
  },
  {
    title: "Por Pagar",
    description: "Cuentas por pagar a proveedores.",
    href: "/dashboard/finanzas/por-pagar",
    icon: CreditCard,
    gradient: "from-rose-500 to-pink-600",
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
    gradient: "from-indigo-500 to-indigo-600",
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Finanzas</h1>
        <p className="text-slate-400 mt-1">Gestión financiera y contable.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {subModules.map((module) => (
<Link
  key={module.href}
  href={module.href}
  className={`group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border transition-all duration-300 ${
    module.active
      ? "border-slate-700/50 hover:border-slate-600 hover:scale-[1.02] hover:shadow-2xl hover:shadow-aria-primary/10"
      : "border-slate-700/30 opacity-50 pointer-events-none"
  }`}
>
  <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
  <div className="relative p-6">
    <div className={`inline-flex p-3.5 rounded-xl bg-gradient-to-br ${module.gradient} shadow-lg mb-4`}>
      <module.icon className="w-6 h-6 text-white" strokeWidth={1.75} />
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-white text-lg group-hover:text-aria-accent transition-colors">
          {module.title}
        </h3>
        {!module.active && (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-500/20 text-slate-500 rounded-full border border-slate-500/30">
            PRÓXIMO
          </span>
        )}
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{module.description}</p>
    </div>
    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
