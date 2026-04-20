"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { History, Search, Filter, Download, Users, DollarSign, Calendar, ChevronDown, X, Loader2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney } from "@/lib/formatters";

interface NominaRegistro {
  id: string;
  employee_id: string;
  semana: number;
  anio: number;
  nombre: string;
  puesto: string;
  obra: string;
  dias_trabajados: number;
  salario_base: number;
  total_percepciones: number;
  total_deducciones: number;
  sueldo_neto: number;
  pago_tarjeta: number;
  pago_efectivo: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export default function HistoricoNominaPage() {
  const [registros, setRegistros] = useState<NominaRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSemana, setFiltroSemana] = useState<string>("");
  const [filtroEmpleado, setFiltroEmpleado] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [semanas, setSemanas] = useState<{semana: number; anio: number; total: number}[]>([]);
  const [empleados, setEmpleados] = useState<string[]>([]);
  const [vistaAcumulado, setVistaAcumulado] = useState(false);
  const [filtroAnio, setFiltroAnio] = useState<string>("");
  const [anios, setAnios] = useState<number[]>([]);

  useEffect(() => { cargarDatos(); }, []);

  const exportarCSV = () => {
    const filas = vistaAcumulado ? acumuladoPorEmpleado.map(e => ({
      Empleado: e.nombre, Puesto: e.puesto, Semanas: e.semanas,
      Bruto: e.totalBruto, Deducciones: e.totalDeducciones, Neto: e.totalNeto,
      Tarjeta: e.totalTarjeta, Efectivo: e.totalEfectivo
    })) : registrosFiltrados.map(r => ({
      Anio: r.anio, Semana: r.semana, FechaInicio: r.fecha_inicio, FechaFin: r.fecha_fin,
      Empleado: r.nombre, Puesto: r.puesto, Obra: r.obra, Dias: r.dias_trabajados,
      Bruto: r.total_percepciones, Deducciones: r.total_deducciones, Neto: r.sueldo_neto,
      Tarjeta: r.pago_tarjeta, Efectivo: r.pago_efectivo
    }));
    if (filas.length === 0) return;
    const headers = Object.keys(filas[0]);
    const csv = "\uFEFF" + headers.join(",") + "\n" + filas.map(f => headers.map(h => {
      const v = (f as Record<string, unknown>)[h]; return typeof v === "string" && v.includes(",") ? `"${v}"` : v ?? "";
    }).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `historico_nomina_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const cargarDatos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("nomina_historico")
      .select("*")
      .order("anio", { ascending: false })
      .order("semana", { ascending: false })
      .order("nombre");
    
    if (data) {
      setRegistros(data);
      // Extraer semanas únicas con totales
      const semanasMap = new Map<string, {semana: number; anio: number; total: number}>();
      data.forEach(r => {
        const key = `${r.anio}-${r.semana}`;
        if (!semanasMap.has(key)) {
          semanasMap.set(key, { semana: r.semana, anio: r.anio, total: 0 });
        }
        semanasMap.get(key)!.total += r.sueldo_neto || 0;
      });
      setSemanas(Array.from(semanasMap.values()));
      // Extraer empleados únicos
      setEmpleados([...new Set(data.map(r => r.nombre))].sort());
      // Años únicos
      setAnios([...new Set(data.map(r => r.anio))].sort((a,b) => b-a));
    }
    setLoading(false);
  };

  const registrosFiltrados = registros.filter(r => {
    if (filtroAnio && String(r.anio) !== filtroAnio) return false;
    if (filtroSemana && `${r.anio}-${r.semana}` !== filtroSemana) return false;
    if (filtroEmpleado && r.nombre !== filtroEmpleado) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const hit = (r.nombre || "").toLowerCase().includes(q)
        || (r.puesto || "").toLowerCase().includes(q)
        || (r.obra || "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  // Calcular acumulado por empleado
  const acumuladoPorEmpleado = empleados.map(nombre => {
    const regs = registrosFiltrados.filter(r => r.nombre === nombre);
    return {
      nombre,
      puesto: regs[0]?.puesto || "",
      semanas: regs.length,
      totalBruto: regs.reduce((s, r) => s + (r.total_percepciones || 0), 0),
      totalDeducciones: regs.reduce((s, r) => s + (r.total_deducciones || 0), 0),
      totalNeto: regs.reduce((s, r) => s + (r.sueldo_neto || 0), 0),
      totalTarjeta: regs.reduce((s, r) => s + (r.pago_tarjeta || 0), 0),
      totalEfectivo: regs.reduce((s, r) => s + (r.pago_efectivo || 0), 0)
    };
  }).filter(e => e.semanas > 0);

  const totales = {
    bruto: registrosFiltrados.reduce((s, r) => s + (r.total_percepciones || 0), 0),
    deducciones: registrosFiltrados.reduce((s, r) => s + (r.total_deducciones || 0), 0),
    neto: registrosFiltrados.reduce((s, r) => s + (r.sueldo_neto || 0), 0),
    tarjeta: registrosFiltrados.reduce((s, r) => s + (r.pago_tarjeta || 0), 0),
    efectivo: registrosFiltrados.reduce((s, r) => s + (r.pago_efectivo || 0), 0),
    registros: registrosFiltrados.length
  };

  const formatMoney = (n: number) => `${fmtMoney((n || 0))}`;
  const formatDateShort = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "";
  const limpiarFiltros = () => { setFiltroSemana(""); setFiltroEmpleado(""); setBusqueda(""); setFiltroAnio(""); };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AriaBackButton href="/dashboard/talento/nomina" />
          <div className="p-3 rounded-2xl bg-gradient-to-br from-aria-primary/20 to-aria-primary/20 border border-aria-primary/30">
            <History className="w-7 h-7 text-aria-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Histórico de Nóminas</h1>
            <p className="text-[#7f93b0] text-sm">{registros.length} registros | {semanas.length} semanas | {empleados.length} empleados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarCSV} disabled={registrosFiltrados.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 transition-all">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => setVistaAcumulado(!vistaAcumulado)} className={`px-4 py-2 rounded-xl border transition-all ${vistaAcumulado ? "bg-aria-primary-light border-aria-primary/30 text-aria-accent" : "bg-white/[0.04] border-white/[0.08] text-[#c9d8ed]"}`}>
            {vistaAcumulado ? "Ver por Semana" : "Ver Acumulado"}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6080]" />
          <input type="text" placeholder="Buscar nombre/puesto/obra..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-[#4a6080] focus:outline-none focus:border-aria-accent/50" />
        </div>
        <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-aria-accent/50">
          <option value="">Todos los años</option>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroSemana} onChange={e => setFiltroSemana(e.target.value)} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-aria-accent/50">
          <option value="">Todas las semanas</option>
          {semanas.map(s => (
            <option key={`${s.anio}-${s.semana}`} value={`${s.anio}-${s.semana}`}>Sem {s.semana} / {s.anio} - {formatMoney(s.total)}</option>
          ))}
        </select>
        <select value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-aria-accent/50">
          <option value="">Todos los empleados</option>
          {empleados.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {(filtroSemana || filtroEmpleado || busqueda) && (
          <button onClick={limpiarFiltros} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-red-400 hover:bg-red-500/20">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Totales */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-gradient-to-br from-aria-primary/10 to-aria-accent/5 border border-aria-primary/20">
          <p className="text-[#7f93b0] text-xs mb-1">Registros</p>
          <p className="text-xl font-bold text-white">{totales.registros}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <p className="text-[#7f93b0] text-xs mb-1">Total Bruto</p>
          <p className="text-xl font-bold text-emerald-400">{formatMoney(totales.bruto)}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] border-red-500/20">
          <p className="text-[#7f93b0] text-xs mb-1">Deducciones</p>
          <p className="text-xl font-bold text-red-400">{formatMoney(totales.deducciones)}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-aria-primary/10 to-aria-primary/5 border border-aria-primary/30">
          <p className="text-[#7f93b0] text-xs mb-1">Neto Pagado</p>
          <p className="text-xl font-bold text-aria-accent">{formatMoney(totales.neto)}</p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-aria-primary/10 to-aria-primary/5 border border-aria-primary/30">
          <p className="text-[#7f93b0] text-xs mb-1">Tarjeta</p>
          <p className="text-xl font-bold text-aria-accent">{formatMoney(totales.tarjeta)}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
          <p className="text-[#7f93b0] text-xs mb-1">Efectivo</p>
          <p className="text-xl font-bold text-amber-400">{formatMoney(totales.efectivo)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] ">
              <tr className="border-b border-white/[0.08]">
                {!vistaAcumulado && <th className="text-left p-4 text-[#7f93b0] font-medium text-sm">Sem</th>}
                {!vistaAcumulado && <th className="text-left p-4 text-[#7f93b0] font-medium text-sm">Periodo</th>}
                <th className="text-left p-4 text-[#7f93b0] font-medium text-sm">Empleado</th>
                <th className="text-left p-4 text-[#7f93b0] font-medium text-sm">Puesto</th>
                {vistaAcumulado && <th className="text-center p-4 text-[#7f93b0] font-medium text-sm">Semanas</th>}
                {!vistaAcumulado && <th className="text-center p-4 text-[#7f93b0] font-medium text-sm">Días</th>}
                <th className="text-right p-4 text-[#7f93b0] font-medium text-sm">Bruto</th>
                <th className="text-right p-4 text-[#7f93b0] font-medium text-sm">Deducc.</th>
                <th className="text-right p-4 text-[#7f93b0] font-medium text-sm">Neto</th>
                <th className="text-right p-4 text-[#7f93b0] font-medium text-sm">Tarjeta</th>
                <th className="text-right p-4 text-[#7f93b0] font-medium text-sm">Efectivo</th>
              </tr>
            </thead>
            <tbody>
              {vistaAcumulado ? (
                acumuladoPorEmpleado.map((e, i) => (
                  <tr key={i} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="p-4 text-white font-medium">{e.nombre}</td>
                    <td className="p-4"><span className="px-2 py-1 rounded-lg bg-white/[0.05] text-[#c9d8ed] text-xs">{e.puesto}</span></td>
                    <td className="p-4 text-center text-aria-accent font-bold">{e.semanas}</td>
                    <td className="p-4 text-right text-white">{formatMoney(e.totalBruto)}</td>
                    <td className="p-4 text-right text-red-400">{formatMoney(e.totalDeducciones)}</td>
                    <td className="p-4 text-right text-emerald-400 font-bold">{formatMoney(e.totalNeto)}</td>
                    <td className="p-4 text-right text-aria-accent">{formatMoney(e.totalTarjeta)}</td>
                    <td className="p-4 text-right text-amber-400">{formatMoney(e.totalEfectivo)}</td>
                  </tr>
                ))
              ) : (
                registrosFiltrados.map((r, i) => (
                  <tr key={i} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="p-4"><span className="px-2 py-1 rounded-lg bg-aria-accent-bg text-aria-accent text-xs font-medium">{r.semana}/{r.anio}</span></td>
                    <td className="p-4 text-[#7f93b0] text-xs whitespace-nowrap">{formatDateShort(r.fecha_inicio)} – {formatDateShort(r.fecha_fin)}</td>
                    <td className="p-4 text-white font-medium">{r.nombre}</td>
                    <td className="p-4"><span className="px-2 py-1 rounded-lg bg-white/[0.05] text-[#c9d8ed] text-xs">{r.puesto}</span></td>
                    <td className="p-4 text-center text-emerald-400 font-bold">{r.dias_trabajados}</td>
                    <td className="p-4 text-right text-white">{formatMoney(r.total_percepciones)}</td>
                    <td className="p-4 text-right text-red-400">{formatMoney(r.total_deducciones)}</td>
                    <td className="p-4 text-right text-emerald-400 font-bold">{formatMoney(r.sueldo_neto)}</td>
                    <td className="p-4 text-right text-aria-accent">{formatMoney(r.pago_tarjeta)}</td>
                    <td className="p-4 text-right text-amber-400">{formatMoney(r.pago_efectivo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
