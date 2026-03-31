"use client";

import { ArrowLeft, ScrollText, Upload } from "lucide-react";
import Link from "next/link";

const opiniones = [
  { name: "IMSS", desc: "Opinión de cumplimiento del Instituto Mexicano del Seguro Social." },
  { name: "Infonavit", desc: "Opinión de cumplimiento de aportaciones patronales." },
  { name: "SAT", desc: "Opinión de cumplimiento de obligaciones fiscales (32-D)." },
  { name: "SAR", desc: "Opinión de cumplimiento del Sistema de Ahorro para el Retiro." },
];

export default function OpinionesPage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/administracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
<ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
<h1 className="text-2xl font-bold text-white">Opiniones de Cumplimiento</h1>
<p className="text-slate-400 text-sm">IMSS, Infonavit, SAT, SAR.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opiniones.map((op) => (
<div key={op.name} className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all">
  <div className="flex items-start justify-between">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-amber-500/10">
        <ScrollText className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-white">{op.name}</h3>
        <p className="text-xs text-slate-500 mt-1">{op.desc}</p>
        <p className="text-xs text-red-400 mt-2">Sin documento vigente</p>
      </div>
    </div>
    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <Upload className="w-4 h-4 text-slate-400" />
    </button>
  </div>
</div>
        ))}
      </div>
    </div>
  );
}
