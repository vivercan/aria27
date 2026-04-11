"use client";
import { useState, ReactNode } from "react";
import { List, FolderTree as FolderIcon } from "lucide-react";
import FolderTree from "@/components/FolderTree";
import EntityFolder from "@/components/EntityFolder";

interface TabsListaCarpetasProps {
  lista: ReactNode;
  scope: string;
}

export default function TabsListaCarpetas({ lista, scope }: TabsListaCarpetasProps) {
  const [tab, setTab] = useState<"lista" | "carpetas">("lista");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex gap-2 mb-3 flex-shrink-0">
        <button
          onClick={() => setTab("lista")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${tab === "lista" ? "bg-aria-primary text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
        >
          <List className="w-4 h-4" /> Lista
        </button>
        <button
          onClick={() => setTab("carpetas")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${tab === "carpetas" ? "bg-aria-primary text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
        >
          <FolderIcon className="w-4 h-4" /> Carpetas
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "lista" ? (
          <div className="h-full overflow-y-auto">{lista}</div>
        ) : (
          <div className="h-full grid grid-cols-12 gap-4">
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
                  entityType={scope}
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
        )}
      </div>
    </div>
  );
}
