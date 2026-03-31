"use client";

import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";

export default function EmpresaPage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/administracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
<ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
<h1 className="text-2xl font-bold text-white">Datos de Empresa</h1>
<p className="text-slate-400 text-sm">Información de GCU Avante y centros de costo.</p>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
<Building2 className="w-6 h-6 text-purple-400" />
<h2 className="text-lg font-semibold text-white">Grupo Constructor Urbano Avante</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
<div><span className="text-slate-500">RFC:</span> <span className="text-white ml-2">—</span></div>
<div><span className="text-slate-500">Régimen:</span> <span className="text-white ml-2">—</span></div>
<div><span className="text-slate-500">Domicilio Fiscal:</span> <span className="text-white ml-2">Aguascalientes, Ags.</span></div>
<div><span className="text-slate-500">Representante Legal:</span> <span className="text-white ml-2">—</span></div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3">Centros de Costo</h3>
        <div className="space-y-2">
{["Avante", "Denivel", "Tendevel"].map((cc) => (
  <div key={cc} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 flex items-center justify-between">
    <span className="text-sm text-white">{cc}</span>
    <span className="text-xs text-slate-500">Centro de costo</span>
  </div>
))}
        </div>
      </div>
    </div>
  );
}
