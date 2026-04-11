"use client";
import DeleteModal from "@/components/DeleteModal";
import FlashBanner from "@/components/FlashBanner";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { useFlashMessage } from "@/lib/use-flash-message";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Bell, Plus, Trash2, Loader2, X, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Alerta {
  id: string;
  obra_id: string;
  dias_atraso: number;
  fecha_deteccion: string;
  notificado: boolean;
  residente_id: string;
  created_at: string;
  actividad_id?: string;
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const { msg, flash } = useFlashMessage();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("alertas_atraso").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) { console.error("Error loading alertas:", error?.message); setLoading(false); return; }
      setAlertas(data || []);
      setLoading(false);
    });
  }, []);

  const marcarNotificado = async (id: string) => {
    const { error } = await supabase.from("alertas_atraso").update({ notificado: true }).eq("id", id);
    if (error) { console.error("Error updating alerta:", error?.message); flash("err", "Error: " + error?.message); return; }
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, notificado: true } : a));
  };

  const eliminar = async (id: string) => {
    setDeleteModal({open:true,id,name:""}); return; // Protected by DeleteModal
    const { error } = await supabase.from("alertas_atraso").delete().eq("id", id);
    if (error) { console.error("Error deleting alerta:", error?.message); flash("err", "Error: " + error?.message); return; }
    setAlertas(prev => prev.filter(a => a.id !== id));
  };

  const pendientes = alertas.filter(a => !a.notificado).length;
  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "alertas_atraso", id: deleteModal.id, userEmail });
    } catch (e) { console.error(e); }
    setDeleteModal({open:false,id:"",name:""});
    // Reload alertas
    const { data } = await supabase.from("alertas_atraso").select("*").order("created_at", { ascending: false });
    setAlertas(data || []);
  };

  return (
    <div className="flex flex-col gap-4 p-6 h-full overflow-auto">
      <FlashBanner msg={msg} />
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuracion" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold">Alertas de Atraso</h1>
          <p className="text-sm text-slate-400">Monitoreo de actividades atrasadas en obra</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <Bell className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{alertas.length}</p>
          <p className="text-xs text-slate-400">Total alertas</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <AlertTriangle className="w-5 h-5 text-amber-400 mb-2" />
          <p className="text-2xl font-bold">{pendientes}</p>
          <p className="text-xs text-slate-400">Pendientes</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold">{alertas.length - pendientes}</p>
          <p className="text-xs text-slate-400">Notificadas</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <div className="grid grid-cols-[1fr_100px_120px_100px_80px] gap-2 px-4 py-3 border-b border-white/10 bg-white/5 text-[11px] font-medium uppercase text-white/50 sticky top-0">
          <div>Obra / Actividad</div><div>Días atraso</div><div>Detectada</div><div>Estado</div><div></div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : alertas.length === 0 ? (
          <div className="text-center py-12 text-sm text-white/40">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Sin alertas de atraso. Las alertas se generan automáticamente cuando se detectan actividades con fechas vencidas en las obras registradas.
          </div>
        ) : alertas.map(a => (
          <div key={a.id} className="grid grid-cols-[1fr_100px_120px_100px_80px] gap-2 px-4 py-3 text-sm border-b border-white/[0.04] hover:bg-white/[0.02]">
            <div className="truncate">{a.obra_id || "â"}</div>
            <div className="text-amber-400 font-medium">{a.dias_atraso} días</div>
            <div className="text-xs text-slate-400">{a.fecha_deteccion || "â"}</div>
            <div>
              {a.notificado ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">Notificado</span>
              ) : (
                <button onClick={() => marcarNotificado(a.id)} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition">Marcar â</button>
              )}
            </div>
            <div className="text-right">
              <button onClick={() => eliminar(a.id)} className="text-red-400/50 hover:text-red-400 text-xs">â</button>
            </div>
          </div>
        ))}
      </div>

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({open:false,id:"",name:""})}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Alerta"
      />
    </div>
  );
}
