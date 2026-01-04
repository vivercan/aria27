"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, Plus, Search, Download, X, Building, CreditCard, Banknote, AlertTriangle, CheckCircle, TrendingUp, Edit, Trash2, Save, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface GastoObra {
  id: string;
  folio: string;
  fecha_gasto: string;
  centro_trabajo_id: string;
  tipo_pago: string;
  concepto: string;
  monto: number;
  tiene_factura: boolean;
  status: string;
  centro_trabajo?: { nombre: string };
}

export default function GastosObraFinancePage() {
  const [gastos, setGastos] = useState<GastoObra[]>([]);
  const [centros, setCentros] = useState<{id: string; nombre: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterObra, setFilterObra] = useState("TODAS");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [showModal, setShowModal] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoObra | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ fecha_gasto: new Date().toISOString().split("T")[0], centro_trabajo_id: "", tipo_pago: "EFECTIVO", concepto: "", monto: 0, tiene_factura: false, status: "PENDIENTE" });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: gastosData } = await supabase.from("gastos_obra").select("*, centro_trabajo:centros_trabajo(nombre)").order("created_at", { ascending: false });
      setGastos(gastosData || []);
      const { data: centrosData } = await supabase.from("centros_trabajo").select("id, nombre").eq("activo", true).order("nombre");
      if (centrosData && centrosData.length > 0) { setCentros(centrosData); }
      else {
        const { data: wc } = await supabase.from("work_centers").select("id, name").eq("active", true).order("name");
        setCentros((wc || []).map(w => ({ id: w.id, nombre: w.name })));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const stats = {
    total: gastos.reduce((s, g) => s + (g.monto || 0), 0),
    transferir: gastos.filter(g => g.tipo_pago === "TRANSFERENCIA" && g.status === "PENDIENTE").reduce((s, g) => s + (g.monto || 0), 0),
    efectivo: gastos.filter(g => g.tipo_pago === "EFECTIVO" && g.status === "PENDIENTE").reduce((s, g) => s + (g.monto || 0), 0),
    urgente: gastos.filter(g => g.tipo_pago === "URGENTE" && g.status === "PENDIENTE").reduce((s, g) => s + (g.monto || 0), 0),
    pagado: gastos.filter(g => g.status === "PAGADO").reduce((s, g) => s + (g.monto || 0), 0),
  };

  const obrasResumen = Object.entries(gastos.reduce((acc, g) => {
    const obra = g.centro_trabajo?.nombre || "Sin asignar";
    acc[obra] = (acc[obra] || 0) + (g.monto || 0);
    return acc;
  }, {} as Record<string, number>)).map(([nombre, total]) => ({ nombre, total, pct: stats.total > 0 ? (total / stats.total) * 100 : 0 })).sort((a, b) => b.total - a.total).slice(0, 6);

  const filteredGastos = gastos.filter(g => {
    const matchSearch = !searchTerm || g.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) || g.folio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchObra = filterObra === "TODAS" || (g.centro_trabajo?.nombre || "Sin asignar") === filterObra;
    const matchStatus = filterStatus === "TODOS" || g.status === filterStatus;
    return matchSearch && matchObra && matchStatus;
  });

  const obrasUnicas = [...new Set(gastos.map(g => g.centro_trabajo?.nombre || "Sin asignar"))];
  const formatMoney = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const handleNew = () => { setEditingGasto(null); setFormData({ fecha_gasto: new Date().toISOString().split("T")[0], centro_trabajo_id: "", tipo_pago: "EFECTIVO", concepto: "", monto: 0, tiene_factura: false, status: "PENDIENTE" }); setShowModal(true); };
  const handleEdit = (g: GastoObra) => { setEditingGasto(g); setFormData({ fecha_gasto: g.fecha_gasto || "", centro_trabajo_id: g.centro_trabajo_id || "", tipo_pago: g.tipo_pago || "EFECTIVO", concepto: g.concepto || "", monto: g.monto || 0, tiene_factura: g.tiene_factura || false, status: g.status || "PENDIENTE" }); setShowModal(true); };
  const handleDelete = async (id: string) => { if (confirm("¿Eliminar?")) { await supabase.from("gastos_obra").delete().eq("id", id); cargarDatos(); } };
  const handleSave = async () => {
    if (!formData.concepto || !formData.monto) { alert("Concepto y monto requeridos"); return; }
    setSaving(true);
    const data = { fecha_gasto: formData.fecha_gasto, centro_trabajo_id: formData.centro_trabajo_id || null, tipo_pago: formData.tipo_pago, concepto: formData.concepto, monto: formData.monto, tiene_factura: formData.tiene_factura, status: formData.status };
    if (editingGasto) { await supabase.from("gastos_obra").update(data).eq("id", editingGasto.id); }
    else { await supabase.from("gastos_obra").insert({ ...data, folio: `GASTO-${Date.now().toString().slice(-6)}` }); }
    setSaving(false); setShowModal(false); cargarDatos();
  };
  const marcarPagado = async (id: string) => { await supabase.from("gastos_obra").update({ status: "PAGADO", pagado: true }).eq("id", id); cargarDatos(); };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /><span className="ml-2 text-white/60">Cargando...</span></div>;

  return (
    <div className="space-y-6">
      {/* Header con botón regresar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/finanzas" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-xl bg-emerald-500/20"><DollarSign className="w-6 h-6 text-emerald-400" /></div>
          <div><h1 className="text-2xl font-bold text-white">Gastos de Obra</h1><p className="text-slate-400 text-sm">Control de gastos por proyecto</p></div>
        </div>
        <div className="flex gap-3">
          <button onClick={cargarDatos} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm"><Download className="w-4 h-4" />Actualizar</button>
          <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-sm"><Plus className="w-4 h-4" />Nuevo Gasto</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg bg-emerald-500/20"><DollarSign className="w-4 h-4 text-emerald-400" /></div><span className="text-slate-400 text-xs">Total</span></div><p className="text-xl font-bold text-white">{formatMoney(stats.total)}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg bg-blue-500/20"><CreditCard className="w-4 h-4 text-blue-400" /></div><span className="text-slate-400 text-xs">Transferir</span></div><p className="text-xl font-bold text-blue-400">{formatMoney(stats.transferir)}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg bg-amber-500/20"><Banknote className="w-4 h-4 text-amber-400" /></div><span className="text-slate-400 text-xs">Efectivo</span></div><p className="text-xl font-bold text-amber-400">{formatMoney(stats.efectivo)}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg bg-red-500/20"><AlertTriangle className="w-4 h-4 text-red-400" /></div><span className="text-slate-400 text-xs">Urgente</span></div><p className="text-xl font-bold text-red-400">{formatMoney(stats.urgente)}</p></div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg bg-green-500/20"><CheckCircle className="w-4 h-4 text-green-400" /></div><span className="text-slate-400 text-xs">Pagado</span></div><p className="text-xl font-bold text-green-400">{formatMoney(stats.pagado)}</p></div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {obrasResumen.length > 0 && (
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-white"><TrendingUp className="w-5 h-5 text-emerald-400" />Resumen por Obra</h2>
              <div className="grid grid-cols-2 gap-3">
                {obrasResumen.map((o, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex justify-between mb-2"><p className="text-sm font-medium text-white truncate">{o.nombre}</p><span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">{o.pct.toFixed(1)}%</span></div>
                    <p className="text-lg font-bold text-emerald-400">{formatMoney(o.total)}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{width:`${Math.min(o.pct*3,100)}%`}}/></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Gastos ({filteredGastos.length})</h2>
              <div className="flex gap-2">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white w-40" /></div>
                <select value={filterObra} onChange={e => setFilterObra(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="TODAS">Todas</option>{obrasUnicas.map(o => <option key={o} value={o}>{o}</option>)}</select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"><option value="TODOS">Todos</option><option value="PENDIENTE">Pendiente</option><option value="PAGADO">Pagado</option></select>
              </div>
            </div>
            {filteredGastos.length === 0 ? (
              <div className="text-center py-12 text-slate-400"><DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" /><p>No hay gastos registrados</p><button onClick={handleNew} className="mt-4 text-emerald-400 hover:underline">+ Agregar primer gasto</button></div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-left text-xs text-slate-400"><th className="px-3 py-2">Folio</th><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Obra</th><th className="px-3 py-2">Concepto</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2 text-right">Monto</th><th className="px-3 py-2 text-center">Estado</th><th className="px-3 py-2 text-center">Acc</th></tr></thead>
                <tbody>
                  {filteredGastos.slice(0,25).map(g => (
                    <tr key={g.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-3 text-cyan-400 font-mono text-xs">{g.folio}</td>
                      <td className="px-3 py-3 text-slate-300">{g.fecha_gasto}</td>
                      <td className="px-3 py-3"><span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs">{g.centro_trabajo?.nombre || "—"}</span></td>
                      <td className="px-3 py-3 text-white truncate max-w-[180px]">{g.concepto}</td>
                      <td className="px-3 py-3"><span className={`px-2 py-1 rounded text-xs ${g.tipo_pago==="TRANSFERENCIA"?"bg-blue-500/20 text-blue-400":g.tipo_pago==="URGENTE"?"bg-red-500/20 text-red-400":"bg-amber-500/20 text-amber-400"}`}>{g.tipo_pago==="TRANSFERENCIA"?"💳":g.tipo_pago==="URGENTE"?"🔥":"💵"}</span></td>
                      <td className="px-3 py-3 text-right font-medium text-white">{formatMoney(g.monto)}</td>
                      <td className="px-3 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${g.status==="PAGADO"?"bg-green-500/20 text-green-400":"bg-amber-500/20 text-amber-400"}`}>{g.status}</span></td>
                      <td className="px-3 py-3"><div className="flex justify-center gap-1">{g.status!=="PAGADO"&&<button onClick={()=>marcarPagado(g.id)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-green-400"><CheckCircle className="w-4 h-4"/></button>}<button onClick={()=>handleEdit(g)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-blue-400"><Edit className="w-4 h-4"/></button><button onClick={()=>handleDelete(g.id)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4"/></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <h2 className="text-lg font-semibold mb-4 text-white">💵 Efectivo</h2>
            <div className="space-y-2 max-h-[180px] overflow-auto">{gastos.filter(g=>g.tipo_pago==="EFECTIVO"&&g.status==="PENDIENTE").map(g=>(<div key={g.id} className="flex justify-between p-2 rounded bg-white/5"><span className="text-slate-300 truncate max-w-[100px]">{g.concepto}</span><span className="text-amber-400">{formatMoney(g.monto)}</span></div>))}</div>
            <div className="mt-4 pt-4 border-t border-amber-500/20 flex justify-between"><span className="text-white">TOTAL</span><span className="text-amber-400 font-bold">{formatMoney(stats.efectivo)}</span></div>
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
            <h2 className="text-lg font-semibold mb-4 text-white">💳 Transferir</h2>
            <div className="space-y-2 max-h-[180px] overflow-auto">{gastos.filter(g=>g.tipo_pago==="TRANSFERENCIA"&&g.status==="PENDIENTE").map(g=>(<div key={g.id} className="flex justify-between p-2 rounded bg-white/5"><span className="text-slate-300 truncate max-w-[100px]">{g.concepto}</span><span className="text-blue-400">{formatMoney(g.monto)}</span></div>))}</div>
            <div className="mt-4 pt-4 border-t border-blue-500/20 flex justify-between"><span className="text-white">TOTAL</span><span className="text-blue-400 font-bold">{formatMoney(stats.transferir)}</span></div>
          </div>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20">
            <h2 className="text-lg font-semibold mb-4 text-white">🔥 Urgente</h2>
            <div className="space-y-2 max-h-[120px] overflow-auto">{gastos.filter(g=>g.tipo_pago==="URGENTE"&&g.status==="PENDIENTE").map(g=>(<div key={g.id} className="flex justify-between p-2 rounded bg-white/5"><span className="text-slate-300 truncate max-w-[100px]">{g.concepto}</span><span className="text-red-400">{formatMoney(g.monto)}</span></div>))}</div>
            <div className="mt-4 pt-4 border-t border-red-500/20 flex justify-between"><span className="text-white">TOTAL</span><span className="text-red-400 font-bold">{formatMoney(stats.urgente)}</span></div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-white/10">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">{editingGasto?"Editar":"Nuevo"} Gasto</h2><button onClick={()=>setShowModal(false)} className="p-2 rounded hover:bg-white/10"><X className="w-5 h-5 text-white"/></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-slate-400">Fecha</label><input type="date" value={formData.fecha_gasto} onChange={e=>setFormData({...formData,fecha_gasto:e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"/></div>
                <div><label className="text-sm text-slate-400">Obra</label><select value={formData.centro_trabajo_id} onChange={e=>setFormData({...formData,centro_trabajo_id:e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"><option value="">—</option>{centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
              </div>
              <div><label className="text-sm text-slate-400">Concepto *</label><input type="text" value={formData.concepto} onChange={e=>setFormData({...formData,concepto:e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"/></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="text-sm text-slate-400">Monto *</label><input type="number" value={formData.monto||""} onChange={e=>setFormData({...formData,monto:parseFloat(e.target.value)||0})} className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"/></div>
                <div><label className="text-sm text-slate-400">Tipo</label><select value={formData.tipo_pago} onChange={e=>setFormData({...formData,tipo_pago:e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"><option value="EFECTIVO">💵 Efectivo</option><option value="TRANSFERENCIA">💳 Transferencia</option><option value="URGENTE">🔥 Urgente</option></select></div>
                <div><label className="text-sm text-slate-400">Estado</label><select value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value})} className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"><option value="PENDIENTE">Pendiente</option><option value="PAGADO">Pagado</option></select></div>
              </div>
              <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={formData.tiene_factura} onChange={e=>setFormData({...formData,tiene_factura:e.target.checked})} className="w-4 h-4"/>Tiene factura</label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-2">{saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}{saving?"...":"Guardar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
