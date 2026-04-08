"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FolderTree from "@/components/FolderTree";
import EntityFolder from "@/components/EntityFolder";

interface ModuleFoldersProps {
  titulo: string;
  descripcion: string;
  backHref: string;
  scope: string;
}

export default function ModuleFolders({ titulo, descripcion, backHref, scope }: ModuleFoldersProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link href={backHref} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{titulo}</h1>
          <p className="text-xs text-slate-400">{descripcion}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-4 lg:col-span-3 min-h-0">
          <FolderTree
            scope={scope}
            selectedId={selected}
            onSelect={(id, nombre) => { setSelected(id); setSelectedName(nombre || ""); }}
            title="Carpetas"
          />
        </div>
        <div className="col-span-8 lg:col-span-9 min-h-0 overflow-y-auto">
          {selected ? (
            <EntityFolder
              entityType={scope as any}
              entityId={selected}
              entityName={selectedName}
              title={`Documentos · ${selectedName}`}
            />
          ) : (
            <div className="h-full flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-slate-500 text-sm">Selecciona o crea una carpeta para ver sus archivos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
