"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { FileText, FolderOpen, FileSpreadsheet, ClipboardList } from "lucide-react";

const modules = [
  { title: "Plantillas", description: "Plantillas de documentos.", icon: FileText, href: "/dashboard/plantillas/biblioteca", color: "from-slate-500 to-slate-600", glowColor: "rgba(100,116,139,0.2)", meta: "Formatos" },
  { title: "Docs Center", description: "Centro de documentación.", icon: FolderOpen, href: "/dashboard/plantillas/documentos", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.3)" },
  { title: "Bid Pack", description: "Paquetes de licitación.", icon: FileSpreadsheet, href: "/dashboard/plantillas/propuestas", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.3)" },
  { title: "PO Pack", description: "Formatos de órdenes.", icon: ClipboardList, href: "/dashboard/plantillas/ordenes", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.3)" },
];

export default function PlantillasPage() {
  return (
    <div>
      <ModuleHeader title="Plantillas" subtitle="Plantillas y documentación estándar." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} {...mod} />
        ))}
      </ModuleGrid>
    </div>
  );
}
