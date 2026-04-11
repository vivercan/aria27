"use client";
import Link from "next/link";
import { ArrowLeft, FileText, Users, Building2, DollarSign } from "lucide-react";

const REPORTES = [
  { href: "/dashboard/reportes/cobranza-mensual", titulo: "Cobranza Mensual", desc: "Facturado, cobrado y por cobrar del mes agrupado por obra.", icon: DollarSign, color: "from-emerald-500 to-teal-600" },
  { href: "/dashboard/reportes/nomina-semanal", titulo: "Nómina Semanal", desc: "Nómina consolidada de la semana con detalle por empleado y obra.", icon: Users, color: "from-violet-500 to-purple-600" },
  { href: "/dashboard/reportes/estado-cuenta-proveedor", titulo: "Estado de Cuenta Proveedor", desc: "OCs, cuentas por pagar y saldo pendiente por proveedor.", icon: Building2, color: "from-amber-500 to-orange-600" },
  { href: "/dashboard/obras/reporte", titulo: "Reporte Ejecutivo de Obra", desc: "Vista 360° de una obra: presupuesto, gasto, cobranza, avance físico.", icon: FileText, color: "from-aria-primary to-aria-accent" },
];

export default function ReportesHub() {
  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      <div className="flex items-center gap-3 mb-6 flex-shrink-0">
        <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes PDF</h1>
          <p className="text-sm text-slate-400">Genera y guarda reportes ejecutivos con un clic</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTES.map(r => {
            const Icon = r.icon;
            return (
              <Link key={r.href} href={r.href} className="group p-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-1">{r.titulo}</h3>
                <p className="text-xs text-slate-400">{r.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
