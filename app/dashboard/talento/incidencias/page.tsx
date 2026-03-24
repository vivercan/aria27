"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Search, AlertCircle, Clock, Calendar, UserX, CheckCircle2 } from "lucide-react";

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
  const router = useRouter();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: "", tipo: "FALTA", fecha: new Date().toISOString().split("T")[0], motivo: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: inc, error: incidenciasErr2 } = await supabase.from("incidencias").select("*").order("fecha", { ascending: false });
      if (incidenciasErr2) console.error("Error loading incidencias:", incidenciasErr2.message);
      setIncidencias(inc || []);
      const { data: emps } = await supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name");
      setEmpleados(emps || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.employee_id || !form.tipo) { alert("Empleado y tipo son requeridos"); return; }
    const emp = empleados.find(e => e.id === form.employee_id);

    const { error } = await supabase.from("incidencias").insert({
      ...form,
      employee_name: emp?.full_name || "",
      autorizada: false,
    });

    if (error) alert("Error: " + error.message);
    else { setShowForm(false); setForm({ employee_id: "", tipo: "FALTA", fecha: new Date().toISOString().split("T")[0], motivo: "" }); loadData(); }
  }

  async function autorizar(id: string) {
    const { error: incidenciasErr } = await supabase.from("incidencias").update({ autorizada: true, autorizada_por: "Dirección" }).eq("id", id);
    if (incidenciasErr) console.error("Error updating incidencias:", incidenciasErr.message);
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
      case "FALTA": return { color: "bg-red-500/20 text-red-400", icon: "✕" };
      case "RETARDO": return { color: "bg-amber-500/20 text-amber-400", icon: "⏰" };
      case "PERMISO": return { color: "bg-blue-500/20 text-blue-400", icon: "📋" };
      case "INCAPACIDAD": return { color: "bg-violet-500/20 text-violet-400", icon: "🏥" };
      default: return { color: "bg-slate-500/20 text-slate-400", icon: "?" };
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidencias</h1>
          <p className="text-slate-400 text-sm">Faltas, retardos, permisos e incapacidades</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Registrar Incidencia
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Faltas", value: faltas, icon: UserX, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Retardos", value: retardos, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Permisos", value: permisos, icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Total", value: incidencias.length, icon: AlertCircle, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Registrar Incidencia</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Empleado</label>
              <select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="">Seleccionar...</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.employee_number} - {e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="FALTA">Falta</option><option value="RETARDO">Retardo</option><option value="PERMISO">Permiso</option><option value="INCAPACIDAD">Incapacidad IMSS</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Motivo</label>
              <input value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} placeholder="Opcional"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "FALTA", "RETARDO", "PERMISO", "INCAPACIDAD"].map(f => (
            <button key={f} onClick={() => setFilterTipo(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterTipo === f ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Empleado</th>
                <th className="text-center p-3">Tipo</th>
                <th className="text-left p-3">Motivo</th>
                <th className="text-center p-3">Autorizada</th>
                <th className="text-center p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Sin incidencias registradas</td></tr>
              ) : filtered.map(i => {
                const badge = getTipoBadge(i.tipo);
                return (
                  <tr key={i.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-slate-300 text-xs">{i.fecha}</td>
                    <td className="p-3 text-white">{i.employee_name}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.icon} {i.tipo}</span></td>
                    <td className="p-3 text-slate-400">{i.motivo || "-"}</td>
                    <td className="p-3 text-center">
                      {i.autorizada ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="text-xs text-slate-500">Pendiente</span>}
                    </td>
                    <td className="p-3 text-center">
                      {!i.autorizada && (
                        <button onClick={() => autorizar(i.id)} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/30">
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
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Search, AlertCircle, Clock, Calendar, UserX, CheckCircle2 } from "lucide-react";

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
  const router = useRouter();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: "", tipo: "FALTA", fecha: new Date().toISOString().split("T")[0], motivo: "" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: inc } = await supabase.from("incidencias").select("*").order("fecha", { ascending: false });
      setIncidencias(inc || []);
      const { data: emps } = await supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name");
      setEmpleados(emps || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.employee_id || !form.tipo) { alert("Empleado y tipo son requeridos"); return; }
    const emp = empleados.find(e => e.id === form.employee_id);

    const { error } = await supabase.from("incidencias").insert({
      ...form,
      employee_name: emp?.full_name || "",
      autorizada: false,
    });

    if (error) alert("Error: " + error.message);
    else { setShowForm(false); setForm({ employee_id: "", tipo: "FALTA", fecha: new Date().toISOString().split("T")[0], motivo: "" }); loadData(); }
  }

  async function autorizar(id: string) {
    await supabase.from("incidencias").update({ autorizada: true, autorizada_por: "Dirección" }).eq("id", id);
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
      case "FALTA": return { color: "bg-red-500/20 text-red-400", icon: "✕" };
      case "RETARDO": return { color: "bg-amber-500/20 text-amber-400", icon: "⏰" };
      case "PERMISO": return { color: "bg-blue-500/20 text-blue-400", icon: "📋" };
      case "INCAPACIDAD": return { color: "bg-violet-500/20 text-violet-400", icon: "🏥" };
      default: return { color: "bg-slate-500/20 text-slate-400", icon: "?" };
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidencias</h1>
          <p className="text-slate-400 text-sm">Faltas, retardos, permisos e incapacidades</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Registrar Incidencia
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Faltas", value: faltas, icon: UserX, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Retardos", value: retardos, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Permisos", value: permisos, icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Total", value: incidencias.length, icon: AlertCircle, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Registrar Incidencia</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Empleado</label>
              <select value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="">Seleccionar...</option>
                {empleados.map(e => <option key={e.id} value={e.id}>{e.employee_number} - {e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="FALTA">Falta</option><option value="RETARDO">Retardo</option><option value="PERMISO">Permiso</option><option value="INCAPACIDAD">Incapacidad IMSS</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Motivo</label>
              <input value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})} placeholder="Opcional"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "FALTA", "RETARDO", "PERMISO", "INCAPACIDAD"].map(f => (
            <button key={f} onClick={() => setFilterTipo(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterTipo === f ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Empleado</th>
                <th className="text-center p-3">Tipo</th>
                <th className="text-left p-3">Motivo</th>
                <th className="text-center p-3">Autorizada</th>
                <th className="text-center p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Sin incidencias registradas</td></tr>
              ) : filtered.map(i => {
                const badge = getTipoBadge(i.tipo);
                return (
                  <tr key={i.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 text-slate-300 text-xs">{i.fecha}</td>
                    <td className="p-3 text-white">{i.employee_name}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>{badge.icon} {i.tipo}</span></td>
                    <td className="p-3 text-slate-400">{i.motivo || "-"}</td>
                    <td className="p-3 text-center">
                      {i.autorizada ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="text-xs text-slate-500">Pendiente</span>}
                    </td>
                    <td className="p-3 text-center">
                      {!i.autorizada && (
                        <button onClick={() => autorizar(i.id)} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/30">
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
