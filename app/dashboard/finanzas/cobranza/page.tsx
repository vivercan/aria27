"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, DollarSign, Clock, CheckCircle2, Plus, Search, FileText, AlertTriangle, X, Loader2 } from "lucide-react";

interface Estimacion {
  id: string;
  numero: number;
  obra_nombre: string;
  cliente: string;
  periodo: string;
  monto_estimado: number;
  monto_cobrado: number;
  retencion_fondo: number;
  status: string;
  fecha_presentacion: string;
  fecha_cobro: string;
  created_at: string;
}

export default function CobranzaPage() {
  const router = useRouter();
  const [estimaciones, setEstimaciones] = useState<Estimacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const [cobroModal, setCobroModal] = useState<{ id: string; monto: number } | null>(null);
  const [cobroMonto, setCobroMonto] = useState("");
  const [cobroSaving, setCobroSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ obra_nombre: "", cliente: "", periodo: "", monto_estimado: 0, retencion_fondo: 5 });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from("estimaciones").select("*").order("created_at", { ascending: false });
      setEstimaciones(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.obra_nombre || form.monto_estimado <= 0) { alert("Obra y monto son requeridos"); return; }
    const { count } = await supabase.from("estimaciones").select("*", { count: "exact", head: true }).eq("obra_nombre", form.obra_nombre);
    const numero = (count || 0) + 1;
    const retencionMonto = form.monto_estimado * (form.retencion_fondo / 100);

    const { error } = await supabase.from("estimaciones").insert({
      numero,
      obra_nombre: form.obra_nombre,
      cliente: form.cliente,
      periodo: form.periodo,
      monto_estimado: form.monto_estimado,
      monto_cobrado: 0,
      retencion_fondo: retencionMonto,
      status: "PRESENTADA",
      fecha_presentacion: new Date().toISOString().split("T")[0],
    });

    if (error) alert("Error: " + error.message);
    else { setShowForm(false); setForm({ obra_nombre: "", cliente: "", periodo: "", monto_estimado: 0, retencion_fondo: 5 }); loadData(); }
  }

  function abrirCobroModal(id: string, monto: number) {
    setCobroModal({ id, monto });
    setCobroMonto(String(monto));
  }

  async function confirmarCobro() {
    if (!cobroModal) return;
    const montoCobrado = parseFloat(cobroMonto);
    if (isNaN(montoCobrado) || montoCobrado <= 0) return;
    setCobroSaving(true);
    await supabase.from("estimaciones").update({
      monto_cobrado: montoCobrado,
      status: "COBRADA",
      fecha_cobro: new Date().toISOString().split("T")[0],
    }).eq("id", cobroModal.id);
    setCobroSaving(false);
    setCobroModal(null);
    loadData();
  }

  const totalEstimado = estimaciones.reduce((s, e) => s + (e.monto_estimado || 0), 0);
  const totalCobrado = estimaciones.reduce((s, e) => s + (e.monto_cobrado || 0), 0);
  const totalRetenido = estimaciones.reduce((s, e) => s + (e.retencion_fondo || 0), 0);
  const pendiente = totalEstimado - totalCobrado - totalRetenido;

  const filtered = estimaciones.filter(e => {
    const matchSearch = !search || e.obra_nombre?.toLowerCase().includes(search.toLowerCase()) || e.cliente?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "TODOS" || e.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cobranza</h1>
          <p className="text-slate-400 text-sm">Estimaciones de avance y cobro a clientes — Fondo de garantía 5%</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Estimación
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Estimado", value: `$${totalEstimado.toLocaleString()}`, icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Cobrado", value: `$${totalCobrado.toLocaleString()}`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Fondo Garantía", value: `$${totalRetenido.toLocaleString()}`, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Pendiente", value: `$${pendiente.toLocaleString()}`, icon: Clock, color: "text-red-400", bg: "bg-red-500/10" },
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
          <h3 className="text-lg font-semibold text-white">Nueva Estimación</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "obra_nombre", label: "Obra", placeholder: "Nombre de la obra" },
              { key: "cliente", label: "Cliente", placeholder: "Nombre del cliente" },
              { key: "periodo", label: "Periodo", placeholder: "Ej: Ene 2026, Semana 1-15 Feb" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Monto Estimado</label>
              <input type="number" value={form.monto_estimado} onChange={e => setForm({...form, monto_estimado: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">% Retención Fondo Garantía</label>
              <input type="number" value={form.retencion_fondo} onChange={e => setForm({...form, retencion_fondo: parseFloat(e.target.value) || 5})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por obra o cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "PRESENTADA", "APROBADA", "COBRADA"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
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
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Periodo</th>
                <th className="text-right p-3">Estimado</th>
                <th className="text-right p-3">Retención</th>
                <th className="text-right p-3">Cobrado</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Sin estimaciones registradas</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-medium">Est. {e.numero}</td>
                  <td className="p-3 text-white">{e.obra_nombre}</td>
                  <td className="p-3 text-slate-300">{e.cliente || "-"}</td>
                  <td className="p-3 text-slate-300">{e.periodo || "-"}</td>
                  <td className="p-3 text-right text-white">${(e.monto_estimado || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-amber-400">${(e.retencion_fondo || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-emerald-400">${(e.monto_cobrado || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.status === "COBRADA" ? "bg-emerald-500/20 text-emerald-400" :
                      e.status === "APROBADA" ? "bg-blue-500/20 text-blue-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>{e.status}</span>
                  </td>
                  <td className="p-3 text-center">
                    {e.status !== "COBRADA" && (
                      <button onClick={() => abrirCobroModal(e.id, e.monto_estimado - (e.retencion_fondo || 0))}
                        className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/30">
                        Cobrar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {cobroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Registrar Cobro</h3>
              <button onClick={() => setCobroModal(null)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monto cobrado</label>
              <input type="number" value={cobroMonto} onChange={e => setCobroMonto(e.target.value)} step="0.01" min="0"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-blue-500/50 focus:outline-none" />
              <p className="text-xs text-slate-500 mt-1">{`Estimado: $${cobroModal.monto.toLocaleString()}`}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCobroModal(null)} className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm font-medium hover:bg-white/10">Cancelar</button>
              <button onClick={confirmarCobro} disabled={cobroSaving || !cobroMonto || parseFloat(cobroMonto) <= 0}
                className="flex-1 py-2.5 bg-emerald-600 rounded-xl text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
                {cobroSaving ? "Guardando..." : "Confirmar Cobro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
