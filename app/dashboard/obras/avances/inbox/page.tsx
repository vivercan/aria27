"use client";
/**
 * /dashboard/obras/avances/inbox
 *
 * Bandeja de Daisy + JJ + cualquier admin para validar reportes de avance
 * de obra que llegan por WhatsApp del Arquitecto.
 *
 * Cada card muestra: arquitecto identificado (o "Remitente sin registrar"),
 * obra sugerida editable, fecha, lista de realizadas/programadas, texto raw,
 * botones Aprobar / Editar / Rechazar.
 *
 * 03-Jun-2026 feature avances WA -> BD (F4)
 */
import { useEffect, useState } from "react";
import CanonPageHeader from "@/components/ui/CanonPageHeader";
import KpiCard from "@/components/ui/KpiCard";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { supabase } from "@/lib/supabase";
import {
  Inbox, CheckCircle2, XCircle, Edit2, Save, X, Phone, HardHat,
  Loader2, Clock, AlertTriangle,
} from "lucide-react";

interface ObraLite { id: string; codigo: string | null; nombre: string | null; }
interface InboxRow {
  id: string;
  arquitecto_id: string | null;
  arquitecto_phone: string | null;
  raw_message: string;
  parsed_json: unknown;
  suggested_obra_id: string | null;
  confirmed_obra_id: string | null;
  reporte_fecha: string | null;
  realizadas: string[] | null;
  programadas: string[] | null;
  media_ids: string[] | null;
  fotos_storage_paths: string[] | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNKNOWN_SENDER";
  approved_by: string | null;
  approved_at: string | null;
  obra_avance_id: string | null;
  created_at: string;
  suggested_obra: ObraLite | null;
  confirmed_obra: ObraLite | null;
  arquitecto: { id: string; full_name: string; whatsapp_phone: string | null } | null;
}

export default function InboxAvancesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [obras, setObras] = useState<ObraLite[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<"PENDING" | "ALL" | "APPROVED" | "REJECTED">("PENDING");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editObraId, setEditObraId] = useState<string>("");
  const [editFecha, setEditFecha] = useState<string>("");
  const [editRealizadas, setEditRealizadas] = useState<string>("");
  const [editProgramadas, setEditProgramadas] = useState<string>("");
  const [actuando, setActuando] = useState<string | null>(null);
  const { msg, flash } = useFlashMessage(2500);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/obras/avances/inbox").then((r) => r.json()),
        supabase
          .from("centros_trabajo")
          .select("id, codigo, nombre")
          .order("nombre", { ascending: true }),
      ]);
      setRows((r1?.inbox as InboxRow[]) || []);
      setObras(((r2.data as ObraLite[]) || []).filter((o) => o.nombre));
    } catch (e: unknown) {
      flash("err", (e as { message?: string })?.message || "Error de red");
    }
    setLoading(false);
  };

  const startEdit = (r: InboxRow) => {
    setEditingId(r.id);
    setEditObraId(r.confirmed_obra_id || r.suggested_obra_id || "");
    setEditFecha(r.reporte_fecha || new Date().toISOString().slice(0, 10));
    setEditRealizadas((r.realizadas || []).join("\n"));
    setEditProgramadas((r.programadas || []).join("\n"));
  };

  const cancelEdit = () => setEditingId(null);

  const aprobar = async (r: InboxRow) => {
    const obraId = editingId === r.id ? editObraId : (r.confirmed_obra_id || r.suggested_obra_id);
    if (!obraId) {
      flash("err", "Selecciona la obra primero (Editar -> elige obra)");
      return;
    }
    const realizadas = editingId === r.id ? editRealizadas.split("\n").map((s) => s.trim()).filter(Boolean) : (r.realizadas || []);
    const programadas = editingId === r.id ? editProgramadas.split("\n").map((s) => s.trim()).filter(Boolean) : (r.programadas || []);
    const fecha = editingId === r.id ? editFecha : r.reporte_fecha;

    setActuando(r.id);
    try {
      const res = await fetch(`/api/obras/avances/inbox/${r.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          confirmed_obra_id: obraId,
          reporte_fecha: fecha,
          realizadas,
          programadas,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Error");
      flash("ok", "Aprobado y guardado en bitacora de obra");
      setEditingId(null);
      await cargar();
    } catch (e: unknown) {
      flash("err", (e as { message?: string })?.message || "Error");
    }
    setActuando(null);
  };

  const rechazar = async (r: InboxRow) => {
    if (!confirm(`Rechazar este reporte de ${r.arquitecto?.full_name || "remitente desconocido"}?`)) return;
    setActuando(r.id);
    try {
      const res = await fetch(`/api/obras/avances/inbox/${r.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "REJECT" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Error");
      flash("ok", "Rechazado");
      await cargar();
    } catch (e: unknown) {
      flash("err", (e as { message?: string })?.message || "Error");
    }
    setActuando(null);
  };

  const filtradas = rows.filter((r) => {
    if (filtroStatus === "ALL") return true;
    if (filtroStatus === "PENDING") return r.status === "PENDING" || r.status === "UNKNOWN_SENDER";
    return r.status === filtroStatus;
  });

  const pendCount = rows.filter((r) => r.status === "PENDING").length;
  const unknownCount = rows.filter((r) => r.status === "UNKNOWN_SENDER").length;
  const aprobadasHoy = rows.filter((r) => {
    if (r.status !== "APPROVED" || !r.approved_at) return false;
    return r.approved_at.startsWith(new Date().toISOString().slice(0, 10));
  }).length;

  return (
    <div className="aria-bg-canon min-h-full p-6 space-y-5">
      <FlashBanner msg={msg} />
      <CanonPageHeader
        title="Bandeja Avances WhatsApp"
        subtitle="Reportes de Arquitectos pendientes de validar antes de pasar a la bitacora de obra"
        backHref="/dashboard/obras"
        icon={<Inbox className="w-6 h-6" />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Pendientes" value={pendCount} icon={<Clock className="w-4 h-4" />} variant={pendCount > 0 ? "rose" : "neutral"} />
        <KpiCard label="Remitente sin registrar" value={unknownCount} icon={<AlertTriangle className="w-4 h-4" />} variant={unknownCount > 0 ? "rose" : "neutral"} />
        <KpiCard label="Aprobadas hoy" value={aprobadasHoy} icon={<CheckCircle2 className="w-4 h-4" />} variant="emerald" />
        <KpiCard label="Total inbox" value={rows.length} icon={<Inbox className="w-4 h-4" />} />
      </div>

      <div className="flex items-center gap-2">
        {(["PENDING", "ALL", "APPROVED", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              filtroStatus === s
                ? "bg-[#2563EB] text-white"
                : "bg-white/[0.04] text-[#A8BBD5] hover:bg-white/[0.08]"
            }`}
          >
            {s === "PENDING" ? "Pendientes" : s === "ALL" ? "Todos" : s === "APPROVED" ? "Aprobados" : "Rechazados"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#7f93b0]" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#0B1626]/60 text-center py-12 text-[#7f93b0] text-sm">
          {filtroStatus === "PENDING" ? "Sin avances pendientes." : "Sin resultados."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border ${
                r.status === "UNKNOWN_SENDER" ? "border-rose-500/40 bg-rose-500/[0.04]" :
                r.status === "APPROVED" ? "border-emerald-500/30 bg-emerald-500/[0.03] opacity-70" :
                r.status === "REJECTED" ? "border-white/[0.06] bg-white/[0.02] opacity-50" :
                "border-white/10 bg-[#0B1626]/60"
              } p-4`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {r.status === "UNKNOWN_SENDER" ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-600/20 text-rose-300 border border-rose-500/30">
                        Remitente sin registrar
                      </span>
                    ) : r.status === "APPROVED" ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                        Aprobado
                      </span>
                    ) : r.status === "REJECTED" ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 text-[#7f93b0]">
                        Rechazado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-600/20 text-amber-300 border border-amber-500/30">
                        Pendiente
                      </span>
                    )}
                    <HardHat className="w-4 h-4 text-[#7f93b0]" />
                    <span className="text-sm font-semibold text-white">
                      {r.arquitecto?.full_name || "Sin identificar"}
                    </span>
                    <Phone className="w-3 h-3 text-[#7f93b0]" />
                    <span className="text-[12px] text-[#A8BBD5]">{r.arquitecto_phone || "—"}</span>
                  </div>
                  <div className="text-[11px] text-[#7f93b0]">
                    Recibido {new Date(r.created_at).toLocaleString("es-MX")}
                  </div>
                </div>
                {r.status === "PENDING" || r.status === "UNKNOWN_SENDER" ? (
                  <div className="flex gap-1.5">
                    {editingId === r.id ? (
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] text-[#A8BBD5] hover:bg-white/[0.08]"
                      >
                        <X className="w-3.5 h-3.5 inline" /> Cancelar
                      </button>
                    ) : (
                      <button
                        onClick={() => startEdit(r)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] text-[#A8BBD5] hover:bg-white/[0.08]"
                      >
                        <Edit2 className="w-3.5 h-3.5 inline" /> Editar
                      </button>
                    )}
                    <button
                      onClick={() => rechazar(r)}
                      disabled={actuando === r.id}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5 inline" /> Rechazar
                    </button>
                    <button
                      onClick={() => aprobar(r)}
                      disabled={actuando === r.id}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-b from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_6px_rgba(0,0,0,0.30)] disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {actuando === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Aprobar
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Detalle obra + fecha + listas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-[11px] text-[#A8BBD5] mb-1">Obra {editingId === r.id ? <span className="text-rose-400">*</span> : null}</div>
                  {editingId === r.id ? (
                    <select
                      value={editObraId}
                      onChange={(e) => setEditObraId(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#070E1B] border border-white/10 text-white text-sm"
                    >
                      <option value="">Seleccionar obra...</option>
                      {obras.map((o) => (
                        <option key={o.id} value={o.id}>{o.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-white">
                      {r.confirmed_obra?.nombre || r.suggested_obra?.nombre || <span className="text-[#E0A04A]">Sin sugerencia</span>}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] text-[#A8BBD5] mb-1">Fecha</div>
                  {editingId === r.id ? (
                    <input
                      type="date"
                      value={editFecha}
                      onChange={(e) => setEditFecha(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#070E1B] border border-white/10 text-white text-sm"
                    />
                  ) : (
                    <div className="text-sm text-white">{r.reporte_fecha || "—"}</div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] text-[#A8BBD5] mb-1">Fotos</div>
                  <div className="text-sm text-white">
                    {(r.media_ids || []).length} {(r.media_ids || []).length === 1 ? "imagen" : "imagenes"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-emerald-400 mb-1 font-semibold uppercase">Realizadas</div>
                  {editingId === r.id ? (
                    <textarea
                      value={editRealizadas}
                      onChange={(e) => setEditRealizadas(e.target.value)}
                      rows={4}
                      placeholder="Una actividad por linea"
                      className="w-full px-2 py-1.5 rounded-lg bg-[#070E1B] border border-white/10 text-white text-sm"
                    />
                  ) : (r.realizadas || []).length === 0 ? (
                    <div className="text-[12px] text-[#7f93b0]">Sin actividades parseadas</div>
                  ) : (
                    <ul className="text-[12px] text-[#D7E3F4] space-y-1">
                      {(r.realizadas || []).map((a, i) => <li key={i}>· {a}</li>)}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-[11px] text-amber-400 mb-1 font-semibold uppercase">Programadas</div>
                  {editingId === r.id ? (
                    <textarea
                      value={editProgramadas}
                      onChange={(e) => setEditProgramadas(e.target.value)}
                      rows={4}
                      placeholder="Una actividad por linea"
                      className="w-full px-2 py-1.5 rounded-lg bg-[#070E1B] border border-white/10 text-white text-sm"
                    />
                  ) : (r.programadas || []).length === 0 ? (
                    <div className="text-[12px] text-[#7f93b0]">Sin actividades parseadas</div>
                  ) : (
                    <ul className="text-[12px] text-[#D7E3F4] space-y-1">
                      {(r.programadas || []).map((a, i) => <li key={i}>· {a}</li>)}
                    </ul>
                  )}
                </div>
              </div>

              <details className="mt-3">
                <summary className="text-[11px] text-[#7f93b0] cursor-pointer">Ver texto original</summary>
                <pre className="mt-2 text-[11px] text-[#A8BBD5] bg-black/30 p-2 rounded whitespace-pre-wrap">{r.raw_message}</pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
