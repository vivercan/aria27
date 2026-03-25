"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, BookOpen, Loader2, CheckCircle2, Clock, MessageSquare, Plus, Trash2, X, Save } from "lucide-react";
import Link from "next/link";

interface Recordatorio {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  tipo: string;
  fecha_hora: string;
  canal: string;
  status_entrega: string;
  created_at: string;
}

const EMPTY = { empleado_nombre: "", tipo: "BITACORA", fecha_hora: "", canal: "WHATSAPP" };

export default function RecordatoriosPage() {
  const [records, setRecords] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    supabase.from("recordatorios_bitacora").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setRecords(data || []);
      setLoading(false);
    });
  }, []);

  const guardar = async () => {
    if (!form.empleado_nombre) { alert("Nombre es requerido"); return; }
    setSaving(true);
    const { error: recordatoriosBitacoraerr3 } = await supabase.from("recordatorios_bitacora").insert({ empleado_nombre: form.empleado_nombre, tipo: form.tipo, fecha_hora: form.fecha_hora || null, canal: form.canal, status_entrega: "PENDIENTE" });
    if (recordatoriosBitacoraerr3) console.error("Error inserting recordatorios_bitacora:", recordatoriosBitacoraerr3.message);
    const { data, error: recordatoriosBitacoraerr2 } = await supabase.from("recordatorios_bitacora").select("*").order("created_at", { ascending: false });
    if (recordatoriosBitacoraerr2) console.error("Error loading recordatorios_bitacora:", recordatoriosBitacoraerr2.message);
    setRecords(data || []);
    setForm(EMPTY); setShowForm(false); setSaving(false);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar?")) return;
    const { error: recordatoriosBitacoraerr } = await supabase.from("recordatorios_bitacora").delete().eq("id", id);
    if (recordatoriosBitacoraerr) console.error("Error deleting recordatorios_bitacora:", recordatoriosBitacoraerr.message);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const statusColor: Record<string, string> = {
    PENDIENTE: "bg-amber-500/20 text-amber-300", ENVIADO: "bg-emerald-500/20 text-emerald-300", FALLIDO: "bg-red-500/20 text-red-300"
  };

  return (
    <div className="flex flex-col gap-4 p-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/configuracion" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold">Recordatorios</h1>
            <p className="text-sm text-slate-400">Recordatorios automáticos por WhatsApp</p>
          </div>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold hover:bg-blue-400 transition">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <BookOpen className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{records.length}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <Clock className="w-5 h-5 text-amber-400 mb-2" />
          <p className="text-2xl font-bold">{records.filter(r => r.status_entrega === "PENDIENTE").length}</p>
          <p className="text-xs text-slate-400">Pendientes</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold">{records.filter(r => r.status_entrega === "ENVIADO").length}</p>
          <p className="text-xs text-slate-400">Enviados</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="grid grid-cols-[1fr_100px_120px_100px_100px_50px] gap-2 px-4 py-3 border-b border-white/10 bg-white/5 text-[11px] font-medium uppercase text-white/50 sticky top-0">
          <div>Empleado</div><div>Tipo</div><div>Fecha/Hora</div><div>Canal</div><div>Status</div><div></div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-sm text-white/40">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Sin recordatorios. Crea uno para programar envíos automáticos.
          </div>
        ) : records.map(r => (
          <div key={r.id} className="grid grid-cols-[1fr_100px_120px_100px_100px_50px] gap-2 px-4 py-3 text-sm border-b border-white/[0.04] hover:bg-white/[0.02]">
            <div className="font-medium truncate">{r.empleado_nombre}</div>
            <div className="text-xs text-slate-400">{r.tipo}</div>
            <div className="text-xs text-slate-400">{r.fecha_hora || "—"}</div>
            <div className="text-xs"><span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">{r.canal}</span></div>
            <div><span className={`px-2 py-0.5 rounded-full text-[10px] ${statusColor[r.status_entrega] || statusColor.PENDIENTE}`}>{r.status_entrega}</span></div>
            <div><button onClick={() => eliminar(r.id)} className="text-red-400/50 hover:text-red-400 text-xs">✕</button></div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nuevo Recordatorio</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-white/60">Empleado *</label>
                <input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-blue-400" value={form.empleado_nombre} onChange={e => setForm({...form, empleado_nombre: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Tipo</label>
                  <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                    <option>BITACORA</option><option>ASISTENCIA</option><option>ENTREGA</option><option>GENERAL</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Canal</label>
                  <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none" value={form.canal} onChange={e => setForm({...form, canal: e.target.value})}>
                    <option>WHATSAPP</option><option>EMAIL</option><option>AMBOS</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Fecha y hora</label>
                <input type="datetime-local" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-blue-400" value={form.fecha_hora} onChange={e => setForm({...form, fecha_hora: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-sm hover:bg-white/10">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 text-sm font-semibold hover:bg-blue-400">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, BookOpen, Loader2, CheckCircle2, Clock, MessageSquare, Plus, Trash2, X, Save } from "lucide-react";
import Link from "next/link";

interface Recordatorio {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  tipo: string;
  fecha_hora: string;
  canal: string;
  status_entrega: string;
  created_at: string;
}

const EMPTY = { empleado_nombre: "", tipo: "BITACORA", fecha_hora: "", canal: "WHATSAPP" };

export default function RecordatoriosPage() {
  const [records, setRecords] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    supabase.from("recordatorios_bitacora").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setRecords(data || []);
      setLoading(false);
    });
  }, []);

  const guardar = async () => {
    if (!form.empleado_nombre) { alert("Nombre es requerido"); return; }
    setSaving(true);
    await supabase.from("recordatorios_bitacora").insert({ empleado_nombre: form.empleado_nombre, tipo: form.tipo, fecha_hora: form.fecha_hora || null, canal: form.canal, status_entrega: "PENDIENTE" });
    const { data } = await supabase.from("recordatorios_bitacora").select("*").order("created_at", { ascending: false });
    setRecords(data || []);
    setForm(EMPTY); setShowForm(false); setSaving(false);
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("recordatorios_bitacora").delete().eq("id", id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const statusColor: Record<string, string> = {
    PENDIENTE: "bg-amber-500/20 text-amber-300", ENVIADO: "bg-emerald-500/20 text-emerald-300", FALLIDO: "bg-red-500/20 text-red-300"
  };

  return (
    <div className="flex flex-col gap-4 p-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/configuracion" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold">Recordatorios</h1>
            <p className="text-sm text-slate-400">Recordatorios automáticos por WhatsApp</p>
          </div>
        </div>
        <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold hover:bg-blue-400 transition">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <BookOpen className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{records.length}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <Clock className="w-5 h-5 text-amber-400 mb-2" />
          <p className="text-2xl font-bold">{records.filter(r => r.status_entrega === "PENDIENTE").length}</p>
          <p className="text-xs text-slate-400">Pendientes</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold">{records.filter(r => r.status_entrega === "ENVIADO").length}</p>
          <p className="text-xs text-slate-400">Enviados</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="grid grid-cols-[1fr_100px_120px_100px_100px_50px] gap-2 px-4 py-3 border-b border-white/10 bg-white/5 text-[11px] font-medium uppercase text-white/50 sticky top-0">
          <div>Empleado</div><div>Tipo</div><div>Fecha/Hora</div><div>Canal</div><div>Status</div><div></div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-sm text-white/40">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Sin recordatorios. Crea uno para programar envíos automáticos.
          </div>
        ) : records.map(r => (
          <div key={r.id} className="grid grid-cols-[1fr_100px_120px_100px_100px_50px] gap-2 px-4 py-3 text-sm border-b border-white/[0.04] hover:bg-white/[0.02]">
            <div className="font-medium truncate">{r.empleado_nombre}</div>
            <div className="text-xs text-slate-400">{r.tipo}</div>
            <div className="text-xs text-slate-400">{r.fecha_hora || "—"}</div>
            <div className="text-xs"><span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">{r.canal}</span></div>
            <div><span className={`px-2 py-0.5 rounded-full text-[10px] ${statusColor[r.status_entrega] || statusColor.PENDIENTE}`}>{r.status_entrega}</span></div>
            <div><button onClick={() => eliminar(r.id)} className="text-red-400/50 hover:text-red-400 text-xs">✕</button></div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nuevo Recordatorio</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-white/60">Empleado *</label>
                <input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-blue-400" value={form.empleado_nombre} onChange={e => setForm({...form, empleado_nombre: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Tipo</label>
                  <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                    <option>BITACORA</option><option>ASISTENCIA</option><option>ENTREGA</option><option>GENERAL</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Canal</label>
                  <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none" value={form.canal} onChange={e => setForm({...form, canal: e.target.value})}>
                    <option>WHATSAPP</option><option>EMAIL</option><option>AMBOS</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">Fecha y hora</label>
                <input type="datetime-local" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-blue-400" value={form.fecha_hora} onChange={e => setForm({...form, fecha_hora: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-sm hover:bg-white/10">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 text-sm font-semibold hover:bg-blue-400">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// test
