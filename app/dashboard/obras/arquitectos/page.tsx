"use client";
/**
 * /dashboard/obras/arquitectos
 *
 * Admin CRUD de Arquitectos de Obra para feature "avances WA -> BD".
 * Solicitud Daisy + JJ 03-Jun-2026.
 *
 * Permite que JJ o Daisy:
 *   - Den de alta arquitectos (nombre + WhatsApp + obras asignadas).
 *   - Editen o desactiven cualquiera.
 *   - Vean a quien le toca cada obra.
 *
 * Cuando un arquitecto manda un reporte de avance al bot WhatsApp JJCRM27,
 * la app lo identifica por su whatsapp_phone (ver /api/webhook/avances)
 * y le precarga el catalogo de sus obras para el parser Claude.
 */
import { useEffect, useState } from "react";
import CanonPageHeader from "@/components/ui/CanonPageHeader";
import KpiCard from "@/components/ui/KpiCard";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { supabase } from "@/lib/supabase";
import {
  Plus, Edit2, Trash2, X, Save, Loader2, Phone, HardHat, Search,
} from "lucide-react";

interface ObraLite {
  id: string;
  codigo: string | null;
  nombre: string | null;
}
interface Arquitecto {
  id: string;
  full_name: string;
  email: string | null;
  whatsapp_phone: string | null;
  position: string | null;
  status: string | null;
  obras: ObraLite[];
}
interface FormState {
  id: string | null;
  full_name: string;
  whatsapp_phone: string;
  email: string;
  obra_ids: string[];
}

const EMPTY_FORM: FormState = {
  id: null,
  full_name: "",
  whatsapp_phone: "",
  email: "",
  obra_ids: [],
};

export default function ArquitectosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [arquitectos, setArquitectos] = useState<Arquitecto[]>([]);
  const [obras, setObras] = useState<ObraLite[]>([]);
  const [filtro, setFiltro] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const { msg, flash } = useFlashMessage(2500);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/obras/arquitectos").then((r) => r.json()),
        supabase
          .from("centros_trabajo")
          .select("id, codigo, nombre")
          .order("nombre", { ascending: true }),
      ]);
      setArquitectos((r1?.arquitectos as Arquitecto[]) || []);
      setObras(((r2.data as ObraLite[]) || []).filter((o) => o.nombre));
    } catch (e: unknown) {
      flash("err", (e as { message?: string })?.message || "Error de red");
    }
    setLoading(false);
  };

  const abrirNuevo = () => {
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const abrirEditar = (a: Arquitecto) => {
    setForm({
      id: a.id,
      full_name: a.full_name,
      whatsapp_phone: a.whatsapp_phone || "",
      email: a.email || "",
      obra_ids: a.obras.map((o) => o.id),
    });
    setDrawerOpen(true);
  };

  const guardar = async () => {
    if (!form.full_name.trim()) {
      flash("err", "Nombre requerido");
      return;
    }
    if (!form.whatsapp_phone.trim()) {
      flash("err", "WhatsApp requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/obras/arquitectos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: form.id || undefined,
          full_name: form.full_name.trim(),
          whatsapp_phone: form.whatsapp_phone.trim(),
          email: form.email.trim() || null,
          obra_ids: form.obra_ids,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Error");
      flash("ok", form.id ? "Actualizado" : "Arquitecto agregado");
      setDrawerOpen(false);
      await cargar();
    } catch (e: unknown) {
      flash("err", (e as { message?: string })?.message || "Error");
    }
    setSaving(false);
  };

  const eliminar = async (a: Arquitecto) => {
    if (!confirm(`Quitar a ${a.full_name} como Arquitecto?\n(No se elimina del catalogo de personal, solo deja de ser arquitecto)`)) return;
    try {
      const res = await fetch(`/api/obras/arquitectos/${a.id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Error");
      flash("ok", "Quitado");
      await cargar();
    } catch (e: unknown) {
      flash("err", (e as { message?: string })?.message || "Error");
    }
  };

  const toggleObraInForm = (id: string) => {
    setForm((f) => ({
      ...f,
      obra_ids: f.obra_ids.includes(id) ? f.obra_ids.filter((x) => x !== id) : [...f.obra_ids, id],
    }));
  };

  const filtrados = arquitectos.filter((a) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      a.full_name.toLowerCase().includes(q) ||
      (a.whatsapp_phone || "").includes(q) ||
      a.obras.some((o) => (o.nombre || "").toLowerCase().includes(q))
    );
  });

  const totalObrasAsignadas = arquitectos.reduce((sum, a) => sum + a.obras.length, 0);
  const sinObra = arquitectos.filter((a) => a.obras.length === 0).length;

  return (
    <div className="aria-bg-canon min-h-full p-6 space-y-5">
      <FlashBanner msg={msg} />
      <CanonPageHeader
        title="Arquitectos de Obra"
        subtitle="Quien manda los avances por WhatsApp y a que obra van"
        backHref="/dashboard/obras"
        icon={<HardHat className="w-6 h-6" />}
        right={
          <button
            onClick={abrirNuevo}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_6px_rgba(0,0,0,0.30)] hover:from-[#1D4ED8] hover:to-[#1E40AF] inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Arquitecto
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Arquitectos" value={arquitectos.length} icon={<HardHat className="w-4 h-4" />} />
        <KpiCard label="Obras asignadas" value={totalObrasAsignadas} icon={<HardHat className="w-4 h-4" />} variant="emerald" />
        <KpiCard label="Sin obra" value={sinObra} variant={sinObra > 0 ? "rose" : "neutral"} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7f93b0]" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nombre, WhatsApp u obra"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0B1626] border border-white/10 text-white placeholder:text-[#7f93b0] text-sm focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0B1626]/60">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-[#A8BBD5] uppercase text-[11px] tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Arquitecto</th>
              <th className="text-left px-4 py-3 font-semibold">WhatsApp</th>
              <th className="text-left px-4 py-3 font-semibold">Obras asignadas</th>
              <th className="text-right px-4 py-3 font-semibold w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-[#7f93b0]">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-[#7f93b0]">
                  {arquitectos.length === 0
                    ? "Sin arquitectos. Da de alta el primero con + Nuevo Arquitecto."
                    : "Sin resultados con el filtro."}
                </td>
              </tr>
            ) : (
              filtrados.map((a) => (
                <tr key={a.id} className="border-t border-white/[0.06] hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{a.full_name}</div>
                    {a.email && (
                      <div className="text-[12px] text-[#7f93b0]">{a.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#D7E3F4]">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#7f93b0]" />
                      {a.whatsapp_phone || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.obras.length === 0 ? (
                      <span className="text-[12px] text-[#E0A04A]">Sin obra asignada</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {a.obras.map((o) => (
                          <span
                            key={o.id}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-600/15 text-emerald-300 border border-emerald-500/25"
                          >
                            {o.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => abrirEditar(a)}
                        title="Editar"
                        className="p-1.5 rounded-md text-[#A8BBD5] hover:text-white hover:bg-white/[0.06]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => eliminar(a)}
                        title="Quitar rol"
                        className="p-1.5 rounded-md text-[#A8BBD5] hover:text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 flex justify-end" onClick={() => setDrawerOpen(false)}>
          <div
            className="w-full max-w-md h-full bg-[#0B1626] border-l border-white/10 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#0B1626] px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {form.id ? "Editar Arquitecto" : "Nuevo Arquitecto"}
              </h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-md text-[#A8BBD5] hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] text-[#A8BBD5] mb-1">
                  Nombre completo <span className="text-rose-400">*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#070E1B] border border-white/10 text-white text-sm"
                  placeholder="Arq. Nombre Apellido"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#A8BBD5] mb-1">
                  WhatsApp <span className="text-rose-400">*</span>
                </label>
                <input
                  value={form.whatsapp_phone}
                  onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#070E1B] border border-white/10 text-white text-sm"
                  placeholder="4951045116"
                />
                <p className="text-[11px] text-[#7f93b0] mt-1">
                  10 digitos. Se guarda sin espacios ni signos.
                </p>
              </div>

              <div>
                <label className="block text-[12px] text-[#A8BBD5] mb-1">
                  Email (opcional)
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#070E1B] border border-white/10 text-white text-sm"
                  placeholder="arquitecto@gcuavante.com"
                />
              </div>

              <div>
                <label className="block text-[12px] text-[#A8BBD5] mb-2">
                  Obras asignadas ({form.obra_ids.length})
                </label>
                <div className="border border-white/10 rounded-lg max-h-64 overflow-y-auto bg-[#070E1B]">
                  {obras.length === 0 ? (
                    <div className="text-center py-8 text-[#7f93b0] text-sm">
                      Sin obras en catalogo.
                    </div>
                  ) : (
                    obras.map((o) => {
                      const checked = form.obra_ids.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => toggleObraInForm(o.id)}
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-white/[0.05] border-b border-white/[0.04] last:border-0 ${
                            checked ? "bg-emerald-600/10" : ""
                          }`}
                        >
                          <span className="text-white">{o.nombre}</span>
                          <span className={`text-[11px] ${checked ? "text-emerald-300" : "text-[#7f93b0]"}`}>
                            {checked ? "ASIGNADA" : "asignar"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#0B1626] border-t border-white/10 px-5 py-4 flex gap-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 px-4 py-2 rounded-full text-sm font-semibold text-[#A8BBD5] border border-white/10 hover:bg-white/[0.04]"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                className="flex-1 px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_6px_rgba(0,0,0,0.30)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {form.id ? "Actualizar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
