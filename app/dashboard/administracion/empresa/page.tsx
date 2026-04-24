"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Building2, MapPin, FileText, Users, Loader2,
  Edit2, Save, X, Briefcase, FolderOpen
} from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface Empresa {
  id: string;
  nombre: string;
  rfc: string;
  regimen: string;
  domicilio_fiscal: string;
  representante_legal: string;
  telefono: string;
  email: string;
  created_at: string;
}

interface CentroTrabajo {
  id: number;
  nombre: string;
  direccion: string;
  estado: string;
  cliente: string;
}

export default function EmpresaPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [centros, setCentros] = useState<CentroTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEmpresa, setEditEmpresa] = useState<Empresa | null>(null);
  const [form, setForm] = useState<any>({});
  const [guardando, setGuardando] = useState(false);
  // EX-3 18-Abr-2026: flash canónico via useFlashMessage (wrapper mantiene success/error)
  const { msg: mensaje, flash: _flash } = useFlashMessage(3000);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    const [empRes, ctRes] = await Promise.all([
      supabase.from("empresas").select("*").order("nombre"),
      supabase.from("centros_trabajo").select("id,nombre,direccion,estado,cliente").order("nombre"),
    ]);
    if (empRes.data) setEmpresas(empRes.data);
    if (ctRes.data) setCentros(ctRes.data);
    setLoading(false);
  };

  const msg = (tipo: "success" | "error" | "info", texto: string) => _flash(tipo === "success" ? "ok" : "err", texto);

  const iniciarEdicion = (e: Empresa) => {
    setEditEmpresa(e);
    setForm({
      nombre: e.nombre || "",
      rfc: e.rfc || "",
      regimen: e.regimen || "",
      domicilio_fiscal: e.domicilio_fiscal || "",
      representante_legal: e.representante_legal || "",
      telefono: e.telefono || "",
      email: e.email || "",
    });
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre?.trim()) errors.nombre = "El nombre es obligatorio";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardar = async () => {
    if (!editEmpresa || !validar()) return;
    setGuardando(true);
    const payload: Record<string, string | null> = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });

    const { error } = await supabase.from("empresas").update(payload).eq("id", editEmpresa.id);
    if (error) { msg("error", error?.message ?? "Error"); }
    else { msg("success", "Empresa actualizada"); setEditEmpresa(null); cargar(); }
    setGuardando(false);
  };
  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600";

  const activas = centros.filter(c => c.estado === "ACTIVA").length;

  return (
    <div className="aria-bg-canon h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <AriaBackButton href="/dashboard/administracion" />
        <div>
          <h1 className="text-2xl font-bold text-white">Datos de Empresa</h1>
          <p className="text-xs text-[#7f93b0]">Información de GCU Avante y centros de costo</p>
        </div>
      </div>

      <FlashBanner msg={mensaje} />

      <div className="flex-1 overflow-y-auto space-y-4">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-aria-accent" />
          </div>
        ) : (
          <>
            {/* Empresa Cards */}
            {empresas.length === 0 ? (
              <div className="p-5 rounded-xl bg-[#0c1d38]/50 border border-white/[0.05] text-center">
                <Building2 className="w-10 h-10 text-[#4a6080] mx-auto mb-2" />
                <p className="text-[#7f93b0] text-sm">No hay empresas registradas en la tabla.</p>
                <p className="text-[#4a6080] text-xs mt-1">Los datos de empresa se cargan desde Supabase.</p>
              </div>
            ) : empresas.map(emp => (
              <div key={emp.id} className="p-5 rounded-xl bg-[#0c1d38]/50 border border-white/[0.05]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-aria-primary/10">
                      <Building2 className="w-6 h-6 text-aria-accent" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">{emp.nombre || "Sin nombre"}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/dashboard/administracion/documentacion"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30 text-xs"
                      title="Documentos legales corporativos (acta, REPSE, CSF, etc.)"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Documentación legal
                    </Link>
                    <button
                      onClick={() => iniciarEdicion(emp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30 text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-[#4a6080] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#4a6080] text-xs">RFC</p>
                      <p className="text-white">{emp.rfc || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-[#4a6080] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#4a6080] text-xs">Régimen</p>
                      <p className="text-white">{emp.regimen || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#4a6080] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#4a6080] text-xs">Domicilio Fiscal</p>
                      <p className="text-white">{emp.domicilio_fiscal || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-[#4a6080] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#4a6080] text-xs">Representante Legal</p>
                      <p className="text-white">{emp.representante_legal || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Centros de Costo */}
            <div className="p-5 rounded-xl bg-[#0c1d38]/50 border border-white/[0.05]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-[#c9d8ed]">Centros de Costo / Obras</h3>
                <span className="text-xs text-[#4a6080]">{centros.length} registrados · {activas} activos</span>
              </div>
              {centros.length === 0 ? (
                <p className="text-[#4a6080] text-sm text-center py-4">Sin centros de trabajo registrados.</p>
              ) : (
                <div className="space-y-2">
                  {centros.map(ct => (
                    <div key={ct.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">{ct.nombre}</p>
                        {ct.direccion && <p className="text-xs text-[#4a6080] mt-0.5">{ct.direccion}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {ct.cliente && <span className="text-xs text-[#4a6080]">{ct.cliente}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ct.estado === "ACTIVA" ? "bg-emerald-500/20 text-aria-accent" : "bg-slate-500/20 text-[#7f93b0]"}`}>
                          {ct.estado || "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editEmpresa && (
        <div className="fixed inset-0 bg-black/60  z-50 flex items-center justify-center p-4" onClick={() => setEditEmpresa(null)}>
          <div className="bg-[#0f1729] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <h2 className="text-lg font-bold text-white">Editar Empresa</h2>
              <button onClick={() => setEditEmpresa(null)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#7f93b0]"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputClass} />
                {formErrors.nombre && <p className="text-red-400 text-xs mt-1">{formErrors.nombre}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">RFC</label>
                  <input type="text" value={form.rfc} onChange={e => setForm({ ...form, rfc: e.target.value })} placeholder="XXX000000XX0" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Régimen Fiscal</label>
                  <input type="text" value={form.regimen} onChange={e => setForm({ ...form, regimen: e.target.value })} placeholder="General de Ley" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Domicilio Fiscal</label>
                <input type="text" value={form.domicilio_fiscal} onChange={e => setForm({ ...form, domicilio_fiscal: e.target.value })} placeholder="Aguascalientes, Ags." className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-[#7f93b0] mb-1">Representante Legal</label>
                <input type="text" value={form.representante_legal} onChange={e => setForm({ ...form, representante_legal: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Teléfono</label>
                  <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-[#7f93b0] mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/[0.08]">
              <button onClick={() => setEditEmpresa(null)} className="px-4 py-2 rounded-lg bg-white/[0.04] text-[#7f93b0] hover:bg-white/[0.06] text-sm">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-aria-accent hover:bg-aria-primary/30 text-sm disabled:opacity-50">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
