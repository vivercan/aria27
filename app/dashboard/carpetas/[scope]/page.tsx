"use client";
import { useState, use } from "react";
import Link from "next/link";
import {  } from "lucide-react";
import FolderTree from "@/components/FolderTree";
import EntityFolder from "@/components/EntityFolder";
import AriaBackButton from "@/components/AriaBackButton";

const HUB = "/dashboard/carpetas";
const SCOPES: Record<string, { titulo: string; desc: string; back: string }> = {
  "obras-general": { titulo: "Obras · Carpetas", desc: "Carpetas jerárquicas para documentación general de obras", back: HUB },
  "obras-expedientes": { titulo: "Obras · Expedientes Carpetas", desc: "Carpetas jerárquicas para expedientes de obra", back: HUB },
  "talento-general": { titulo: "Talento · Carpetas", desc: "Carpetas jerárquicas para recursos humanos", back: HUB },
  "finanzas-general": { titulo: "Finanzas · Carpetas", desc: "Carpetas jerárquicas para documentación financiera", back: HUB },
  "finanzas-bancos": { titulo: "Finanzas · Bancos Carpetas", desc: "Carpetas jerárquicas para estados de cuenta y conciliaciones", back: HUB },
  "clientes-general": { titulo: "Clientes · Carpetas", desc: "Carpetas jerárquicas para documentación de clientes", back: HUB },
  "activos-general": { titulo: "Activos · Carpetas", desc: "Carpetas jerárquicas para activos y vehículos", back: HUB },
  "requisiciones-general": { titulo: "Requisiciones · Carpetas", desc: "Carpetas jerárquicas para requisiciones y OC", back: HUB },
  "plantillas-general": { titulo: "Plantillas · Carpetas", desc: "Carpetas jerárquicas para plantillas y formatos", back: HUB },
};

export default function CarpetasScopePage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope } = use(params);
  const cfg = SCOPES[scope] || { titulo: scope, desc: "Carpetas personalizadas", back: "/dashboard" };
  const fullScope = `global:${scope}`;

  const [selected, setSelected] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <AriaBackButton href={cfg.back} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{cfg.titulo}</h1>
          <p className="text-xs text-[#7f93b0]">{cfg.desc}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        <div className="col-span-4 lg:col-span-3 min-h-0">
          <FolderTree
            scope={fullScope}
            selectedId={selected}
            onSelect={(id, nombre) => { setSelected(id); setSelectedName(nombre || ""); }}
            title="Carpetas"
          />
        </div>
        <div className="col-span-8 lg:col-span-9 min-h-0 overflow-y-auto">
          {selected ? (
            <EntityFolder
              entityType={fullScope}
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
