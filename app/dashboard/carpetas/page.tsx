"use client";
import AriaBackButton from "@/components/AriaBackButton";
import Link from "next/link";
import { FolderTree, HardHat, Users, DollarSign, Landmark, UserCheck, Truck, ClipboardList, FileStack } from "lucide-react";

const scopes = [
  { scope: "obras-general", title: "Obras", desc: "Carpetas generales de obras", icon: HardHat, gradient: "from-orange-500 to-red-600" },
  { scope: "obras-expedientes", title: "Obras · Expedientes", desc: "Carpetas para expedientes de obra", icon: FolderTree, gradient: "from-orange-500 to-amber-600" },
  { scope: "talento-general", title: "Talento", desc: "Carpetas para recursos humanos", icon: Users, gradient: "from-blue-500 to-indigo-600" },
  { scope: "finanzas-general", title: "Finanzas", desc: "Carpetas financieras generales", icon: DollarSign, gradient: "from-emerald-500 to-green-600" },
  { scope: "finanzas-bancos", title: "Finanzas · Bancos", desc: "Estados de cuenta y conciliaciones", icon: Landmark, gradient: "from-emerald-500 to-teal-600" },
  { scope: "clientes-general", title: "Clientes", desc: "Documentación de clientes", icon: UserCheck, gradient: "from-purple-500 to-fuchsia-600" },
  { scope: "activos-general", title: "Activos", desc: "Activos, vehículos y equipos", icon: Truck, gradient: "from-cyan-500 to-sky-600" },
  { scope: "requisiciones-general", title: "Requisiciones", desc: "Requisiciones y órdenes de compra", icon: ClipboardList, gradient: "from-amber-500 to-orange-500" },
  { scope: "plantillas-general", title: "Plantillas", desc: "Plantillas y formatos", icon: FileStack, gradient: "from-slate-500 to-slate-700" },
];

export default function CarpetasHubPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard" />
        <div>
          <h1 className="text-3xl font-bold text-white">Carpetas Personalizadas</h1>
          <p className="text-slate-400 mt-1">Organiza archivos jerárquicamente por cualquier criterio en cualquier módulo.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {scopes.map((s) => (
          <Link
            key={s.scope}
            href={`/dashboard/carpetas/${s.scope}`}
            className="group relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
            <div className="relative p-6">
              <div className={`inline-flex p-3.5 rounded-xl bg-gradient-to-br ${s.gradient} shadow-lg mb-4`}>
                <s.icon className="w-6 h-6 text-white" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-white text-lg group-hover:text-blue-300 transition-colors">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mt-1">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
