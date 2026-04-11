"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useObrasCatalogo } from "@/lib/use-obras-catalogo";
import { Plus, Search, DollarSign, BarChart3, TrendingUp, AlertTriangle, Layers , Loader2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";

interface PartidaRow {
  id?: string;
  obra_nombre?: string;
  clave?: string;
  descripcion?: string;
  unidad?: string;
  cantidad?: number | string;
  precio_unitario?: number | string;
  importe?: number | string;
  categoria?: string;
  created_at?: string;
}

interface Partida {
  id: string;
  obra_nombre: string;
  clave: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
  categoria: string;
  created_at: string;
}

export default function PresupuestosPage() {
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterObra, setFilterObra] = useState("TODAS");
  const [obras, setObras] = useState<string[]>([]);
  const { obras: obrasCat } = useObrasCatalogo();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ obra_nombre: "", clave: "", descripcion: "", unidad: "LOTE", cantidad: 0, precio_unitario: 0, categoria: "MATERIALES" });
  const { msg, flash, clear } = useFlashMessage();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from("presupuestos_partidas").select("*").order("obra_nombre").order("clave");
      setPartidas(data || []);
      const obrasUnicas = [...new Set((data || []).map((p: PartidaRow) => p.obra_nombre).filter(Boolean))];
      setObras(obrasUnicas as string[]);
    } catch (e) { /* error handled */ }
    finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.obra_nombre.trim()) { flash("err", "Selecciona una obra"); return; }
    if (!form.descripcion.trim()) { flash("err", "Descripción es requerida"); return; }
    if (isNaN(form.cantidad) || form.cantidad <= 0) { flash("err", "Cantidad debe ser mayor a 0"); return; }
    if (isNaN(form.precio_unitario) || form.precio_unitario <= 0) { flash("err", "Precio unitario debe ser mayor a 0"); return; }
    const importe = form.cantidad * form.precio_unitario;

    const { error } = await supabase.from("presupuestos_partidas").insert({ ...form, importe, descripcion: form.descripcion.trim() });
    if (error) flash("err", "Error: " + error?.message);
    else { setShowForm(false); setForm({ obra_nombre: "", clave: "", descripcion: "", unidad: "LOTE", cantidad: 0, precio_unitario: 0, categoria: "MATERIALES" }); loadData(); flash("ok", "Partida guardada correctamente"); }
  }

  const filtered = partidas.filter(p => {
    const matchSearch = !search || p.descripcion?.toLowerCase().includes(search.toLowerCase()) || p.clave?.toLowerCase().includes(search.toLowerCase());
    const matchObra = filterObra === "TODAS" || p.obra_nombre === filterObra;
    return matchSearch && matchObra;
  });

  const totalPresupuesto = filtered.reduce((s, p) => s + (p.importe || 0), 0);
  const categorias = [...new Set(filtered.map(p => p.categoria).filter(Boolean))];

  // Totales por categoría
  const porCategoria = categorias.map(cat => ({
    categoria: cat,
    total: filtered.filter(p => p.categoria === cat).reduce((s, p) => s + (p.importe || 0), 0),
    partidas: filtered.filter(p => p.categoria === cat).length,
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <FlashBanner msg={msg} />
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4">
        <AriaBackButton href="/dashboard/obras" />

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Presupuestos de Obra</h1>
            <p className="text-slate-400 text-sm">Catálogo de partidas con precios unitarios por obra</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva Partida
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Presupuesto", value: `$${totalPresupuesto.toLocaleString()}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Partidas", value: filtered.length, icon: Layers, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Obras", value: obras.length, icon: BarChart3, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Categorías", value: categorias.length, icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Desglose por categoría */}
      {porCategoria.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {porCategoria.map((cat, i) => (
            <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
              <p className="text-xs text-slate-400 uppercase">{cat.categoria}</p>
              <p className="text-sm font-bold text-white">${cat.total.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{cat.partidas} partidas · {totalPresupuesto > 0 ? ((cat.total / totalPresupuesto) * 100).toFixed(1) : 0}%</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Nueva Partida</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="text-xs text-slate-400 mb-1 block">Obra *</label>
              <select value={form.obra_nombre} onChange={e => setForm({...form, obra_nombre: e.target.value})} required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="">-- Selecciona obra del catálogo --</option>
                {obrasCat.map(o => <option key={o.id} value={o.nombre}>{o.nombre}</option>)}
              </select></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Clave</label>
              <input value={form.clave} onChange={e => setForm({...form, clave: e.target.value.toUpperCase()})} placeholder="Ej: ALB-001" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Categoría</label>
              <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="MATERIALES">Materiales</option><option value="MANO_OBRA">Mano de Obra</option><option value="HERRAMIENTA">Herramienta/Equipo</option><option value="SUBCONTRATO">Subcontrato</option><option value="INDIRECTOS">Indirectos</option><option value="OTROS">Otros</option>
              </select></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Unidad</label>
              <select value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option value="LOTE">LOTE</option><option value="M2">M2</option><option value="M3">M3</option><option value="ML">ML</option><option value="PZA">PZA</option><option value="KG">KG</option><option value="TON">TON</option><option value="JOR">JORNADA</option><option value="GLOBAL">GLOBAL</option>
              </select></div>
            <div className="md:col-span-2"><label className="text-xs text-slate-400 mb-1 block">Descripción *</label>
              <input value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Descripción de la partida" required className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Cantidad *</label>
              <input type="number" min="0.01" step="0.01" required value={form.cantidad} onChange={e => setForm({...form, cantidad: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" /></div>
            <div><label className="text-xs text-slate-400 mb-1 block">Precio Unitario *</label>
              <input type="number" min="0.01" step="0.01" required value={form.precio_unitario} onChange={e => setForm({...form, precio_unitario: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" /></div>
          </div>
          {form.cantidad > 0 && form.precio_unitario > 0 && (
            <div className="p-3 bg-white/5 rounded-lg text-sm">
              <span className="text-slate-400">Importe: </span><span className="text-emerald-400 font-bold">${(form.cantidad * form.precio_unitario).toLocaleString()}</span>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por clave o descripción..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <select value={filterObra} onChange={e => setFilterObra(e.target.value)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none">
          <option value="TODAS">Todas las obras</option>
          {obras.map((o, i) => <option key={i} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Clave</th>
                <th className="text-left p-3">Descripción</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-center p-3">Cat.</th>
                <th className="text-center p-3">Unidad</th>
                <th className="text-right p-3">Cantidad</th>
                <th className="text-right p-3">P.U.</th>
                <th className="text-right p-3">Importe</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin partidas registradas</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-mono text-xs">{p.clave || "-"}</td>
                  <td className="p-3 text-white">{p.descripcion}</td>
                  <td className="p-3 text-slate-300 text-xs">{p.obra_nombre}</td>
                  <td className="p-3 text-center text-xs text-slate-400">{(p.categoria || "").replace("_", " ")}</td>
                  <td className="p-3 text-center text-slate-400">{p.unidad}</td>
                  <td className="p-3 text-right text-slate-300">{(p.cantidad || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-300">${(p.precio_unitario || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-white font-medium">${(p.importe || 0).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length > 0 && (
                <tr className="border-t-2 border-white/10 bg-white/[0.02]">
                  <td colSpan={7} className="p-3 text-right text-white font-semibold">TOTAL:</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">${totalPresupuesto.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
