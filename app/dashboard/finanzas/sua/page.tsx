"use client";

import { ArrowLeft, Building2, Upload } from "lucide-react";
import Link from "next/link";

export default function SUAPage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/finanzas" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
<ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
<h1 className="text-2xl font-bold text-white">SUA / Infonavit</h1>
<p className="text-slate-400 text-sm">Control de aportaciones SUA e Infonavit.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
<Upload className="w-4 h-4" />
Cargar Archivo SUA
        </button>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No hay registros de aportaciones.</p>
        <p className="text-slate-500 text-sm mt-1">Carga archivos SUA para llevar control de aportaciones IMSS e Infonavit.</p>
      </div>
    </div>
  );
}
