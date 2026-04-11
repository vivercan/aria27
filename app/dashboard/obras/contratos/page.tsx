"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, FileText, DollarSign, Calendar, CheckCircle2, Clock, Building2 , Loader2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";

interface Contrato {
  id: string;
  numero: string;
  obra_nombre: string;
  cliente: string;
  rfc_cliente: string;
  tipo: string;
  monto_contrato: number;
  anticipo_porcentaje: number;
  anticipo_monto: number;
  retencion_porcentaje: number;
  fecha_inicio: string;
  fecha_fin: string;
  plazo_dias: number;
  status: string;
  descripcion: string;
  created_at: string;
}

export default function ContratosPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    obra_nombre: "", cliente: "", rfc_cliente: "", tipo: "OBRA_PUBLICA",
    monto_contrato: 0, anticipo_porcentaje: 30, retencion_porcentaje: 5,
    fecha_inicio: "", fecha_fin: "", descripcion: ""
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from("contratos").select("*").order("created_at", { ascending: false });
      setContratos(data || []);
    } catch (e) { /* error handled */ }
    finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.obra_nombre?.trim()) { flash("err", "Nombre de obra es requerido"); return; }
    if (!form.cliente?.trim()) { flash("err", "Cliente es requerido"); return; }
    if (isNaN(form.monto_contrato) || form.monto_contrato <= 0) { flash("err", "Monto contrato debe ser mayor a 0"); return; }
    if (!form.fecha_inicio) { flash("err", "Fecha inicio es requerida"); return; }
    if (!form.fecha_fin) { flash("err", "Fecha fin es requerida"); return; }
    if (isNaN(form.anticipo_porcentaje) || form.anticipo_porcentaje < 0 || form.anticipo_porcentaje > 100) { flash("err", "% Anticipo debe estar entre 0 y 100"); return; }
    if (isNaN(form.retencion_porcentaje) || form.retencion_porcentaje < 0 || form.retencion_porcentaje > 100) { flash("err", "% Retención debe estar entre 0 y 100"); return; }

    const { count } = await supabase.from("contratos").select("*", { count: "exact", head: true });
    const numero = `CONT-${String((count || 0) + 1).padStart(4, "0")}`;
    const anticipo = form.monto_contrato * (form.anticipo_porcentaje / 100);
    const inicio = new Date(form.fecha_inicio);
    const fin = new Date(form.fecha_fin);
    const plazo = form.fecha_inicio && form.fecha_fin ? Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const { error } = await supabase.from("contratos").insert({
      numero, ...form, anticipo_monto: anticipo, plazo_dias: plazo, status: "VIGENTE",
    });

    if (error) flash("err", "Error: " + error?.message);
    else { setShowForm(false); setForm({ obra_nombre: "", cliente: "", rfc_cliente: "", tipo: "OBRA_PUBLICA", monto_contrato: 0, anticipo_porcentaje: 30, retencion_porcentaje: 5, fecha_inicio: "", fecha_fin: "", descripcion: "" }); loadData(); flash("ok", "Contrato guardado correctamente"); }
  }

  const totalContratado = contratos.reduce((s, c) => s + (c.monto_contrato || 0), 0);
  const vigentes = contratos.filter(c => c.status === "VIGENTE").length;
  const terminados = contratos.filter(c => c.status === "TERMINADO").length;

  const filtered = contratos.filter(c => {
    const matchSearch = !search || c.obra_nombre?.toLowerCase().includes(search.toLowerCase()) || c.cliente?.toLowerCase().includes(search.toLowerCase()) || c.numero?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "TODOS" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VIGENTE": return "bg-emerald-500/20 text-emerald-400";
      case "TERMINADO": return "bg-blue-500/20 text-blue-400";
      case "CANCELADO": return "bg-red-500/20 text-red-400";
      case "EN_FINIQUITO": return "bg-amber-500/20 text-amber-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <FlashBanner msg={msg} />
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4">
        <AriaBackButton href="/dashboard/obras" />

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Contratos</h1>
            <p className="text-slate-400 text-sm">Control de contratos de obra — anticipos, retenciones y plazos</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo Contrato
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Contratado", value: `$${totalContratado.toLocaleString()}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Contratos", value: contratos.length, icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Vigentes", value: vigentes, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Terminados", value: terminados, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
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
          <h3 className="text-lg font-semibold text-white">Nuevo Contrato</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-xs text-slate-400 mb-1 block">Obra *</label>
              <input required value={form.obra_nombre} onChange={e => setForm({...form, obra_nombre: e.target.value})} placeholder="Nombre de la obra" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Cliente *</label>
              <input required value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} placeholder="Razón social" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">RFC Cliente</label>
              <input value={form.rfc_cliente} onChange={e => setForm({...form, rfc_cliente: e.target.value.toUpperCase()})} placeholder="RFC" maxLength={13} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none uppercase" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="OBRA_PUBLICA">Obra Pública</option><option value="OBRA_PRIVADA">Obra Privada</option><option value="MANTENIMIENTO">Mantenimiento</option><option value="SERVICIOS">Servicios</option>
              </select></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Monto del Contrato *</label>
              <input type="number" required min="0.01" step="0.01" value={form.monto_contrato} onChange={e => setForm({...form, monto_contrato: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">% Anticipo *</label>
              <input type="number" required min="0" max="100" step="0.01" value={form.anticipo_porcentaje} onChange={e => setForm({...form, anticipo_porcentaje: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">% Retención Garantía *</label>
              <input type="number" required min="0" max="100" step="0.01" value={form.retencion_porcentaje} onChange={e => setForm({...form, retencion_porcentaje: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Fecha Inicio *</label>
              <input type="date" required value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Fecha Fin *</label>
              <input type="date" required value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" /></div>
            <div className="md:col-span-3"><label className="text-xs text-slate-400 mb-1 block">Descripción</label>
              <input value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Descripción del contrato" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" /></div>
          </div>
          {form.monto_contrato > 0 && (
            <div className="p-3 bg-white/5 rounded-lg text-sm flex gap-6">
              <span><span className="text-slate-400">Anticipo: </span><span className="text-emerald-400 font-medium">${(form.monto_contrato * form.anticipo_porcentaje / 100).toLocaleString()}</span></span>
              <span><span className="text-slate-400">Retención: </span><span className="text-amber-400 font-medium">${(form.monto_contrato * form.retencion_porcentaje / 100).toLocaleString()}</span></span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por obra, cliente o número..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "VIGENTE", "TERMINADO", "EN_FINIQUITO", "CANCELADO"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Contrato</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-center p-3">Tipo</th>
                <th className="text-right p-3">Monto</th>
                <th className="text-right p-3">Anticipo</th>
                <th className="text-center p-3">Plazo</th>
                <th className="text-center p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin contratos registrados</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-mono text-xs">{c.numero}</td>
                  <td className="p-3 text-white font-medium">{c.obra_nombre}</td>
                  <td className="p-3 text-slate-300">{c.cliente}</td>
                  <td className="p-3 text-center"><span className="text-xs text-slate-400">{(c.tipo || "").replace("_", " ")}</span></td>
                  <td className="p-3 text-right text-white font-medium">${(c.monto_contrato || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-emerald-400">${(c.anticipo_monto || 0).toLocaleString()}</td>
                  <td className="p-3 text-center text-slate-300">{c.plazo_dias ? `${c.plazo_dias}d` : "-"}</td>
                  <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(c.status)}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
