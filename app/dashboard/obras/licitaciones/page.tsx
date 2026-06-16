"use client";
import { clientLogger } from "@/lib/client-logger";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, FileText, Calendar, DollarSign, Building2, CheckCircle2, Clock, X, Save, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import AriaBackButton from "@/components/AriaBackButton";
import { fmtMoney } from "@/lib/formatters";

interface Licitacion {
  id: string;
  obra_nombre: string;
  dependencia: string;
  numero_licitacion: string;
  fecha_apertura: string;
  fecha_cierre: string;
  monto_estimado: number;
  status: string;
  paquete_generado: boolean;
  catalogo_pdf: string;
  analista_nombre: string;
  analista_email: string;
  resultado: string;
  notas: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  EN_PROCESO: "bg-aria-primary-light text-aria-accent border-aria-primary/30",
  ENVIADA: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  GANADA: "bg-emerald-500/20 text-aria-accent border-emerald-500/30",
  PERDIDA: "bg-red-500/20 text-red-300 border-red-500/30",
  CANCELADA: "bg-slate-500/20 text-[#c9d8ed] border-white/[0.1]/30",
  DESIERTA: "bg-aria-primary-light text-aria-accent border-aria-primary/30",
};

const EMPTY_FORM = {
  obra_nombre: "", dependencia: "", numero_licitacion: "", fecha_apertura: "", fecha_cierre: "",
  monto_estimado: "", status: "EN_PROCESO", analista_nombre: "", analista_email: "", notas: ""
};

export default function LicitacionesPage() {
  const log = clientLogger("LICITACIONES");
  const { msg, flash, clear } = useFlashMessage();
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, []);

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.obra_nombre?.trim()) {
      errors.obra_nombre = "Obra es requerida";
    }
    if (!form.dependencia?.trim()) {
      errors.dependencia = "Dependencia es requerida";
    }
    if (form.monto_estimado && isNaN(parseFloat(form.monto_estimado))) {
      errors.monto_estimado = "El monto debe ser un número válido";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loadData = async () => {
    const { data, error } = await supabase.from("licitaciones").select("*").order("created_at", { ascending: false });
    if (error) {
      log.error("Error loading licitaciones:", { error: error?.message });
      setLoading(false);
      return;
    }
    setLicitaciones(data || []);
    setLoading(false);
  };

  const guardar = async () => {
    if (!validar()) { flash("err", "Por favor corrige los errores en el formulario"); return; }
    setSaving(true);
    const record = {
      obra_nombre: form.obra_nombre, dependencia: form.dependencia, numero_licitacion: form.numero_licitacion,
      fecha_apertura: form.fecha_apertura || null, fecha_cierre: form.fecha_cierre || null,
      monto_estimado: form.monto_estimado ? parseFloat(form.monto_estimado) : null,
      status: form.status, analista_nombre: form.analista_nombre, analista_email: form.analista_email, notas: form.notas
    };
    if (editId) {
      const { error } = await supabase.from("licitaciones").update(record).eq("id", editId);
      if (error) {
        log.error("Error updating licitacion:", { error: error?.message });
        flash("err", "Error al actualizar licitacion: " + (error?.message || "desconocido"));
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("licitaciones").insert(record);
      if (error) {
        log.error("Error creating licitacion:", { error: error?.message });
        flash("err", "Error al guardar licitacion: " + (error?.message || "desconocido"));
        setSaving(false);
        return;
      }
    }
    setForm(EMPTY_FORM); setShowForm(false); setEditId(null); setSaving(false);
    loadData();
  };

  const editar = (l: Licitacion) => {
    setForm({
      obra_nombre: l.obra_nombre || "", dependencia: l.dependencia || "", numero_licitacion: l.numero_licitacion || "",
      fecha_apertura: l.fecha_apertura || "", fecha_cierre: l.fecha_cierre || "",
      monto_estimado: l.monto_estimado ? String(l.monto_estimado) : "", status: l.status || "EN_PROCESO",
      analista_nombre: l.analista_nombre || "", analista_email: l.analista_email || "", notas: l.notas || ""
    });
    setEditId(l.id); setShowForm(true);
  };

  const eliminar = async (id: string) => {
    setDeleteModal({open:true,id,name:""}); return; // Protected by DeleteModal
    const { error } = await supabase.from("licitaciones").delete().eq("id", id);
    if (error) {
      log.error("Error deleting licitacion:", { error: error?.message });
      return;
    }
    loadData();
  };

  const filtered = licitaciones.filter(l => {
    if (filter !== "TODOS" && l.status !== filter) return false;
    if (search && !l.obra_nombre?.toLowerCase().includes(search.toLowerCase()) && !l.dependencia?.toLowerCase().includes(search.toLowerCase()) && !l.numero_licitacion?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalEstimado = filtered.reduce((s, l) => s + (l.monto_estimado || 0), 0);
  const stats = {
    total: licitaciones.length,
    enProceso: licitaciones.filter(l => l.status === "EN_PROCESO").length,
    ganadas: licitaciones.filter(l => l.status === "GANADA").length,
    perdidas: licitaciones.filter(l => l.status === "PERDIDA").length,
  };

  const fmt = (n: number) => fmtMoney(n, { noDecimals: true });
  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "licitaciones", id: deleteModal.id, userEmail });
    } catch (e: unknown) { log.error(String(e)); }
    setDeleteModal({open:false,id:"",name:""});
    loadData();
  };

  return (
    <div className="aria-bg-canon flex flex-col gap-4 p-6 h-full overflow-auto">
      <FlashBanner msg={msg} className="mx-3 -mt-3 mb-2" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AriaBackButton href="/dashboard/obras" />
          <div>
            <h1 className="text-2xl font-bold">Licitaciones</h1>
            <p className="text-sm text-[#7f93b0]">Control de procesos de licitación</p>
          </div>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-aria-primary px-4 py-2.5 text-sm font-semibold hover:bg-aria-primary-hover transition">
          <Plus className="w-4 h-4" /> Nueva Licitación
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: FileText, color: "blue" },
          { label: "En Proceso", value: stats.enProceso, icon: Clock, color: "amber" },
          { label: "Ganadas", value: stats.ganadas, icon: CheckCircle2, color: "emerald" },
          { label: "Perdidas", value: stats.perdidas, icon: AlertTriangle, color: "red" },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <s.icon className={`w-5 h-5 text-${s.color}-400 mb-2`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-[#7f93b0]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 opacity-50" />
          <input className="w-full bg-transparent text-sm outline-none" placeholder="Buscar obra, dependencia, número..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {["TODOS","EN_PROCESO","ENVIADA","GANADA","PERDIDA","CANCELADA"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === s ? "bg-aria-primary text-white" : "bg-white/[0.04] text-[#7f93b0] hover:bg-white/[0.06]"}`}>
            {s === "TODOS" ? "Todos" : s.replace("_"," ")}
          </button>
        ))}
        <span className="text-sm text-[#7f93b0] ml-auto">{filtered.length} licitaciones · {fmt(totalEstimado)} est.</span>
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="grid grid-cols-[1fr_1fr_120px_100px_100px_110px_60px] gap-2 px-4 py-3 border-b border-white/[0.08] bg-white/[0.04] text-[11px] font-medium uppercase text-white/50 sticky top-0">
          <div>Obra</div><div>Dependencia</div><div>No. Licitación</div><div>Apertura</div><div>Monto Est.</div><div>Status</div><div></div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-aria-accent" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-white/40">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            {licitaciones.length === 0 ? "Sin licitaciones. Crea la primera." : "Sin resultados para este filtro."}
          </div>
        ) : filtered.map(l => (
          <div key={l.id} onClick={() => editar(l)} className="grid grid-cols-[1fr_1fr_120px_100px_100px_110px_60px] gap-2 px-4 py-3 text-sm border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition">
            <div className="font-medium truncate">{l.obra_nombre}</div>
            <div className="text-[#c9d8ed] truncate">{l.dependencia}</div>
            <div className="text-[#7f93b0] text-xs">{l.numero_licitacion || "—"}</div>
            <div className="text-[#7f93b0] text-xs">{l.fecha_apertura || "—"}</div>
            <div className="text-[#c9d8ed] text-xs">{l.monto_estimado ? fmt(l.monto_estimado) : "—"}</div>
            <div><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[l.status] || STATUS_COLORS.EN_PROCESO}`}>{l.status?.replace("_"," ")}</span></div>
            <div className="text-right">
              <button onClick={(e) => { e.stopPropagation(); eliminar(l.id); }} className="text-red-400/50 hover:text-red-400 text-xs">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 " onClick={() => setShowForm(false)}>
          <div className="bg-[#0f172a] border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editId ? "Editar" : "Nueva"} Licitación</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/[0.06]"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/60">Obra *</label>
                <input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={form.obra_nombre} onChange={e => setForm({...form, obra_nombre: e.target.value})} />
                {formErrors.obra_nombre && <p className="text-red-400 text-xs mt-1">{formErrors.obra_nombre}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Dependencia *</label>
                <input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={form.dependencia} onChange={e => setForm({...form, dependencia: e.target.value})} />
                {formErrors.dependencia && <p className="text-red-400 text-xs mt-1">{formErrors.dependencia}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">No. Licitación</label>
                <input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={form.numero_licitacion} onChange={e => setForm({...form, numero_licitacion: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Monto Estimado</label>
                <input type="number" min="0" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={form.monto_estimado} onChange={e => setForm({...form, monto_estimado: e.target.value})} />
                {formErrors.monto_estimado && <p className="text-red-400 text-xs mt-1">{formErrors.monto_estimado}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Fecha Apertura</label>
                <input type="date" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={form.fecha_apertura} onChange={e => setForm({...form, fecha_apertura: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Fecha Cierre</label>
                <input type="date" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={form.fecha_cierre} onChange={e => setForm({...form, fecha_cierre: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Status</label>
                <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="EN_PROCESO">En Proceso</option><option value="ENVIADA">Enviada</option>
                  <option value="GANADA">Ganada</option><option value="PERDIDA">Perdida</option>
                  <option value="CANCELADA">Cancelada</option><option value="DESIERTA">Desierta</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Analista</label>
                <input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={form.analista_nombre} onChange={e => setForm({...form, analista_nombre: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-white/60">Notas</label>
                <textarea className="w-full h-16 resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/[0.04] text-sm hover:bg-white/[0.06] transition">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-aria-primary text-sm font-semibold hover:bg-aria-primary-hover transition">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editId ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({open:false,id:"",name:""})}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Licitación"
      />
    </div>
  );
}
