"use client";

import { ArrowLeft, Shield, Plus } from "lucide-react";
import Link from "next/link";

export default function PolizasPage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/administracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
<ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
<h1 className="text-2xl font-bold text-white">Pólizas</h1>
<p className="text-slate-400 text-sm">Pólizas de seguro y fianzas subsecuentes.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">
<Plus className="w-4 h-4" />
Nueva Póliza
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No hay pólizas registradas.</p>
        <p className="text-slate-500 text-sm mt-1">Agrega pólizas de seguro y fianzas para llevar control de vencimientos.</p>
      </div>
    </div>
  );
}
