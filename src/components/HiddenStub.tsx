"use client";
import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

interface HiddenStubProps {
  titulo: string;
  modulo: string;
  hubHref: string;
  motivo: string;
  decision: "OCULTA TEMPORAL" | "PENDIENTE MAYOR";
}

export default function HiddenStub({ titulo, modulo, hubHref, motivo, decision }: HiddenStubProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link
          href={hubHref}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{titulo}</h1>
          <p className="text-xs text-slate-400">{modulo}</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md text-center p-8 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <Construction className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-4">
            {decision}
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Submódulo no disponible aún</h2>
          <p className="text-sm text-slate-300 mb-4">{motivo}</p>
          <p className="text-xs text-slate-500">
            Esta pantalla quedó documentada como fuera del flujo operativo en el cierre del 7-Abr-2026.
            Se reactivará cuando exista decisión funcional cerrada.
          </p>
          <Link
            href={hubHref}
            className="inline-block mt-6 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            Volver
          </Link>
        </div>
      </div>
    </div>
  );
}
