"use client";
import Link from "next/link";
import { DollarSign, Calendar, Gift, FileHeart } from "lucide-react";

const submodulos = [
  { titulo: "Préstamos", descripcion: "Control de préstamos y descuentos", href: "/dashboard/talento/prestaciones/prestamos", icono: DollarSign, color: "from-blue-500 to-cyan-500" },
  { titulo: "Vacaciones", descripcion: "Saldos y solicitudes", href: "/dashboard/talento/prestaciones/vacaciones", icono: Calendar, color: "from-green-500 to-emerald-500" },
  { titulo: "Aguinaldo", descripcion: "Cálculo anual", href: "/dashboard/talento/prestaciones/aguinaldo", icono: Gift, color: "from-amber-500 to-orange-500" },
  { titulo: "Incapacidades", descripcion: "Registro IMSS", href: "/dashboard/talento/prestaciones/incapacidades", icono: FileHeart, color: "from-red-500 to-pink-500" },
];

export default function PrestacionesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Prestaciones</h1>
        <p className="text-slate-400">Gestión de prestaciones laborales</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {submodulos.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${mod.color} mb-4`}>
              <mod.icono className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{mod.titulo}</h3>
            <p className="text-sm text-slate-400">{mod.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
