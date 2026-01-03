"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  HardHat,
  Users,
  Package,
  Wallet,
  Warehouse,
  FileText,
  Settings,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const modules = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-blue-400",
  },
  {
    name: "Obras",
    icon: HardHat,
    href: "/dashboard/obras",
    color: "text-amber-400",
    submodules: [
      { name: "Pipeline", href: "/dashboard/obras/pipeline" },
      { name: "Licitaciones", href: "/dashboard/obras/licitaciones" },
      { name: "Presupuestos", href: "/dashboard/obras/presupuestos" },
      { name: "Expedientes", href: "/dashboard/obras/expedientes" },
      { name: "Contratos", href: "/dashboard/obras/contratos" },
      { name: "SIROC", href: "/dashboard/obras/siroc" },
    ],
  },
  {
    name: "Talento",
    icon: Users,
    href: "/dashboard/talento",
    color: "text-violet-400",
    submodules: [
      { name: "Personal", href: "/dashboard/talento/personal" },
      { name: "Users", href: "/dashboard/talento/Users" },
      { name: "Checadas", href: "/dashboard/talento/checadas" },
      { name: "Asistencia", href: "/dashboard/talento/asistencia" },
      { name: "Nómina", href: "/dashboard/talento/nomina" },
      { name: "Incidencias", href: "/dashboard/talento/incidencias" },
      { name: "Legales", href: "/dashboard/talento/legales" },
      { name: "Matriz", href: "/dashboard/talento/matriz" },
    ],
  },
  {
    name: "Requisiciones",
    icon: Package,
    href: "/dashboard/requisiciones",
    color: "text-cyan-400",
    submodules: [
      { name: "Requisiciones", href: "/dashboard/requisiciones/requisiciones" },
      { name: "Proveedores", href: "/dashboard/requisiciones/proveedores" },
      { name: "Productos", href: "/dashboard/requisiciones/productos" },
      { name: "Cotizaciones", href: "/dashboard/requisiciones/cotizaciones" },
      { name: "Compras", href: "/dashboard/requisiciones/compras" },
      { name: "Entregas", href: "/dashboard/requisiciones/entregas" },
      { name: "Pagos", href: "/dashboard/requisiciones/pagos" },
      { name: "Prospección", href: "/dashboard/requisiciones/prospeccion" },
    ],
  },
  {
    name: "Finanzas",
    icon: Wallet,
    href: "/dashboard/finanzas",
    color: "text-emerald-400",
    submodules: [
      { name: "Facturación", href: "/dashboard/finanzas/facturacion" },
      { name: "Cobranza", href: "/dashboard/finanzas/cobranza" },
      { name: "Por Pagar", href: "/dashboard/finanzas/por-pagar" },
      { name: "Costeo", href: "/dashboard/finanzas/costeo" },
      { name: "Caja", href: "/dashboard/finanzas/caja" },
      { name: "Bancos", href: "/dashboard/finanzas/bancos" },
    ],
  },
  {
    name: "Activos",
    icon: Warehouse,
    href: "/dashboard/activos",
    color: "text-rose-400",
    submodules: [
      { name: "Catálogo", href: "/dashboard/activos/catalogo" },
      { name: "Asignación", href: "/dashboard/activos/asignacion" },
      { name: "Mantenimiento", href: "/dashboard/activos/mantenimiento" },
      { name: "Estado", href: "/dashboard/activos/estado" },
    ],
  },
  {
    name: "Plantillas",
    icon: FileText,
    href: "/dashboard/plantillas",
    color: "text-slate-400",
    submodules: [
      { name: "Documentos", href: "/dashboard/plantillas/documentos" },
      { name: "Propuestas", href: "/dashboard/plantillas/propuestas" },
      { name: "Órdenes", href: "/dashboard/plantillas/ordenes" },
      { name: "Biblioteca", href: "/dashboard/plantillas/biblioteca" },
    ],
  },
  {
    name: "Config",
    icon: Settings,
    href: "/dashboard/config",
    color: "text-slate-400",
    submodules: [
      { name: "Maestros", href: "/dashboard/config/maestros" },
      { name: "Accesos", href: "/dashboard/config/accesos" },
      { name: "Integraciones", href: "/dashboard/config/integraciones" },
      { name: "Alertas", href: "/dashboard/config/alertas" },
      { name: "Correo", href: "/dashboard/config/correo" },
      { name: "Recordatorios", href: "/dashboard/config/recordatorios" },
      { name: "Versiones", href: "/dashboard/config/versiones" },
      { name: "General", href: "/dashboard/config/general" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleName)
        ? prev.filter((m) => m !== moduleName)
        : [...prev, moduleName]
    );
  };

  const isActive = (href: string) => pathname === href;
  const isModuleActive = (module: any) =>
    pathname.startsWith(module.href) && module.href !== "/dashboard";

  return (
    <aside className="w-64 h-screen bg-[#0a1628] border-r border-white/10 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            ARIA
          </span>
        </Link>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
          Operations OS
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {modules.map((module) => (
          <div key={module.name} className="mb-1">
            {module.submodules ? (
              <>
                <button
                  onClick={() => toggleModule(module.name)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    isModuleActive(module)
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <module.icon className={`w-5 h-5 ${module.color}`} />
                    <span className="font-medium">{module.name}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      expandedModules.includes(module.name) ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedModules.includes(module.name) && (
                  <div className="ml-4 pl-4 border-l border-white/10 mt-1 space-y-1">
                    {module.submodules.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                          isActive(sub.href)
                            ? "bg-white/10 text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={module.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive(module.href)
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <module.icon className={`w-5 h-5 ${module.color}`} />
                <span className="font-medium">{module.name}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
