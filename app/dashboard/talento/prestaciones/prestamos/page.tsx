"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, DollarSign, Calendar, User, X, ArrowLeft, Loader2, Wallet, TrendingDown } from "lucide-react";

interface Prestamo {
  id: string;
  employee_id: string;
  monto_original: number;
  monto_pendiente: number;
  descuento_semanal: number;
  fecha_prestamo: string;
  motivo: string;
  status: string;
  employee?: { full_name: string; position: string };
}

export default function PrestamosPage() {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee_id: "", monto: "", descuento: "", semanas: "", motivo: "" });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: pres } = await supabase
      .from("prestamos")
      .select("*, employee:Personal(full_name, position)")
      .order("created_at", { ascending: false });
    if (pres) setPrestamos(pres);

    const { data: emps } = await supabase
      .from("Personal")
      .select("id, full_name")
      .eq("status", "ACTIVO")
      .order("full_name");
    if (emps) setEmpleados(emps);
    setLoading(false);
  };

  const crearPrestamo = async () => {
    const monto = parseFloat(form.monto);
    const descuento = parseFloat(form.descuento);
    const semanas = parseInt(form.semanas);
    
    await supabase.from("prestamos").insert({
      employee_id: form.employee_id,
      monto_original: monto,
      monto_pendiente: monto,
      descuento_semanal: descuento,
      fecha_prestamo: new Date().toISOString().split("T")[0],
      fecha_inicio_descuento: new Date().toISOString().split("T")[0],
      semanas_plazo: semanas,
      motivo: form.motivo,
      status: "ACTIVO",
    });
    
    setShowModal(false);
    setForm({ employee_id: "", monto: "", descuento: "", semanas: "", motivo: "" });
    cargarDatos();
  };

  const formatMoney = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* Flecha de regreso */}
              <Link href="/dashboard/talento/prestaciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors inline-block w-fit mb-4">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Control de Préstamos</h1>
          <p className="text-slate-400">Gestiona préstamos y descuentos semanales</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Préstamo
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-blue-500/10 mb-2"><DollarSign className="w-4 h-4 text-blue-400" /></div>
          <p className="text-xl font-bold text-white">{prestamos.filter(p => p.status?.toUpperCase() === "ACTIVO").length}</p>
          <p className="text-xs text-slate-400">Préstamos Activos</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-amber-500/10 mb-2"><Wallet className="w-4 h-4 text-amber-400" /></div>
          <p className="text-xl font-bold text-white">{formatMoney(prestamos.filter(p => p.status?.toUpperCase() === "ACTIVO").reduce((s, p) => s + p.monto_pendiente, 0))}</p>
          <p className="text-xs text-slate-400">Total Pendiente</p>
        </div>
        <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <div className="inline-flex p-2 rounded-lg bg-emerald-500/10 mb-2"><TrendingDown className="w-4 h-4 text-emerald-400" /></div>
          <p className="text-xl font-bold text-white">{formatMoney(prestamos.filter(p => p.status?.toUpperCase() === "ACTIVO").reduce((s, p) => s + p.descuento_semanal, 0))}</p>
          <p className="text-xs text-slate-400">Descuento Semanal Total</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex-1 min-h-0 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0a1628] z-10">
            <tr className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
              <th className="p-3">Empleado</th>
              <th className="p-3 text-right">Monto Original</th>
              <th className="p-3 text-right">Pendiente</th>
              <th className="p-3 text-right">Descuento/Sem</th>
              <th className="p-3">Motivo</th>
              <th className="p-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
            ) : prestamos.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">No hay préstamos registrados</td></tr>
            ) : (
              prestamos.map((p) => (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3">
                    <p className="text-white font-medium">{p.employee?.full_name}</p>
                    <p className="text-slate-400 text-xs">{p.employee?.position}</p>
                  </td>
                  <td className="p-3 text-right text-white">{formatMoney(p.monto_original)}</td>
                  <td className="p-3 text-right text-amber-400">{formatMoney(p.monto_pendiente)}</td>
                  <td className="p-3 text-right text-cyan-400">{formatMoney(p.descuento_semanal)}</td>
                  <td className="p-3 text-slate-300 text-sm">{p.motivo}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status?.toUpperCase() === "ACTIVO" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                      {p.status?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Nuevo Préstamo</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            <div className="space-y-4">
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white">
                <option value="">Seleccionar empleado</option>
                {empleados.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
              <input type="number" placeholder="Monto total" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white" />
              <input type="number" placeholder="Descuento semanal" value={form.descuento} onChange={(e) => setForm({ ...form, descuento: e.target.value })} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white" />
              <input type="number" placeholder="Semanas plazo" value={form.semanas} onChange={(e) => setForm({ ...form, semanas: e.target.value })} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white" />
              <input type="text" placeholder="Motivo" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white" />
              <button onClick={crearPrestamo} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Crear Préstamo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




