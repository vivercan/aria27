"use client";
import { Calculator, FileText, Wallet, Building2, CreditCard, TrendingUp } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Costeo",
    description: "Costeo por proyecto.",
    href: "/dashboard/finanzas/costeo",
    icon: Calculator,
    color: "bg-blue-500"
  },
  {
    title: "Facturación",
    description: "Facturación y CFDI.",
    href: "/dashboard/finanzas/facturacion",
    icon: FileText,
    color: "bg-green-500"
  },
  {
    title: "Caja Chica",
    description: "Caja chica de obra.",
    href: "/dashboard/finanzas/caja",
    icon: Wallet,
    color: "bg-amber-500"
  },
  {
    title: "Bancos",
    description: "Conciliación bancaria.",
    href: "/dashboard/finanzas/bancos",
    icon: Building2,
    color: "bg-cyan-500"
  },
  {
    title: "Por Pagar",
    description: "Cuentas por pagar.",
    href: "/dashboard/finanzas/por-pagar",
    icon: CreditCard,
    color: "bg-rose-500"
  },
  {
    title: "Cobranza",
    description: "Cuentas por cobrar.",
    href: "/dashboard/finanzas/cobranza",
    icon: TrendingUp,
    color: "bg-purple-500"
  }
];

export default function FinanzasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Finanzas</h1>
        <p className="text-slate-400 mt-1">Control financiero y contabilidad.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${module.color}/20`}>
                <module.icon className={`w-6 h-6 text-white`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {module.title}
                </h3>
                <p className="text-sm text-slate-400 mt-1">{module.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
