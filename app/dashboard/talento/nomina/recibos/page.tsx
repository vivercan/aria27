"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, Printer, FileText, Download, CheckCircle, 
  AlertTriangle, User, Building2, Calendar, DollarSign,
  CreditCard, Banknote, Clock, ChevronDown, ChevronUp,
  Lock, Unlock
} from "lucide-react";

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
  // Datos bancarios del empleado
  banco?: string;
  clabe?: string;
  numero_cuenta?: string;
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

export default function RecibosNominaPage() {
  const [nominas, setNominas] = useState<NominaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [semanaInfo, setSemanaInfo] = useState({ semana: 0, anio: 2026, inicio: "", fin: "" });
  const [selectedRecibo, setSelectedRecibo] = useState<NominaRecord | null>(null);
  const [printAll, setPrintAll] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [motivoModificacion, setMotivoModificacion] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [nominaStatus, setNominaStatus] = useState<"GENERADA" | "CONFIRMADA">("GENERADA");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hoy = new Date();
    const { inicio, fin, semana } = getWeekRange(hoy);
    setSemanaInfo({
      semana,
      anio: inicio.getFullYear(),
      inicio: inicio.toISOString().split("T")[0],
      fin: fin.toISOString().split("T")[0]
    });
  }, []);

  useEffect(() => {
    if (semanaInfo.semana > 0) cargarNominas();
  }, [semanaInfo]);

  const cargarNominas = async () => {
    setLoading(true);
    
    // Cargar nóminas con datos bancarios del empleado
    const { data: nominasData } = await supabase
      .from("nomina_historico")
      .select("*")
      .eq("semana", semanaInfo.semana)
      .eq("anio", semanaInfo.anio)
      .order("nombre");

    if (nominasData && nominasData.length > 0) {
      // Obtener datos bancarios de cada empleado
      const nominasConBanco = await Promise.all(
        nominasData.map(async (n) => {
          const { data: emp } = await supabase
            .from("employees")
            .select("banco, clabe, numero_cuenta")
            .eq("id", n.employee_id)
            .single();
          return { ...n, banco: emp?.banco, clabe: emp?.clabe, numero_cuenta: emp?.numero_cuenta };
        })
      );
      setNominas(nominasConBanco);
      setNominaStatus(nominasData[0].status === "CONFIRMADA" ? "CONFIRMADA" : "GENERADA");
    }
    setLoading(false);
  };

  const confirmarNomina = async () => {
    if (nominaStatus === "CONFIRMADA") {
      // Ya está confirmada, necesita doble confirmación para modificar
      if (!motivoModificacion.trim()) {
        alert("Debe ingresar el motivo de la modificación");
        return;
      }
      
      const confirm1 = window.confirm("⚠️ ADVERTENCIA: Esta nómina ya fue CONFIRMADA.\n\n¿Está seguro que desea desbloquearla para modificación?");
      if (!confirm1) return;
      
      const confirm2 = window.confirm(`SEGUNDA CONFIRMACIÓN\n\nMotivo: ${motivoModificacion}\n\n¿CONFIRMA que desea desbloquear la nómina de Semana ${semanaInfo.semana}?`);
      if (!confirm2) return;

      // Registrar modificación y cambiar status
      await supabase
        .from("nomina_historico")
        .update({ status: "GENERADA" })
        .eq("semana", semanaInfo.semana)
        .eq("anio", semanaInfo.anio);

      // Log de auditoría
      await supabase.from("audit_log").insert({
        tabla: "nomina_historico",
        accion: "DESBLOQUEO_NOMINA",
        descripcion: `Semana ${semanaInfo.semana}/${semanaInfo.anio} desbloqueada. Motivo: ${motivoModificacion}`,
        usuario: localStorage.getItem("userEmail") || "unknown"
      });

      setNominaStatus("GENERADA");
      setShowConfirmModal(false);
      setMotivoModificacion("");
      alert("✅ Nómina desbloqueada. Ahora puede regenerarla.");
    } else {
      // Confirmar nómina
      const confirm1 = window.confirm(`¿Confirmar DEFINITIVAMENTE la nómina de Semana ${semanaInfo.semana}?\n\nUna vez confirmada, requerirá doble autorización para modificarla.`);
      if (!confirm1) return;

      const confirm2 = window.confirm("SEGUNDA CONFIRMACIÓN\n\n¿CONFIRMA que los datos son correctos y desea CERRAR esta nómina?");
      if (!confirm2) return;

      setConfirmando(true);
      await supabase
        .from("nomina_historico")
        .update({ status: "CONFIRMADA" })
        .eq("semana", semanaInfo.semana)
        .eq("anio", semanaInfo.anio);

      setNominaStatus("CONFIRMADA");
      setConfirmando(false);
      alert("✅ Nómina CONFIRMADA exitosamente");
    }
  };

  const handlePrint = (all: boolean) => {
    setPrintAll(all);
    setTimeout(() => window.print(), 100);
  };

  const formatMoney = (n: number) => `$${(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  const ReciboCard = ({ nomina, forPrint = false }: { nomina: NominaRecord; forPrint?: boolean }) => (
    <div className={`${forPrint ? "print-recibo" : ""} bg-white text-gray-900 rounded-xl shadow-lg overflow-hidden ${forPrint ? "page-break-after" : ""}`} style={{ maxWidth: forPrint ? "100%" : "800px" }}>
      {/* Header Premium */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">GRUPO CUAVANTE</h1>
            <p className="text-slate-300 text-sm">Constructora</p>
          </div>
          <div className="text-right">
            <div className="bg-white/10 px-4 py-2 rounded-lg">
              <p className="text-xs text-slate-300">RECIBO DE NÓMINA</p>
              <p className="text-lg font-bold">Semana {nomina.semana}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Empleado */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-gray-500 uppercase tracking-wide">Empleado</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{nomina.nombre}</p>
            <p className="text-gray-600">{nomina.puesto}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-gray-500 uppercase tracking-wide">Obra/Centro</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{nomina.obra || "Sin asignar"}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Período</p>
            <p className="font-medium">{formatDate(nomina.fecha_inicio)} - {formatDate(nomina.fecha_fin)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Días Trabajados</p>
            <p className="font-bold text-2xl text-emerald-600">{nomina.dias_trabajados}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Horas Extra</p>
            <p className="font-bold text-2xl text-blue-600">{nomina.horas_extra || 0}</p>
          </div>
        </div>
      </div>

      {/* Desglose */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Percepciones */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Percepciones</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Salario Base ({nomina.dias_trabajados} días × {formatMoney(nomina.salario_diario)})</span>
                <span className="font-medium">{formatMoney(nomina.salario_base)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Horas Extra</span>
                <span className="font-medium">{formatMoney(nomina.pago_horas_extra || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Bonos</span>
                <span className="font-medium">{formatMoney(nomina.bonos || 0)}</span>
              </div>
              <div className="flex justify-between py-3 bg-emerald-50 px-3 rounded-lg mt-2">
                <span className="font-bold text-emerald-800">TOTAL PERCEPCIONES</span>
                <span className="font-bold text-emerald-600 text-lg">{formatMoney(nomina.total_percepciones)}</span>
              </div>
            </div>
          </div>

          {/* Deducciones */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Deducciones</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Préstamos</span>
                <span className="font-medium text-red-600">-{formatMoney(nomina.prestamo_descuento || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Otras Deducciones</span>
                <span className="font-medium text-red-600">-{formatMoney(nomina.otras_deducciones || 0)}</span>
              </div>
              <div className="flex justify-between py-3 bg-red-50 px-3 rounded-lg mt-2">
                <span className="font-bold text-red-800">TOTAL DEDUCCIONES</span>
                <span className="font-bold text-red-600 text-lg">-{formatMoney(nomina.total_deducciones)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Neto a Pagar */}
        <div className="mt-8 p-6 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-violet-200 text-sm uppercase tracking-wide">Sueldo Neto a Pagar</p>
              <p className="text-4xl font-bold mt-1">{formatMoney(nomina.sueldo_neto)}</p>
            </div>
            <DollarSign className="w-16 h-16 text-white/20" />
          </div>
        </div>

        {/* Forma de Pago */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-purple-800 font-medium">Transferencia Bancaria</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatMoney(nomina.pago_tarjeta)}</p>
            {nomina.banco && (
              <div className="mt-3 pt-3 border-t border-purple-200 text-sm">
                <p className="text-purple-600">Banco: <span className="font-medium text-purple-800">{nomina.banco}</span></p>
                {nomina.clabe && <p className="text-purple-600">CLABE: <span className="font-mono font-medium text-purple-800">{nomina.clabe}</span></p>}
              </div>
            )}
          </div>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">Efectivo</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{formatMoney(nomina.pago_efectivo)}</p>
          </div>
        </div>

        {/* Firmas */}
        <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-b-2 border-gray-400 pb-8 mb-2"></div>
            <p className="text-sm text-gray-600">Firma del Empleado</p>
            <p className="text-xs text-gray-400 mt-1">{nomina.nombre}</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-gray-400 pb-8 mb-2"></div>
            <p className="text-sm text-gray-600">Firma de Recursos Humanos</p>
            <p className="text-xs text-gray-400 mt-1">Grupo Cuavante</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>Documento generado por ARIA27 ERP | {new Date().toLocaleDateString("es-MX")} | Semana {nomina.semana}/{nomina.anio}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-recibo { 
            page-break-after: always; 
            margin: 0; 
            padding: 20px;
            box-shadow: none !important;
          }
          @page { size: letter; margin: 0.5in; }
        }
      `}</style>

      <div className="space-y-6 no-print">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/talento/nomina" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20">
              <FileText className="w-7 h-7 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Recibos de Nómina</h1>
              <p className="text-slate-400 text-sm">Semana {semanaInfo.semana} | {formatDate(semanaInfo.inicio)} - {formatDate(semanaInfo.fin)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${nominaStatus === "CONFIRMADA" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-amber-500/20 border-amber-500/30 text-amber-300"}`}>
              {nominaStatus === "CONFIRMADA" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {nominaStatus === "CONFIRMADA" ? "CONFIRMADA" : "PRE-NÓMINA"}
            </div>

            {/* Botón Confirmar/Desbloquear */}
            <button
              onClick={() => nominaStatus === "CONFIRMADA" ? setShowConfirmModal(true) : confirmarNomina()}
              disabled={nominas.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 ${
                nominaStatus === "CONFIRMADA"
                  ? "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300"
                  : "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600"
              }`}
            >
              {nominaStatus === "CONFIRMADA" ? (
                <><Unlock className="w-4 h-4" /> Desbloquear</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Confirmar Nómina</>
              )}
            </button>

            {/* Botones de impresión */}
            <button
              onClick={() => handlePrint(true)}
              disabled={nominas.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-300 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Imprimir Todos ({nominas.length})
            </button>
          </div>
        </div>

        {/* Lista de Recibos */}
        {nominas.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No hay nómina generada</h3>
            <p className="text-slate-400">Primero genera la pre-nómina desde el módulo de Nómina</p>
            <Link href="/dashboard/talento/nomina" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors">
              Ir a Nómina
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {nominas.map((nomina) => (
              <div key={nomina.id} className="relative group">
                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setSelectedRecibo(nomina); setTimeout(() => window.print(), 100); }}
                    className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-lg transition-all"
                  >
                    <Printer className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
                <ReciboCard nomina={nomina} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Área de impresión */}
      <div className="print-area hidden print:block">
        {(printAll ? nominas : (selectedRecibo ? [selectedRecibo] : [])).map((nomina) => (
          <ReciboCard key={nomina.id} nomina={nomina} forPrint={true} />
        ))}
      </div>

      {/* Modal Desbloquear */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 no-print">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Desbloquear Nómina</h3>
                <p className="text-sm text-slate-400">Esta acción requiere justificación</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-2">Motivo de la modificación *</label>
              <textarea
                value={motivoModificacion}
                onChange={(e) => setMotivoModificacion(e.target.value)}
                placeholder="Explique por qué necesita modificar esta nómina confirmada..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowConfirmModal(false); setMotivoModificacion(""); }}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarNomina}
                disabled={!motivoModificacion.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
              >
                Desbloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
