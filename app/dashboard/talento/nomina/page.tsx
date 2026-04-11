"use client";
import Link from "next/link";
import { ArrowLeft, Calculator, FileText, History, PenTool, Receipt } from "lucide-react";

const submodulos = [
  { nombre: "Pre-Nómina", descripcion: "Generar cálculo de nómina semanal", href: "/dashboard/talento/nomina/pre-nomina", icono: Calculator, color: "from-aria-primary to-aria-accent" },
  { nombre: "Captura Manual", descripcion: "Ajustes y capturas manuales", href: "/dashboard/talento/nomina/manual", icono: PenTool, color: "from-violet-500 to-purple-500" },
  { nombre: "Histórico", descripcion: "Consultar nóminas anteriores", href: "/dashboard/talento/nomina/historico", icono: History, color: "from-amber-500 to-orange-500" },
  { nombre: "Recibos", descripcion: "Generar recibos de nómina", href: "/dashboard/talento/nomina/recibos", icono: Receipt, color: "from-emerald-500 to-emerald-500" },
];

export default function NominaPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <Link href="/dashboard/talento" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> Talento
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2">Nómina</h1>
      <p className="text-slate-400 mb-8">Gestión de nómina y pagos</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {submodulos.map((sub, i) => (
          <Link key={i} href={sub.href} className="group p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${sub.color} mb-4`}>
              <sub.icono className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-aria-accent transition-colors">{sub.nombre}</h3>
            <p className="text-sm text-slate-400 mt-1">{sub.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
