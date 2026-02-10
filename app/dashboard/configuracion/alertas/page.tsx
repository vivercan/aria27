"use client";
import { useState } from "react";
import { ArrowLeft, Bell, Mail, MessageSquare, Clock, Save } from "lucide-react";
import Link from "next/link";

const defaultAlertas = [
  { id: "req_creada", label: "Requisición creada", email: true, whatsapp: true, descripcion: "Cuando se crea una nueva requisición" },
  { id: "req_validada", label: "Requisición validada", email: true, whatsapp: true, descripcion: "Cuando el validador aprueba" },
  { id: "req_autorizada", label: "Compra autorizada", email: true, whatsapp: true, descripcion: "Cuando dirección autoriza la compra" },
  { id: "oc_generada", label: "Orden de compra generada", email: true, whatsapp: true, descripcion: "Cuando se genera la OC" },
  { id: "entrega_registrada", label: "Entrega registrada", email: true, whatsapp: false, descripcion: "Cuando compras registra recepción de material" },
  { id: "asistencia_falta", label: "Falta de asistencia", email: false, whatsapp: false, descripcion: "Cuando un empleado no registra entrada" },
  { id: "prestamo_vencido", label: "Préstamo por vencer", email: true, whatsapp: false, descripcion: "3 días antes de corte de préstamo" },
  { id: "vacaciones_pendientes", label: "Vacaciones pendientes", email: false, whatsapp: false, descripcion: "Empleados con vacaciones acumuladas" },
];

export default function AlertasPage() {
  const [alertas, setAlertas] = useState(defaultAlertas);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string, channel: "email" | "whatsapp") => {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, [channel]: !a[channel] } : a));
    setSaved(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/configuracion" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Configuración
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Alertas y Notificaciones</h1>
            <p className="text-slate-400 text-sm mt-1">Configura qué notificaciones envía ARIA</p>
          </div>
          <button onClick={() => setSaved(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
            {saved ? <><Save className="w-4 h-4" /> Guardado</> : <><Save className="w-4 h-4" /> Guardar</>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-3">
        {alertas.map(a => (
          <div key={a.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                <h3 className="font-medium text-white">{a.label}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 ml-6">{a.descripcion}</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => toggle(a.id, "email")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${a.email ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-slate-500 border border-white/10"}`}>
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button onClick={() => toggle(a.id, "whatsapp")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${a.whatsapp ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-slate-500 border border-white/10"}`}>
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
