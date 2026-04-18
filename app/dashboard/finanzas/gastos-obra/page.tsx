"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { uploadAndInsert, deleteRowAndBlob, buildPath } from "@/lib/storage";
import { DollarSign, Search, Download, Calendar, Building2, Filter, X, Loader2, TrendingUp, FileSpreadsheet, Plus, ChevronRight, Paperclip, Edit2, Trash2, Eye, MoreVertical } from "lucide-react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney } from "@/lib/formatters";

interface Gasto {
  id: string;
  fecha: string;
  semana: number;
  obra: string;
  solicitante: string;
  descripcion: string;
  proveedor: string;
  monto: number;
  estatus: string;
  imagen_url?: string;
  created_at?: string;
}

interface Obra {
  nombre: string;
}

const ESTATUS_OPTIONS = ["Pendiente", "Aprobado", "Pagado"];

export default function GastosObraPage() {
  const log = clientLogger("GASTOS-OBRA");
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [filtros, setFiltros] = useState({ buscar: "", obra: "", semana: "", fechaInicio: "", fechaFin: "" });
  const [obras, setObras] = useState<string[]>([]);
  const [semanas, setSemanas] = useState<number[]>([]);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | "view">("create");
  const [selectedGasto, setSelectedGasto] = useState<Gasto | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fecha: "",
    obra: "",
    solicitante: "",
    proveedor: "",
    descripcion: "",
    monto: "",
    estatus: "Pendiente",
    comprobante: null as File | null
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Modals and alerts
  const [confirmModal, setConfirmModal] = useState({ open: false, id: "", titulo: "" });
  const { msg: flashMsg, flash, clear: clearFlash } = useFlashMessage();
  const [obrasData, setObrasData] = useState<Obra[]>([]);

  useEffect(() => {
    cargarDatos();
    cargarObras();
  }, []);

  const cargarObras = async () => {
    const { data } = await supabase.from("centros_trabajo").select("nombre").order("nombre", { ascending: true });
    if (data) setObrasData(data);
  };

  const cargarDatos = async () => {
    setLoading(true);
    const { data } = await supabase.from("gastos").select("*").order("fecha", { ascending: false });
    if (data) {
      setGastos(data);
      setObras([...new Set(data.map(g => g.obra).filter(Boolean))].sort());
      setSemanas([...new Set(data.map(g => g.semana).filter(Boolean))].sort((a, b) => b - a));
    }
    setLoading(false);
  };

  const gastosFiltrados = gastos.filter(g => {
    if (filtros.buscar && !g.descripcion?.toLowerCase().includes(filtros.buscar.toLowerCase()) && !g.solicitante?.toLowerCase().includes(filtros.buscar.toLowerCase()) && !g.proveedor?.toLowerCase().includes(filtros.buscar.toLowerCase())) return false;
    if (filtros.obra && g.obra !== filtros.obra) return false;
    if (filtros.semana && g.semana !== parseInt(filtros.semana)) return false;
    if (filtros.fechaInicio && g.fecha < filtros.fechaInicio) return false;
    if (filtros.fechaFin && g.fecha > filtros.fechaFin) return false;
    return true;
  });

  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + (g.monto || 0), 0);
  const limpiarFiltros = () => setFiltros({ buscar: "", obra: "", semana: "", fechaInicio: "", fechaFin: "" });
  const formatMoney = fmtMoney;

  const resumenObras = Object.entries(gastosFiltrados.reduce((acc, g) => {
    const obra = g.obra || "Sin asignar";
    acc[obra] = (acc[obra] || 0) + (g.monto || 0);
    return acc;
  }, {} as Record<string, number>)).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total).slice(0, 6);

  // ===== DRAWER HANDLERS =====
  const openNewGasto = () => {
    setDrawerMode("create");
    setSelectedGasto(null);
    setFormData({ fecha: "", obra: "", solicitante: "", proveedor: "", descripcion: "", monto: "", estatus: "Pendiente", comprobante: null });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const openViewGasto = (gasto: Gasto) => {
    setDrawerMode("view");
    setSelectedGasto(gasto);
    setFormData({ fecha: gasto.fecha, obra: gasto.obra, solicitante: gasto.solicitante, proveedor: gasto.proveedor, descripcion: gasto.descripcion, monto: gasto.monto.toString(), estatus: gasto.estatus, comprobante: null });
    setFormErrors({});
    setDrawerOpen(true);
  };

  const switchToEdit = () => {
    setDrawerMode("edit");
    setFormErrors({});
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMode("create");
    setSelectedGasto(null);
  };

  // ===== VALIDATION =====
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.fecha) errors.fecha = "Fecha requerida";
    if (!formData.obra) errors.obra = "Obra requerida";
    if (!formData.descripcion) errors.descripcion = "Descripción requerida";
    if (!formData.monto) errors.monto = "Monto requerido";
    const monto = parseFloat(formData.monto);
    if (isNaN(monto) || monto <= 0) errors.monto = "Monto debe ser > 0";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== SUBMIT HANDLERS =====
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      const monto = parseFloat(formData.monto);
      const baseData = {
        fecha: formData.fecha,
        obra: formData.obra,
        solicitante: formData.solicitante,
        proveedor: formData.proveedor,
        descripcion: formData.descripcion,
        monto,
        estatus: formData.estatus || "Pendiente",
        semana: calculateSemana(formData.fecha)
      };

      if (drawerMode === "create") {
        let newData: Record<string, unknown> = baseData;

        // Handle file upload
        if (formData.comprobante) {
          setUploadingFile(true);
          const path = buildPath({ module: "gastos", scope: [formData.obra], file: formData.comprobante });

          const { data: uploadedData, error: uploadError } = await supabase.storage
            .from("expedientes")
            .upload(path, formData.comprobante, { upsert: false });

          if (uploadError) throw uploadError;
          const imagen_url = `${path}`;
          newData = { ...newData, imagen_url };
          setUploadingFile(false);
        }

        const { error } = await supabase.from("gastos").insert([newData]);
        if (error) throw error;
        flash("ok", "Gasto creado exitosamente");
      } else if (drawerMode === "edit" && selectedGasto) {
        let updateData: Record<string, unknown> = baseData;

        // Handle file upload for edit
        if (formData.comprobante) {
          setUploadingFile(true);
          const path = buildPath({ module: "gastos", scope: [formData.obra], file: formData.comprobante });

          const { data: uploadedData, error: uploadError } = await supabase.storage
            .from("expedientes")
            .upload(path, formData.comprobante, { upsert: false });

          if (uploadError) throw uploadError;
          const imagen_url = `${path}`;
          updateData = { ...updateData, imagen_url };
          setUploadingFile(false);
        }

        const { error } = await supabase.from("gastos").update(updateData).eq("id", selectedGasto.id);
        if (error) throw error;
        flash("ok", "Gasto actualizado exitosamente");
      }

      await cargarDatos();
      closeDrawer();
    } catch (error: unknown) {
      log.error("Error al guardar el gasto", { error });
      flash("err", "Error al guardar el gasto");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!selectedGasto) return;
    setConfirmModal({ open: false, id: "", titulo: "" });
    deleteGasto(selectedGasto.id);
  };

  const deleteGasto = async (id: string) => {
    setSubmitting(true);
    try {
      const gasto = gastos.find(g => g.id === id);
      if (gasto?.imagen_url) {
        await supabase.storage.from("expedientes").remove([gasto.imagen_url]);
      }
      const { error } = await supabase.from("gastos").delete().eq("id", id);
      if (error) throw error;
      flash("ok", "Gasto eliminado exitosamente");
      await cargarDatos();
      closeDrawer();
    } catch (error: unknown) {
      log.error("Error al eliminar el gasto", { error });
      flash("err", "Error al eliminar el gasto");
    } finally {
      setSubmitting(false);
    }
  };

  // ===== UTILITIES =====
  const calculateSemana = (fecha: string) => {
    if (!fecha) return 0;
    const date = new Date(fecha);
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
  };

  const getComprobanteMimeType = (url: string) => {
    if (!url) return null;
    if (url.endsWith(".pdf")) return "pdf";
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return "image";
    return null;
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "gastos", filtros: { obra: filtros.obra, semana: filtros.semana, fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin } })
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Gastos_ARIA_${new Date().toISOString().split("T")[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      log.error("Error exportando gastos", { error: e });
    }
    setExportando(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /><span className="ml-3 text-white/60">Cargando gastos...</span></div>;

  return (
    <div className="space-y-6">
      <FlashBanner msg={flashMsg} className="mx-0 mb-3" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AriaBackButton href="/dashboard/finanzas" />
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 border border-emerald-500/20">
            <DollarSign className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Gastos de Obra</h1>
            <p className="text-[#7f93b0] text-sm">{gastos.length} registros históricos cargados</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={openNewGasto} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-aria-primary/20 to-aria-primary/20 border border-aria-primary/30 text-aria-accent hover:from-aria-primary/30 hover:to-aria-primary/30 transition-all">
            <Plus className="w-4 h-4" />
            Nuevo Gasto
          </button>
          <button onClick={exportarExcel} disabled={exportando} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:from-emerald-500/30 hover:to-emerald-500/30 transition-all disabled:opacity-50">
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            {exportando ? "Generando..." : "Exportar Excel"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 ">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/20"><DollarSign className="w-5 h-5 text-emerald-400" /></div>
            <span className="text-[#7f93b0] text-sm">Total Filtrado</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatMoney(totalFiltrado)}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-aria-primary/10 to-aria-accent/5 border border-aria-primary/20 ">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-aria-primary-light"><Filter className="w-5 h-5 text-aria-accent" /></div>
            <span className="text-[#7f93b0] text-sm">Registros</span>
          </div>
          <p className="text-2xl font-bold text-aria-accent">{gastosFiltrados.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 ">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-amber-500/20"><Building2 className="w-5 h-5 text-amber-400" /></div>
            <span className="text-[#7f93b0] text-sm">Obras</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{[...new Set(gastosFiltrados.map(g => g.obra))].length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20 ">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-purple-500/20"><Calendar className="w-5 h-5 text-purple-400" /></div>
            <span className="text-[#7f93b0] text-sm">Semanas</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{[...new Set(gastosFiltrados.map(g => g.semana))].length}</p>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] ">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6080]" />
            <input type="text" placeholder="Buscar descripción, solicitante, proveedor..." value={filtros.buscar} onChange={e => setFiltros({ ...filtros, buscar: e.target.value })} className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-[#4a6080] focus:border-emerald-500/50 focus:outline-none transition-all" />
          </div>
          <select value={filtros.obra} onChange={e => setFiltros({ ...filtros, obra: e.target.value })} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:border-emerald-500/50 focus:outline-none">
            <option value="">🏗️ Todas las obras</option>
            {obras.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filtros.semana} onChange={e => setFiltros({ ...filtros, semana: e.target.value })} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:border-emerald-500/50 focus:outline-none">
            <option value="">📅 Todas las semanas</option>
            {semanas.map(s => <option key={s} value={s}>Semana {s}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={filtros.fechaInicio} onChange={e => setFiltros({ ...filtros, fechaInicio: e.target.value })} className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:border-emerald-500/50 focus:outline-none" />
            <span className="text-[#4a6080]">→</span>
            <input type="date" value={filtros.fechaFin} onChange={e => setFiltros({ ...filtros, fechaFin: e.target.value })} className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:border-emerald-500/50 focus:outline-none" />
          </div>
          <button onClick={limpiarFiltros} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all" title="Limpiar filtros">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] ">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />Detalle de Gastos
          </h2>
          <div className="max-h-[450px] overflow-y-auto rounded-xl">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0c1d38]/90 ">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7f93b0] uppercase tracking-wider rounded-tl-lg">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7f93b0] uppercase tracking-wider">Sem</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7f93b0] uppercase tracking-wider">Obra</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7f93b0] uppercase tracking-wider">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7f93b0] uppercase tracking-wider">Proveedor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[#7f93b0] uppercase tracking-wider">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#7f93b0] uppercase tracking-wider rounded-tr-lg">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {gastosFiltrados.slice(0, 150).map((g, idx) => (
                  <tr key={g.id} onClick={() => openViewGasto(g)} className={`${idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-white/[0.03]'} hover:bg-white/[0.06] transition-colors cursor-pointer`}>
                    <td className="px-4 py-3 text-[#c9d8ed] whitespace-nowrap">{g.fecha || "—"}</td>
                    <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium">{g.semana || "—"}</span></td>
                    <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium truncate max-w-[120px] block">{g.obra || "—"}</span></td>
                    <td className="px-4 py-3 text-white truncate max-w-[200px]">{g.descripcion || "—"}</td>
                    <td className="px-4 py-3 text-[#7f93b0] truncate max-w-[120px]">{g.proveedor || "—"}</td>
                    <td className="px-4 py-3 text-right"><span className="font-semibold text-emerald-400">{formatMoney(g.monto)}</span></td>
                    <td className="px-4 py-3 text-center">{g.imagen_url ? <Paperclip className="w-4 h-4 text-[#7f93b0] mx-auto" /> : <span className="text-[#4a6080]">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gastosFiltrados.length > 150 && <p className="text-center text-[#4a6080] text-xs mt-4 py-2 bg-white/[0.04] rounded-lg">Mostrando 150 de {gastosFiltrados.length}</p>}
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] ">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />Top Obras
          </h2>
          <div className="space-y-3">
            {resumenObras.map((o, i) => (
              <div key={i} className="p-4 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.05] hover:border-white/[0.08] transition-all cursor-pointer" onClick={() => setFiltros({ ...filtros, obra: o.nombre })}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium text-white truncate flex-1">{o.nombre}</p>
                  <span className="text-emerald-400 font-bold">{formatMoney(o.total)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-aria-accent transition-all" style={{ width: `${Math.min((o.total / (resumenObras[0]?.total || 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DRAWER SLIDE-OVER */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 " onClick={closeDrawer} />

          {/* Drawer Panel */}
          <div className="relative ml-auto w-full max-w-xl bg-[#0a1628] border-l border-white/[0.08] shadow-2xl flex flex-col max-h-screen overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.08] sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur">
              <h2 className="text-lg font-semibold text-white">
                {drawerMode === "create" && "Nuevo Gasto"}
                {drawerMode === "view" && "Detalle del Gasto"}
                {drawerMode === "edit" && "Editar Gasto"}
              </h2>
              <button onClick={closeDrawer} className="p-1 hover:bg-white/[0.06] rounded-lg transition-all">
                <X className="w-5 h-5 text-[#7f93b0]" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-[#c9d8ed] mb-2">Fecha *</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                  disabled={drawerMode === "view"}
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-500/50 focus:outline-none"
                />
                {formErrors.fecha && <p className="text-red-400 text-xs mt-1">{formErrors.fecha}</p>}
              </div>

              {/* Obra */}
              <div>
                <label className="block text-sm font-medium text-[#c9d8ed] mb-2">Obra *</label>
                <select
                  value={formData.obra}
                  onChange={e => setFormData({ ...formData, obra: e.target.value })}
                  disabled={drawerMode === "view"}
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="">-- Seleccionar obra --</option>
                  {obrasData.map(o => <option key={o.nombre} value={o.nombre}>{o.nombre}</option>)}
                </select>
                {formErrors.obra && <p className="text-red-400 text-xs mt-1">{formErrors.obra}</p>}
              </div>

              {/* Solicitante */}
              <div>
                <label className="block text-sm font-medium text-[#c9d8ed] mb-2">Solicitante</label>
                <input
                  type="text"
                  value={formData.solicitante}
                  onChange={e => setFormData({ ...formData, solicitante: e.target.value })}
                  disabled={drawerMode === "view"}
                  placeholder="Nombre del solicitante"
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-[#4a6080] disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              {/* Proveedor */}
              <div>
                <label className="block text-sm font-medium text-[#c9d8ed] mb-2">Proveedor</label>
                <input
                  type="text"
                  value={formData.proveedor}
                  onChange={e => setFormData({ ...formData, proveedor: e.target.value })}
                  disabled={drawerMode === "view"}
                  placeholder="Nombre del proveedor"
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-[#4a6080] disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-500/50 focus:outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-[#c9d8ed] mb-2">Descripción *</label>
                <textarea
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  disabled={drawerMode === "view"}
                  placeholder="Descripción detallada del gasto"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-[#4a6080] disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-500/50 focus:outline-none resize-none"
                />
                {formErrors.descripcion && <p className="text-red-400 text-xs mt-1">{formErrors.descripcion}</p>}
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-medium text-[#c9d8ed] mb-2">Monto *</label>
                <input
                  type="number" min="0"
                  value={formData.monto}
                  onChange={e => setFormData({ ...formData, monto: e.target.value })}
                  disabled={drawerMode === "view"}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-[#4a6080] disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-500/50 focus:outline-none"
                />
                {formErrors.monto && <p className="text-red-400 text-xs mt-1">{formErrors.monto}</p>}
              </div>

              {/* Estatus */}
              <div>
                <label className="block text-sm font-medium text-[#c9d8ed] mb-2">Estatus</label>
                <select
                  value={formData.estatus}
                  onChange={e => setFormData({ ...formData, estatus: e.target.value })}
                  disabled={drawerMode === "view"}
                  className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-500/50 focus:outline-none"
                >
                  {ESTATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Comprobante Upload / Preview */}
              <div>
                <label className="block text-sm font-medium text-[#c9d8ed] mb-2">Comprobante (Imagen/PDF)</label>

                {/* Preview if exists and viewing */}
                {drawerMode === "view" && selectedGasto?.imagen_url && (
                  <div className="mb-3 p-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                    {getComprobanteMimeType(selectedGasto.imagen_url) === "image" ? (
                      <div className="relative w-full h-32 bg-black/20 rounded overflow-hidden">
                        <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/expedientes/${selectedGasto.imagen_url}`} alt="Comprobante" className="w-full h-full object-cover" />
                      </div>
                    ) : getComprobanteMimeType(selectedGasto.imagen_url) === "pdf" ? (
                      <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/expedientes/${selectedGasto.imagen_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-aria-accent hover:text-aria-accent text-sm">
                        <Paperclip className="w-4 h-4" />
                        Ver PDF
                      </a>
                    ) : null}
                  </div>
                )}

                {/* File input (only in create/edit) */}
                {drawerMode !== "view" && (
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => setFormData({ ...formData, comprobante: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-500/50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30"
                  />
                )}

                {formData.comprobante && <p className="text-xs text-[#7f93b0] mt-2">Archivo: {formData.comprobante.name}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.08] p-6 bg-[rgba(4,8,16,0.98)] backdrop-blur flex gap-3 justify-end sticky bottom-0">
              {drawerMode === "view" && (
                <>
                  <button onClick={closeDrawer} className="px-5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.06] transition-all">
                    Cerrar
                  </button>
                  <button onClick={switchToEdit} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-aria-primary-light border border-aria-primary/30 text-aria-accent hover:bg-aria-primary-hover/30 transition-all">
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </button>
                  <button onClick={() => setConfirmModal({ open: true, id: selectedGasto?.id || "", titulo: selectedGasto?.descripcion || "" })} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all">
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                </>
              )}

              {drawerMode === "create" && (
                <>
                  <button onClick={closeDrawer} className="px-5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.06] transition-all">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} disabled={submitting || uploadingFile} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting || uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {submitting || uploadingFile ? "Guardando..." : "Crear"}
                  </button>
                </>
              )}

              {drawerMode === "edit" && (
                <>
                  <button onClick={() => setDrawerMode("view")} className="px-5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.06] transition-all">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} disabled={submitting || uploadingFile} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting || uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                    {submitting || uploadingFile ? "Guardando..." : "Actualizar"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        open={confirmModal.open}
        title="Eliminar Gasto"
        message={`¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmModal({ open: false, id: "", titulo: "" })}
      />
    </div>
  );
}
