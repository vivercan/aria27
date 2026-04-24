"use client";
import Link from "next/link";
import { Calculator, FileText, History, PenTool, Receipt } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

const submodulos = [
  { nombre: "Pre-Nómina", descripcion: "Generar cálculo de nómina semanal", href: "/dashboard/talento/nomina/pre-nomina", icono: Calculator, color: "from-aria-primary to-aria-accent" },
  { nombre: "Captura Manual", descripcion: "Ajustes y capturas manuales", href: "/dashboard/talento/nomina/manual", icono: PenTool, color: "from-aria-primary to-aria-accent" },
  { nombre: "Histórico", descripcion: "Consultar nóminas anteriores", href: "/dashboard/talento/nomina/historico", icono: History, color: "from-amber-500 to-orange-500" },
  { nombre: "Recibos", descripcion: "Generar recibos de nómina", href: "/dashboard/talento/nomina/recibos", icono: Receipt, color: "from-aria-primary to-aria-accent" },
];

export default function NominaPage() {
  return (
    <div className="aria-bg-canon max-w-7xl mx-auto p-6">
      <AriaBackButton href="/dashboard/talento" />
      <h1 className="text-2xl font-bold text-white mb-2">Nómina</h1>
      <p className="text-[#7f93b0] mb-8">Gestión de nómina y pagos</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {submodulos.map((sub, i) => (
          <Link key={i} href={sub.href} className="group p-6 bg-white/[0.04] border border-white/[0.08] rounded-2xl hover:bg-white/[0.06] transition-all">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${sub.color} mb-4`}>
              <sub.icono className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-aria-accent transition-colors">{sub.nombre}</h3>
            <p className="text-sm text-[#7f93b0] mt-1">{sub.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
