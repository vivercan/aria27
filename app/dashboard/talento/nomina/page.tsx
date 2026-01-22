"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DollarSign, Edit3, Calculator, History, Download, Users, CreditCard, Banknote, ArrowLeft, Loader2, ChevronRight, Calendar, Clock } from "lucide-react";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  project_site: string;
  salario_diario: number;
  minimo_tarjeta: number;
}

interface DetalleNomina {
  empleado: Empleado;
  dias_trabajados: number;
  salario_base: number;
  horas_extra: number;
  pago_horas_extra: number;
  total_percepciones: number;
  deducciones: number;
  sueldo_neto: number;
  pago_tarjeta: number;
  pago_efectivo: number;
}

function getWeekRange(date: Date): { inicio: Date; fin: Date; semana: number } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToThursday = day >= 4 ? day - 4 : day + 3;
  const jueves = new Date(d);
  jueves.setDate(d.getDate() - diffToThursday);
  const miercoles = new Date(jueves);
  miercoles.setDate(jueves.getDate() + 6);
  const tempDate = new Date(jueves);
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const semana = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { inicio: jueves, fin: miercoles, semana };
}

export default function NominaPage() {
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [detalles, setDetalles] = useState<DetalleNomina[]>([]);
  const [semanaInfo, setSemanaInfo] = useState({ inicio: "", fin: "", semana: 0, anio: 2026 });
  const [totales, setTotales] = useState({ bruto: 0, deducciones: 0, neto: 0, tarjeta: 0, efectivo: 0, empleados: 0 });
  const [nominaExiste, setNominaExiste] = useState(false);
  const [mensaje, setMensaje] = useState<{tipo: "success" | "error" | "info"; texto: string} | null>(null);

  useEffect(() => {
    const hoy = new Date();
    const { inicio, fin, semana } = getWeekRange(hoy);
    setSemanaInfo({
      inicio: inicio.toISOString().split("T")[0],
      fin: fin.toISOString().split("T")[0],
      semana,
      anio: inicio.getFullYear()
    });
  }, []);

  useEffect(() => {
    if (semanaInfo.inicio) verificarYCargar();
  }, [semanaInfo]);

  const verificarYCargar = async () => {
    setLoading(true);
    // Verificar si ya existe nómina para esta semana
    const { data: existente } = await supabase
      .from("nomina_historico")
      .select("*")
      .eq("semana", semanaInfo.semana)
      .eq("anio", semanaInfo.anio);

    if (existente && existente.length > 0) {
      setNominaExiste(true);
      // Cargar desde histórico
      const totalBruto = existente.reduce((s, n) => s + (n.total_percepciones || 0), 0);
      const totalDeducciones = existente.reduce((s, n) => s + (n.total_deducciones || 0), 0);
      const totalNeto = existente.reduce((s, n) => s + (n.sueldo_neto || 0), 0);
      const totalTarjeta = existente.reduce((s, n) => s + (n.pago_tarjeta || 0), 0);
      const totalEfectivo = existente.reduce((s, n) => s + (n.pago_efectivo || 0), 0);
      setTotales({ bruto: totalBruto, deducciones: totalDeducciones, neto: totalNeto, tarjeta: totalTarjeta, efectivo: totalEfectivo, empleados: existente.length });
      
      // Mapear a detalles para mostrar
      const detallesCargados = existente.map(n => ({
        empleado: { id: n.employee_id, employee_number: "", full_name: n.nombre, position: n.puesto, project_site: n.obra, salario_diario: n.salario_diario, minimo_tarjeta: 0 },
        dias_trabajados: n.dias_trabajados,
        salario_base: n.salario_base,
        horas_extra: n.horas_extra,
        pago_horas_extra: n.pago_horas_extra,
        total_percepciones: n.total_percepciones,
        deducciones: n.total_deducciones,
        sueldo_neto: n.sueldo_neto,
        pago_tarjeta: n.pago_tarjeta,
        pago_efectivo: n.pago_efectivo
      }));
      setDetalles(detallesCargados);
    } else {
      setNominaExiste(false);
      setDetalles([]);
      setTotales({ bruto: 0, deducciones: 0, neto: 0, tarjeta: 0, efectivo: 0, empleados: 0 });
    }
    setLoading(false);
  };

  const generarPreNomina = async () => {
    if (nominaExiste) {
      setMensaje({ tipo: "info", texto: "Ya existe nómina para esta semana. Ve al histórico para consultarla." });
      return;
    }
    
    const confirmar = window.confirm(`¿Generar pre-nómina para Semana ${semanaInfo.semana}?\n\nPeríodo: ${formatDate(semanaInfo.inicio)} - ${formatDate(semanaInfo.fin)}`);
    if (!confirmar) return;

    setGenerando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/nomina/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaReferencia: semanaInfo.inicio })
      });
      const data = await res.json();
      if (data.error) {
        setMensaje({ tipo: "error", texto: data.error });
      } else {
        setMensaje({ tipo: "success", texto: `✅ Nómina generada: ${data.registros} empleados | Neto: $${data.totales.neto.toLocaleString("es-MX", {minimumFractionDigits: 2})}` });
        await verificarYCargar();
      }
    } catch (e: any) {
      setMensaje({ tipo: "error", texto: e.message });
    }
    setGenerando(false);
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const res = await fetch("/api/nomina/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semana: semanaInfo.semana, anio: semanaInfo.anio })
      });
      if (!res.ok) throw new Error("Error al exportar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Nomina_Sem${semanaInfo.semana}_${semanaInfo.anio}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setMensaje({ tipo: "error", texto: "Error al exportar: " + e.message });
    }
    setExportando(false);
  };

  const formatMoney = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /><span className="ml-3 text-white/60">Cargando nómina...</span></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/talento" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20">
            <DollarSign className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Nómina</h1>
            <p className="text-slate-400 text-sm">Semana {semanaInfo.semana} | {formatDate(semanaInfo.inicio)} - {formatDate(semanaInfo.fin)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/talento/nomina/manual" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 transition-all">
            <Edit3 className="w-4 h-4" />
            Nómina Manual
          </Link>
          <Link href="/dashboard/talento/nomina/historico" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all">
            <History className="w-4 h-4" />
            Histórico
          </Link>
          <Link href="/dashboard/talento/checadas/incompletas" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 transition-all">
            <Clock className="w-4 h-4" />
            Revisar Incompletas
          </Link>
          {nominaExiste ? (
            <>
            <button onClick={() => { if(confirm("¿Regenerar nómina? Esto recalculará basado en asistencias completas.")) { fetch("/api/nomina/generar", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ fechaReferencia: semanaInfo.inicio, forzar: true }) }).then(() => verificarYCargar()).then(() => setMensaje({tipo: "success", texto: "Nómina regenerada correctamente"})); }}} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 transition-all">
              <Calculator className="w-4 h-4" />
              Regenerar
            </button>
            <button onClick={exportarExcel} disabled={exportando} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 text-purple-300 hover:from-purple-500/30 hover:to-violet-500/30 transition-all disabled:opacity-50">
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportando ? "Exportando..." : "Descargar Excel"}
            </button>
            </>
          ) : (
            <button onClick={generarPreNomina} disabled={generando} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50">
              {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              {generando ? "Generando..." : "Generar Pre-nómina"}
            </button>
          )}
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-4 rounded-xl border ${mensaje.tipo === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : mensaje.tipo === "error" ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-blue-500/10 border-blue-500/30 text-blue-300"}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Si no hay nómina */}
      {!nominaExiste && !generando && (
        <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
          <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No hay nómina generada para esta semana</h3>
          <p className="text-slate-400 mb-4">Presiona "Generar Pre-nómina" para calcular los pagos basados en las asistencias registradas.</p>
        </div>
      )}

      {/* Si hay nómina */}
      {nominaExiste && (
        <>
          {/* Totales */}
          <div className="grid grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-blue-400" /><span className="text-slate-400 text-xs">Empleados</span></div>
              <p className="text-2xl font-bold text-white">{totales.empleados}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-emerald-400" /><span className="text-slate-400 text-xs">Total Bruto</span></div>
              <p className="text-2xl font-bold text-emerald-400">{formatMoney(totales.bruto)}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-red-400" /><span className="text-slate-400 text-xs">Deducciones</span></div>
              <p className="text-2xl font-bold text-red-400">{formatMoney(totales.deducciones)}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2"><CreditCard className="w-4 h-4 text-purple-400" /><span className="text-slate-400 text-xs">Transferencia</span></div>
              <p className="text-2xl font-bold text-purple-400">{formatMoney(totales.tarjeta)}</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2"><Banknote className="w-4 h-4 text-amber-400" /><span className="text-slate-400 text-xs">Efectivo</span></div>
              <p className="text-2xl font-bold text-amber-400">{formatMoney(totales.efectivo)}</p>
            </div>
          </div>

          {/* Gran total */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-green-500/10 border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm mb-1">TOTAL NETO A PAGAR</p>
                <p className="text-4xl font-bold text-white">{formatMoney(totales.neto)}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Pago: Jueves {new Date(semanaInfo.fin + "T12:00:00").getDate() + 1} {new Date(semanaInfo.fin + "T12:00:00").toLocaleDateString("es-MX", {month: "short"})}</p>
              </div>
            </div>
          </div>

          {/* Tabla de empleados */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-medium">Detalle por Empleado</h3>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Empleado</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Puesto</th>
                    <th className="text-center p-4 text-slate-400 font-medium text-sm">Días</th>
                    <th className="text-right p-4 text-slate-400 font-medium text-sm">Base</th>
                    <th className="text-right p-4 text-slate-400 font-medium text-sm">Neto</th>
                    <th className="text-right p-4 text-slate-400 font-medium text-sm">Tarjeta</th>
                    <th className="text-right p-4 text-slate-400 font-medium text-sm">Efectivo</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((d, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4"><span className="text-white font-medium">{d.empleado.full_name}</span></td>
                      <td className="p-4"><span className="px-2 py-1 rounded-lg bg-slate-700/50 text-slate-300 text-xs">{d.empleado.position}</span></td>
                      <td className="p-4 text-center"><span className="text-emerald-400 font-bold">{d.dias_trabajados}</span></td>
                      <td className="p-4 text-right text-white">{formatMoney(d.salario_base)}</td>
                      <td className="p-4 text-right text-emerald-400 font-bold">{formatMoney(d.sueldo_neto)}</td>
                      <td className="p-4 text-right text-purple-400">{formatMoney(d.pago_tarjeta)}</td>
                      <td className="p-4 text-right text-amber-400">{formatMoney(d.pago_efectivo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

