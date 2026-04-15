"use client";
import { useState } from "react";
import Link from "next/link";
import {  } from "lucide-react";
import FolderTree from "@/components/FolderTree";
import EntityFolder from "@/components/EntityFolder";
import AriaBackButton from "@/components/AriaBackButton";

const SCOPE = "admin:documentacion";

export default function DocumentacionPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <AriaBackButton href="/dashboard/administracion" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Documentación Legal</h1>
          <p className="text-xs text-[#7f93b0]">Carpetas jerárquicas (Avante / Denivel / Terracret o las que necesites)</p>
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
              entityType={SCOPE}
              entityId={selected}
              entityName={selectedName}
              title={`Documentos · ${selectedName}`}
            />
          ) : (
            <div className="h-full flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[#4a6080] text-sm">Selecciona o crea una carpeta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
