"use client";
import Link from "next/link";
import { ArrowLeft, HardHat, Clock } from "lucide-react";

export default function SIROCPage() {
  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/obras" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">SIROC</h1>
          <p className="text-slate-400 text-sm">Registro IMSS de obras de construcciÃ³n</p>
        </div>
      </div>

      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 mx-auto mb-6">
            <HardHat className="w-10 h-10 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">MÃ³dulo en Desarrollo</h2>
          <p className="text-slate-400 mb-4">
            El registro SIROC ante el IMSS estÃ¡ siendo implementado. PrÃ³ximamente podrÃ¡s gestionar
            avisos de obra, incidencias y reportes bimestrales desde aquÃ­.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>Disponible prÃ³ximamente</span>
          </div>
        </div>
      </div>
    </div>
  );
}
