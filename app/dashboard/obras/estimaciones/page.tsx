"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useObrasCatalogo } from "@/lib/use-obras-catalogo";
import { Plus, Search, DollarSign, TrendingUp, CheckCircle2, Clock, Printer, AlertTriangle, Loader2, X } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface Estimacion {
  id: string;
  obra_id: string;
  numero_estimacion: number;
  periodo_inicio: string;
  periodo_fin: string;
  importe_periodo: number;
  importe_acumulado: number;
  importe_contrato: number;
  pct_avance: number;
  anticipo_pct: number;
  retencion_pct: number;
  monto_retencion: number;
  iva_pct: number;
  monto_iva: number;
  neto_a_cobrar: number;
  amortizacion_anticipo?: number;
  status: string;
  fecha_presentacion: string | null;
  fecha_aprobacion: string | null;
  aprobada_por: string | null;
  notas: string | null;
  created_at: string;
}

interface Partida {
  id: string;
  estimacion_id: string;
  concepto: string;
  unidad: string;
  cantidad_contrato: number;
  precio_unitario: number;
  cantidad_periodo: number;
  cantidad_acumulada: number;
  importe_periodo: number;
  importe_acumulado: number;
  pct_avance: number;
}

interface FormPartida {
  concepto: string;
  unidad: string;
  cantidad_contrato: number;
  precio_unitario: number;
  cantidad_periodo: number;
}

export default function EstimacionesPage() {
  const log = clientLogger("ESTIMACIONES");
  const [estimaciones, setEstimaciones] = useState<Estimacion[]>([]);
  const [partidas, setPartidas] = useState<Map<string, Partida[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterObra, setFilterObra] = useState("TODAS");
  const [filterStatus, setFilterStatus] = useState("TODAS");
  const [obras, setObras] = useState<string[]>([]);
  const { obras: obrasCat } = useObrasCatalogo();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEstimacion, setSelectedEstimacion] = useState<Estimacion | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [form, setForm] = useState({
    obra_nombre: "",
    obra_id: "",
    periodo_inicio: "",
    periodo_fin: "",
    importe_contrato: 0,
    anticipo_pct: 30,
    retencion_pct: 5,
    iva_pct: 16,
    notas: "",
    partidas: [] as FormPartida[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { msg, flash, clear } = useFlashMessage();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: ests } = await supabase
        .from("obra_estimaciones")
        .select("*")
        .order("created_at", { ascending: false });

      setEstimaciones(ests || []);

      const obraNames = [...new Set((ests || []).map((e) => {
        const match = obrasCat.find((o) => o.id === e.obra_id);
        return match?.nombre || "Obra no identificada";
      }))];
      setObras(obraNames as string[]);

      if (ests && ests.length > 0) {
        const pMap = new Map<string, Partida[]>();
        for (const est of ests) {
          const { data: parts } = await supabase
            .from("obra_estimacion_partidas")
            .select("*")
            .eq("estimacion_id", est.id);
          if (parts) pMap.set(est.id, parts as Partida[]);
        }
        setPartidas(pMap);
      }
    } catch (e: unknown) {
      log.error(String(e));
    } finally {
      setLoading(false);
    }
  }

  function addPartida() {
    setForm({
      ...form,
      partidas: [...form.partidas, { concepto: "", unidad: "PZA", cantidad_contrato: 0, precio_unitario: 0, cantidad_periodo: 0 }],
    });
  }

  function removePartida(idx: number) {
    setForm({ ...form, partidas: form.partidas.filter((_, i) => i !== idx) });
  }

  function updatePartida(idx: number, field: keyof FormPartida, value: string | number) {
    const newPartidas = [...form.partidas];
    newPartidas[idx] = { ...newPartidas[idx], [field]: field === "concepto" || field === "unidad" ? value : parseFloat(String(value)) || 0 };
    setForm({ ...form, partidas: newPartidas });
  }

  function validar(): boolean {
    const errors: Record<string, string> = {};
    if (!form.obra_id?.trim()) errors.obra_id = "Selecciona una obra";
    if (!form.periodo_inicio) errors.periodo_inicio = "Fecha inicio es requerida";
    if (!form.periodo_fin) errors.periodo_fin = "Fecha fin es requerida";
    if (form.partidas.length === 0) errors.partidas = "Agrega al menos una partida";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function guardar() {
    if (!validar()) return;

    // Validate partidas
    for (let i = 0; i < form.partidas.length; i++) {
      const p = form.partidas[i];
      if (!p.concepto.trim()) {
        flash("err", `Partida ${i + 1}: Concepto es requerido`);
        return;
      }
      if (isNaN(p.cantidad_contrato) || p.cantidad_contrato < 0) {
        flash("err", `Partida ${i + 1}: Cantidad contrato debe ser válida`);
        return;
      }
      if (isNaN(p.precio_unitario) || p.precio_unitario <= 0) {
        flash("err", `Partida ${i + 1}: Precio unitario debe ser mayor a 0`);
        return;
      }
      if (isNaN(p.cantidad_periodo) || p.cantidad_periodo < 0) {
        flash("err", `Partida ${i + 1}: Cantidad periodo debe ser válida`);
        return;
      }
    }

    // Calculate totals
    let totalImportePeriodo = 0;
    let totalCantidadContrato = 0;
    for (const p of form.partidas) {
      totalImportePeriodo += p.cantidad_periodo * p.precio_unitario;
      totalCantidadContrato += p.cantidad_contrato * p.precio_unitario;
    }

    const pctAvance = form.importe_contrato > 0 ? (totalImportePeriodo / form.importe_contrato) * 100 : 0;
    const amortizacion = totalImportePeriodo * (form.anticipo_pct / 100);
    const retencion = totalImportePeriodo * (form.retencion_pct / 100);
    const iva = (totalImportePeriodo - amortizacion - retencion) * (form.iva_pct / 100);
    const neto = totalImportePeriodo - amortizacion - retencion + iva;

    // FIX P1 17-Jun-2026: race condition numero_estimacion
    const { data: maxEst } = await supabase.from("obra_estimaciones").select("numero_estimacion").eq("obra_id", form.obra_id).order("numero_estimacion", { ascending: false }).limit(1).maybeSingle();
    const numero = ((maxEst?.numero_estimacion as number | undefined) || 0) + 1;

    const { data: insEst, error: errEst } = await supabase.from("obra_estimaciones").insert({
      obra_id: form.obra_id,
      numero_estimacion: numero,
      periodo_inicio: form.periodo_inicio,
      periodo_fin: form.periodo_fin,
      importe_periodo: totalImportePeriodo,
      importe_acumulado: totalImportePeriodo,
      importe_contrato: form.importe_contrato,
      pct_avance: pctAvance,
      anticipo_pct: form.anticipo_pct,
      amortizacion_anticipo: amortizacion,
      retencion_pct: form.retencion_pct,
      monto_retencion: retencion,
      iva_pct: form.iva_pct,
      monto_iva: iva,
      neto_a_cobrar: neto,
      status: "BORRADOR",
      notas: form.notas,
      created_by: "usuario",
    }).select("id").single();

    if (errEst || !insEst) {
      flash("err", "Error al crear estimación: " + (errEst?.message || "Unknown"));
      return;
    }

    // Insert partidas
    const partidasData = form.partidas.map((p) => {
      const importePeriodo = p.cantidad_periodo * p.precio_unitario;
      return {
        estimacion_id: insEst.id,
        concepto: p.concepto,
        unidad: p.unidad,
        cantidad_contrato: p.cantidad_contrato,
        precio_unitario: p.precio_unitario,
        cantidad_periodo: p.cantidad_periodo,
        cantidad_acumulada: p.cantidad_periodo,
        importe_periodo: importePeriodo,
        importe_acumulado: importePeriodo,
        pct_avance: form.importe_contrato > 0 ? (importePeriodo / form.importe_contrato) * 100 : 0,
      };
    });

    const { error: errParts } = await supabase.from("obra_estimacion_partidas").insert(partidasData);
    if (errParts) {
      flash("err", "Error al crear partidas: " + errParts.message);
      return;
    }

    flash("ok", "Estimación creada exitosamente");

    setShowForm(false);
    setForm({
      obra_nombre: "",
      obra_id: "",
      periodo_inicio: "",
      periodo_fin: "",
      importe_contrato: 0,
      anticipo_pct: 30,
      retencion_pct: 5,
      iva_pct: 16,
      notas: "",
      partidas: [],
    });
    loadData();
  }

  async function cambiarStatus(estId: string, newStatus: string) {
    const { error } = await supabase
      .from("obra_estimaciones")
      .update({
        status: newStatus,
        fecha_presentacion: newStatus === "PRESENTADA" ? new Date().toISOString().split("T")[0] : undefined,
        fecha_aprobacion: newStatus === "APROBADA" ? new Date().toISOString().split("T")[0] : undefined,
      })
      .eq("id", estId);

    if (error) {
      flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido");
    } else {
      loadData();
      if (selectedEstimacion?.id === estId) {
        setShowDetail(false);
      }
      flash("ok", "Estado actualizado");
    }
  }

  const getObraNombre = (obraId: string) => {
    const obra = obrasCat.find((o) => o.id === obraId);
    return obra?.nombre || "Obra no identificada";
  };

  const filtered = estimaciones.filter((e) => {
    const obraNombre = getObraNombre(e.obra_id);
    const matchSearch = !search || obraNombre.toLowerCase().includes(search.toLowerCase()) || e.numero_estimacion.toString().includes(search);
    const matchObra = filterObra === "TODAS" || obraNombre === filterObra;
    const matchStatus = filterStatus === "TODAS" || e.status === filterStatus;
    return matchSearch && matchObra && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "BORRADOR":
        return "bg-slate-500/20 text-[#7f93b0]";
      case "PRESENTADA":
        return "bg-aria-primary-light text-aria-accent";
      case "APROBADA":
        return "bg-emerald-500/20 text-aria-accent";
      case "COBRADA":
        return "bg-aria-primary-light text-aria-accent";
      case "RECHAZADA":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-500/20 text-[#7f93b0]";
    }
  };

  const totalFacturable = filtered.reduce((s, e) => s + (e.importe_periodo || 0), 0);
  const totalAcumulado = filtered.reduce((s, e) => s + (e.importe_acumulado || 0), 0);

  return (
    <div className="aria-bg-canon space-y-6 max-w-7xl mx-auto pb-12">
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4">
        <AriaBackButton href="/dashboard/obras" />

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Estimaciones de Obra</h1>
            <p className="text-[#7f93b0] text-sm">Solicitudes de pago por avance — desglose de partidas y liquidación</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] text-white rounded-full text-sm font-medium hover:bg-[#2A4A8E] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nueva Estimación
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Este Periodo",
            value: `$${totalFacturable.toLocaleString()}`,
            icon: DollarSign,
            color: "text-aria-accent",
            bg: "bg-aria-primary/10",
          },
          {
            label: "Acumulado",
            value: `$${totalAcumulado.toLocaleString()}`,
            icon: TrendingUp,
            color: "text-aria-accent",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Estimaciones",
            value: filtered.length,
            icon: CheckCircle2,
            color: "text-aria-accent",
            bg: "bg-aria-primary-light",
          },
          {
            label: "Obras",
            value: obras.length,
            icon: Clock,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-[#7f93b0]">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Nueva Estimación</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Obra *</label>
              <select
                value={form.obra_id}
                onChange={(e) => {
                  const obra = obrasCat.find((o) => o.id === e.target.value);
                  setForm({ ...form, obra_id: e.target.value, obra_nombre: obra?.nombre || "" });
                }}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none"
              >
                <option value="">-- Selecciona obra --</option>
                {obrasCat.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
              {formErrors.obra_id && <p className="text-red-400 text-xs mt-1">{formErrors.obra_id}</p>}
            </div>

            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Período Inicio *</label>
              <input
                type="date"
                value={form.periodo_inicio}
                onChange={(e) => setForm({ ...form, periodo_inicio: e.target.value })}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none"
              />
              {formErrors.periodo_inicio && <p className="text-red-400 text-xs mt-1">{formErrors.periodo_inicio}</p>}
            </div>

            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Período Fin *</label>
              <input
                type="date"
                value={form.periodo_fin}
                onChange={(e) => setForm({ ...form, periodo_fin: e.target.value })}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none"
              />
              {formErrors.periodo_fin && <p className="text-red-400 text-xs mt-1">{formErrors.periodo_fin}</p>}
            </div>

            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Importe Total Contrato</label>
              <input
                type="number" min="0.01"
                step="0.01"
                value={form.importe_contrato}
                onChange={(e) => setForm({ ...form, importe_contrato: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">% Anticipo</label>
              <input
                type="number" min="0"
                max="100"
                step="0.01"
                value={form.anticipo_pct}
                onChange={(e) => setForm({ ...form, anticipo_pct: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">% Retención</label>
              <input
                type="number" min="0"
                max="100"
                step="0.01"
                value={form.retencion_pct}
                onChange={(e) => setForm({ ...form, retencion_pct: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs text-[#7f93b0] mb-1 block">Notas</label>
              <input
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Observaciones sobre esta estimación"
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-[#4a6080] focus:outline-none"
              />
            </div>
          </div>

          {/* Partidas */}
          <div className="border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Partidas de la Estimación {formErrors.partidas && <span className="text-red-400 text-xs ml-2">({formErrors.partidas})</span>}</h4>
              <button
                onClick={addPartida}
                className="px-3 py-1 bg-emerald-500/20 text-aria-accent rounded-lg text-xs font-medium hover:bg-aria-primary/30"
              >
                <Plus className="w-3 h-3 inline mr-1" /> Agregar
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-auto">
              {form.partidas.length === 0 ? (
                <p className="text-[#7f93b0] text-sm">Sin partidas. Agrega una para continuar.</p>
              ) : (
                form.partidas.map((p, idx) => (
                  <div key={idx} className="p-3 bg-white/[0.04] border border-white/[0.08] rounded-lg space-y-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <label className="text-xs text-[#7f93b0] mb-1 block">Concepto *</label>
                        <input
                          value={p.concepto}
                          onChange={(e) => updatePartida(idx, "concepto", e.target.value)}
                          placeholder="Descripción de trabajo"
                          className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded text-white text-xs placeholder:text-[#4a6080] focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removePartida(idx)}
                        className="mt-5 p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <div>
                        <label className="text-xs text-[#7f93b0] mb-1 block">Unidad</label>
                        <select
                          value={p.unidad}
                          onChange={(e) => updatePartida(idx, "unidad", e.target.value)}
                          className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded text-white text-xs focus:outline-none"
                        >
                          <option value="PZA">PZA</option>
                          <option value="M2">M2</option>
                          <option value="M3">M3</option>
                          <option value="ML">ML</option>
                          <option value="KG">KG</option>
                          <option value="TON">TON</option>
                          <option value="JOR">JOR</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-[#7f93b0] mb-1 block">Cant. Contrato</label>
                        <input
                          type="number" min="0"
                          step="0.01"
                          value={p.cantidad_contrato}
                          onChange={(e) => updatePartida(idx, "cantidad_contrato", e.target.value)}
                          className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#7f93b0] mb-1 block">P.U.</label>
                        <input
                          type="number" min="0.01"
                          step="0.01"
                          value={p.precio_unitario}
                          onChange={(e) => updatePartida(idx, "precio_unitario", e.target.value)}
                          className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#7f93b0] mb-1 block">Cant. Este Período</label>
                        <input
                          type="number" min="0"
                          step="0.01"
                          value={p.cantidad_periodo}
                          onChange={(e) => updatePartida(idx, "cantidad_periodo", e.target.value)}
                          className="w-full px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded text-white text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#7f93b0] mb-1 block">Importe</label>
                        <div className="px-2 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded text-white text-xs font-medium">
                          ${(p.cantidad_periodo * p.precio_unitario).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={guardar}
              className="px-6 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-sm font-medium"
            >
              Guardar Estimación
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setForm({
                  obra_nombre: "",
                  obra_id: "",
                  periodo_inicio: "",
                  periodo_fin: "",
                  importe_contrato: 0,
                  anticipo_pct: 30,
                  retencion_pct: 5,
                  iva_pct: 16,
                  notas: "",
                  partidas: [],
                });
              }}
              className="px-6 py-2 bg-white/[0.04] hover:bg-white/[0.06] text-[#c9d8ed] rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por obra o número..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none"
          />
        </div>
        <select
          value={filterObra}
          onChange={(e) => setFilterObra(e.target.value)}
          className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none"
        >
          <option value="TODAS">Todas las obras</option>
          {obras.map((o, i) => (
            <option key={i} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none"
        >
          <option value="TODAS">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="PRESENTADA">Presentada</option>
          <option value="APROBADA">Aprobada</option>
          <option value="COBRADA">Cobrada</option>
          <option value="RECHAZADA">Rechazada</option>
        </select>
      </div>

      {/* List View */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">#Est</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-center p-3">Período</th>
                <th className="text-right p-3">Importe Período</th>
                <th className="text-right p-3">Acumulado</th>
                <th className="text-center p-3">% Avance</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#7f93b0]">
                    <Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-[#7f93b0]">
                    Sin estimaciones registradas
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-mono text-xs font-bold">{e.numero_estimacion}</td>
                    <td className="p-3 text-white">{getObraNombre(e.obra_id)}</td>
                    <td className="p-3 text-center text-[#c9d8ed] text-xs">
                      {e.periodo_inicio} → {e.periodo_fin}
                    </td>
                    <td className="p-3 text-right text-white font-medium">${(e.importe_periodo || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-aria-accent font-medium">${(e.importe_acumulado || 0).toLocaleString()}</td>
                    <td className="p-3 text-center text-[#c9d8ed]">{(e.pct_avance || 0).toFixed(1)}%</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(e.status)}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedEstimacion(e);
                          setShowDetail(true);
                        }}
                        className="text-aria-accent hover:text-aria-accent text-xs font-medium"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && selectedEstimacion && (
        <div className="fixed inset-0 bg-black/50  z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-[rgba(4,8,16,0.98)] p-6 border-b border-white/[0.08] flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Estimación #{selectedEstimacion.numero_estimacion}</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="text-[#7f93b0] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#7f93b0] uppercase">Obra</p>
                  <p className="text-white font-medium">{getObraNombre(selectedEstimacion.obra_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#7f93b0] uppercase">Período</p>
                  <p className="text-white font-medium">
                    {selectedEstimacion.periodo_inicio} → {selectedEstimacion.periodo_fin}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#7f93b0] uppercase">Estado</p>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                      selectedEstimacion.status
                    )}`}
                  >
                    {selectedEstimacion.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#7f93b0] uppercase">% Avance</p>
                  <p className="text-white font-medium">{(selectedEstimacion.pct_avance || 0).toFixed(2)}%</p>
                </div>
              </div>

              {/* Partidas Table */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Partidas</h3>
                <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg overflow-auto max-h-[250px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#0c1d38]/50">
                      <tr className="text-[#7f93b0]">
                        <th className="text-left p-2">Concepto</th>
                        <th className="text-center p-2">Unidad</th>
                        <th className="text-right p-2">Cant. Período</th>
                        <th className="text-right p-2">P.U.</th>
                        <th className="text-right p-2">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(partidas.get(selectedEstimacion.id) || []).map((p) => (
                        <tr key={p.id} className="border-t border-white/[0.05]">
                          <td className="p-2 text-white">{p.concepto}</td>
                          <td className="p-2 text-center text-[#7f93b0]">{p.unidad}</td>
                          <td className="p-2 text-right text-[#c9d8ed]">{(p.cantidad_periodo || 0).toLocaleString()}</td>
                          <td className="p-2 text-right text-[#c9d8ed]">${(p.precio_unitario || 0).toLocaleString()}</td>
                          <td className="p-2 text-right text-white font-medium">${(p.importe_periodo || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#7f93b0]">Subtotal Período:</span>
                  <span className="text-white font-medium">${(selectedEstimacion.importe_periodo || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7f93b0]">Amortización Anticipo ({selectedEstimacion.anticipo_pct}%):</span>
                  <span className="text-red-400">-${(selectedEstimacion.amortizacion_anticipo || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7f93b0]">Retención ({selectedEstimacion.retencion_pct}%):</span>
                  <span className="text-red-400">-${(selectedEstimacion.monto_retencion || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7f93b0]">IVA ({selectedEstimacion.iva_pct}%):</span>
                  <span className="text-amber-400">+${(selectedEstimacion.monto_iva || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-white/[0.08] pt-2 flex justify-between">
                  <span className="text-white font-semibold">Neto a Cobrar:</span>
                  <span className="text-aria-accent font-bold text-lg">${(selectedEstimacion.neto_a_cobrar || 0).toLocaleString()}</span>
                </div>
              </div>

              {selectedEstimacion.notas && (
                <div className="bg-aria-primary/10 border border-aria-primary/20 rounded-lg p-3">
                  <p className="text-xs text-aria-accent font-medium mb-1">Notas:</p>
                  <p className="text-sm text-aria-accent">{selectedEstimacion.notas}</p>
                </div>
              )}

              {/* Status Actions */}
              <div className="flex gap-2 pt-4 border-t border-white/[0.08]">
                {selectedEstimacion.status === "BORRADOR" && (
                  <button
                    onClick={() => cambiarStatus(selectedEstimacion.id, "PRESENTADA")}
                    className="flex-1 px-4 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-sm font-medium transition-colors"
                  >
                    Presentar
                  </button>
                )}
                {["BORRADOR", "PRESENTADA"].includes(selectedEstimacion.status) && (
                  <button
                    onClick={() => cambiarStatus(selectedEstimacion.id, "APROBADA")}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Aprobar
                  </button>
                )}
                {selectedEstimacion.status === "APROBADA" && (
                  <button
                    onClick={() => cambiarStatus(selectedEstimacion.id, "COBRADA")}
                    className="flex-1 px-4 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-sm font-medium transition-colors"
                  >
                    Marcar como Cobrada
                  </button>
                )}
                {["BORRADOR", "PRESENTADA"].includes(selectedEstimacion.status) && (
                  <button
                    onClick={() => cambiarStatus(selectedEstimacion.id, "RECHAZADA")}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Rechazar
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-[#0f2448] hover:bg-[#162040] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
