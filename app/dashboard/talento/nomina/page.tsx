"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { DollarSign, FileText, Edit3, Calculator, History, Download, Users, CreditCard, Banknote, ArrowLeft, Loader2, ChevronRight, Calendar, Clock, AlertTriangle, Settings, ToggleLeft, ToggleRight, X } from "lucide-react";

interface DetalleNomina {
  empleado: { id: string; employee_number: string; full_name: string; position: string; project_site: string; salario_diario: number; minimo_tarjeta: number };
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

interface Incidencia {
  empleado: string;
  diasCompletos: number;
  diasIncompletos: number;
  diasSinRegistro: number;
  detalle: { fecha: string; entrada: string; salida: string }[];
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
  
  // Nuevos estados
  const [modoNomina, setModoNomina] = useState<"ONBOARDING" | "ESTRICTO">("ONBOARDING");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showIncidenciasModal, setShowIncidenciasModal] = useState(false);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [cargandoIncidencias, setCargandoIncidencias] = useState(false);

  useEffect(() => {
    // Verificar si es admin
    const email = localStorage.getItem("userEmail");
    if (email === "recursos.humanos@gcuavante.com") {
      setIsAdmin(true);
    }
    
    // Cargar modo actual
    cargarModo();
    
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

  const cargarModo = async () => {
    const { data } = await supabase
      .from("configuracion_nomina")
      .select("valor")
      .eq("clave", "modo_nomina")
      .single();
    if (data) setModoNomina(data.valor as "ONBOARDING" | "ESTRICTO");
  };

  const cambiarModo = async () => {
    const nuevoModo = modoNomina === "ONBOARDING" ? "ESTRICTO" : "ONBOARDING";
    const confirmar = window.confirm(
      nuevoModo === "ESTRICTO" 
        ? "⚠️ MODO ESTRICTO\n\nEsto descontará faltas del salario semanal.\n\n¿Está seguro de activar este modo?"
        : "✅ MODO ONBOARDING\n\nEsto pagará el salario semanal completo sin importar asistencias.\n\n¿Cambiar a modo onboarding?"
    );
    if (!confirmar) return;

    await supabase
      .from("configuracion_nomina")
      .update({ valor: nuevoModo })
      .eq("clave", "modo_nomina");
    
    setModoNomina(nuevoModo);
    setMensaje({ tipo: "success", texto: `Modo cambiado a ${nuevoModo}` });
  };

  const verificarYCargar = async () => {
    setLoading(true);
    const { data: existente } = await supabase
      .from("nomina_historico")
      .select("*")
      .eq("semana", semanaInfo.semana)
      .eq("anio", semanaInfo.anio);

    if (existente && existente.length > 0) {
      setNominaExiste(true);
      const totalBruto = existente.reduce((s, n) => s + (n.total_percepciones || 0), 0);
      const totalDeducciones = existente.reduce((s, n) => s + (n.total_deducciones || 0), 0);
      const totalNeto = existente.reduce((s, n) => s + (n.sueldo_neto || 0), 0);
      const totalTarjeta = existente.reduce((s, n) => s + (n.pago_tarjeta || 0), 0);
      const totalEfectivo = existente.reduce((s, n) => s + (n.pago_efectivo || 0), 0);
      setTotales({ bruto: totalBruto, deducciones: totalDeducciones, neto: totalNeto, tarjeta: totalTarjeta, efectivo: totalEfectivo, empleados: existente.length });

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
      setDetalles(detallesCargados.filter(d => d.sueldo_neto > 0));
    } else {
      setNominaExiste(false);
      setDetalles([]);
      setTotales({ bruto: 0, deducciones: 0, neto: 0, tarjeta: 0, efectivo: 0, empleados: 0 });
    }
    setLoading(false);
  };

  const consultarIncidencias = async () => {
    setCargandoIncidencias(true);
    try {
      const res = await fetch(`/api/nomina/generar?fecha=${semanaInfo.inicio}`);
      const data = await res.json();
      const inc = data.incidencias || [];
      setIncidencias(inc);
      // Si no hay incidencias, generar directo sin mostrar modal
      if (inc.length === 0) {
        setCargandoIncidencias(false);
        await generarPreNomina(false);
        return;
      }
      setShowIncidenciasModal(true);
    } catch (e) {
      setMensaje({ tipo: "error", texto: "Error al consultar incidencias" });
    }
    setCargandoIncidencias(false);
  };

  const generarPreNomina = async (forzar = false) => {
    setShowIncidenciasModal(false);
    setGenerando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/nomina/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaReferencia: semanaInfo.inicio, forzar })
      });
      const data = await res.json();
      if (data.error) {
        setMensaje({ tipo: "error", texto: data.error });
      } else {
        let msg = `✅ Nómina generada: ${data.registros} empleados | Neto: $${data.totales.neto.toLocaleString("es-MX", {minimumFractionDigits: 2})}`;
        if (data.incidencias) {
          msg += ` | ⚠️ ${data.incidencias.total} con incidencias`;
        }
        setMensaje({ tipo: "success", texto: msg });
        await verificarYCargar();
      }
    } catch (e: any) {
      setMensaje({ tipo: "error", texto: e.message });
    }
    setGenerando(false);
  };

  const handleGenerarClick = async () => {
    if (nominaExiste) {
      setMensaje({ tipo: "info", texto: "Ya existe nómina para esta semana. Use Regenerar si necesita recalcular." });
      return;
    }
    // Primero consultar incidencias
    await consultarIncidencias();
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
        <div className="flex gap-3 flex-wrap justify-end">
          <Link href="/dashboard/talento/nomina/manual" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 transition-all">
            <Edit3 className="w-4 h-4" />
            Manual
          </Link>
          <Link href="/dashboard/talento/nomina/recibos" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 text-violet-300 hover:from-violet-500/30 hover:to-purple-500/30 transition-all">
            <FileText className="w-4 h-4" />
            Recibos
          </Link>
          <Link href="/dashboard/talento/nomina/historico" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all">
            <History className="w-4 h-4" />
            Histórico
          </Link>
          <Link href="/dashboard/talento/checadas/incompletas" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 transition-all">
            <Clock className="w-4 h-4" />
            Incompletas
          </Link>
        </div>
      </div>

      {/* Switch de modo (solo admin) */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-white font-medium">Modo de Nómina</p>
              <p className="text-slate-400 text-xs">
                {modoNomina === "ONBOARDING" 
                  ? "Paga salario semanal completo (sin descontar faltas)" 
                  : "Descuenta faltas del salario semanal"}
              </p>
            </div>
          </div>
          <button onClick={cambiarModo} className="flex items-center gap-2">
            {modoNomina === "ONBOARDING" ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <ToggleLeft className="w-6 h-6 text-emerald-400" />
                <span className="text-emerald-300 font-medium">ONBOARDING</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30">
                <ToggleRight className="w-6 h-6 text-red-400" />
                <span className="text-red-300 font-medium">ESTRICTO</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end">
        {nominaExiste ? (
          <>
            <button onClick={() => generarPreNomina(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 transition-all">
              <Calculator className="w-4 h-4" />
              Regenerar
            </button>
            <button onClick={exportarExcel} disabled={exportando} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-violet-500/20 border border-purple-500/30 text-purple-300 hover:from-purple-500/30 hover:to-violet-500/30 transition-all disabled:opacity-50">
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportando ? "Exportando..." : "Descargar Excel"}
            </button>
          </>
        ) : (
          <button onClick={handleGenerarClick} disabled={generando || cargandoIncidencias} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50">
            {(generando || cargandoIncidencias) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {cargandoIncidencias ? "Consultando..." : generando ? "Generando..." : "Generar Pre-nómina"}
          </button>
        )}
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
          <p className="text-slate-400 mb-4">Presiona "Generar Pre-nómina" para calcular los pagos.</p>
          <p className="text-xs text-slate-500">Modo actual: <span className={modoNomina === "ONBOARDING" ? "text-emerald-400" : "text-red-400"}>{modoNomina}</span></p>
        </div>
      )}

      {/* Si hay nómina - Totales y tabla */}
      {nominaExiste && (
        <>
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

      {/* Modal de Incidencias */}
      {showIncidenciasModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-bold text-white">Incidencias Detectadas</h2>
              </div>
              <button onClick={() => setShowIncidenciasModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[50vh]">
              {incidencias.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-emerald-400 text-lg">✅ No hay incidencias</p>
                  <p className="text-slate-400 mt-2">Todos los empleados tienen sus asistencias completas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-amber-300 mb-4">⚠️ {incidencias.length} empleado(s) con incidencias esta semana:</p>
                  {incidencias.map((inc, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-amber-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{inc.empleado}</span>
                        <div className="flex gap-2">
                          <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs">{inc.diasCompletos} completos</span>
                          {inc.diasIncompletos > 0 && <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs">{inc.diasIncompletos} incompletos</span>}
                          {inc.diasSinRegistro > 0 && <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs">{inc.diasSinRegistro} sin registro</span>}
                        </div>
                      </div>
                      {inc.detalle.length > 0 && (
                        <div className="text-xs text-slate-400 mt-2">
                          {inc.detalle.map((d, j) => (
                            <p key={j}>{d.fecha}: Entrada {d.entrada} | Salida {d.salida}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-white/10 flex gap-3 justify-end">
              <button onClick={() => setShowIncidenciasModal(false)} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all">
                Cancelar
              </button>
              <Link href="/dashboard/talento/checadas/incompletas" className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 transition-all">
                Corregir Manualmente
              </Link>
              <button onClick={() => generarPreNomina(false)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 transition-all">
                Generar Así
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



