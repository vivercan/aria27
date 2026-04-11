"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Link2, X, Loader2, CheckCircle2, AlertCircle, ArrowDown, ArrowUp } from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";
import ConfirmModal from "@/components/ConfirmModal";

interface Cuenta { id: string; banco: string; cuenta: string; empresa: string; }
interface Movimiento {
  id: string;
  cuenta_id: string | null;
  banco: string | null;
  cuenta: string | null;
  empresa: string | null;
  fecha_movimiento: string | null;
  monto: number | null;
  concepto: string | null;
  referencia: string | null;
  tipo_movimiento: string | null;
  status_match: string | null;
  cobro_id: string | null;
  oc_id: string | null;
  notas: string | null;
  created_at: string;
}
interface Cobro { id: string; folio: string | null; monto: number | null; fecha: string | null; obra_nombre: string | null; cliente_nombre: string | null; estatus: string | null; }
interface OC { id: string; po_number: string | null; total: number | null; created_at: string; supplier_name: string | null; status: string | null; }

const FORM_INIT = { cuenta_id: "", fecha_movimiento: new Date().toISOString().slice(0,10), monto: 0, concepto: "", referencia: "", tipo_movimiento: "ABONO", notas: "" };

export default function MovimientosBancariosPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCuenta, setFiltroCuenta] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...FORM_INIT });
  const [matchModal, setMatchModal] = useState<Movimiento | null>(null);
  const [cobrosSugeridos, setCobrosSugeridos] = useState<Cobro[]>([]);
  const [ocsSugeridas, setOcsSugeridas] = useState<OC[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("cuentas_bancarias").select("id, banco, cuenta, empresa").eq("activa", true).order("banco"),
      supabase.from("conciliacion_bancaria").select("*").order("fecha_movimiento", { ascending: false }).limit(500),
    ]);
    setCuentas((c as any) || []);
    setMovs((m as any) || []);
    setLoading(false);
  }

  function validar(): boolean {
    const errors: Record<string, string> = {};
    if (!form.cuenta_id) errors.cuenta_id = "Selecciona una cuenta";
    if (!form.monto || form.monto <= 0) errors.monto = "Monto debe ser mayor a 0";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function crearMovimiento() {
    if (!validar()) return;
    const cuenta = cuentas.find(c => c.id === form.cuenta_id);
    const payload = {
      cuenta_id: form.cuenta_id,
      banco: cuenta?.banco || null,
      cuenta: cuenta?.cuenta || null,
      empresa: cuenta?.empresa || null,
      fecha_movimiento: form.fecha_movimiento,
      monto: Number(form.monto),
      concepto: form.concepto,
      referencia: form.referencia,
      tipo_movimiento: form.tipo_movimiento,
      notas: form.notas,
      status_match: "PENDIENTE",
    };
    const { error } = await supabase.from("conciliacion_bancaria").insert(payload);
    if (error) { flash("err", "Error: " + error.message); return; }
    setForm({ ...FORM_INIT });
    setShowForm(false);
    loadAll();
  }

  async function abrirMatch(m: Movimiento) {
    setMatchModal(m);
    setCobrosSugeridos([]);
    setOcsSugeridas([]);
    if (!m.monto) return;
    const monto = Number(m.monto);
    const tol = monto * 0.01 + 1;
    if (m.tipo_movimiento === "ABONO") {
      const { data } = await supabase
        .from("cobros_manuales")
        .select("id, folio, monto, fecha, obra_nombre, cliente_nombre, estatus")
        .gte("monto", monto - tol).lte("monto", monto + tol)
        .neq("estatus", "CANCELADO")
        .order("fecha", { ascending: false }).limit(10);
      setCobrosSugeridos((data as any) || []);
    } else {
      const { data } = await supabase
        .from("purchase_orders")
        .select("id, po_number, total, created_at, supplier_name, status")
        .gte("total", monto - tol).lte("total", monto + tol)
        .neq("status", "CANCELADA")
        .order("created_at", { ascending: false }).limit(10);
      setOcsSugeridas((data as any) || []);
    }
  }

  async function aplicarMatch(tipo: "cobro" | "oc", id: string, ref: string) {
    if (!matchModal) return;
    const update: any = { status_match: "MATCHED", referencia: ref };
    if (tipo === "cobro") update.cobro_id = id;
    else update.oc_id = id;
    const { error } = await supabase.from("conciliacion_bancaria").update(update).eq("id", matchModal.id);
    if (error) { flash("err", "Error: " + error.message); return; }
    setMatchModal(null);
    loadAll();
  }

  async function desconciliar(m: Movimiento) {
    setConfirmState({
      open: true,
      msg: "¿Quitar la conciliación de este movimiento?",
      onOk: async () => {
        const { error } = await supabase.from("conciliacion_bancaria")
          .update({ status_match: "PENDIENTE", cobro_id: null, oc_id: null })
          .eq("id", m.id);
        if (error) { flash("err", "Error: " + error.message); return; }
        loadAll();
      }
    });
  }

  const movsFiltrados = movs.filter(m => {
    if (filtroCuenta && m.cuenta_id !== filtroCuenta) return false;
    if (filtroStatus !== "TODOS" && (m.status_match || "PENDIENTE") !== filtroStatus) return false;
    return true;
  });
  const totalAbonos = movsFiltrados.filter(m => m.tipo_movimiento === "ABONO").reduce((s, m) => s + Number(m.monto || 0), 0);
  const totalCargos = movsFiltrados.filter(m => m.tipo_movimiento === "CARGO").reduce((s, m) => s + Number(m.monto || 0), 0);
  const pendientes = movsFiltrados.filter(m => (m.status_match || "PENDIENTE") === "PENDIENTE").length;

  return (
    <div className="space-y-6">
      <FlashBanner msg={msg} />
      <div className="flex items-center gap-4">
        <Link href="/dashboard/finanzas/bancos" className="p-2 hover:bg-white/10 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Movimientos Bancarios · Conciliación</h1>
          <p className="text-slate-400 text-sm">Alta manual + match con cobros y órdenes de compra</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg flex items-center gap-2 text-sm">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancelar" : "Nuevo movimiento"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-slate-400">Movimientos</p>
          <p className="text-2xl font-bold text-white">{movsFiltrados.length}</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-slate-400">Abonos</p>
          <p className="text-2xl font-bold text-emerald-400">${totalAbonos.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-slate-400">Cargos</p>
          <p className="text-2xl font-bold text-red-400">${totalCargos.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-slate-400">Pendientes match</p>
          <p className="text-2xl font-bold text-amber-400">{pendientes}</p>
        </div>
      </div>

      {showForm && (
        <div className="p-6 bg-white/5 rounded-xl border border-white/10 space-y-4">
          <h3 className="text-lg font-semibold text-white">Alta de movimiento</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400">Cuenta *</label>
              <select value={form.cuenta_id} onChange={e => setForm({ ...form, cuenta_id: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                <option value="">Selecciona...</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco} · {c.cuenta} ({c.empresa})</option>)}
              </select>
              {formErrors.cuenta_id && <p className="text-red-400 text-xs mt-1">{formErrors.cuenta_id}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400">Fecha</label>
              <input type="date" value={form.fecha_movimiento} onChange={e => setForm({ ...form, fecha_movimiento: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Tipo</label>
              <select value={form.tipo_movimiento} onChange={e => setForm({ ...form, tipo_movimiento: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                <option value="ABONO">ABONO (entrada)</option>
                <option value="CARGO">CARGO (salida)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Monto *</label>
              <input type="number" value={form.monto} onChange={e => setForm({ ...form, monto: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              {formErrors.monto && <p className="text-red-400 text-xs mt-1">{formErrors.monto}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">Concepto</label>
              <input value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} placeholder="Descripción del movimiento" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-slate-400">Referencia / Notas</label>
              <input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Referencia bancaria, nota interna" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={crearMovimiento} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/5 text-slate-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <select value={filtroCuenta} onChange={e => setFiltroCuenta(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
          <option value="">Todas las cuentas</option>
          {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco} · {c.cuenta}</option>)}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
          <option value="TODOS">Todos los estatus</option>
          <option value="PENDIENTE">Pendientes</option>
          <option value="MATCHED">Conciliados</option>
        </select>
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/95 sticky top-0 backdrop-blur">
            <tr>
              <th className="px-3 py-3 text-left text-slate-300">Fecha</th>
              <th className="px-3 py-3 text-left text-slate-300">Cuenta</th>
              <th className="px-3 py-3 text-center text-slate-300">Tipo</th>
              <th className="px-3 py-3 text-right text-slate-300">Monto</th>
              <th className="px-3 py-3 text-left text-slate-300">Concepto</th>
              <th className="px-3 py-3 text-center text-slate-300">Status</th>
              <th className="px-3 py-3 text-center text-slate-300">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && <tr><td colSpan={7} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" /></td></tr>}
            {!loading && movsFiltrados.map(m => {
              const status = m.status_match || "PENDIENTE";
              return (
                <tr key={m.id} className="hover:bg-white/5">
                  <td className="px-3 py-2 text-slate-300">{m.fecha_movimiento ? new Date(m.fecha_movimiento).toLocaleDateString("es-MX") : "-"}</td>
                  <td className="px-3 py-2 text-slate-300 text-xs">{m.banco} <br /><span className="text-slate-500 font-mono">{m.cuenta}</span></td>
                  <td className="px-3 py-2 text-center">
                    {m.tipo_movimiento === "ABONO"
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs"><ArrowDown className="w-3 h-3" />ABONO</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs"><ArrowUp className="w-3 h-3" />CARGO</span>}
                  </td>
                  <td className={`px-3 py-2 text-right font-medium ${m.tipo_movimiento === "ABONO" ? "text-emerald-400" : "text-red-400"}`}>${Number(m.monto || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-slate-300 text-xs">{m.concepto || "-"}<br /><span className="text-slate-500">{m.notas}</span></td>
                  <td className="px-3 py-2 text-center">
                    {status === "MATCHED"
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs"><CheckCircle2 className="w-3 h-3" />OK</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-xs"><AlertCircle className="w-3 h-3" />PEND</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {status === "MATCHED"
                      ? <button onClick={() => desconciliar(m)} className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs hover:bg-red-500/30">Desconciliar</button>
                      : <button onClick={() => abrirMatch(m)} className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs hover:bg-blue-500/30 inline-flex items-center gap-1"><Link2 className="w-3 h-3" />Conciliar</button>}
                  </td>
                </tr>
              );
            })}
            {!loading && movsFiltrados.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Sin movimientos. Da de alta el primero.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {matchModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full border border-white/10 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Conciliar movimiento · ${Number(matchModal.monto || 0).toLocaleString()}</h3>
              <button onClick={() => setMatchModal(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-400 mb-4">{matchModal.concepto} · {matchModal.fecha_movimiento}</p>
            {matchModal.tipo_movimiento === "ABONO" ? (
              <>
                <p className="text-sm text-slate-300 mb-2">Cobros con monto similar (±1%):</p>
                {cobrosSugeridos.length === 0 && <p className="text-slate-500 text-sm py-4">Sin sugerencias</p>}
                <div className="space-y-2">
                  {cobrosSugeridos.map(c => (
                    <button key={c.id} onClick={() => aplicarMatch("cobro", c.id, c.folio || c.id)} className="w-full text-left p-3 bg-white/5 hover:bg-emerald-500/20 rounded-lg border border-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{c.folio || c.id.slice(0,8)} · {c.cliente_nombre}</p>
                          <p className="text-xs text-slate-400">{c.obra_nombre} · {c.fecha} · {c.estatus}</p>
                        </div>
                        <p className="text-emerald-400 font-bold">${Number(c.monto || 0).toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300 mb-2">Órdenes de compra con monto similar (±1%):</p>
                {ocsSugeridas.length === 0 && <p className="text-slate-500 text-sm py-4">Sin sugerencias</p>}
                <div className="space-y-2">
                  {ocsSugeridas.map(o => (
                    <button key={o.id} onClick={() => aplicarMatch("oc", o.id, o.po_number || o.id)} className="w-full text-left p-3 bg-white/5 hover:bg-red-500/20 rounded-lg border border-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{o.po_number || o.id.slice(0,8)} · {o.supplier_name}</p>
                          <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString("es-MX")} · {o.status}</p>
                        </div>
                        <p className="text-red-400 font-bold">${Number(o.total || 0).toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => { confirmState.onOk(); setConfirmState(p => ({...p, open: false})); }}
        onCancel={() => setConfirmState(p => ({...p, open: false}))}
      />
    </div>
  );
}
