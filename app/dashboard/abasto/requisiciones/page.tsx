"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FilePlus, ListChecks, ShieldCheck, ShoppingCart, ClipboardList } from "lucide-react";

const submodules = [
  { title: "Nueva Requisición", description: "Crear solicitud de materiales.", icon: FilePlus, href: "/dashboard/abasto/Requisiciones/nuevo", color: "from-emerald-500 to-emerald-600" },
  { title: "Estatus de Requisiciones", description: "Monitor de solicitudes.", icon: ListChecks, href: "/dashboard/abasto/Requisiciones/estatus", color: "from-blue-500 to-blue-600" },
  { title: "Autorizar Requisiciones", description: "Aprobar solicitudes pendientes.", icon: ShieldCheck, href: "/dashboard/abasto/Requisiciones/autorizar", color: "from-amber-500 to-amber-600" },
  { title: "Compras", description: "Gestionar cotizaciones.", icon: ShoppingCart, href: "/dashboard/abasto/Requisiciones/Compras", color: "from-purple-500 to-purple-600" },
  { title: "Órdenes de Compra", description: "Órdenes autorizadas.", icon: ClipboardList, href: "/dashboard/abasto/Requisiciones/ordenes", color: "from-cyan-500 to-cyan-600" },
];

export default function RequisicionesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Requisiciones</h1>
        <p className="text-slate-400">Gestión de solicitudes de materiales para obra.</p>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {submodules.map((mod, idx) => (
          <Link key={idx} href={mod.href} className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg transition hover:border-white/20 hover:bg-white/10 h-full">
              <div className={`absolute inset-0 bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-10 transition`} />
              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${mod.color} mb-3`}>
                  <mod.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{mod.title}</h3>
                <p className="text-xs text-white/60">{mod.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
