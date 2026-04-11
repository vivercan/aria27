"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Droplet, FlaskConical, Building2, TrendingUp, ArrowRight, Loader2, ChevronRight } from "lucide-react";

interface Remision {
  id: string;
  obra: string;
  proveedor: string;
  numero_remision: string;
  fecha_colado: string;
  resistencia_fc: string;
  revenimiento: number;
  m3: number;
  elemento: string;
  temperatura: number;
  costo_unitario: number;
  costo_total: number;
  observaciones: string;
  created_by: string;
  created_at: string;
}

interface Cilindro {
  id: string;
  remision_id: string;
  numero_cilindro: string;
  fecha_prueba: string;
  dias_edad: number;
  resistencia_alcanzada: number;
  cumple: boolean;
  laboratorio: string;
  created_at: string;
}

interface ObraResumen {
  obra: string;
  remisiones: number;
  m3_total: number;
  costo_total: number;
  resistencia_promedio: number;
  cilindros_total: number;
  cilindros_cumplimiento: number;
  pct_cumplimiento: number;
}

const fmt = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNum = (n: number) => (n || 0).toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function ConcretoPage() {
  const [loading, setLoading] = useState(true);
  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [cilindros, setCilindros] = useState<Cilindro[]>([]);
  const [obras, setObras] = useState<string[]>([]);
  const [filtroObra, setFiltroObra] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [{ data: rems }, { data: cils }, { data: centros }] = await Promise.all([
        supabase.from("concreto_remisiones").select("*").order("fecha_colado", { ascending: false }),
        supabase.from("concreto_cilindros").select("*"),
        supabase.from("centros_trabajo").select("nombre"),
      ]);

      setRemisiones((rems || []) as Remision[]);
      setCilindros((cils || []) as Cilindro[]);
      setObras(
        (centros || [])
          .map((c: any) => c.nombre)
          .sort()
      );
    } catch (e) {
      console.error("Error cargando datos:", e);
    }
    setLoading(false);
  }

  // KPIs globales
  const kpis = useMemo(() => {
    const totalM3 = remisiones.reduce((s, r) => s + (r.m3 || 0), 0);
    const totalRemisiones = remisiones.length;
    const totalCilindros = cilindros.length;
    const cilindrosCumplen = cilindros.filter(c => c.cumple).length;
    const pctCumplimiento = totalCilindros > 0 ? ((cilindrosCumplen / totalCilindros) * 100) : 0;

    return { totalM3, totalRemisiones, totalCilindros, cilindrosCumplen, pctCumplimiento };
  }, [remisiones, cilindros]);

  // Resumen por obra
  const resumenPorObra = useMemo(() => {
    const mapa = new Map<string, ObraResumen>();

    remisiones.forEach(rem => {
      if (!mapa.has(rem.obra)) {
        mapa.set(rem.obra, {
          obra: rem.obra,
          remisiones: 0,
          m3_total: 0,
          costo_total: 0,
          resistencia_promedio: 0,
          cilindros_total: 0,
          cilindros_cumplimiento: 0,
          pct_cumplimiento: 0,
        });
      }
      const resumen = mapa.get(rem.obra)!;
      resumen.remisiones++;
      resumen.m3_total += rem.m3 || 0;
      resumen.costo_total += rem.costo_total || 0;

      const resistenciaNum = parseFloat((rem.resistencia_fc || "").replace(/[^\d.]/g, "") || "0");
      resumen.resistencia_promedio = (resumen.resistencia_promedio + resistenciaNum) / resumen.remisiones;
    });

    cilindros.forEach(cil => {
      const remision = remisiones.find(r => r.id === cil.remision_id);
      if (remision) {
        const resumen = mapa.get(remision.obra);
        if (resumen) {
          resumen.cilindros_total++;
          if (cil.cumple) resumen.cilindros_cumplimiento++;
          resumen.pct_cumplimiento = resumen.cilindros_total > 0 ? ((resumen.cilindros_cumplimiento / resumen.cilindros_total) * 100) : 0;
        }
      }
    });

    let resultado = Array.from(mapa.values());
    if (filtroObra) {
      resultado = resultado.filter(r => r.obra === filtroObra);
    }
    return resultado.sort((a, b) => b.m3_total - a.m3_total);
  }, [remisiones, cilindros, filtroObra]);

  // Últimas remisiones (últimas 10)
  const ultimasRemisiones = useMemo(() => {
    let resultado = remisiones.slice(0, 10);
    if (filtroObra) {
      resultado = resultado.filter(r => r.obra === filtroObra);
    }
    return resultado;
  }, [remisiones, filtroObra]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-aria-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/obras" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-aria-primary/20 to-aria-accent/20 border border-aria-primary/20">
            <Droplet className="w-7 h-7 text-aria-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Control de Concreto</h1>
            <p className="text-slate-400 text-sm">Colados, pruebas de resistencia y gestión de cilindros de prueba</p>
          </div>
        </div>
        <Link href="/dashboard/obras/concreto/remisiones" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-aria-primary/10 border border-aria-primary/30 text-aria-accent hover:bg-aria-primary-light transition-all">
          <ArrowRight className="w-4 h-4" /> Gestionar Remisiones
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total m³ colados */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-aria-accent/10 to-aria-primary/10 border border-aria-accent/20 hover:border-aria-accent/40 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total m³ Colados</p>
              <p className="text-3xl font-bold text-white">{fmtNum(kpis.totalM3)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-aria-accent-bg">
              <Droplet className="w-5 h-5 text-aria-accent" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Volumen total de concreto colado</p>
        </div>

        {/* Total remisiones */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-aria-primary/10 to-indigo-500/10 border border-aria-primary/20 hover:border-aria-primary/40 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-slate-400 text-sm mb-1">Remisiones</p>
              <p className="text-3xl font-bold text-white">{kpis.totalRemisiones}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-aria-primary-light">
              <Building2 className="w-5 h-5 text-aria-accent" />
            </div>
          </div>
          <p className="text-xs text-slate-500">Colados registrados</p>
        </div>

        {/* Cilindros probados */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-slate-400 text-sm mb-1">Cilindros Probados</p>
              <p className="text-3xl font-bold text-white">{kpis.totalCilindros}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/20">
              <FlaskConical className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500">{kpis.cilindrosCumplen} cumplen especificación</p>
        </div>

        {/* % Cumplimiento */}
        <div className={`p-6 rounded-2xl bg-gradient-to-br ${kpis.pctCumplimiento >= 90 ? "from-emerald-500/10 to-green-500/10 border border-emerald-500/20" : "from-amber-500/10 to-orange-500/10 border border-amber-500/20"} hover:border-opacity-40 transition-all`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-slate-400 text-sm mb-1">% Cumplimiento</p>
              <p className={`text-3xl font-bold ${kpis.pctCumplimiento >= 90 ? "text-emerald-300" : "text-amber-300"}`}>{kpis.pctCumplimiento.toFixed(1)}%</p>
            </div>
            <div className={`p-2.5 rounded-xl ${kpis.pctCumplimiento >= 90 ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
              <TrendingUp className={`w-5 h-5 ${kpis.pctCumplimiento >= 90 ? "text-emerald-400" : "text-amber-400"}`} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Especificación f'c cumplida</p>
        </div>
      </div>

      {/* Filtro por obra */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Filtrar por obra:</label>
        <select
          value={filtroObra}
          onChange={e => setFiltroObra(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-aria-accent/50"
        >
          <option value="">Todas las obras</option>
          {obras.map(obra => (
            <option key={obra} value={obra}>
              {obra}
            </option>
          ))}
        </select>
        {filtroObra && (
          <button
            onClick={() => setFiltroObra("")}
            className="text-xs text-slate-400 hover:text-slate-300 underline"
          >
            Limpiar filtro
          </button>
        )}
      </div>

      {/* Resumen por Obra */}
      {resumenPorObra.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-aria-accent" />
            Resumen por Obra
          </h2>
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-slate-400 text-xs font-medium">Obra</th>
                    <th className="text-right p-4 text-slate-400 text-xs font-medium">Remisiones</th>
                    <th className="text-right p-4 text-slate-400 text-xs font-medium">m³ Total</th>
                    <th className="text-right p-4 text-slate-400 text-xs font-medium">Costo Total</th>
                    <th className="text-center p-4 text-slate-400 text-xs font-medium">f'c Promedio</th>
                    <th className="text-center p-4 text-slate-400 text-xs font-medium">Cilindros</th>
                    <th className="text-center p-4 text-slate-400 text-xs font-medium">% Cumple</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenPorObra.map(resumen => (
                    <tr
                      key={resumen.obra}
                      className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() => setFiltroObra(resumen.obra)}
                    >
                      <td className="p-4 text-white font-medium flex items-center gap-2">
                        {resumen.obra}
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </td>
                      <td className="p-4 text-right text-aria-accent">{resumen.remisiones}</td>
                      <td className="p-4 text-right text-aria-accent">{fmtNum(resumen.m3_total)}</td>
                      <td className="p-4 text-right text-emerald-300">{fmt(resumen.costo_total)}</td>
                      <td className="p-4 text-center text-slate-300">{resumen.resistencia_promedio.toFixed(0)} kg/cm²</td>
                      <td className="p-4 text-center text-purple-300">{resumen.cilindros_total}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-semibold ${resumen.pct_cumplimiento >= 90 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                          {resumen.pct_cumplimiento.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Actividad Reciente */}
      {ultimasRemisiones.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Droplet className="w-5 h-5 text-aria-accent" />
            Últimas Remisiones ({ultimasRemisiones.length})
          </h2>
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-slate-400 text-xs font-medium">Fecha</th>
                    <th className="text-left p-4 text-slate-400 text-xs font-medium">Obra</th>
                    <th className="text-left p-4 text-slate-400 text-xs font-medium">Proveedor</th>
                    <th className="text-right p-4 text-slate-400 text-xs font-medium">m³</th>
                    <th className="text-center p-4 text-slate-400 text-xs font-medium">f'c</th>
                    <th className="text-right p-4 text-slate-400 text-xs font-medium">Costo</th>
                    <th className="text-center p-4 text-slate-400 text-xs font-medium">Cilindros</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasRemisiones.map(rem => {
                    const cilindrosDeLaRemision = cilindros.filter(c => c.remision_id === rem.id).length;
                    return (
                      <tr key={rem.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-4 text-slate-300 text-xs">{new Date(rem.fecha_colado).toLocaleDateString("es-MX")}</td>
                        <td className="p-4 text-white font-medium">{rem.obra}</td>
                        <td className="p-4 text-slate-300 text-xs">{rem.proveedor}</td>
                        <td className="p-4 text-right text-aria-accent font-medium">{fmtNum(rem.m3)}</td>
                        <td className="p-4 text-center text-slate-300 text-xs">{rem.resistencia_fc}</td>
                        <td className="p-4 text-right text-emerald-300">{fmt(rem.costo_total)}</td>
                        <td className="p-4 text-center">
                          {cilindrosDeLaRemision > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
                              {cilindrosDeLaRemision}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {remisiones.length === 0 && (
        <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-aria-primary/10 border border-aria-primary/20">
              <Droplet className="w-8 h-8 text-aria-accent" />
            </div>
          </div>
          <p className="text-slate-400 mb-4">No hay remisiones de concreto registradas aún</p>
          <Link href="/dashboard/obras/concreto/remisiones" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-aria-primary/10 border border-aria-primary/30 text-aria-accent hover:bg-aria-primary-light transition-all">
            <ArrowRight className="w-4 h-4" /> Registrar Primera Remisión
          </Link>
        </div>
      )}

      {/* Info Footer */}
      <div className="p-4 rounded-xl bg-aria-primary/5 border border-aria-primary/20 flex items-start gap-3">
        <TrendingUp className="w-5 h-5 text-aria-accent mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-400 space-y-1">
          <p className="text-aria-accent font-medium">¿Cómo funciona?</p>
          <p>
            <b>m³ Total:</b> suma de volúmenes en todas las remisiones de concreto.
            <b className="ml-2">Cilindros:</b> pruebas de resistencia (28 días) vinculadas a cada remisión.
            <b className="ml-2">% Cumplimiento:</b> cilindros que alcanzan la f'c especificada.
          </p>
        </div>
      </div>
    </div>
  );
}
