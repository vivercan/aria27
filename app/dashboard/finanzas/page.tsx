"use client";
import { Calculator, FileText, Wallet, Building2, CreditCard, TrendingUp } from "lucide-react";
import Link from "next/link";

const subModules = [
  {
    title: "Costeo",
    description: "Costeo por proyecto.",
    href: "/dashboard/finanzas/costeo",
    icon: Calculator,
    gradient: "from-blue-500 to-blue-600"
  },
  {
    title: "Facturación",
    description: "Facturación y CFDI.",
    href: "/dashboard/finanzas/facturacion",
    icon: FileText,
    gradient: "from-green-500 to-emerald-600"
  },
  {
    title: "Caja Chica",
    description: "Caja chica de obra.",
    href: "/dashboard/finanzas/caja",
    icon: Wallet,
    gradient: "from-amber-500 to-orange-500"
  },
  {
    title: "Bancos",
    description: "Conciliación bancaria.",
    href: "/dashboard/finanzas/bancos",
    icon: Building2,
    gradient: "from-cyan-500 to-cyan-600"
  },
  {
    title: "Por Pagar",
    description: "Cuentas por pagar.",
    href: "/dashboard/finanzas/por-pagar",
    icon: CreditCard,
    gradient: "from-rose-500 to-pink-600"
  },
  {
    title: "Cobranza",
    description: "Cuentas por cobrar.",
    href: "/dashboard/finanzas/cobranza",
    icon: TrendingUp,
    gradient: "from-purple-500 to-purple-600"
  }
];

export default function FinanzasPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Finanzas</h1>
        <p className="text-slate-400 mt-1">Control financiero y contabilidad.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {subModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
            
            <div className="relative p-6">
              <div className={`inline-flex p-3.5 rounded-xl bg-gradient-to-br ${module.gradient} shadow-lg mb-4`}>
                <module.icon className="w-6 h-6 text-white" strokeWidth={1.75} />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-white text-lg group-hover:text-blue-300 transition-colors">
                  {module.title}
                </h3>
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
