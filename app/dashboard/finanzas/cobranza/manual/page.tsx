"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Search, Loader2, X, DollarSign, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface Cliente { id: string; nombre: string; estatus: string; }
interface Obra    { id: string; nombre: string; activo: boolean; }
interface Cobro {
  id: string;
  cliente_id: string | null;
  cliente_nombre: string;
  obra_id: string | null;
  obra_nombre: string | null;
  monto: number;
  saldo: number;
  estatus: string;
  referencia: string | null;
  metodo: string | null;
  fecha: string;
  observaciones: string | null;
  created_at: string;
}

const ESTATUS = ["PENDIENTE", "PARCIAL", "PAGADO", "CANCELADO"] as const;
const METODOS = ["Transferencia", "Efectivo", "Cheque", "Tarjeta", "Otro"];

const FORM_INIT = {
  cliente_id: "",
  obra_id: "",
  monto: 0,
  saldo: 0,
  estatus: "PENDIENTE" as (typeof ESTATUS)[number],
  referencia: "",
  metodo: "Transferencia",
  fecha: new Date().toISOString().split("T")[0],
  observaciones: "",
};

export default function CobranzaManualPage() {
  const router = useRouter();
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...FORM_INIT });
  const [saving, setSaving] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [c, cli, ob] = await Promise.all([
        supabase.from("cobros_manuales").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("clientes").select("id, nombre, estatus").order("nombre", { ascending: true }),
        supabase.from("centros_trabajo").select("id, nombre, activo").order("nombre", { ascending: true }),
      ]);
      if (c.error?.code === "42P01" || c.error?.code === "PGRST205") {
        alert("Falta crear tabla cobros_manuales. Ver SQL aplicado en Supabase.");
      }
      setCobros((c.data as Cobro[]) || []);
      setClientes((cli.data as Cliente[]) || []);
      setObras((ob.data as Obra[]) || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function abrirNuevo() {
    setEditId(null);
    setForm({ ...FORM_INIT });
    setShowForm(true);
  }

  function abrirEdicion(c: Cobro) {
    setEditId(c.id);
    setForm({
      cliente_id: c.cliente_id || "",
      obra_id: c.obra_id || "",
      monto: Number(c.monto) || 0,
      saldo: Number(c.saldo) || 0,
      estatus: (c.estatus as any) || "PENDIENTE",
      referencia: c.referencia || "",
      metodo: c.metodo || "Transferencia",
      fecha: c.fecha || new Date().toISOString().split("T")[0],
      observaciones: c.observaciones || "",
    });
    setShowForm(true);
  }

  async function guardar() {
    if (!form.cliente_id) { alert("Selecciona un cliente"); return; }
    const cli = clientes.find(c => c.id === form.cliente_id);
    if (!cli) { alert("Cliente no encontrado"); return; }
    if (cli.estatus !== "ACTIVO") {
      alert(`El cliente "${cli.nombre}" está INACTIVO. No se permite registrar nueva cobranza.`);
      return;
    }
    if (!form.monto || form.monto <= 0) { alert("Monto debe ser mayor a 0"); return; }
    if (form.saldo < 0 || form.saldo > form.monto) { alert("Saldo debe estar entre 0 y monto"); return; }

    const obra = form.obra_id ? obras.find(o => o.id === form.obra_id) : null;

    // Auto-derivar estatus si saldo es 0 o monto completo
    let estatus = form.estatus;
    if (form.saldo === 0 && estatus !== "CANCELADO") estatus = "PAGADO";
    else if (form.saldo > 0 && form.saldo < form.monto && estatus !== "CANCELADO") estatus = "PARCIAL";
    else if (form.saldo === form.monto && estatus !== "CANCELADO") estatus = "PENDIENTE";

    const payload = {
      cliente_id: form.cliente_id,
      cliente_nombre: cli.nombre,
      obra_id: form.obra_id || null,
      obra_nombre: obra?.nombre || null,
      monto: form.monto,
      saldo: form.saldo,
      estatus,
      referencia: form.referencia || null,
      metodo: form.metodo || null,
      fecha: form.fecha,
      observaciones: form.observaciones || null,
    };

    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase.from("cobros_manuales").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cobros_manuales").insert(payload);
        if (error) throw error;
      }
      setShowForm(false);
      setEditId(null);
      setForm({ ...FORM_INIT });
      await cargar();
    } catch (e: any) {
      alert("Error: " + (e?.message || "desconocido"));
    } finally {
      setSaving(false);
    }
  }

  async function cancelarCobro(c: Cobro) {
    if (c.estatus === "CANCELADO") return;
    if (!confirm(`Cancelar cobro de "${c.cliente_nombre}" por $${c.monto}?`)) return;
    const { error } = await supabase.from("cobros_manuales").update({ estatus: "CANCELADO" }).eq("id", c.id);
    if (error) alert("Error: " + error.message);
    else cargar();
  }

  const clientesActivos = clientes.filter(c => c.estatus === "ACTIVO");
  const obrasActivas = obras.filter(o => o.activo !== false);

  const filtered = cobros.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.cliente_nombre?.toLowerCase().includes(q) || c.obra_nombre?.toLowerCase().includes(q) || c.referencia?.toLowerCase().includes(q);
    const matchFilter = filter === "TODOS" || c.estatus === filter;
    return matchSearch && matchFilter;
  });

  const totMonto = cobros.filter(c => c.estatus !== "CANCELADO").reduce((s, c) => s + Number(c.monto || 0), 0);
  const totSaldo = cobros.filter(c => c.estatus !== "CANCELADO").reduce((s, c) => s + Number(c.saldo || 0), 0);
  const totCobrado = totMonto - totSaldo;

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cobros Manuales</h1>
          <p className="text-slate-400 text-sm">Registro manual de pagos a clientes — vínculo opcional con obra</p>
        </div>
        <button onClick={abrirNuevo} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Cobro
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Monto Total", value: `$${totMonto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Cobrado", value: `$${totCobrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Saldo Pendiente", value: `$${totSaldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Registros", value: cobros.length, icon: AlertTriangle, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, obra, referencia..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["TODOS", ...ESTATUS] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"}`}>
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
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Monto</th>
                <th className="text-right p-3">Saldo</th>
                <th className="text-center p-3">Estatus</th>
                <th className="text-left p-3">Referencia</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin cobros registrados</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-slate-300">{c.fecha}</td>
                  <td className="p-3 text-white font-medium">{c.cliente_nombre}</td>
                  <td className="p-3 text-slate-300">{c.obra_nombre || "-"}</td>
                  <td className="p-3 text-right text-white">${Number(c.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right text-amber-400">${Number(c.saldo || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.estatus === "PAGADO" ? "bg-emerald-500/20 text-emerald-400" :
                      c.estatus === "PARCIAL" ? "bg-blue-500/20 text-blue-400" :
                      c.estatus === "CANCELADO" ? "bg-slate-500/20 text-slate-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>{c.estatus}</span>
                  </td>
                  <td className="p-3 text-slate-400 text-xs">{c.referencia || "-"}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => abrirEdicion(c)} disabled={c.estatus === "CANCELADO"}
                        className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 disabled:opacity-30">
                        Editar
                      </button>
                      {c.estatus !== "CANCELADO" && (
                        <button onClick={() => cancelarCobro(c)}
                          className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-auto py-8">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">{editId ? "Editar Cobro" : "Nuevo Cobro Manual"}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Cliente *</label>
                <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                  <option value="">— Selecciona cliente ACTIVO —</option>
                  {clientesActivos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                {clientes.length > clientesActivos.length && (
                  <p className="text-[11px] text-slate-500 mt-1">{clientes.length - clientesActivos.length} cliente(s) INACTIVO(s) ocultos. No se permite cobranza nueva contra clientes inactivos.</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Obra (opcional)</label>
                <select value={form.obra_id} onChange={e => setForm({ ...form, obra_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                  <option value="">— Sin vínculo a obra —</option>
                  {obrasActivas.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Monto *</label>
                <input type="number" step="0.01" value={form.monto}
                  onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    setForm({ ...form, monto: v, saldo: form.saldo > v ? v : form.saldo });
                  }}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Saldo pendiente</label>
                <input type="number" step="0.01" min={0} max={form.monto} value={form.saldo}
                  onChange={e => setForm({ ...form, saldo: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                <p className="text-[11px] text-slate-500 mt-1">Cobrado: ${(form.monto - form.saldo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Método</label>
                <select value={form.metodo} onChange={e => setForm({ ...form, metodo: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                  {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Estatus</label>
                <select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                  {ESTATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Se ajusta automáticamente según saldo si no está CANCELADO.</p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Referencia</label>
                <input value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })}
                  placeholder="Folio transferencia, cheque, etc."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm font-medium hover:bg-white/10">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 rounded-xl text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50">
                {saving ? "Guardando..." : (editId ? "Actualizar" : "Registrar Cobro")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
