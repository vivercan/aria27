"use client";
import Link from "next/link";
import { ArrowLeft, Crown, Sparkles, Lock } from "lucide-react";

export default function ModuloPremiumPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        {/* Icono Premium */}
        <div className="relative inline-block mb-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-500/30">
            <Crown className="w-12 h-12 text-amber-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Texto */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Módulo Business
        </h1>
        <p className="text-slate-400 mb-6">
          Esta funcionalidad está disponible en el plan <span className="text-amber-400 font-semibold">ARIA Business</span>
        </p>

        {/* Features */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
            <Sparkles className="w-4 h-4" />
            Incluye:
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Acceso completo al módulo
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Reportes avanzados
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Soporte prioritario
            </li>
          </ul>
        </div>

        {/* Botones */}
        <div className="flex flex-col gap-3">
          <button className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 rounded-xl text-white font-semibold transition-all shadow-lg shadow-amber-500/25">
            Actualizar a Business
          </button>
          <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
