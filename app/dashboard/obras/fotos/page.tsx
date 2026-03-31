"use client";

import { ArrowLeft, Camera, Upload } from "lucide-react";
import Link from "next/link";

export default function FotosPage() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/obras" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
<ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
<h1 className="text-2xl font-bold text-white">Fotos de Avance</h1>
<p className="text-slate-400 text-sm">Registro fotográfico del avance de obra.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg transition-colors">
<Upload className="w-4 h-4" />
Subir Fotos
        </button>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
        <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">No hay fotos registradas.</p>
        <p className="text-slate-500 text-sm mt-1">Sube fotos de avance con fecha, obra y descripción.</p>
      </div>
    </div>
  );
}
