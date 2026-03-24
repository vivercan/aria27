"use client";
import React from "react";
import { useState, useEffect } from "react";
import { supabase } from "A/lib/supabase";
import { ArrowLeft, Activity, CheckCircle2, AlertTriangle, XCircle, Wrench, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EstadoActivosPage() {
  const [activos, setActivos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data, error } = await supabase.from("activos").select("*").order("nombre");
    if (error) { console.error("Error loading activos:", error.message); setLoading(false); return; }
    if (data) setActivos(data);
    setLoading(false);
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    setSaving(id);
    const { error } = await supabase.from("activos").update({ estado: nuevoEstado }).eq("id", id);
    if (error) { console.error("Error updating estado:", error.message); alert("Error: " + error.message); setSaving(null); return; }
    setActivos(prev => prev.map(a => a.id === id ? { ...a, estado: nuevoEstado } : a));
    setSaving(null);
  };

  const estados = activos.reduce((acc, a) => {
    const est = a.estado || "Sin estado";
    acc[est] = (acc[est] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = filtro === "todos" ? activos : activos.filter(a => (a.estado || "Sin estado") === filtro);

  const getIcon = (estado: string): React.ReactNode => {
    switch(estado?.toLowerCase()) {
      case "bueno": case "activo": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "mantenimiento": case "reparacion": return <Wrench className="w-4 h-4 text-amber-400" />;
      case "baja": case "daÃ±ado": return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    }
  };

  const estadoOptions = ["bueno", "mantenimiento", "reparacion", "baja"];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/activos" className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Estado de Activos</h1>
          <p className="text-sm text-slate-400">{i.activos.length} activos registrados</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFiltro("todos")} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filtro === "todos" ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
          Todos ({activos.length})
        </button>
        {Object.entries(estados).map(([est, count]) => (
          <button key={est} onClick={() => setFiltro(est)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${filtro === est ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            {getIcon(est)} {est} ({count as number})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No hay activos en esta categorÃ­a</div>
    ìÃ´ñ¥Ø±ÍÍ9µô½ÙÉ±½ÜµÕÑ¼µàµ µlØÕÙ¡tÉ½Õ¹µá°½ÉÈ½ÉÈµÝ¡¥Ñ¼ÄÀø(ñÑ±±ÍÍ9µôÜµÕ±°ÑáÐµÍ´ø(ñÑ¡±ÍÍ9µôÍÑ¥­äÑ½À´ÀµÍ±Ñ´àÀÀ¼äÀ­É½Àµ±ÕÈÑáÐµÍ±Ñ´ÐÀÀÑáÐµáÌÕÁÁÉÍø(ñÑÈø(ñÑ ±ÍÍ9µôÑáÐµ±ÐÀ´ÌùÑ¥Ù¼ð½Ñ ø(ñÑ ±ÍÍ9µôÑáÐµ±ÐÀ´Ìù
Ñ½Ëµð½Ñ ø(ñÑ ±ÍÍ9µôÑáÐµ±ÐÀ´ÌùU¥§Í¸ð½Ñ ø(ñÑ ±ÍÍ9µôÑáÐµ±ÐÀ´ÌùÍÑ¼ÑÕ°ð½Ñ ø(ñÑ ±ÍÍ9µôÑáÐµ±ÐÀ´Ìù
µ¥ÈÍÑ¼ð½Ñ ø(ð½ÑÈø(ð½Ñ¡ø(ñÑ½ä±ÍÍ9µô¥Ù¥µä¥Ù¥µÝ¡¥Ñ¼Ôø(í¥±ÑÉ¹µÀ¡ôø (ñÑÈ­äõí¹¥ô±ÍÍ9µô¡½ÙÈéµÝ¡¥Ñ¼Ôø(ñÑ±ÍÍ9µôÀ´ÌÑáÐµÝ¡¥Ñ½¹Ðµµ¥Õ´ùí¤¹¹½µÉñð¹¹µñðPôð½Ñø(ñÑ±ÍÍ9µôÀ´ÌÑáÐµÍ±Ñ´ÐÀÀùí¹Ñ½É¥ñð¹Ñ½ÉäñðPôð½Ñø(ñÑ±ÍÍ9µôÀ´ÌÑáÐµÍ±Ñ´ÐÀÀùí¤¹Õ¥¥½¸ñð¹±½Ñ¥½¸ñðPôð½Ñø(ñÑ±ÍÍ9µôÀ´ÌùíÑ%½¸¡¹ÍÑ¼ñð¥ôñÍÁ¸±ÍÍ9µôµ°´ÄÑáÐµÝ¡¥Ñùí¹ÍÑ¼ñðM¥¸ÍÑ¼ôð½ÍÁ¸øð½Ñø(ñÑ±ÍÍ9µôÀ´Ìø(ñ¥Ø±ÍÍ9µô±à¥ÑµÌµ¹ÑÈÀ´Èø(ñÍ±Ð(Ù±Õõí¹ÍÑ¼ñðPô(½¹
¡¹õì¡¤ôøµ¥ÉÍÑ¼¡¹¥°¹ÑÉÐ¹Ù±Õ¥ô(±ÍÍ9µôµÍ±Ñ´ÜÀÀÑáÐµÝ¡¥ÑÑáÐµáÌÉ½Õ¹Áà´ÈÁä´Ä¸Ô½ÉÈ½ÉÈµÝ¡¥Ñ¼ÄÀ(¥Í±õíÍÙ¥¹ôôô¹¥ô(ø(ñ½ÁÑ¥½¸Ù±ÕôùM±¥½¹È¸¸¸ð½½ÁÑ¥½¸ø(íÍÑ½=ÁÑ¥½¹Ì¹µÀ¡¼ôøñ½ÁÑ¥½¸­äõí½ôÙ±Õõí½ôùí½ôð½½ÁÑ¥½¸ø¥ô(ð½Í±Ðø(íÍÙ¥¹ôôô¹¥ñ1½ÈÈ±ÍÍ9µôÜ´Ð ´Ð¹¥µÑµÍÁ¥¸ÑáÐµå¸´ÐÀÀ¼ùô(ð½¥Øø(ð½Ñø(ð½ÑÈø(¤¥ô(ð½Ñ½äø(ð½Ñ±ø(ð½¥Øø(¥ô(ð½¥Øø(<Bþ
