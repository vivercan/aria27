"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { 
  Calculator, 
  Receipt, 
  Banknote, 
  Building2, 
  CreditCard, 
  TrendingUp 
} from "lucide-react";

const modules = [
  { 
    title: "Job Costing", 
    description: "Costeo por proyecto.", 
    icon: Calculator, 
    href: "/dashboard/finance/job-costing", 
    color: "from-blue-500 to-cyan-600"
  },
  { 
    title: "Billing Desk", 
    description: "Facturación y cobros.", 
    icon: Receipt, 
    href: "/dashboard/finance/billing", 
    color: "from-emerald-500 to-emerald-600" 
  },
  { 
    title: "Field Cash", 
    description: "Caja chica de obra.", 
    icon: Banknote, 
    href: "/dashboard/finance/field-cash", 
    color: "from-amber-500 to-orange-600" 
  },
  { 
    title: "Bank Reco", 
    description: "Conciliación bancaria.", 
    icon: Building2, 
    href: "/dashboard/finance/bank-reco", 
    color: "from-violet-500 to-purple-600" 
  },
  { 
    title: "Accounts Payable", 
    description: "Cuentas por pagar.", 
    icon: CreditCard, 
    href: "/dashboard/finance/accounts-payable", 
    color: "from-rose-500 to-pink-600" 
  },
  { 
    title: "Receivables", 
    description: "Cuentas por cobrar.", 
    icon: TrendingUp, 
    href: "/dashboard/finance/receivables", 
    color: "from-teal-500 to-teal-600" 
  },
];

export default function FinancePage() {
  return (
    <div>
      <ModuleHeader 
        title="Finance" 
        subtitle="Control financiero y contabilidad."
      />
      <ModuleGrid columns={3}>
        {modules.map((mod, idx) => (
          <ModuleCard
            key={idx}
            title={mod.title}
            description={mod.description}
            icon={mod.icon}
            href={mod.href}
            color={mod.color}
          />
        ))}
      </ModuleGrid>
    </div>
  );
}
