"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { registrarCobroEstimacion } from "@/lib/finanzas-payments";
import { DollarSign, Clock, CheckCircle2, Plus, Search, FileText, AlertTriangle, X, Loader2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

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
  const log = clientLogger("COBRANZA");
  const [estimaciones, setEstimaciones] = useState<Estimacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const [cobroModal, setCobroModal] = useState<{ id: string; montoEstimado: number; retencion: number; cobrado: number; pendiente: number } | null>(null);
  const [cobroMonto, setCobroMonto] = useState("");
  const [cobroSaving, setCobroSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ obra_nombre: "", cliente: "", periodo: "", monto_estimado: 0, retencion_fondo: 5 });
  const { msg, flash, clear } = useFlashMessage();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from("estimaciones").select("*").order("created_at", { ascending: false });
      setEstimaciones(data || []);
    } catch (e: unknown) { log.error(String(e)); }
    finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.obra_nombre?.trim()) { flash("err", "Nombre de obra es requerido"); return; }
    if (isNaN(form.monto_estimado) || form.monto_estimado <= 0) { flash("err", "Monto estimado debe ser mayor a 0"); return; }
    if (isNaN(form.retencion_fondo) || form.retencion_fondo < 0 || form.retencion_fondo > 100) { flash("err", "% Retención debe estar entre 0 y 100"); return; }
    // Folio derivado del max(numero) + 1 por obra. NOTA: sin unique constraint en
    // (obra_nombre, numero) sigue habiendo riesgo de colisión bajo concurrencia.
    // Mitigado a nivel cliente; deuda P1: añadir unique index en BD.
    const { data: maxRow } = await supabase
      .from("estimaciones")
      .select("numero")
      .eq("obra_nombre", form.obra_nombre)
      .order("numero", { ascending: false })
      .limit(1)
      .maybeSingle();
    const numero = ((maxRow?.numero as number | undefined) || 0) + 1;
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

    if (error) flash("err", "Error: " + (error as {message?: string})?.message || "Unknown error");
    else { setShowForm(false); setForm({ obra_nombre: "", cliente: "", periodo: "", monto_estimado: 0, retencion_fondo: 5 }); loadData(); }
  }

  function abrirCobroModal(est: Estimacion) {
    const retencion = est.retencion_fondo || 0;
    const cobrado = est.monto_cobrado || 0;
    const pendiente = +(est.monto_estimado - retencion - cobrado).toFixed(2);
    setCobroModal({
      id: est.id,
      montoEstimado: est.monto_estimado,
      retencion,
      cobrado,
      pendiente,
    });
    setCobroMonto(String(pendiente));
  }

  async function confirmarCobro() {
    if (!cobroModal) return;
    const montoCobrado = parseFloat(cobroMonto);
    if (isNaN(montoCobrado) || montoCobrado <= 0) { flash("err", "Monto a cobrar debe ser mayor a 0"); return; }
    if (montoCobrado > cobroModal.pendiente) { flash("err", `Monto no puede exceder pendiente de $${cobroModal.pendiente.toLocaleString()}`); return; }
    setCobroSaving(true);
    try {
      await registrarCobroEstimacion({
        estimacionId: cobroModal.id,
        monto: montoCobrado,
        montoEstimado: cobroModal.montoEstimado,
        retencion: cobroModal.retencion,
        expectedCobrado: cobroModal.cobrado,
      });
      setCobroModal(null);
      await loadData();
    } catch (e: unknown) {
      flash("err", (e as {message?: string})?.message || "Error desconocido al registrar cobro");
    } finally {
      setCobroSaving(false);
    }
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
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      <AriaBackButton href="/dashboard/finanzas" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cobranza</h1>
          <p className="text-[#7f93b0] text-sm">Estimaciones de avance y cobro a clientes — Fondo de garantía 5%</p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/finanzas/cobranza/manual" className="px-4 py-2 bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] text-white rounded-full text-sm font-medium hover:bg-[#2A4A8E] transition-colors flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Cobros Manuales
          </a>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] text-white rounded-full text-sm font-medium hover:bg-[#2A4A8E] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva Estimación
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Estimado", value: `$${totalEstimado.toLocaleString()}`, icon: FileText, color: "text-aria-accent", bg: "bg-aria-primary/10" },
          { label: "Cobrado", value: `$${totalCobrado.toLocaleString()}`, icon: CheckCircle2, color: "text-aria-accent", bg: "bg-emerald-500/10" },
          { label: "Fondo Garantía", value: `$${totalRetenido.toLocaleString()}`, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Pendiente", value: `$${pendiente.toLocaleString()}`, icon: Clock, color: "text-red-400", bg: "bg-red-500/10" },
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
          <h3 className="text-lg font-semibold text-white">Nueva Estimación</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "obra_nombre", label: "Obra *", placeholder: "Nombre de la obra" },
              { key: "cliente", label: "Cliente", placeholder: "Nombre del cliente" },
              { key: "periodo", label: "Periodo", placeholder: "Ej: Ene 2026, Semana 1-15 Feb" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-[#7f93b0] mb-1 block">{f.label}</label>
                <input required={f.key === "obra_nombre"} value={String((form as Record<string, unknown>)[f.key] || "")} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-[#4a6080] focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Monto Estimado *</label>
              <input type="number" required min="0.01" step="0.01" value={form.monto_estimado} onChange={e => setForm({...form, monto_estimado: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">% Retención Fondo *</label>
              <input type="number" required min="0" max="100" step="0.01" value={form.retencion_fondo} onChange={e => setForm({...form, retencion_fondo: parseFloat(e.target.value) || 5})}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-sm font-medium">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-white/[0.04] hover:bg-white/[0.06] text-[#c9d8ed] rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por obra o cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "PRESENTADA", "APROBADA", "COBRADA"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-aria-primary-light text-aria-accent border border-aria-primary/30" : "bg-white/[0.04] text-[#7f93b0] border border-white/[0.08] hover:bg-white/[0.06]"}`}>
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
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]">Sin estimaciones registradas</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-medium">Est. {e.numero}</td>
                  <td className="p-3 text-white">{e.obra_nombre}</td>
                  <td className="p-3 text-[#c9d8ed]">{e.cliente || "-"}</td>
                  <td className="p-3 text-[#c9d8ed]">{e.periodo || "-"}</td>
                  <td className="p-3 text-right text-white">${(e.monto_estimado || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-amber-400">${(e.retencion_fondo || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-aria-accent">${(e.monto_cobrado || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.status === "COBRADA" ? "bg-emerald-500/20 text-aria-accent" :
                      e.status === "APROBADA" ? "bg-aria-primary-light text-aria-accent" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>{e.status}</span>
                  </td>
                  <td className="p-3 text-center">
                    {e.status !== "COBRADA" && (
                      <button onClick={() => abrirCobroModal(e)}
                        className="px-3 py-1 bg-emerald-500/20 text-aria-accent rounded-lg text-xs hover:bg-aria-primary/30">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 ">
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Registrar Cobro</h3>
              <button onClick={() => setCobroModal(null)} className="p-1 rounded-lg hover:bg-white/[0.06]"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>
            <div>
              <label className="block text-xs text-[#7f93b0] mb-1">Monto cobrado *</label>
              <input type="number" required value={cobroMonto} onChange={e => setCobroMonto(e.target.value)} step="0.01" min="0.01" max={cobroModal.pendiente}
                className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:border-aria-primary/50 focus:outline-none" />
              <p className="text-xs text-[#4a6080] mt-1">{`Pendiente cobrable: $${cobroModal.pendiente.toLocaleString()} (cobrado previo: $${cobroModal.cobrado.toLocaleString()}, retención: $${cobroModal.retencion.toLocaleString()})`}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCobroModal(null)} className="flex-1 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[#c9d8ed] text-sm font-medium hover:bg-white/[0.06]">Cancelar</button>
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
