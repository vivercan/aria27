"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FilePlus, ListChecks, ShieldCheck } from "lucide-react";

const submodules = [
  {
    title: "Nueva Requisición",
    description: "Crear una nueva solicitud de materiales para obra.",
    icon: FilePlus,
    href: "/dashboard/supply-desk/requisitions/new",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    title: "Estatus de Requisiciones",
    description: "Monitor de todas las requisiciones activas y su estado.",
    icon: ListChecks,
    href: "/dashboard/supply-desk/requisitions/status",
    color: "from-blue-500 to-blue-600",
  },
  {
    title: "Autorizar Requisiciones",
    description: "Revisar y aprobar requisiciones pendientes.",
    icon: ShieldCheck,
    href: "/dashboard/supply-desk/requisitions/authorize",
    color: "from-amber-500 to-amber-600",
  },
];

export default function RequisitionsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Requisiciones</h1>
        <p className="text-slate-400">Gestión de solicitudes de materiales para obra.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {submodules.map((mod, idx) => (
          <Link key={idx} href={mod.href} className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg transition hover:border-white/20 hover:bg-white/10">
              <div className={`absolute inset-0 bg-gradient-to-br ${mod.color} opacity-0 group-hover:opacity-10 transition`} />
              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} mb-4`}>
                  <mod.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{mod.title}</h3>
                <p className="text-sm text-white/60">{mod.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
