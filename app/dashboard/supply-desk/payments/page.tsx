"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";

export default function SubModulePage() {
  const router = useRouter();

  return (
    <div className="animate-in fade-in zoom-in duration-300">
      {/* Botón Regresar */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
      >
        <div className="p-2 rounded-full bg-white/5 group-hover:bg-blue-600 group-hover:text-white transition-all">
          <ArrowLeft size={16} />
        </div>
        <span className="text-sm font-medium">Regresar al Panel</span>
      </button>

      {/* Área de Trabajo */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-10 min-h-[600px] flex flex-col items-center justify-center text-center backdrop-blur-md">
        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
          <Construction size={40} className="text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Módulo: PAYMENTS</h1>
        <p className="text-slate-400 max-w-md">
          Este módulo está activo y conectado al núcleo de Aria27. 
          Aquí se cargarán los formularios y tablas correspondientes.
        </p>
        
        <div className="mt-8 flex gap-4">
            <button className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-500/20">
                Crear Nuevo Registro
            </button>
            <button className="px-6 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 text-sm font-medium transition-all">
                Ver Reportes
            </button>
        </div>
      </div>
    </div>
  );
}
