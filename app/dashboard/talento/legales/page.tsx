"use client";
import Link from "next/link";
import { ArrowLeft, Scale, Construction } from "lucide-react";

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/talento" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="p-3 rounded-xl bg-violet-500/20">
          <Scale className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Documentos Legales</h1>
          <p className="text-slate-400 text-sm">Contratos de personal</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="p-4 rounded-full bg-violet-500/10 mb-4">
          <Construction className="w-12 h-12 text-violet-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Módulo en Desarrollo</h2>
        <p className="text-slate-400 text-center max-w-md">Este módulo está siendo desarrollado.</p>
      </div>
    </div>
  );
}
