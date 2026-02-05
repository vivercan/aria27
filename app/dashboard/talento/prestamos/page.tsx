"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, DollarSign, Pause, Play, X } from "lucide-react";
import Link from "next/link";

interface Prestamo {
  id: string;
  employee_id: string;
  monto_original: number;
  monto_pendiente: number;
  descuento_semanal: number;
  fecha_prestamo: string;
  semanas_plazo: number;
  motivo: string;
  status: string;
  employees?: { full_name: string };
}

export default function PrestamosPage() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [employees, setEmployees] = useState<{id: string, full_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee_id: "", monto_original: "", descuento_semanal: "", semanas_plazo: "", motivo: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: p } = await supabase.from("prestamos").select("*, employees(full_name)").order("created_at", { ascending: false });
    const { data: e } = await supabase.from("employees").select("id, full_name").eq("status", "ACTIVO").order("full_name");
    setPrestamos(p || []);
    setEmployees(e || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const monto = parseFloat(form.monto_original);
    const descuento = parseFloat(form.descuento_semanal);
    const semanas = parseInt(form.semanas_plazo) || Math.ceil(monto / descuento);
    const hoy = new Date().toISOString().split("T")[0];
    
    await supabase.from("prestamos").insert({
      employee_id: form.employee_id,
      monto_original: monto,
      monto_pendiente: monto,
      descuento_semanal: descuento,
      fecha_prestamo: hoy,
      fecha_inicio_descuento: hoy,
      semanas_plazo: semanas,
      motivo: form.motivo,
      status: "activo"
    });
    
    setShowModal(false);
    setForm({ employee_id: "", monto_original: "", descuento_semanal: "", semanas_plazo: "", motivo: "" });
    loadData();
  };

  const toggleStatus = async (id: string, current: string) => {
    await supabase.from("prestamos").update({ status: current === "activo" ? "pausado" : "activo" }).eq("id", id);
    loadData();
  };

  const registrarPago = async (p: Prestamo) => {
    const nuevoSaldo = Math.max(0, p.monto_pendiente - p.descuento_semanal);
    await supabase.from("prestamos").update({ 
      monto_pendiente: nuevoSaldo, 
      status: nuevoSaldo <= 0 ? "liquidado" : "activo" 
    }).eq("id", p.id);
    await supabase.from("prestamos_pagos").insert({ prestamo_id: p.id, monto: p.descuento_semanal });
    loadData();
  };

  const totales = {
    activos: prestamos.filter(p => p.status === "activo").length,
    saldo: prestamos.filter(p => p.status === "activo").reduce((s, p) => s + (p.monto_pendiente || 0), 0),
    semanal: prestamos.filter(p => p.status === "activo").reduce((s, p) => s + (p.descuento_semanal || 0), 0)
  };

  if (loading) return <div className="p-8 text-white">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/talento" className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5 text-white" /></Link>
            <div><h1 className="text-2xl font-bold text-white">💰 Préstamos</h1><p className="text-slate-400 text-sm">Gestión de préstamos a empleados</p></div>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"><Plus className="w-4 h-4" /> Nuevo</button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-slate-400 text-sm">Activos</p><p className="text-2xl font-bold text-white">{totales.activos}</p></div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-slate-400 text-sm">Saldo Pendiente</p><p className="text-2xl font-bold text-amber-400">${totales.saldo.toLocaleString()}</p></div>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10"><p className="text-slate-400 text-sm">Descuento Semanal</p><p className="text-2xl font-bold text-red-400">${totales.semanal.toLocaleString()}</p></div>
        </div>

        <div className="space-y-3 overflow-y-auto" style={{maxHeight: "calc(100vh - 280px)"}}>
          {prestamos.map(p => (
            <div key={p.id} className={`p-4 rounded-xl border ${p.status === "liquidado" ? "bg-emerald-500/10 border-emerald-500/30" : p.status === "pausado" ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${p.status === "liquidado" ? "bg-emerald-500/20" : p.status === "pausado" ? "bg-amber-500/20" : "bg-blue-500/20"}`}>
                    <DollarSign className={`w-6 h-6 ${p.status === "liquidado" ? "text-emerald-400" : p.status === "pausado" ? "text-amber-400" : "text-blue-400"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{p.employees?.full_name || "Sin asignar"}</p>
                    <p className="text-xs text-slate-400">{p.motivo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">${p.descuento_semanal}/sem</p>
                  <p className="text-sm text-slate-400">Saldo: ${p.monto_pendiente?.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {p.status === "activo" && <button onClick={() => registrarPago(p)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">+1 Pago</button>}
                  {p.status !== "liquidado" && (
                    <button onClick={() => toggleStatus(p.id, p.status)} className={`p-2 rounded-lg ${p.status === "activo" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {p.status === "activo" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${p.status === "liquidado" ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${((p.monto_original - p.monto_pendiente) / p.monto_original) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/10">
              <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-white">Nuevo Préstamo</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-white" /></button></div>
              <div className="space-y-4">
                <div><label className="text-sm text-slate-400">Empleado</label><select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white"><option value="">Seleccionar...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm text-slate-400">Monto Total</label><input type="number" value={form.monto_original} onChange={e => setForm({...form, monto_original: e.target.value})} className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="10000" /></div>
                  <div><label className="text-sm text-slate-400">Descuento Semanal</label><input type="number" value={form.descuento_semanal} onChange={e => setForm({...form, descuento_semanal: e.target.value})} className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="500" /></div>
                </div>
                <div><label className="text-sm text-slate-400">Motivo</label><input type="text" value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Descripción del préstamo" /></div>
                <button onClick={handleSubmit} disabled={!form.employee_id || !form.monto_original || !form.descuento_semanal} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg font-medium">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
