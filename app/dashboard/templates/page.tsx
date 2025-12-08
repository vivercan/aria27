"use client";

import { motion } from "framer-motion";
import { 
  FileText, 
  Briefcase, 
  ShoppingBag, 
  FolderArchive 
} from "lucide-react";
import { SubModuleCard } from "@/components/dashboard/SubModuleCard";

export default function TemplatesPage() {
  const modules = [
    { title: "Templates", desc: "Biblioteca de plantillas administrativas (Word/Excel).", icon: FileText, href: "/dashboard/templates/library" },
    { title: "Bid Pack", desc: "Paquetes de documentos para licitaciones.", icon: Briefcase, href: "/dashboard/templates/bids" },
    { title: "PO Pack", desc: "Plantillas de órdenes de compra.", icon: ShoppingBag, href: "/dashboard/templates/po" },
    { title: "Docs Center", desc: "Gestor documental centralizado (almacenamiento).", icon: FolderArchive, href: "/dashboard/templates/docs" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Templates</h1>
        <p className="text-slate-400">Gestión documental y plantillas institucionales.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {modules.map((mod, idx) => (
          <SubModuleCard key={idx} title={mod.title} description={mod.desc} icon={mod.icon} href={mod.href} />
        ))}
      </motion.div>
    </div>
  );
}
