"use client";
import Link from "next/link";
import { DollarSign, Calculator, FileText, Wallet, Building2, CreditCard, TrendingUp } from "lucide-react";

const submodules = [
  {
    name: "Gastos de Obra",
    description: "Control de gastos por proyecto.",
    href: "/dashboard/finanzas/gastos-obra",
    icon: DollarSign,
    color: "bg-emerald-500",
  },
  {
    name: "Costeo",
    description: "Costeo por proyecto.",
    href: "/dashboard/finanzas/costeo",
    icon: Calculator,
    color: "bg-blue-500",
  },
  {
    name: "Facturación",
    description: "Facturación y CFDI.",
    href: "/dashboard/finanzas/facturacion",
    icon: FileText,
    color: "bg-green-500",
  },
  {
    name: "Caja Chica",
    description: "Caja chica de obra.",
    href: "/dashboard/finanzas/caja",
    icon: Wallet,
    color: "bg-orange-500",
  },
  {
    name: "Bancos",
    description: "Conciliación bancaria.",
    href: "/dashboard/finanzas/bancos",
    icon: Building2,
    color: "bg-cyan-500",
  },
  {
    name: "Por Pagar",
    description: "Cuentas por pagar.",
    href: "/dashboard/finanzas/por-pagar",
    icon: CreditCard,
    color: "bg-pink-500",
  },
  {
    name: "Cobranza",
    description: "Cuentas por cobrar.",
    href: "/dashboard/finanzas/cobranza",
    icon: TrendingUp,
    color: "bg-violet-500",
  },
];

export default function FinanzasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Finanzas</h1>
        <p className="text-slate-400">Control financiero y contabilidad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {submodules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="group p-5 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-all"
          >
            <div className={`w-12 h-12 rounded-xl ${mod.color} flex items-center justify-center mb-4`}>
              <mod.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
              {mod.name}
            </h3>
            <p className="text-sm text-slate-400">{mod.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
