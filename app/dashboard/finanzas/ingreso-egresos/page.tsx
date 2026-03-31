"use client";

import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import Link from "next/link";

export default function IngresoEgresosPage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finanzas" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
<ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
<h1 className="text-2xl font-bold text-white">Ingreso - Egresos</h1>
<p className="text-slate-400 text-sm">Reporte consolidado de ingresos y egresos.</p>
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <ArrowLeftRight className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Sin datos de periodo.</p>
        <p className="text-slate-500 text-sm mt-1">Selecciona un periodo para ver el reporte de ingresos vs egresos.</p>
      </div>
    </div>
  );
}
