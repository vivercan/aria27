"use client";
import { useEffect, useState } from "react";
import { Activity, RefreshCw, Search, MessageCircle, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CanonPageHeader from "@/components/ui/CanonPageHeader";

interface EventoRow {
  id: string;
  tipo: string;
  resumen: string;
  detalle: string | null;
  actor: string | null;
  metadata: Record<string, unknown>;
  notificados_wa: string[] | null;
  notificados_email: string[] | null;
  created_at: string;
}

const TIPOS: string[] = [
  "REQUISICION_CREADA",
  "REQUISICION_APROBADA",
  "REQUISICION_RECHAZADA",
  "OC_GENERADA",
  "PAGO_AVISADO",
  "PAGO_CONFIRMADO",
  "TAREA_CREADA",
  "TAREA_COMPLETADA",
  "EMPLEADO_ALTA",
  "EMPLEADO_BAJA",
  "DOCUMENTO_SUBIDO",
  "ASISTENCIA_ENTRADA",
  "ASISTENCIA_SALIDA",
  "FALTA_DETECTADA",
  "COTIZACION_ENVIADA",
  "COBRO_REGISTRADO",
];

const ICONO: Record<string, string> = {
  REQUISICION_CREADA: "\u{1F4E6}",
  REQUISICION_APROBADA: "✅",
  REQUISICION_RECHAZADA: "❌",
  OC_GENERADA: "\u{1F6D2}",
  PAGO_AVISADO: "\u{1F4B0}",
  PAGO_CONFIRMADO: "✔️",
  TAREA_CREADA: "\u{1F4CB}",
  TAREA_COMPLETADA: "✅",
  EMPLEADO_ALTA: "\u{1F464}",
  EMPLEADO_BAJA: "\u{1F44B}",
  DOCUMENTO_SUBIDO: "\u{1F4C1}",
  ASISTENCIA_ENTRADA: "\u{1F4CD}",
  ASISTENCIA_SALIDA: "\u{1F3C1}",
  FALTA_DETECTADA: "⚠️",
  COTIZACION_ENVIADA: "\u{1F4E4}",
  COBRO_REGISTRADO: "\u{1F4B5}",
};

export default function EventosPage() {
  const [rows, setRows] = useState<EventoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState("");
  const [filterActor, setFilterActor] = useState("");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("event_log").select("*").order("created_at", { ascending: false }).limit(300);
    if (filterTipo) q = q.eq("tipo", filterTipo);
    if (filterActor) q = q.ilike("actor", `%${filterActor}%`);
    const { data } = await q;
    setRows((data as EventoRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTipo, filterActor]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, filterTipo, filterActor]);

  const filtradas = rows.filter(r => {
    const s = search.toLowerCase();
    return !s ||
      r.tipo.toLowerCase().includes(s) ||
      r.resumen?.toLowerCase().includes(s) ||
      r.actor?.toLowerCase().includes(s) ||
      r.detalle?.toLowerCase().includes(s);
  });

  const stats = {
    total: rows.length,
    waOk: rows.filter(r => (r.notificados_wa || []).length > 0).length,
    emailOk: rows.filter(r => (r.notificados_email || []).length > 0).length,
    sinNotif: rows.filter(r => !(r.notificados_wa || []).length && !(r.notificados_email || []).length).length,
  };

  return (
    <div className="aria-page-canon h-full flex flex-col overflow-hidden">
      <CanonPageHeader
        title="Eventos del sistema"
        subtitle="Feed de auditoria - notificaciones a Direccion + RH"
        backHref="/dashboard/admin"
        right={
          <div className="flex gap-2 items-center">
            <label className="flex items-center gap-2 text-xs text-[#7f93b0]">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              auto 30s
            </label>
            <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary text-white text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Recargar
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4 flex-shrink-0">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
          <p className="text-[10px] text-[#7f93b0] uppercase tracking-wider">Eventos</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
          <p className="text-[10px] text-emerald-300 uppercase tracking-wider">WA enviados</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.waOk}</p>
        </div>
        <div className="rounded-xl bg-aria-primary/10 border border-aria-primary/20 p-3">
          <p className="text-[10px] text-aria-accent uppercase tracking-wider">Emails enviados</p>
          <p className="text-2xl font-bold text-aria-accent">{stats.emailOk}</p>
        </div>
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3">
          <p className="text-[10px] text-rose-300 uppercase tracking-wider">Sin notificar</p>
          <p className="text-2xl font-bold text-rose-400">{stats.sinNotif}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap flex-shrink-0">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en resumen, detalle, actor..."
            className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none focus:border-aria-primary"
          />
        </div>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
          className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none">
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{ICONO[t] || ""} {t.replace(/_/g, " ")}</option>)}
        </select>
        <input value={filterActor} onChange={e => setFilterActor(e.target.value)} placeholder="Actor (email)"
          className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none w-56" />
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] z-10">
            <tr className="border-b border-white/[0.08]">
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Hora</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Tipo</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Resumen</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Actor</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Notificaciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && !loading && (
              <tr><td colSpan={5} className="text-center py-8 text-[#7f93b0]">Sin eventos</td></tr>
            )}
            {filtradas.map(e => {
              const fecha = new Date(e.created_at);
              const hora = fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
              const dia = fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
              return (
                <tr key={e.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="p-3 text-xs text-[#c9d8ed] whitespace-nowrap">
                    <div>{hora}</div>
                    <div className="text-[10px] text-[#7f93b0]">{dia}</div>
                  </td>
                  <td className="p-3 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-aria-primary/10 text-aria-accent">
                      <span>{ICONO[e.tipo] || "\u{1F514}"}</span>
                      <span>{e.tipo.replace(/_/g, " ")}</span>
                    </span>
                  </td>
                  <td className="p-3 text-xs text-white">
                    <div className="font-medium">{e.resumen}</div>
                    {e.detalle && (
                      <div className="text-[10px] text-[#7f93b0] mt-1 whitespace-pre-wrap line-clamp-3">{e.detalle}</div>
                    )}
                  </td>
                  <td className="p-3 text-xs text-[#c9d8ed]">{e.actor || "—"}</td>
                  <td className="p-3 text-xs">
                    <div className="flex flex-col gap-1">
                      {(e.notificados_wa || []).length > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <MessageCircle className="w-3 h-3" />
                          {(e.notificados_wa || []).length}
                        </span>
                      )}
                      {(e.notificados_email || []).length > 0 && (
                        <span className="inline-flex items-center gap-1 text-aria-accent">
                          <Mail className="w-3 h-3" />
                          {(e.notificados_email || []).length}
                        </span>
                      )}
                      {!(e.notificados_wa || []).length && !(e.notificados_email || []).length && (
                        <span className="text-rose-400">sin notif</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
