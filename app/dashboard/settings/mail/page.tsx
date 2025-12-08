"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Box } from "lucide-react";

export default function SubModulePage() {
  const router = useRouter();
  return (
    <div className="animate-in fade-in zoom-in duration-300">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
      >
        <div className="p-2 rounded-full bg-white/5 group-hover:bg-blue-600 group-hover:text-white transition-all">
          <ArrowLeft size={16} />
        </div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-10 min-h-[500px] flex flex-col items-center justify-center text-center backdrop-blur-md">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
          <Box size={40} className="text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Módulo: MAIL</h1>
        <p className="text-slate-400">Gestión activa: MAIL</p>
      </div>
    </div>
  );
}
