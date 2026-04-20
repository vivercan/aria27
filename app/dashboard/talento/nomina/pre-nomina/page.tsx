"use client";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Calculator, CheckCircle, Loader2, ChevronLeft, ChevronRight, Calendar, Search, Download, RefreshCw, Info } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney } from "@/lib/formatters";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  project_site: string;
  salario_semanal: number;
  salario_diario: number;
  minimo_tarjeta: number;
  status: string;
}

interface DetalleNomina {
  employee_id: string;
  empleado?: Empleado;
  dias_trabajados: number;
  dias_incompletos: number;
  dias_falta: number;
  horas_extra: number;
  salario_base: number;
  pago_horas_extra: number;
  total_percepciones: number;
  prestamo_descuento: number;
  total_deducciones: number;
  sueldo_neto: number;
  pago_tarjeta: number;
  pago_efectivo: number;
}

// Rango Viernes-Jueves
function getWeekRange(date: Date): { inicio: Date; fin: Date; semana: number } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToFriday = day >= 5 ? day - 5 : day + 2;
  const viernes = new Date(d);
  viernes.setDate(d.getDate() - diffToFriday);
  viernes.setHours(0, 0, 0, 0);
  const jueves = new Date(viernes);
  jueves.setDate(viernes.getDate() + 6);
  const tempDate = new Date(viernes);
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const semana = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { inicio: viernes, fin: jueves, semana };
}

const fmtIso = (d: Date) => d.toISOString().split("T")[0];
// CV 18-Abr: fmtMoney importado de @/lib/formatters (canon). Local eliminado.
const fmtFecha = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

export default function PreNominaPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [detalles, setDetalles] = useState<DetalleNomina[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [generando, setGenerando] = useState(false);
  // EX-3 18-Abr-2026: flash canónico via useFlashMessage (wrapper mantiene success/error)
  const { msg: mensaje, flash: _flash } = useFlashMessage(3000);
  // EX-3 18-Abr-2026: wrapper retrocompatible setMensaje
  const setMensaje = (v: { tipo: "success" | "error" | "info"; texto: string } | null) => {
    if (v === null) return; // el hook auto-limpia tras timeout
    _flash(v.tipo === "success" ? "ok" : "err", v.texto);
  };
  const [refDate, setRefDate] = useState<Date>(new Date());
  const [filtro, setFiltro] = useState("");
  const [modoNomina, setModoNomina] = useState<string>("ONBOARDING");
  const [yaExiste, setYaExiste] = useState(false);
  const [confirmState, setConfirmState] = useState<{open: boolean; msg: string; onOk: () => void}>({open: false, msg: "", onOk: () => {}});
  const closeConfirm = () => setConfirmState(s => ({...s, open: false}));

  const semanaInfo = useMemo(() => {
    const r = getWeekRange(refDate);
    return { inicio: fmtIso(r.inicio), fin: fmtIso(r.fin), semana: r.semana, anio: r.inicio.getFullYear() };
  }, [refDate]);

  useEffect(() => { cargarEmpleados(); cargarConfig(); }, []);
  useEffect(() => { checarExistente(); setDetalles([]); }, [semanaInfo.semana, semanaInfo.anio]);

  const cargarEmpleados = async () => {
    const { data } = await supabase.from("Personal").select("*").eq("status", "ACTIVO").order("full_name");
    if (data) setEmpleados(data as Empleado[]);
    setLoading(false);
  };

  const cargarConfig = async () => {
    const { data } = await supabase.from("configuracion_nomina").select("clave,valor").eq("clave", "modo_nomina").maybeSingle();
    if (data?.valor) setModoNomina(data.valor);
  };

  const checarExistente = async () => {
    const { data } = await supabase.from("nomina_historico").select("id").eq("semana", semanaInfo.semana).eq("anio", semanaInfo.anio).limit(1);
    setYaExiste(!!(data && data.length));
  };

  const calcularPreNomina = async () => {
    setCalculando(true);
    setMensaje(null);
    const nuevosDetalles: DetalleNomina[] = [];

    const { data: config } = await supabase.from("configuracion_nomina").select("*");
    const getConfig = (clave: string, def: number) => {
      const c = config?.find((x) => x.clave === clave);
      return c ? parseFloat(c.valor) : def;
    };
    const factorDoble = getConfig("factor_hora_extra_doble", 2);
    const minimoTarjetaDef = getConfig("minimo_tarjeta_default", 1096);
    const diasLaborables = 6;

    // Una sola query global de asistencias y préstamos para evitar N+1
    const empIds = empleados.map(e => e.id);
    const { data: todasAsist } = await supabase
      .from("asistencias")
      .select("employee_id,fecha,hora_entrada,hora_salida,horas_extra,falta")
      .in("employee_id", empIds.length ? empIds : ["00000000-0000-0000-0000-000000000000"])
      .gte("fecha", semanaInfo.inicio)
      .lte("fecha", semanaInfo.fin);

    const { data: todosPrest } = await supabase
      .from("prestamos")
      .select("employee_id,descuento_semanal")
      .eq("status", "ACTIVO")
      .in("employee_id", empIds.length ? empIds : ["00000000-0000-0000-0000-000000000000"]);

    for (const emp of empleados) {
      const asistEmp = (todasAsist || []).filter((a) => a.employee_id === emp.id);
      const completas = asistEmp.filter((a) => a.hora_entrada && a.hora_salida);
      const incompletas = asistEmp.filter((a) => !a.hora_entrada || !a.hora_salida);
      const prestEmp = (todosPrest || []).filter((p) => p.employee_id === emp.id);

      const diasTrabajados = completas.length;
      const diasIncompletos = incompletas.length;
      const horasExtra = completas.reduce((s: number, a) => s + (a.horas_extra || 0), 0);
      const salarioDiario = emp.salario_diario || 0;
      const salarioSemanal = emp.salario_semanal || (salarioDiario * 7);

      let salarioBase: number;
      let diasFalta = 0;
      if (modoNomina === "ONBOARDING") {
        salarioBase = salarioSemanal;
      } else {
        diasFalta = Math.max(0, diasLaborables - diasTrabajados);
        salarioBase = salarioSemanal - (salarioDiario * diasFalta);
      }

      const pagoHorasExtra = horasExtra * (salarioDiario / 8) * factorDoble;
      const totalPercepciones = salarioBase + pagoHorasExtra;
      const prestamoDescuento = prestEmp.reduce((s: number, p) => s + (p.descuento_semanal || 0), 0);
      const totalDeduccionesEmp = prestamoDescuento;
      const sueldoNeto = totalPercepciones - totalDeduccionesEmp;
      const minTarjeta = emp.minimo_tarjeta || minimoTarjetaDef;
      const pagoTarjeta = Math.min(sueldoNeto, minTarjeta);
      const pagoEfectivo = Math.max(0, sueldoNeto - pagoTarjeta);

      nuevosDetalles.push({
        employee_id: emp.id, empleado: emp,
        dias_trabajados: diasTrabajados, dias_incompletos: diasIncompletos, dias_falta: diasFalta,
        horas_extra: horasExtra, salario_base: salarioBase, pago_horas_extra: pagoHorasExtra,
        total_percepciones: totalPercepciones, prestamo_descuento: prestamoDescuento,
        total_deducciones: totalDeduccionesEmp, sueldo_neto: sueldoNeto,
        pago_tarjeta: pagoTarjeta, pago_efectivo: pagoEfectivo,
      });
    }

    setDetalles(nuevosDetalles);
    setCalculando(false);
    setMensaje({ tipo: "info", texto: `Pre-nómina calculada: ${nuevosDetalles.length} empleados (modo ${modoNomina}).` });
  };

  const generarNomina = async (forzar = false) => {
    if (yaExiste && !forzar) {
      setConfirmState({
        open: true,
        msg: `Ya existe nómina para la semana ${semanaInfo.semana}/${semanaInfo.anio}. ¿Regenerar (sobrescribir)?`,
        onOk: () => {
          closeConfirm();
          generarNomina(true);
        }
      });
      return;
    }
    setGenerando(true);
    setMensaje(null);
    try {
      const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const res = await fetch("/api/nomina/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": userEmail },
        body: JSON.stringify({ fechaReferencia: semanaInfo.inicio, forzar }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setMensaje({ tipo: "error", texto: data.error || `HTTP ${res.status}` });
      } else {
        setMensaje({ tipo: "success", texto: `Nómina generada: ${data.registros} empleados | Neto ${fmtMoney(data.totales.neto)}` });
        setYaExiste(true);
      }
    } catch (e: unknown) {
      setMensaje({ tipo: "error", texto: (e as {message?: string})?.message ?? "Error" });
    }
    setGenerando(false);
  };

  const exportarCSV = () => {
    if (detalles.length === 0) return;
    const headers = ["#", "Numero", "Empleado", "Puesto", "Obra", "Dias", "Incompletos", "Faltas", "HrsExtra", "SalarioBase", "PagoHrsExtra", "Percepciones", "Prestamo", "Deducciones", "Neto", "Tarjeta", "Efectivo"];
    const rows = filtrados.map((d, i) => [
      i + 1, d.empleado?.employee_number || "", d.empleado?.full_name || "", d.empleado?.position || "", d.empleado?.project_site || "",
      d.dias_trabajados, d.dias_incompletos, d.dias_falta, d.horas_extra,
      d.salario_base.toFixed(2), d.pago_horas_extra.toFixed(2), d.total_percepciones.toFixed(2),
      d.prestamo_descuento.toFixed(2), d.total_deducciones.toFixed(2), d.sueldo_neto.toFixed(2),
      d.pago_tarjeta.toFixed(2), d.pago_efectivo.toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pre-nomina-sem${semanaInfo.semana}-${semanaInfo.anio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const semanaPrev = () => { const d = new Date(refDate); d.setDate(d.getDate() - 7); setRefDate(d); };
  const semanaSig = () => { const d = new Date(refDate); d.setDate(d.getDate() + 7); setRefDate(d); };
  const semanaHoy = () => setRefDate(new Date());

  const filtrados = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    if (!q) return detalles;
    return detalles.filter(d =>
      d.empleado?.full_name?.toLowerCase().includes(q) ||
      d.empleado?.position?.toLowerCase().includes(q) ||
      d.empleado?.project_site?.toLowerCase().includes(q) ||
      d.empleado?.employee_number?.toLowerCase().includes(q)
    );
  }, [detalles, filtro]);

  const totales = useMemo(() => {
    return filtrados.reduce((acc, d) => ({
      bruto: acc.bruto + d.total_percepciones,
      deducciones: acc.deducciones + d.total_deducciones,
      neto: acc.neto + d.sueldo_neto,
      tarjeta: acc.tarjeta + d.pago_tarjeta,
      efectivo: acc.efectivo + d.pago_efectivo,
    }), { bruto: 0, deducciones: 0, neto: 0, tarjeta: 0, efectivo: 0 });
  }, [filtrados]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <AriaBackButton href="/dashboard/talento/nomina" />
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <Calculator className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Pre-Nómina</h1>
            <p className="text-[#7f93b0] text-sm">
              Semana {semanaInfo.semana}/{semanaInfo.anio} · {fmtFecha(semanaInfo.inicio)} – {fmtFecha(semanaInfo.fin)} (Vie–Jue) · Modo <strong className={modoNomina === "ONBOARDING" ? "text-amber-400" : "text-emerald-400"}>{modoNomina}</strong>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={semanaPrev} title="Semana anterior" className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08]"><ChevronLeft className="w-4 h-4 text-[#c9d8ed]" /></button>
          <button onClick={semanaHoy} className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-[#c9d8ed] text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />Hoy</button>
          <button onClick={semanaSig} title="Semana siguiente" className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08]"><ChevronRight className="w-4 h-4 text-[#c9d8ed]" /></button>
          <button onClick={calcularPreNomina} disabled={calculando} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-aria-accent/20 to-aria-primary/20 border border-aria-accent/30 text-aria-accent hover:from-aria-accent/30 hover:to-aria-primary/30 disabled:opacity-50">
            {calculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {calculando ? "Calculando..." : "Calcular"}
          </button>
          <button onClick={exportarCSV} disabled={detalles.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-[#c9d8ed] disabled:opacity-40">
            <Download className="w-4 h-4" />CSV
          </button>
          <button onClick={() => generarNomina(false)} disabled={generando || detalles.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-500 text-white font-medium hover:from-emerald-600 hover:to-emerald-600 disabled:opacity-50">
            {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : (yaExiste ? <RefreshCw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />)}
            {generando ? "Generando..." : (yaExiste ? "Regenerar" : "Generar Nómina")}
          </button>
        </div>
      </div>

      {/* EX-3 18-Abr-2026: FlashBanner canónico */}
      <FlashBanner msg={mensaje} />

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#4a6080] absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar empleado, puesto, obra, número..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[#4a6080]" />
        </div>
        <span className="text-xs text-[#7f93b0]">{filtrados.length} de {detalles.length}</span>
      </div>

      {/* Totales */}
      {detalles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-aria-primary/10 to-aria-accent/5 border border-aria-primary/20">
            <p className="text-[#7f93b0] text-xs mb-1">Total Bruto</p>
            <p className="text-xl font-bold text-white">{fmtMoney(totales.bruto)}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
            <p className="text-[#7f93b0] text-xs mb-1">Deducciones</p>
            <p className="text-xl font-bold text-red-400">{fmtMoney(totales.deducciones)}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
            <p className="text-[#7f93b0] text-xs mb-1">Neto a Pagar</p>
            <p className="text-xl font-bold text-emerald-400">{fmtMoney(totales.neto)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-aria-primary/10 to-aria-primary/5 border border-aria-primary/30">
            <p className="text-[#7f93b0] text-xs mb-1">Transferencia</p>
            <p className="text-xl font-bold text-aria-accent">{fmtMoney(totales.tarjeta)}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
            <p className="text-[#7f93b0] text-xs mb-1">Efectivo</p>
            <p className="text-xl font-bold text-amber-400">{fmtMoney(totales.efectivo)}</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)]  z-10">
              <tr className="border-b border-white/[0.08]">
                <th className="text-left p-3 text-[#7f93b0] font-medium">Empleado</th>
                <th className="text-left p-3 text-[#7f93b0] font-medium">Puesto</th>
                <th className="text-left p-3 text-[#7f93b0] font-medium">Obra</th>
                <th className="text-center p-3 text-[#7f93b0] font-medium">Días ✓</th>
                <th className="text-center p-3 text-[#7f93b0] font-medium">Inc</th>
                <th className="text-center p-3 text-[#7f93b0] font-medium">Falt</th>
                <th className="text-right p-3 text-[#7f93b0] font-medium">Hrs Ex</th>
                <th className="text-right p-3 text-[#7f93b0] font-medium">Salario</th>
                <th className="text-right p-3 text-[#7f93b0] font-medium">$ Hrs Ex</th>
                <th className="text-right p-3 text-[#7f93b0] font-medium">Préstamo</th>
                <th className="text-right p-3 text-[#7f93b0] font-medium">Neto</th>
                <th className="text-right p-3 text-[#7f93b0] font-medium">Tarjeta</th>
                <th className="text-right p-3 text-[#7f93b0] font-medium">Efectivo</th>
              </tr>
            </thead>
            <tbody>
              {detalles.length === 0 ? (
                <tr><td colSpan={13} className="p-8 text-center text-[#4a6080]">Presiona "Calcular" para ver la pre-nómina</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={13} className="p-8 text-center text-[#4a6080]">Sin coincidencias para "{filtro}"</td></tr>
              ) : (
                filtrados.map((d, i) => (
                  <tr key={i} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="p-3"><div className="text-white font-medium">{d.empleado?.full_name}</div><div className="text-[#4a6080] text-xs">#{d.empleado?.employee_number}</div></td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-white/[0.05] text-[#c9d8ed] text-xs">{d.empleado?.position}</span></td>
                    <td className="p-3 text-[#7f93b0] text-xs">{d.empleado?.project_site || "—"}</td>
                    <td className="p-3 text-center"><span className={`font-bold ${d.dias_trabajados >= 6 ? "text-emerald-400" : d.dias_trabajados >= 4 ? "text-amber-400" : "text-red-400"}`}>{d.dias_trabajados}</span></td>
                    <td className="p-3 text-center text-amber-300">{d.dias_incompletos || ""}</td>
                    <td className="p-3 text-center text-red-300">{d.dias_falta || ""}</td>
                    <td className="p-3 text-right text-aria-accent">{d.horas_extra ? d.horas_extra.toFixed(1) : ""}</td>
                    <td className="p-3 text-right text-white">{fmtMoney(d.salario_base)}</td>
                    <td className="p-3 text-right text-aria-accent">{fmtMoney(d.pago_horas_extra)}</td>
                    <td className="p-3 text-right text-red-400">{d.prestamo_descuento ? fmtMoney(d.prestamo_descuento) : "—"}</td>
                    <td className="p-3 text-right text-emerald-400 font-bold">{fmtMoney(d.sueldo_neto)}</td>
                    <td className="p-3 text-right text-aria-accent">{fmtMoney(d.pago_tarjeta)}</td>
                    <td className="p-3 text-right text-amber-400">{fmtMoney(d.pago_efectivo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-[#4a6080] leading-relaxed">
        <strong>Nota:</strong> en modo <code className="text-amber-400">ONBOARDING</code> se paga el salario semanal completo aunque haya faltas.
        En modo <code className="text-emerald-400">ESTRICTO</code> se descuento cada falta. Las incidencias (días incompletos / faltas) se muestran solo como alerta.
        El cálculo de Pre-Nómina coincide exactamente con lo que guardará "Generar Nómina".
      </div>

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => { confirmState.onOk(); closeConfirm(); }}
        onCancel={closeConfirm}
      />
    </div>
  );
}
