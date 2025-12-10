"use client";

import { ModuleCard, ModuleHeader, ModuleGrid } from "@/components/dashboard";
import { FileText, FolderOpen, FileSpreadsheet, ClipboardList } from "lucide-react";

const modules = [
  { title: "Templates", description: "Plantillas de documentos.", icon: FileText, href: "/dashboard/templates/library", color: "from-slate-500 to-slate-600", glowColor: "rgba(100,116,139,0.3)", meta: "Formatos" },
  { title: "Docs Center", description: "Centro de documentación.", icon: FolderOpen, href: "/dashboard/templates/docs", color: "from-blue-500 to-blue-600", glowColor: "rgba(59,130,246,0.4)" },
  { title: "Bid Pack", description: "Paquetes de licitación.", icon: FileSpreadsheet, href: "/dashboard/templates/bids", color: "from-emerald-500 to-emerald-600", glowColor: "rgba(52,211,153,0.4)" },
  { title: "PO Pack", description: "Formatos de órdenes.", icon: ClipboardList, href: "/dashboard/templates/po", color: "from-amber-500 to-orange-500", glowColor: "rgba(245,158,11,0.4)" },
];

export default function TemplatesPage() {
  return (
    <div>
      <ModuleHeader title="Templates" subtitle="Plantillas y documentación estándar." />
      <ModuleGrid>
        {modules.map((mod, idx) => (
          <ModuleCard key={idx} title={mod.title} description={mod.description} icon={mod.icon} href={mod.href} color={mod.color} glowColor={mod.glowColor} meta={mod.meta} />
        ))}
      </ModuleGrid>
    </div>
  );
}
