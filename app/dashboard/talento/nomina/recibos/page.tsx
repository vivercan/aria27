"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ConfirmModal from "@/components/ConfirmModal";
import {
  Printer, FileText, Download, CheckCircle,
  AlertTriangle, User, Building2, DollarSign,
  CreditCard, Banknote, Lock, Unlock, Loader2, ChevronLeft, ChevronRight, Calendar, Search
} from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney } from "@/lib/formatters";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface PersonalBankInfo {
  id: string;
  banco: string | null;
  clabe: string | null;
  numero_cuenta: string | null;
}

interface NominaRecord {
  id: string;
  employee_id: string;
  semana: number;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  nombre: string;
  puesto: string;
  obra: string;
  dias_trabajados: number;
  horas_extra: number;
  salario_diario: number;
  salario_semanal: number;
  salario_base: number;
  pago_horas_extra: number;
  bonos: number;
  total_percepciones: number;
  prestamo_descuento: number;
  otras_deducciones: number;
  total_deducciones: number;
  sueldo_neto: number;
  pago_tarjeta: number;
  pago_efectivo: number;
  status: string;
  modo_calculo?: string;
  banco?: string;
  clabe?: string;
  numero_cuenta?: string;
}

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
const fmtFecha = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
const fmtFechaCorta = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" });

export default function RecibosNominaPage() {
  const [nominas, setNominas] = useState<NominaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refDate, setRefDate] = useState<Date>(new Date());
  const [printMode, setPrintMode] = useState<"none" | "all" | "one">("none");
  const [printOne, setPrintOne] = useState<NominaRecord | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [motivoModificacion, setMotivoModificacion] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [nominaStatus, setNominaStatus] = useState<"GENERADA" | "CONFIRMADA">("GENERADA");
  const [filtro, setFiltro] = useState("");
  const [exportando, setExportando] = useState(false);
  // EX-3 18-Abr-2026: flash canónico via useFlashMessage (wrapper mantiene success/error)
  const { msg: mensaje, flash: _flash } = useFlashMessage(3000);
  // EX-3 18-Abr-2026: wrapper retrocompatible setMensaje
  const setMensaje = (v: { tipo: "success" | "error" | "info"; texto: string } | null) => {
    if (v === null) return; // el hook auto-limpia tras timeout
    _flash(v.tipo === "success" ? "ok" : "err", v.texto);
  };
  const [confirmState, setConfirmState] = useState<{open: boolean; msg: string; title: string; onOk: () => void; variant?: "warning"|"danger"}>({open: false, msg: "", title: "", onOk: () => {}, variant: "warning"});
  const closeConfirm = () => setConfirmState(s => ({...s, open: false}));

  const semanaInfo = useMemo(() => {
    const r = getWeekRange(refDate);
    return { inicio: fmtIso(r.inicio), fin: fmtIso(r.fin), semana: r.semana, anio: r.inicio.getFullYear() };
  }, [refDate]);

  useEffect(() => { cargarNominas(); }, [semanaInfo.semana, semanaInfo.anio]);

  const cargarNominas = async () => {
    setLoading(true);
    setMensaje(null);
    const { data: nominasData } = await supabase
      .from("nomina_historico")
      .select("*")
      .eq("semana", semanaInfo.semana)
      .eq("anio", semanaInfo.anio)
      .order("nombre");

    if (nominasData && nominasData.length > 0) {
      // Batch query bancarios — una sola query .in() en vez de N+1
      const empIds = nominasData.map((n: typeof nominasData[number]) => n.employee_id);
      const { data: empBank } = await supabase
        .from("Personal")
        .select("id, banco, clabe, numero_cuenta")
        .in("id", empIds);
      const bankMap = new Map((empBank || []).map((e: PersonalBankInfo) => [e.id, e]));
      const merged = nominasData.map((n: typeof nominasData[number]) => {
        const b: PersonalBankInfo = bankMap.get(n.employee_id) || { id: "", banco: null, clabe: null, numero_cuenta: null };
        return { ...n, banco: b.banco, clabe: b.clabe, numero_cuenta: b.numero_cuenta };
      });
      setNominas(merged as unknown as NominaRecord[]);
      setNominaStatus(nominasData[0].status === "CONFIRMADA" ? "CONFIRMADA" : "GENERADA");
    } else {
      setNominas([]);
      setNominaStatus("GENERADA");
    }
    setLoading(false);
  };

  const confirmarNomina = async () => {
    if (nominaStatus === "CONFIRMADA") {
      if (!motivoModificacion.trim()) {
        setMensaje({ tipo: "error", texto: "Debe ingresar el motivo de la modificación" });
        return;
      }
      // First confirmation for unlock
      setConfirmState({
        open: true,
        title: "⚠️ Advertencia",
        msg: "Esta nómina ya fue CONFIRMADA. ¿Está seguro que desea desbloquearla para modificación?",
        variant: "danger",
        onOk: () => {
          closeConfirm();
          // Second confirmation for unlock
          setConfirmState({
            open: true,
            title: "Segunda Confirmación",
            msg: `Motivo: ${motivoModificacion}\n\n¿CONFIRMA que desea desbloquear la nómina de Semana ${semanaInfo.semana}?`,
            variant: "danger",
            onOk: async () => {
              closeConfirm();
              const { data: unlockRows, error: unlockErr } = await supabase
                .from("nomina_historico")
                .update({ status: "GENERADA" })
                .eq("semana", semanaInfo.semana)
                .eq("anio", semanaInfo.anio)
                .eq("status", "CONFIRMADA")
                .select("id");
              if (unlockErr) { setMensaje({ tipo: "error", texto: "No se pudo desbloquear: " + unlockErr.message }); return; }
              if (!unlockRows || unlockRows.length === 0) { setMensaje({ tipo: "error", texto: "La nómina ya no estaba CONFIRMADA. Recarga." }); return; }

              await supabase.from("audit_log").insert({
                tabla: "nomina_historico",
                accion: "DESBLOQUEO_NOMINA",
                descripcion: `Semana ${semanaInfo.semana}/${semanaInfo.anio} desbloqueada. Motivo: ${motivoModificacion}`,
                usuario: localStorage.getItem("userEmail") || "unknown",
              });

              setNominaStatus("GENERADA");
              setShowConfirmModal(false);
              setMotivoModificacion("");
              setMensaje({ tipo: "success", texto: "Nómina desbloqueada. Ahora puede regenerarla." });
            }
          });
        }
      });
    } else {
      // First confirmation for lock
      setConfirmState({
        open: true,
        title: "Confirmar Nómina",
        msg: `¿Confirmar DEFINITIVAMENTE la nómina de Semana ${semanaInfo.semana}?\n\nUna vez confirmada, requerirá doble autorización para modificarla.`,
        variant: "warning",
        onOk: () => {
          closeConfirm();
          // Second confirmation for lock
          setConfirmState({
            open: true,
            title: "Segunda Confirmación",
            msg: "¿CONFIRMA que los datos son correctos y desea CERRAR esta nómina?",
            variant: "warning",
            onOk: async () => {
              closeConfirm();
              setConfirmando(true);
              const { data: lockRows, error: lockErr } = await supabase
                .from("nomina_historico")
                .update({ status: "CONFIRMADA" })
                .eq("semana", semanaInfo.semana)
                .eq("anio", semanaInfo.anio)
                .eq("status", "GENERADA")
                .select("id");
              setConfirmando(false);
              if (lockErr) { setMensaje({ tipo: "error", texto: "No se pudo confirmar: " + lockErr.message }); return; }
              if (!lockRows || lockRows.length === 0) { setMensaje({ tipo: "error", texto: "La nómina ya no estaba GENERADA. Recarga." }); return; }

              setNominaStatus("CONFIRMADA");
              setMensaje({ tipo: "success", texto: `Nómina CONFIRMADA exitosamente (${lockRows.length} recibos)` });
            }
          });
        }
      });
    }
  };

  const handlePrintAll = () => {
    setPrintMode("all");
    setPrintOne(null);
    setTimeout(() => { window.print(); setTimeout(() => setPrintMode("none"), 500); }, 150);
  };

  const handlePrintOne = (n: NominaRecord) => {
    setPrintMode("one");
    setPrintOne(n);
    setTimeout(() => { window.print(); setTimeout(() => { setPrintMode("none"); setPrintOne(null); }, 500); }, 150);
  };

  const exportarExcel = async () => {
    setExportando(true);
    setMensaje(null);
    try {
      const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const res = await fetch("/api/nomina/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": userEmail },
        body: JSON.stringify({ semana: semanaInfo.semana, anio: semanaInfo.anio }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Nomina_Sem${semanaInfo.semana}_${semanaInfo.anio}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setMensaje({ tipo: "success", texto: `Exportado: Nomina_Sem${semanaInfo.semana}_${semanaInfo.anio}.xlsx` });
    } catch (e: unknown) {
      setMensaje({ tipo: "error", texto: (e as {message?: string})?.message || "Error exportando" });
    }
    setExportando(false);
  };

  const semanaPrev = () => { const d = new Date(refDate); d.setDate(d.getDate() - 7); setRefDate(d); };
  const semanaSig = () => { const d = new Date(refDate); d.setDate(d.getDate() + 7); setRefDate(d); };
  const semanaHoy = () => setRefDate(new Date());

  const filtradas = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    if (!q) return nominas;
    return nominas.filter(n =>
      n.nombre?.toLowerCase().includes(q) ||
      n.puesto?.toLowerCase().includes(q) ||
      n.obra?.toLowerCase().includes(q)
    );
  }, [nominas, filtro]);

  const totales = useMemo(() => filtradas.reduce((acc, n) => ({
    bruto: acc.bruto + (n.total_percepciones || 0),
    neto: acc.neto + (n.sueldo_neto || 0),
    tarjeta: acc.tarjeta + (n.pago_tarjeta || 0),
    efectivo: acc.efectivo + (n.pago_efectivo || 0),
  }), { bruto: 0, neto: 0, tarjeta: 0, efectivo: 0 }), [filtradas]);

  const ReciboCard = ({ nomina, forPrint = false }: { nomina: NominaRecord; forPrint?: boolean }) => {
    const esOnboarding = nomina.modo_calculo === "ONBOARDING" || (nomina.dias_trabajados === 0 && (nomina.salario_base || 0) > 0);
    return (
      <div className={`${forPrint ? "print-recibo" : ""} bg-white text-gray-900 rounded-xl shadow-lg overflow-hidden ${forPrint ? "page-break-after" : ""}`} style={{ maxWidth: forPrint ? "100%" : "800px" }}>
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">GRUPO CUAVANTE</h1>
              <p className="text-[#c9d8ed] text-sm">Constructora · Aguascalientes</p>
            </div>
            <div className="text-right">
              <div className="bg-white/[0.06] px-4 py-2 rounded-lg">
                <p className="text-xs text-[#c9d8ed]">RECIBO DE NÓMINA</p>
                <p className="text-lg font-bold">Semana {nomina.semana}/{nomina.anio}</p>
                {nomina.status === "CONFIRMADA" && <p className="text-[10px] text-emerald-300 mt-1">CONFIRMADA</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-[#4a6080]" />
                <span className="text-sm text-gray-500 uppercase tracking-wide">Empleado</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{nomina.nombre}</p>
              <p className="text-gray-600">{nomina.puesto}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-[#4a6080]" />
                <span className="text-sm text-gray-500 uppercase tracking-wide">Obra/Centro</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{nomina.obra || "Sin asignar"}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Período</p>
              <p className="font-medium">{fmtFecha(nomina.fecha_inicio)} – {fmtFecha(nomina.fecha_fin)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Días Trabajados</p>
              <p className="font-bold text-2xl text-emerald-600">{nomina.dias_trabajados}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Horas Extra</p>
              <p className="font-bold text-2xl text-aria-primary">{nomina.horas_extra || 0}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Percepciones</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">
                    {esOnboarding
                      ? `Salario semanal (modo onboarding)`
                      : `Salario base (${nomina.dias_trabajados} días × ${fmtMoney(nomina.salario_diario)})`}
                  </span>
                  <span className="font-medium">{fmtMoney(nomina.salario_base)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Horas Extra ({nomina.horas_extra || 0}h)</span>
                  <span className="font-medium">{fmtMoney(nomina.pago_horas_extra || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Bonos</span>
                  <span className="font-medium">{fmtMoney(nomina.bonos || 0)}</span>
                </div>
                <div className="flex justify-between py-3 bg-emerald-50 px-3 rounded-lg mt-2">
                  <span className="font-bold text-emerald-800">TOTAL PERCEPCIONES</span>
                  <span className="font-bold text-emerald-600 text-lg">{fmtMoney(nomina.total_percepciones)}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Deducciones</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Préstamos</span>
                  <span className="font-medium text-red-600">-{fmtMoney(nomina.prestamo_descuento || 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Otras Deducciones</span>
                  <span className="font-medium text-red-600">-{fmtMoney(nomina.otras_deducciones || 0)}</span>
                </div>
                <div className="flex justify-between py-3 bg-red-50 px-3 rounded-lg mt-2">
                  <span className="font-bold text-red-800">TOTAL DEDUCCIONES</span>
                  <span className="font-bold text-red-600 text-lg">-{fmtMoney(nomina.total_deducciones)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-aria-primary to-aria-primary rounded-xl text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[#c9d8ed] text-sm uppercase tracking-wide">Sueldo Neto a Pagar</p>
                <p className="text-4xl font-bold mt-1">{fmtMoney(nomina.sueldo_neto)}</p>
              </div>
              <DollarSign className="w-16 h-16 text-white/20" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-aria-primary" />
                <span className="text-sm text-aria-primary font-medium">Transferencia Bancaria</span>
              </div>
              <p className="text-2xl font-bold text-aria-primary">{fmtMoney(nomina.pago_tarjeta)}</p>
              {nomina.banco && (
                <div className="mt-3 pt-3 border-t border-purple-200 text-sm">
                  <p className="text-aria-primary">Banco: <span className="font-medium text-aria-primary">{nomina.banco}</span></p>
                  {nomina.clabe && <p className="text-aria-primary">CLABE: <span className="font-mono font-medium text-aria-primary">{nomina.clabe}</span></p>}
                </div>
              )}
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-800 font-medium">Efectivo</span>
              </div>
              <p className="text-2xl font-bold text-aria-accent">{fmtMoney(nomina.pago_efectivo)}</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-b-2 border-gray-400 pb-8 mb-2"></div>
              <p className="text-sm text-gray-600">Firma del Empleado</p>
              <p className="text-xs text-gray-400 mt-1">{nomina.nombre}</p>
            </div>
            <div className="text-center">
              <div className="border-b-2 border-gray-400 pb-8 mb-2"></div>
              <p className="text-sm text-gray-600">Firma de Recursos Humanos</p>
              <p className="text-xs text-gray-400 mt-1">Grupo Constructor Urbano Avante</p>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-gray-400">
            <p>Documento generado por ARIA27 ERP | {new Date().toLocaleDateString("es-MX")} | Semana {nomina.semana}/{nomina.anio}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-recibo { page-break-after: always; margin: 0; padding: 20px; box-shadow: none !important; }
          @page { size: letter; margin: 0.5in; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6 no-print">
        <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <AriaBackButton href="/dashboard/talento/nomina" />
            <div className="p-3 rounded-2xl bg-gradient-to-br from-aria-primary/20 to-aria-primary/20 border border-aria-primary/30">
              <FileText className="w-7 h-7 text-aria-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Recibos de Nómina</h1>
              <p className="text-[#7f93b0] text-sm">Semana {semanaInfo.semana}/{semanaInfo.anio} · {fmtFechaCorta(semanaInfo.inicio)} – {fmtFechaCorta(semanaInfo.fin)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={semanaPrev} title="Semana anterior" className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08]"><ChevronLeft className="w-4 h-4 text-[#c9d8ed]" /></button>
            <button onClick={semanaHoy} className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-[#c9d8ed] text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />Hoy</button>
            <button onClick={semanaSig} title="Semana siguiente" className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08]"><ChevronRight className="w-4 h-4 text-[#c9d8ed]" /></button>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${nominaStatus === "CONFIRMADA" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-amber-500/20 border-amber-500/30 text-amber-300"}`}>
              {nominaStatus === "CONFIRMADA" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {nominaStatus === "CONFIRMADA" ? "CONFIRMADA" : "PRE-NÓMINA"}
            </div>

            <button onClick={() => nominaStatus === "CONFIRMADA" ? setShowConfirmModal(true) : confirmarNomina()} disabled={nominas.length === 0 || confirmando} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50 ${nominaStatus === "CONFIRMADA" ? "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300" : "bg-gradient-to-r from-emerald-500 to-emerald-500 text-white hover:from-emerald-600 hover:to-emerald-600"}`}>
              {confirmando ? <Loader2 className="w-4 h-4 animate-spin" /> : nominaStatus === "CONFIRMADA" ? <Unlock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              {nominaStatus === "CONFIRMADA" ? "Desbloquear" : "Confirmar Nómina"}
            </button>

            <button onClick={exportarExcel} disabled={nominas.length === 0 || exportando} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.08] text-emerald-300 hover:from-emerald-500/30 hover:to-green-500/30 disabled:opacity-50">
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Excel
            </button>

            <button onClick={handlePrintAll} disabled={nominas.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-aria-primary/20 to-aria-accent/20 border border-aria-primary/30 text-aria-accent hover:from-aria-primary/30 hover:to-aria-accent/30 disabled:opacity-50">
              <Printer className="w-4 h-4" />
              Imprimir Todos ({filtradas.length})
            </button>
          </div>
        </div>

        <FlashBanner msg={mensaje} />

        {nominas.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]"><p className="text-xs text-[#7f93b0]">Recibos</p><p className="text-xl font-bold text-white">{filtradas.length}</p></div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]"><p className="text-xs text-[#7f93b0]">Neto total</p><p className="text-xl font-bold text-emerald-400">{fmtMoney(totales.neto)}</p></div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]"><p className="text-xs text-[#7f93b0]">Transferencia</p><p className="text-xl font-bold text-aria-accent">{fmtMoney(totales.tarjeta)}</p></div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]"><p className="text-xs text-[#7f93b0]">Efectivo</p><p className="text-xl font-bold text-amber-400">{fmtMoney(totales.efectivo)}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#4a6080] absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar empleado, puesto, obra..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-[#4a6080]" />
              </div>
              <span className="text-xs text-[#7f93b0]">{filtradas.length} de {nominas.length}</span>
            </div>
          </>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>
        ) : nominas.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-center">
            <FileText className="w-16 h-16 text-[#4a6080] mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No hay nómina generada para semana {semanaInfo.semana}/{semanaInfo.anio}</h3>
            <p className="text-[#7f93b0]">Genera la nómina desde Pre-Nómina o navega a otra semana</p>
            <Link href="/dashboard/talento/nomina/pre-nomina" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-aria-primary hover:bg-aria-primary rounded-lg text-white font-medium">
              Ir a Pre-Nómina
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtradas.map(nomina => (
              <div key={nomina.id} className="relative group">
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handlePrintOne(nomina)} className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all" title="Imprimir este recibo">
                    <Printer className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
                <ReciboCard nomina={nomina} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="print-area hidden print:block">
        {(printMode === "all" ? filtradas : printMode === "one" && printOne ? [printOne] : []).map(nomina => (
          <ReciboCard key={nomina.id} nomina={nomina} forPrint={true} />
        ))}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 no-print">
          <div className="bg-[#0c1d38] rounded-2xl p-6 w-full max-w-md border border-white/[0.08]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/20 rounded-xl"><AlertTriangle className="w-6 h-6 text-amber-400" /></div>
              <div>
                <h3 className="text-lg font-bold text-white">Desbloquear Nómina</h3>
                <p className="text-sm text-[#7f93b0]">Esta acción requiere justificación</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-[#c9d8ed] mb-2">Motivo de la modificación *</label>
              <textarea value={motivoModificacion} onChange={e => setMotivoModificacion(e.target.value)} placeholder="Explique por qué necesita modificar esta nómina confirmada..." className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-[#4a6080] focus:outline-none focus:border-amber-500 resize-none" rows={3} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowConfirmModal(false); setMotivoModificacion(""); }} className="px-4 py-2 text-[#7f93b0] hover:text-white">Cancelar</button>
              <button onClick={confirmarNomina} disabled={!motivoModificacion.trim()} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl text-white font-medium">Desbloquear</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        title={confirmState.title}
        variant={confirmState.variant}
        onConfirm={() => { confirmState.onOk(); closeConfirm(); }}
        onCancel={closeConfirm}
      />
    </>
  );
}
