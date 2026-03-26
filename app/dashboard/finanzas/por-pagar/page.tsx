"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, DollarSign, Clock, AlertTriangle, CheckCircle2, Search, Calendar, Loader2, X } from "lucide-react";

interface CuentaPorPagar {
  id: string;
  folio: string;
  supplier_name: string;
  total: number;
  monto_pagado: number;
  saldo: number;
  created_at: string;
  obra_nombre: string;
  dias_credito: number;
  fecha_vencimiento: string;
  vencida: boolean;
}

export default function PorPagarPage() {
  const router = useRouter();
  const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const [pagando, setPagando] = useState<string | null>(null);
  const [pagoModal, setPagoModal] = useState<{ id: string; saldo: number } | null>(null);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoSaving, setPagoSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: ocs } = await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false });
      const hoy = new Date();

      const processed = (ocs || []).map((oc: any) => {
        const pagado = oc.monto_pagado || 0;
        const total = oc.total || 0;
        const saldo = total - pagado;
        const diasCredito = oc.dias_credito || 30;
        const fechaCreacion = new Date(oc.created_at);
        const fechaVenc = new Date(fechaCreacion);
        fechaVenc.setDate(fechaVenc.getDate() + diasCredito);
        const vencida = hoy > fechaVenc && saldo > 0;

        return { ...oc, monto_pagado: pagado, saldo, dias_credito: diasCredito, fecha_vencimiento: fechaVenc.toISOString(), vencida };
      }).filter((oc: any) => oc.saldo > 0);

      setCuentas(processed);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const totalPorPagar = cuentas.reduce((s, c) => s + c.saldo, 0);
  const vencidas = cuentas.filter(c => c.vencida);
  const porVencer = cuentas.filter(c => !c.vencida);
  const totalVencido = vencidas.reduce((s, c) => s + c.saldo, 0);

  const filtered = cuentas.filter(c => {
    const matchSearch = !search || c.folio?.toLowerCase().includes(search.toLowerCase()) || c.supplier_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "TODOS" || (filter === "VENCIDAS" && c.vencida) || (filter === "VIGENTES" && !c.vencida);
    return matchSearch && matchFilter;
  });

  const diasRestantes = (fecha: string) => {
    const diff = Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000*60*60*24));
    return diff;
  };


  function abrirPagoModal(id: string, total: number, pagado: number) {
    setPagoModal({ id, saldo: total - pagado });
    setPagoMonto(String(total - pagado));
  }

  async function confirmarPago() {
    if (!pagoModal) return;
    const monto = Number(pagoMonto);
    if (isNaN(monto) || monto <= 0) return;
    setPagoSaving(true);
    const cuenta = cuentas.find(c => c.id === pagoModal.id);
    if (!cuenta) { setPagoSaving(false); return; }
    const nuevoPagado = cuenta.monto_pagado + monto;
    await supabase.from("purchase_orders").update({ monto_pagado: nuevoPagado }).eq("id", pagoModal.id);
    setPagoSaving(false);
    setPagoModal(null);
    loadData();
  }

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div>
        <h1 className="text-2xl font-bold text-white">Cuentas por Pagar</h1>
        <p className="text-slate-400 text-sm">Saldos pendientes con proveedores y antigÃ¼edad</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total por Pagar", value: `$${totalPorPagar.toLocaleString()}`, icon: DollarSign, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Vencido", value: `$${totalVencido.toLocaleString()}`, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Cuentas Vencidas", value: vencidas.length, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Vigentes", value: porVencer.length, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio o proveedor..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {["TODOS", "VENCIDAS", "VIGENTES"].map(f => (
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
                <th className="text-left p-3">OC</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Pagado</th>
                <th className="text-right p-3">Saldo</th>
                <th className="text-center p-3">Vencimiento</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">AcciÃ³n</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Sin cuentas pendientes ð</td></tr>
              ) : filtered.map(c => {
                const dias = diasRestantes(c.fecha_vencimiento);
                return (
                  <tr key={c.id} className={`border-t border-white/5 hover:bg-white/[0.02] ${c.vencida ? "bg-red-500/[0.03]" : ""}`}>
                    <td className="p-3 text-white font-mono text-xs">{c.folio}</td>
                    <td className="p-3 text-white">{c.supplier_name}</td>
                    <td className="p-3 text-slate-300">{c.obra_nombre || "-"}</td>
                    <td className="p-3 text-right text-slate-300">${(c.total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-emerald-400">${(c.monto_pagado || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-white font-medium">${c.saldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-center text-xs text-slate-400">
                      {new Date(c.fecha_vencimiento).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="p-3 text-center">
                      {c.vencida ? (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">Vencida {Math.abs(dias)}d</span>
                      ) : dias <= 7 ? (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">Vence en {dias}d</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">Vigente {dias}d</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {c.saldo > 0 && (
                        <button
                          onClick={() => abrirPagoModal(c.id, c.total, c.monto_pagado)}
                          disabled={pagando === c.id}
                          className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          {pagando === c.id ? "..." : "Pagar"}
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

      {pagoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Registrar Pago</h3>
              <button onClick={() => setPagoModal(null)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monto del pago</label>
              <input type="number" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} step="0.01" min="0"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-blue-500/50 focus:outline-none" />
              <p className="text-xs text-slate-500 mt-1">{`Saldo pendiente: $${pagoModal.saldo.toLocaleString()}`}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setPagoModal(null)} className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm font-medium hover:bg-white/10">Cancelar</button>
              <button onClick={confirmarPago} disabled={pagoSaving || !pagoMonto || Number(pagoMonto) <= 0}
                className="flex-1 py-2.5 bg-blue-600 rounded-xl text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50">
                {pagoSaving ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
