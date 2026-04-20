"use client";
import Link from "next/link";
import { DollarSign, Calendar, Gift, FileHeart } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

const submodulos = [
  { titulo: "Préstamos", descripcion: "Control de préstamos y descuentos", href: "/dashboard/talento/prestaciones/prestamos", icono: DollarSign, color: "from-aria-primary to-aria-accent" },
  { titulo: "Vacaciones", descripcion: "Saldos y solicitudes", href: "/dashboard/talento/prestaciones/vacaciones", icono: Calendar, color: "from-aria-primary to-aria-accent" },
  { titulo: "Aguinaldo", descripcion: "Cálculo anual", href: "/dashboard/talento/prestaciones/aguinaldo", icono: Gift, color: "from-amber-500 to-orange-500" },
  { titulo: "Incapacidades", descripcion: "Registro IMSS", href: "/dashboard/talento/prestaciones/incapacidades", icono: FileHeart, color: "from-red-500 to-red-400" },
];

export default function PrestacionesPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <AriaBackButton href="/dashboard/talento" />
        <div>
          <h1 className="text-2xl font-bold text-white">Prestaciones</h1>
        <p className="text-[#7f93b0]">Gestión de prestaciones laborales</p>
      </div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {submodulos.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group p-5 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${mod.color} mb-4`}>
              <mod.icono className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{mod.titulo}</h3>
            <p className="text-sm text-[#7f93b0]">{mod.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}


