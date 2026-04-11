"use client";
import AriaBackButton from "@/components/AriaBackButton";
import { useState, useEffect } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import { useFlashMessage } from "@/lib/use-flash-message";
import FlashBanner from "@/components/FlashBanner";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Search, Edit2, Save, X, Loader2,
  Users, Power, FolderOpen
} from "lucide-react";
import { EntityFolderDrawer } from "@/components/EntityFolder";

/**
 * MÓDULO CLIENTES — Bloque 5 cierre funcional ARIA27 (7-Abr-2026)
 *
 * Tabla: public.clientes (ver sql/clientes_plantillas.sql)
 * Soporta CRUD + baja lógica + búsqueda + expediente reusable (entity_type='cliente').
 */

interface Cliente {
  id: string;
  nombre: string;
  rfc: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  dias_credito: number;
  observaciones: string | null;
  estatus: string;
  created_at?: string;
  updated_at?: string;
}

const FORM_INIT = {
  nombre: "",
  rfc: "",
  contacto: "",
  telefono: "",
  email: "",
  dias_credito: 0,
  observaciones: "",
  estatus: "ACTIVO",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState<"ACTIVOS" | "INACTIVOS" | "TODOS">("ACTIVOS");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...FORM_INIT });
  const [saving, setSaving] = useState(false);
  const [expedienteCli, setExpedienteCli] = useState<Cliente | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
  const { msg, flash, clear } = useFlashMessage();

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre");
    if (error) {
      if (error && 'code' in error && error.code === "42P01") {
        flash("err", "Falta crear tabla clientes. Ver sql/clientes_plantillas.sql");
      } else {
        flash("err", error.message);
      }
      setClientes([]);
    } else if (data) {
      setClientes(data as Cliente[]);
    }
    setLoading(false);
  };


  const reset = () => { setForm({ ...FORM_INIT }); setEditId(null); setShowForm(false); };

  const abrirEdicion = (c: Cliente) => {
    setEditId(c.id);
    setForm({
      nombre: c.nombre || "",
      rfc: c.rfc || "",
      contacto: c.contacto || "",
      telefono: c.telefono || "",
      email: c.email || "",
      dias_credito: c.dias_credito ?? 0,
      observaciones: c.observaciones || "",
      estatus: c.estatus || "ACTIVO",
    });
    setShowForm(true);
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre?.trim()) errors.nombre = "El nombre / razón social es obligatorio";
    if (form.dias_credito && (isNaN(parseInt(form.dias_credito)) || parseInt(form.dias_credito) < 0)) {
      errors.dias_credito = "Días de crédito debe ser >= 0";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setSaving(true);
    const payload = { ...form };
    payload.dias_credito = parseInt(payload.dias_credito) || 0;
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    payload.estatus = form.estatus || "ACTIVO";

    if (editId) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editId);
      if (error) { flash("err", "Error: " + error.message); setSaving(false); return; }
      flash("ok", "Guardado correctamente");
    } else {
      const { error } = await supabase.from("clientes").insert(payload);
      if (error) { flash("err", "Error: " + error.message); setSaving(false); return; }
      flash("ok", "Guardado correctamente");
    }
    setSaving(false);
    reset();
    cargar();
  };

  const toggleEstatus = async (c: Cliente) => {
    const nuevo = c.estatus === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    setConfirmState({
      open: true,
      msg: `¿Marcar a "${c.nombre}" como ${nuevo}?`,
      onOk: async () => {
        const { error } = await supabase.from("clientes").update({ estatus: nuevo }).eq("id", c.id);
        if (error) { flash("err", "Error: " + error.message); return; }
        flash("ok", "Guardado correctamente");
        cargar();
      }
    });
  };

  const filtrados = clientes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (c.nombre || "").toLowerCase().includes(q)
      || (c.rfc || "").toLowerCase().includes(q)
      || (c.contacto || "").toLowerCase().includes(q)
      || (c.email || "").toLowerCase().includes(q);
    let matchEst = true;
    if (filtroEstatus === "ACTIVOS") matchEst = c.estatus === "ACTIVO";
    else if (filtroEstatus === "INACTIVOS") matchEst = c.estatus === "INACTIVO";
    return matchSearch && matchEst;
  });

  const stats = {
    total: clientes.length,
    activos: clientes.filter(c => c.estatus === "ACTIVO").length,
    inactivos: clientes.filter(c => c.estatus === "INACTIVO").length,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <FlashBanner msg={msg} />
      <div className="flex-none p-6 pb-3 border-b border-white/10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" /> Clientes
            </h1>
            <p className="text-xs text-slate-400">CRUD + baja lógica + expediente documental reusable</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/dashboard/clientes/cotizaciones"
              className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 flex items-center gap-2"
            >
              Cotizaciones
            </a>
            <button
              onClick={() => { if (showForm) reset(); else { setForm({ ...FORM_INIT }); setShowForm(true); } }}
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 flex items-center gap-2"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancelar" : "Nuevo cliente"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Total", value: stats.total, color: "text-white" },
            { label: "Activos", value: stats.activos, color: "text-emerald-400" },
            { label: "Inactivos", value: stats.inactivos, color: "text-slate-400" },
          ].map(s => (
            <div key={s.label} className="p-3 bg-white/5 rounded-lg">
              <p className={`text-xl font-bold ${s.color}`}>{loading ? "…" : s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre, RFC, contacto o email…"
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          <select
            value={filtroEstatus}
            onChange={e => setFiltroEstatus(e.target.value as "ACTIVOS" | "INACTIVOS" | "TODOS")}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="ACTIVOS">Solo activos</option>
            <option value="INACTIVOS">Solo inactivos</option>
            <option value="TODOS">Todos</option>
          </select>
        </div>
      </div>

      {msg && (
        <div className={`mx-6 mt-3 px-4 py-2 rounded-lg text-sm ${msg.tipo === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {msg.texto}
        </div>
      )}

      {showForm && (
        <div className="flex-none mx-6 mt-3 p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <h3 className="text-base font-semibold text-white mb-3">{editId ? "Editar cliente" : "Nuevo cliente"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Nombre / razón social *</label>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              {formErrors.nombre && <p className="text-red-400 text-xs mt-1">{formErrors.nombre}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">RFC</label>
              <input value={form.rfc} onChange={e => setForm({ ...form, rfc: e.target.value.toUpperCase() })} maxLength={13} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm uppercase" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Contacto principal</label>
              <input value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Días de crédito</label>
              <input type="number" min={0} value={form.dias_credito} onChange={e => setForm({ ...form, dias_credito: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
              {formErrors.dias_credito && <p className="text-red-400 text-xs mt-1">{formErrors.dias_credito}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Estatus</label>
              <select value={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.value })} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-slate-400 mb-1 block">Observaciones</label>
              <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={guardar} disabled={saving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? "Guardar cambios" : "Crear cliente"}
            </button>
            <button onClick={reset} className="px-5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">RFC</th>
                <th className="text-left p-3">Contacto</th>
                <th className="text-left p-3">Teléfono / Email</th>
                <th className="text-right p-3">Crédito</th>
                <th className="text-center p-3">Estatus</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto" /></td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Sin clientes para los filtros actuales.</td></tr>
              ) : filtrados.map(c => (
                <tr key={c.id} className={`border-t border-white/5 hover:bg-white/[0.02] ${c.estatus === "INACTIVO" ? "opacity-60" : ""}`}>
                  <td className="p-3">
                    <p className="text-white font-medium">{c.nombre}</p>
                    {c.observaciones && <p className="text-xs text-slate-500 truncate max-w-xs">{c.observaciones}</p>}
                  </td>
                  <td className="p-3 text-slate-300 font-mono text-xs">{c.rfc || "—"}</td>
                  <td className="p-3 text-slate-300">{c.contacto || "—"}</td>
                  <td className="p-3 text-slate-400 text-xs">
                    {c.telefono && <p>{c.telefono}</p>}
                    {c.email && <p className="text-blue-400/80">{c.email}</p>}
                    {!c.telefono && !c.email && "—"}
                  </td>
                  <td className="p-3 text-right text-amber-400">{c.dias_credito > 0 ? `${c.dias_credito} d` : "—"}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${c.estatus === "ACTIVO" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                      {c.estatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setExpedienteCli(c)} title="Expediente" className="p-1.5 text-violet-400/70 hover:text-violet-400 hover:bg-violet-500/10 rounded">
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button onClick={() => abrirEdicion(c)} title="Editar" className="p-1.5 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleEstatus(c)} title={c.estatus === "ACTIVO" ? "Inactivar" : "Reactivar"} className="p-1.5 text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 rounded">
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EntityFolderDrawer
        open={!!expedienteCli}
        onClose={() => setExpedienteCli(null)}
        entityType="cliente"
        entityId={expedienteCli?.id || ""}
        entityName={expedienteCli?.nombre}
      />

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => { confirmState.onOk(); setConfirmState(p => ({...p, open: false})); }}
        onCancel={() => setConfirmState(p => ({...p, open: false}))}
      />
    </div>
  );
}
