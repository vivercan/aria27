"use client";

import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, AlertCircle, Clock, Calendar, UserX, CheckCircle2 , Loader2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface Incidencia {
  id: string;
  employee_name: string;
  employee_id: string;
  tipo: string;
  fecha: string;
  motivo: string;
  autorizada: boolean;
  autorizada_por: string;
  obra_nombre: string;
  created_at: string;
}

export default function IncidenciasPage() {
  const log = clientLogger("INCIDENCIAS");
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    tipo: "FALTA",
    fecha: new Date().toISOString().split("T")[0],
    motivo: ""
  });
  const { msg, flash } = useFlashMessage();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: inc } = await supabase.from("incidencias").select("*").order("fecha", { ascending: false });
      setIncidencias(inc || []);
      const { data: emps } = await supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name");
      setEmpleados(emps || []);
    } catch (e: unknown) { log.error(String(e)); } finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.employee_id) { flash("err", "Empleado es requerido"); return; }
    if (!form.tipo) { flash("err", "Tipo de incidencia es requerido"); return; }
    if (!form.fecha) { flash("err", "Fecha es requerida"); return; }
    const emp = empleados.find(e => e.id === form.employee_id);
    const { error } = await supabase.from("incidencias").insert({
      ...form,
      employee_name: emp?.full_name || "",
      autorizada: false,
    });
    if (error) flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido");
    else {
      setShowForm(false);
      setForm({ employee_id: "", tipo: "FALTA", fecha: new Date().toISOString().split("T")[0], motivo: "" });
      loadData();
    }
  }

  // FIX: Usar el nombre real del usuario logueado en vez de hardcodear "Direccion"
  async function autorizar(id: string) {
    const userName = localStorage.getItem("userName") || localStorage.getItem("userEmail") || "Sistema";
    const { error } = await supabase.from("incidencias").update({
      autorizada: true,
      autorizada_por: userName
    }).eq("id", id);
    if (error) { flash("err", "Error al autorizar: " + (error as {message?: string})?.message || "Error desconocido"); return; }
    loadData();
  }

  const faltas = incidencias.filter(i => i.tipo === "FALTA").length;
  const retardos = incidencias.filter(i => i.tipo === "RETARDO").length;
  const permisos = incidencias.filter(i => i.tipo === "PERMISO").length;

  const filtered = incidencias.filter(i => {
    const matchSearch = !search || i.employee_name?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "TODOS" || i.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "FALTA": return { color: "bg-red-500/20 text-red-400", icon: "\u2715" };
      case "RETARDO": return { color: "bg-amber-500/20 text-amber-400", icon: "\u23F0" };
      case "PERMISO": return { color: "bg-aria-primary-light text-aria-accent", icon: "\uD83D\uDCCB" };
      case "INCAPACIDAD": return { color: "bg-aria-primary-light text-aria-accent", icon: "\uD83C\uDFE5" };
      default: return { color: "bg-slate-500/20 text-[#7f93b0]", icon: "?" };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {msg && <FlashBanner msg={msg} className="mx-6 mt-3" />}
      <AriaBackButton href="/dashboard/talento" />

      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidencias</h1>
          <p className="text-[#7f93b0] text-sm">Faltas, retardos, permisos e incapacidades</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-aria-primary-light text-aria-accent rounded-xl text-sm font-medium hover:bg-aria-primary-hover/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Registrar Incidencia
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Faltas", value: faltas, icon: UserX, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Retardos", value: retardos, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Permisos", value: permisos, icon: Calendar, color: "text-aria-accent", bg: "bg-aria-primary/10" },
          { label: "Total", value: incidencias.length, icon: AlertCircle, color: "text-aria-accent", bg: "bg-aria-primary/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-[#7f93b0]">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Registrar Incidencia</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Empleado *</label>
              <select required value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none">
                <option value="">Seleccionar...</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.employee_number} - {e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Tipo *</label>
              <select required value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none">
                <option value="FALTA">Falta</option><option value="RETARDO">Retardo</option><option value="PERMISO">Permiso</option><option value="INCAPACIDAD">Incapacidad IMSS</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Fecha *</label>
              <input type="date" required value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Motivo</label>
              <input value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} placeholder="Opcional" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-[#4a6080] focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-aria-primary hover:bg-aria-primary-hover text-white rounded-lg text-sm font-medium">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-white/[0.04] hover:bg-white/[0.06] text-[#c9d8ed] rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado..." className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "FALTA", "RETARDO", "PERMISO", "INCAPACIDAD"].map(f => (
            <button key={f} onClick={() => setFilterTipo(f)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterTipo === f ? "bg-aria-primary-light text-aria-accent border border-aria-primary/30" : "bg-white/[0.04] text-[#7f93b0] border border-white/[0.08] hover:bg-white/[0.06]"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Empleado</th>
                <th className="text-center p-3">Tipo</th>
                <th className="text-left p-3">Motivo</th>
                <th className="text-center p-3">Autorizada</th>
                <th className="text-center p-3">Accion</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-[#7f93b0]"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-[#7f93b0]">Sin incidencias registradas</td></tr>
              ) : filtered.map(i => {
                const badge = getTipoBadge(i.tipo);
                return (
                  <tr key={i.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="p-3 text-[#c9d8ed] text-xs">{i.fecha}</td>
                    <td className="p-3 text-white">{i.employee_name}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.icon} {i.tipo}</span></td>
                    <td className="p-3 text-[#7f93b0]">{i.motivo || "-"}</td>
                    <td className="p-3 text-center">
                      {i.autorizada ? <CheckCircle2 className="w-4 h-4 text-aria-accent mx-auto" /> : <span className="text-xs text-[#4a6080]">Pendiente</span>}
                    </td>
                    <td className="p-3 text-center">
                      {!i.autorizada && (
                        <button onClick={() => autorizar(i.id)} className="px-3 py-1 bg-emerald-500/20 text-aria-accent rounded-lg text-xs hover:bg-aria-primary/30">
                          Autorizar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
