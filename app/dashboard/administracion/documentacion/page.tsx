"use client";

import { ArrowLeft, Upload, FileText, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const documentTypes = [
  "Acta Constitutiva",
  "TIP (Tarjeta de Identificación Patronal)",
  "REPSE",
  "CSF (Constancia de Situación Fiscal)",
  "Comprobante de Domicilio",
  "Poder Notarial",
];

export default function DocumentacionPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/administracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
<ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
<h1 className="text-2xl font-bold text-white">Documentación Legal</h1>
<p className="text-slate-400 text-sm">Acta constitutiva, TIP, REPSE, CSF y documentos corporativos.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-slate-700/50">
<Search className="w-4 h-4 text-slate-500" />
<input
  type="text"
  placeholder="Buscar documento..."
  className="bg-transparent outline-none text-sm text-white w-full"
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
<Upload className="w-4 h-4" />
Subir Documento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentTypes
.filter((d) => d.toLowerCase().includes(searchTerm.toLowerCase()))
.map((docType) => (
  <div
    key={docType}
    className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer"
  >
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-blue-500/10">
        <FileText className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-white">{docType}</h3>
        <p className="text-xs text-slate-500 mt-1">Sin documentos cargados</p>
      </div>
    </div>
  </div>
))}
      </div>
    </div>
  );
}
