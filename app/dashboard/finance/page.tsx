"use client";

import { motion } from "framer-motion";
import { 
  Calculator, 
  Wallet, 
  Landmark, 
  Receipt, 
  CreditCard, 
  Banknote 
} from "lucide-react";
import { SubModuleCard } from "@/components/dashboard/SubModuleCard";

export default function FinancePage() {
  const modules = [
    { title: "Job Costing", desc: "Control de gastos por centro de costos y obra.", icon: Calculator, href: "/dashboard/finance/job-costing" },
    { title: "Field Cash", desc: "Administración de caja chica de obra.", icon: Wallet, href: "/dashboard/finance/field-cash" },
    { title: "Bank Reco", desc: "Conciliaciones bancarias y estados de cuenta.", icon: Landmark, href: "/dashboard/finance/bank-reco" },
    { title: "Billing Desk", desc: "Facturación a clientes y timbrado.", icon: Receipt, href: "/dashboard/finance/billing" },
    { title: "Accounts", desc: "Cuentas por pagar a proveedores.", icon: CreditCard, href: "/dashboard/finance/accounts-payable" },
    { title: "Receivables", desc: "Cuentas por cobrar a clientes.", icon: Banknote, href: "/dashboard/finance/receivables" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Finance</h1>
        <p className="text-slate-400">Administración financiera y control de flujo.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {modules.map((mod, idx) => (
          <SubModuleCard key={idx} title={mod.title} description={mod.desc} icon={mod.icon} href={mod.href} />
        ))}
      </motion.div>
    </div>
  );
}
