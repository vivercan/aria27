"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FolderTree from "@/components/FolderTree";
import EntityFolder from "@/components/EntityFolder";

const SCOPE = "admin:documentacion";

export default function DocumentacionPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link href="/dashboard/administracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Documentación Legal</h1>
          <p className="text-xs text-slate-400">Carpetas jerárquicas (Avante / Denivel / Terracret o las que necesites)</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-4 lg:col-span-3 min-h-0">
          <FolderTree
            scope={SCOPE}
            selectedId={selected}
            onSelect={(id, nombre) => { setSelected(id); setSelectedName(nombre || ""); }}
            title="Carpetas"
          />
        </div>
        <div className="col-span-8 lg:col-span-9 min-h-0 overflow-y-auto">
          {selected ? (
            <EntityFolder
              entityType={SCOPE as any}
              entityId={selected}
              entityName={selectedName}
              title={`Documentos · ${selectedName}`}
            />
          ) : (
            <div className="h-full flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-slate-500 text-sm">Selecciona o crea una carpeta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
