"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Loader2, Settings, Clock, DollarSign, Calendar, Users, Shield } from "lucide-react";
import Link from "next/link";

interface Param { id: string; clave: string; valor: string; descripcion: string; updated_at: string; }
interface UserInfo { id: string; name: string; email: string; role: string; phone: string; active: boolean; }

const ICONS: Record<string, any> = {
  salario: DollarSign, minimo: DollarSign, aguinaldo: Calendar, vacaciones: Calendar,
  horario: Clock, hora: Clock, tolerancia: Clock, dia_pago: Calendar,
  factor: Settings, modo: Settings, default: Settings
};

const getIcon = (clave: string) => {
  for (const [key, icon] of Object.entries(ICONS)) {
    if (clave.includes(key)) return icon;
  }
  return Settings;
};

export default function ConfigGeneralPage() {
  const [params, setParams] = useState<Param[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("configuracion_nomina").select("*").order("clave"),
      supabase.from("users").select("*").order("name")
    ]).then(([{ data: p, error: pError }, { data: u, error: uError }]) => {
      if (pError) { console.error("Error loading configuracion_nomina:", pError.message); setLoading(false); return; }
      if (uError) { console.error("Error loading users:", uError.message); setLoading(false); return; }
      setParams(p || []);
      setUsers((u || []) as UserInfo[]);
      setLoading(false);
    });
  }, []);

  const handleChange = (id: string, val: string) => {
    setEdited(prev => ({ ...prev, [id]: val }));
  };

  const guardar = async (param: Param) => {
    const newVal = edited[param.id];
    if (newVal === undefined || newVal === param.valor) return;
    setSaving(param.id);
    const { error } = await supabase.from("configuracion_nomina").update({ valor: newVal, updated_at: new Date().toISOString() }).eq("id", param.id);
    if (error) { console.error("Error saving param:", error.message); setSaving(null); return; }
    setParams(prev => prev.map(p => p.id === param.id ? { ...p, valor: newVal } : p));
    setEdited(prev => { const n = { ...prev }; delete n[param.id]; return n; });
    setSaving(null);
    setMsg(`â ${param.clave} actualizado`);
    setTimeout(() => setMsg(null), 2000);
  };

  const guardarTodo = async () => {
    setSaving("all");
    for (const param of params) {
      if (edited[param.id] !== undefined && edited[param.id] !== param.valor) {
        const { error } = await supabase.from("configuracion_nomina").update({ valor: edited[param.id], updated_at: new Date().toISOString() }).eq("id", param.id);
        if (error) { console.error("Error saving param:", error.message); setSaving(null); return; }
      }
    }
    const { data, error: selectError } = await supabase.from("configuracion_nomina").select("*").order("clave");
    if (selectError) { console.error("Error loading configuracion:", selectError.message); setSaving(null); return; }
    setParams(data || []);
    setEdited({});
    setSaving(null);
    setMsg("â ConfiguraciÃ³n guardada");
    setTimeout(() => setMsg(null), 2000);
  };

  const hasChanges = Object.keys(edited).some(id => {
    const p = params.find(x => x.id === id);
    return p && edited[id] !== p.valor;
  });

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/20 text-red-300", direccion: "bg-amber-500/20 text-amber-300",
    compras: "bg-blue-500/20 text-blue-300", validador: "bg-emerald-500/20 text-emerald-300",
    usuario: "bg-gray-500/20 text-gray-300"
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="flex flex-col gap-4 p-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/configuracion" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold">ConfiguraciÃ³n General</h1>
            <p className="text-sm text-slate-400">ParÃ¡metros del sistema y usuarios</p>
          </div>
        </div>
        {hasChanges && (
          <button onClick={guardarTodo} disabled={saving === "all"} className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-400 transition">
            {saving === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cambios
          </button>
        )}
      </div>

      {msg && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{msg}</div>}

      {/* PARAMETROS DE NOMINA */}
      <section className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold">ParÃ¡metros de NÃ³mina</h2>
          <span className="text-xs text-slate-400 ml-auto">{params.length} parÃ¡metros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {params.map(p => {
            const Icon = getIcon(p.clave);
            const isEdited = edited[p.id] !== undefined && edited[p.id] !== p.valor;
            return (
              <div key={p.id} className={`flex items-center gap-3 rounded-xl p-3 transition ${isEdited ? "bg-amber-500/10 border border-amber-500/20" : "bg-black/20 border border-transparent"}`}>
                <div className="p-2 rounded-lg bg-white/5">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 truncate">{p.descripcion}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{p.clave}</p>
                </div>
                <input
                  className={`w-28 rounded-lg px-3 py-1.5 text-sm text-right outline-none transition ${isEdited ? "bg-amber-500/20 border border-amber-500/30 text-amber-200" : "bg-black/30 border border-white/10"}`}
                  value={edited[p.id] !== undefined ? edited[p.id] : p.valor}
                  onChange={e => handleChange(p.id, e.target.value)}
                  onBlur={() => guardar(p)}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* USUARIOS */}
      <section className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold">Usuarios del Sistema</h2>
          <span className="text-xs text-slate-400 ml-auto">{users.length} usuarios</span>
        </div>
        <div className="overflow-auto rounded-xl border border-white/[0.06]">
          <div className="grid grid-cols-[1fr_1fr_100px_100px] gap-2 px-4 py-2.5 border-b border-white/10 bg-white/5 text-[11px] font-medium uppercase text-white/50 sticky top-0">
            <div>Nombre</div><div>Email</div><div>Rol</div><div>Estado</div>
          </div>
          {users.map(u => (
            <div key={u.id} className="grid grid-cols-[1fr_1fr_100px_100px] gap-2 px-4 py-3 text-sm border-b border-white/[0.04] hover:bg-white/[0.02]">
              <div className="font-medium">{u.name}</div>
              <div className="text-slate-400 text-xs truncate">{u.email}</div>
              <div><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${roleColors[u.role] || roleColors.usuario}`}>{u.role}</span></div>
              <div><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${u.active ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>{u.active ? "Activo" : "Inactivo"}</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
