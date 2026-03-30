"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, FileText, Search, Plus, DollarSign, CheckCircle2, Clock, AlertTriangle , Loader2 } from "lucide-react";

interface Factura {
  id: string;
  folio: string;
  serie: string;
  cliente: string;
  rfc_cliente: string;
  concepto: string;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
  obra_nombre: string;
  fecha_emision: string;
  fecha_pago: string;
  metodo_pago: string;
  uso_cfdi: string;
  created_at: string;
}

export default function FacturacionPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    serie: "A", cliente: "", rfc_cliente: "", concepto: "", subtotal: 0, obra_nombre: "",
    metodo_pago: "PUE", uso_cfdi: "G03"
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from("facturas").select("*").order("created_at", { ascending: false });
      setFacturas(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.cliente || form.subtotal <= 0) { alert("Cliente y subtotal requeridos"); return; }
    const { count } = await supabase.from("facturas").select("*", { count: "exact", head: true });
    const folio = `${form.serie}-${String((count || 0) + 1).padStart(5, "0")}`;
    const iva = form.subtotal * 0.16;

    const { error } = await supabase.from("facturas").insert({
      folio, serie: form.serie, cliente: form.cliente, rfc_cliente: form.rfc_cliente,
      concepto: form.concepto, subtotal: form.subtotal, iva, total: form.subtotal + iva,
      status: "EMITIDA", obra_nombre: form.obra_nombre, fecha_emision: new Date().toISOString().split("T")[0],
      metodo_pago: form.metodo_pago, uso_cfdi: form.uso_cfdi,
    });

    if (error) alert("Error: " + error?.message);
    else { setShowForm(false); setForm({ serie: "A", cliente: "", rfc_cliente: "", concepto: "", subtotal: 0, obra_nombre: "", metodo_pago: "PUE", uso_cfdi: "G03" }); loadData(); }
  }

  const totalFacturado = facturas.reduce((s, f) => s + (f.total || 0), 0);
  const totalCobrado = facturas.filter(f => f.status === "PAGADA").reduce((s, f) => s + (f.total || 0), 0);

  const filtered = facturas.filter(f => {
    const matchSearch = !search || f.folio?.toLowerCase().includes(search.toLowerCase()) || f.cliente?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "TODOS" || f.status === filter;
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
          <h1 className="text-2xl font-bold text-white">Facturación</h1>
          <p className="text-slate-400 text-sm">Control de facturas emitidas — IVA 16%</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Factura
        </button>
      </div>

      {/* Aviso CFDI */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-amber-300 font-medium">Registro interno — No genera CFDI</p>
          <p className="text-xs text-amber-400/70">Para timbrado fiscal se requiere integración con un PAC autorizado por el SAT</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Facturado", value: `$${totalFacturado.toLocaleString()}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Cobrado", value: `$${totalCobrado.toLocaleString()}`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Pendiente", value: `$${(totalFacturado - totalCobrado).toLocaleString()}`, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
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
          <h3 className="text-lg font-semibold text-white">Nueva Factura</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-xs text-slate-400 mb-1 block">Cliente</label>
              <input value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} placeholder="Razón social" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">RFC</label>
              <input value={form.rfc_cliente} onChange={e => setForm({...form, rfc_cliente: e.target.value.toUpperCase()})} placeholder="RFC del cliente" maxLength={13} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none uppercase" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Obra</label>
              <input value={form.obra_nombre} onChange={e => setForm({...form, obra_nombre: e.target.value})} placeholder="Nombre de la obra" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" /></div>
            <div className="md:col-span-2"><label className="text-xs text-slate-400 mb-1 block">Concepto</label>
              <input value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} placeholder="Descripción del servicio" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Subtotal (sin IVA)</label>
              <input type="number" value={form.subtotal} onChange={e => setForm({...form, subtotal: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Método Pago</label>
              <select value={form.metodo_pago} onChange={e => setForm({...form, metodo_pago: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="PUE">PUE - Pago en una sola exhibición</option><option value="PPD">PPD - Pago en parcialidades</option>
              </select></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Uso CFDI</label>
              <select value={form.uso_cfdi} onChange={e => setForm({...form, uso_cfdi: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="G03">G03 - Gastos en general</option><option value="I01">I01 - Construcciones</option><option value="P01">P01 - Por definir</option>
              </select></div>
          </div>
          {form.subtotal > 0 && (
            <div className="p-3 bg-white/5 rounded-lg text-sm">
              <span className="text-slate-400">Subtotal: </span><span className="text-white">${form.subtotal.toLocaleString()}</span>
              <span className="text-slate-400 mx-2">+ IVA: </span><span className="text-white">${(form.subtotal * 0.16).toLocaleString()}</span>
              <span className="text-slate-400 mx-2">= Total: </span><span className="text-emerald-400 font-bold">${(form.subtotal * 1.16).toLocaleString()}</span>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio o cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "EMITIDA", "PAGADA", "CANCELADA"].map(f => (
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
                <th className="text-left p-3">Folio</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">RFC</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Subtotal</th>
                <th className="text-right p-3">IVA</th>
                <th className="text-right p-3">Total</th>
                <th className="text-center p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin facturas registradas</td></tr>
              ) : filtered.map(f => (
                <tr key={f.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-mono text-xs">{f.folio}</td>
                  <td className="p-3 text-white">{f.cliente}</td>
                  <td className="p-3 text-slate-400 font-mono text-xs">{f.rfc_cliente}</td>
                  <td className="p-3 text-slate-300">{f.obra_nombre || "-"}</td>
                  <td className="p-3 text-right text-slate-300">${(f.subtotal || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-400">${(f.iva || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-white font-medium">${(f.total || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      f.status === "PAGADA" ? "bg-emerald-500/20 text-emerald-400" :
                      f.status === "CANCELADA" ? "bg-red-500/20 text-red-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>{f.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
