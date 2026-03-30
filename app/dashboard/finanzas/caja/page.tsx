"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, DollarSign, TrendingDown, Receipt, Calendar, Search, Download, Loader2 } from "lucide-react";

interface MovimientoCaja {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  tipo: string;
  obra_nombre: string;
  solicitante: string;
  comprobante: boolean;
  created_at: string;
}

export default function CajaChicaPage() {
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ concepto: "", monto: 0, tipo: "GASTO", obra_nombre: "", solicitante: "", comprobante: false });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from("caja_chica").select("*").order("created_at", { ascending: false });
      setMovimientos(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.concepto || form.monto <= 0) { alert("Concepto y monto son requeridos"); return; }
    const { error } = await supabase.from("caja_chica").insert({ ...form, fecha: new Date().toISOString().split("T")[0] });
    if (error) alert("Error: " + error?.message);
    else { setShowForm(false); setForm({ concepto: "", monto: 0, tipo: "GASTO", obra_nombre: "", solicitante: "", comprobante: false }); loadData(); }
  }

  const gastos = movimientos.filter(m => m.tipo === "GASTO").reduce((s, m) => s + (m.monto || 0), 0);
  const reposiciones = movimientos.filter(m => m.tipo === "REPOSICION").reduce((s, m) => s + (m.monto || 0), 0);
  const saldo = reposiciones - gastos;

  const filtered = movimientos.filter(m => !search || m.concepto?.toLowerCase().includes(search.toLowerCase()) || m.obra_nombre?.toLowerCase().includes(search.toLowerCase()) || m.solicitante?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Caja Chica</h1>
          <p className="text-slate-400 text-sm">Control de gastos menores y reposiciones</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Movimiento
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Saldo Disponible", value: `$${saldo.toLocaleString()}`, icon: DollarSign, color: saldo >= 0 ? "text-emerald-400" : "text-red-400", bg: saldo >= 0 ? "bg-emerald-500/10" : "bg-red-500/10" },
          { label: "Gastos del Periodo", value: `$${gastos.toLocaleString()}`, icon: TrendingDown, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Reposiciones", value: `$${reposiciones.toLocaleString()}`, icon: Receipt, color: "text-blue-400", bg: "bg-blue-500/10" },
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
          <h3 className="text-lg font-semibold text-white">Registrar Movimiento</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="GASTO">Gasto</option><option value="REPOSICION">Reposición</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Concepto</label>
              <input value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} placeholder="Descripción del gasto"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Monto</label>
              <input type="number" value={form.monto} onChange={e => setForm({...form, monto: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Obra</label>
              <input value={form.obra_nombre} onChange={e => setForm({...form, obra_nombre: e.target.value})} placeholder="Nombre de la obra"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Solicitante</label>
              <input value={form.solicitante} onChange={e => setForm({...form, solicitante: e.target.value})} placeholder="Quién solicita"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.comprobante} onChange={e => setForm({...form, comprobante: e.target.checked})} className="rounded" />
                <span className="text-sm text-slate-300">Tiene comprobante</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por concepto, obra o solicitante..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Concepto</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3">Solicitante</th>
                <th className="text-center p-3">Tipo</th>
                <th className="text-right p-3">Monto</th>
                <th className="text-center p-3">Comp.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No hay movimientos registrados</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-slate-300 text-xs">{m.fecha || new Date(m.created_at).toLocaleDateString("es-MX")}</td>
                  <td className="p-3 text-white">{m.concepto}</td>
                  <td className="p-3 text-slate-300">{m.obra_nombre || "-"}</td>
                  <td className="p-3 text-slate-300">{m.solicitante || "-"}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.tipo === "GASTO" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className={`p-3 text-right font-medium ${m.tipo === "GASTO" ? "text-red-400" : "text-emerald-400"}`}>
                    {m.tipo === "GASTO" ? "-" : "+"}${(m.monto || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">{m.comprobante ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
