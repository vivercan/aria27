"use client";

import { ArrowLeft, Layers, Plus } from "lucide-react";
import Link from "next/link";

export default function ConcretoPage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/obras" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
<ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
<h1 className="text-2xl font-bold text-white">Concreto</h1>
<p className="text-slate-400 text-sm">Control de colados, resistencias y pedidos a concretera.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
<Plus className="w-4 h-4" />
Nuevo Colado
        </button>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No hay registros de colados.</p>
        <p className="text-slate-500 text-sm mt-1">Registra colados con fecha, obra, resistencia y proveedor.</p>
      </div>
    </div>
  );
}
