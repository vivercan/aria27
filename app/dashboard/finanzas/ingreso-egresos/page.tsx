"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Loader2, TrendingUp, TrendingDown, ArrowLeftRight,
  DollarSign, Filter, Calendar
} from "lucide-react";

interface Gasto {
  id: string;
  fecha: string;
  obra: string;
  descripcion: string;
  proveedor: string;
  monto: number;
  estatus: string;
}

interface Factura {
  id: string;
  folio: string;
  cliente: string;
  concepto: string;
  total: number;
  status: string;
  obra_nombre: string;
  fecha_emision: string;
}

export default function IngresoEgresosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [vistaActiva, setVistaActiva] = useState<"resumen" | "ingresos" | "egresos">("resumen");

  useEffect(() => { cargar(); }, [periodo]);

  const cargar = async () => {
    setLoading(true);
    const [year, month] = periodo.split("-");
    const inicio = `${year}-${month}-01`;
    const finDate = new Date(parseInt(year), parseInt(month), 0);
    const fin = `${year}-${month}-${String(finDate.getDate()).padStart(2, "0")}`;

    const [gastosRes, facturasRes] = await Promise.all([
      supabase.from("gastos").select("*").gte("fecha", inicio).lte("fecha", fin).order("fecha", { ascending: false }),
      supabase.from("facturas").select("*").gte("fecha_emision", inicio).lte("fecha_emision", fin).order("fecha_emision", { ascending: false }),
    ]);

    if (gastosRes.data) setGastos(gastosRes.data);
    if (facturasRes.data) setFacturas(facturasRes.data);
    setLoading(false);
  };

  const totalIngresos = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
  const totalEgresos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
  const balance = totalIngresos - totalEgresos;

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const mesLabel = () => {
    const [y, m] = periodo.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finanzas" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Ingreso - Egresos</h1>
            <p className="text-xs text-slate-400 capitalize">{mesLabel()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input
            type="month"
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400/70">Ingresos</span>
          </div>
          <p className="text-emerald-400 text-xl font-bold">{fmt(totalIngresos)}</p>
          <p className="text-emerald-400/50 text-xs mt-1">{facturas.length} facturas</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400/70">Egresos</span>
          </div>
          <p className="text-red-400 text-xl font-bold">{fmt(totalEgresos)}</p>
          <p className="text-red-400/50 text-xs mt-1">{gastos.length} gastos</p>
        </div>
        <div className={`${balance >= 0 ? "bg-blue-500/10 border-blue-500/20" : "bg-orange-500/10 border-orange-500/20"} border rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className={`w-4 h-4 ${balance >= 0 ? "text-blue-400" : "text-orange-400"}`} />
            <span className={`text-xs ${balance >= 0 ? "text-blue-400/70" : "text-orange-400/70"}`}>Balance</span>
          </div>
          <p className={`text-xl font-bold ${balance >= 0 ? "text-blue-400" : "text-orange-400"}`}>
            {balance < 0 ? "-" : ""}{fmt(balance)}
          </p>
          <p className={`text-xs mt-1 ${balance >= 0 ? "text-blue-400/50" : "text-orange-400/50"}`}>
            {balance >= 0 ? "Superávit" : "Déficit"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-3 flex-shrink-0">
        {[
          { key: "resumen", label: "Resumen" },
          { key: "ingresos", label: `Ingresos (${facturas.length})` },
          { key: "egresos", label: `Egresos (${gastos.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setVistaActiva(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${vistaActiva === tab.key ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" />
          </div>
        ) : vistaActiva === "resumen" ? (
          <div className="p-4 space-y-4">
            {/* Top egresos by obra */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Egresos por Obra</h3>
              {gastos.length === 0 ? (
                <p className="text-slate-500 text-sm">Sin egresos en este periodo.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(
                    gastos.reduce<Record<string, number>>((acc, g) => {
                      const key = g.obra || "Sin obra";
                      acc[key] = (acc[key] || 0) + (g.monto || 0);
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([obra, total]) => (
                      <div key={obra} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-sm text-white">{obra}</span>
                        <span className="text-sm text-red-400 font-medium">{fmt(total)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
            {/* Top ingresos by cliente */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Ingresos por Cliente</h3>
              {facturas.length === 0 ? (
                <p className="text-slate-500 text-sm">Sin ingresos en este periodo.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(
                    facturas.reduce<Record<string, number>>((acc, f) => {
                      const key = f.cliente || "Sin cliente";
                      acc[key] = (acc[key] || 0) + (f.total || 0);
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([cliente, total]) => (
                      <div key={cliente} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-sm text-white">{cliente}</span>
                        <span className="text-sm text-emerald-400 font-medium">{fmt(total)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : vistaActiva === "ingresos" ? (
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-slate-400 font-medium text-xs">Folio</th>
                <th className="text-left p-3 text-slate-400 font-medium text-xs">Cliente</th>
                <th className="text-left p-3 text-slate-400 font-medium text-xs">Concepto</th>
                <th className="text-left p-3 text-slate-400 font-medium text-xs">Obra</th>
                <th className="text-right p-3 text-slate-400 font-medium text-xs">Total</th>
                <th className="text-center p-3 text-slate-400 font-medium text-xs">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-sm">Sin facturas en este periodo</td></tr>
              ) : facturas.map(f => (
                <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white text-sm font-mono">{f.folio || "—"}</td>
                  <td className="p-3 text-slate-300 text-sm">{f.cliente || "—"}</td>
                  <td className="p-3 text-slate-400 text-sm">{f.concepto || "—"}</td>
                  <td className="p-3 text-slate-400 text-sm">{f.obra_nombre || "—"}</td>
                  <td className="p-3 text-right text-emerald-400 text-sm font-medium">{fmt(f.total)}</td>
                  <td className="p-3 text-center text-slate-400 text-xs">
                    {f.fecha_emision ? new Date(f.fecha_emision + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-slate-400 font-medium text-xs">Fecha</th>
                <th className="text-left p-3 text-slate-400 font-medium text-xs">Obra</th>
                <th className="text-left p-3 text-slate-400 font-medium text-xs">Descripción</th>
                <th className="text-left p-3 text-slate-400 font-medium text-xs">Proveedor</th>
                <th className="text-right p-3 text-slate-400 font-medium text-xs">Monto</th>
                <th className="text-center p-3 text-slate-400 font-medium text-xs">Estatus</th>
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-sm">Sin gastos en este periodo</td></tr>
              ) : gastos.map(g => (
                <tr key={g.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-slate-400 text-xs">
                    {g.fecha ? new Date(g.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—"}
                  </td>
                  <td className="p-3 text-white text-sm">{g.obra || "—"}</td>
                  <td className="p-3 text-slate-300 text-sm">{g.descripcion || "—"}</td>
                  <td className="p-3 text-slate-400 text-sm">{g.proveedor || "—"}</td>
                  <td className="p-3 text-right text-red-400 text-sm font-medium">{fmt(g.monto)}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      g.estatus === "pagado" ? "bg-emerald-500/20 text-emerald-400" :
                      g.estatus === "pendiente" ? "bg-amber-500/20 text-amber-400" :
                      "bg-slate-500/20 text-slate-400"
                    }`}>
                      {g.estatus || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
