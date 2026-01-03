"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { Calculator, Receipt, Banknote, Building2, CreditCard, TrendingUp } from "lucide-react";

const modules = [
  { title: "Job Costing", description: "Costeo por proyecto.", icon: Calculator, href: "/dashboard/Finanzas/job-costing", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.3)", meta: "Costos por obra" },
  { title: "Billing Desk", description: "Facturación y cobros.", icon: Receipt, href: "/dashboard/Finanzas/billing", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.3)" },
  { title: "Field Cash", description: "Caja chica de obra.", icon: Banknote, href: "/dashboard/Finanzas/field-cash", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.3)" },
  { title: "Bank Reco", description: "Conciliación bancaria.", icon: Building2, href: "/dashboard/Finanzas/bank-reco", color: "from-purple-500 to-purple-600", glowColor: "rgba(168,85,247,0.3)" },
  { title: "Accounts Payable", description: "Cuentas por pagar.", icon: CreditCard, href: "/dashboard/Finanzas/accounts-payable", color: "from-rose-500 to-rose-600", glowColor: "rgba(244,63,94,0.3)" },
  { title: "Receivables", description: "Cuentas por cobrar.", icon: TrendingUp, href: "/dashboard/Finanzas/receivables", color: "from-teal-500 to-teal-600", glowColor: "rgba(20,184,166,0.3)" },
];

export default function FinanzasPage() {
  return (
    <div>
      <ModuleHeader title="Finanzas" subtitle="Control financiero y contabilidad." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} {...mod} />
        ))}
      </ModuleGrid>
    </div>
  );
}
