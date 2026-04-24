"use client";
import { useEffect, useState } from "react";
import { Mail, RefreshCw, CheckCircle2, XCircle, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AriaBackButton from "@/components/AriaBackButton";

interface EmailLogRow {
  id: string;
  template: string;
  to_email: string;
  subject: string | null;
  body_preview: string | null;
  success: boolean;
  message_id: string | null;
  error: string | null;
  origen: string | null;
  enviado_por: string | null;
  reply_to: string | null;
  bcc: string | null;
  created_at: string;
}

const TEMPLATES = [
  "requisicion_creada_creador",
  "requisicion_creada_compras",
  "requisicion_creada_direccion",
  "requisicion_creada_admin",
  "requisicion_validada_compras",
  "requisicion_rechazada_validador",
  "requisicion_solicitar_cotizacion",
  "requisicion_comparativa_director",
  "requisicion_autorizar_oc_direccion",
  "requisicion_oc_autorizada_compras",
  "requisicion_oc_autorizada_solicitante",
  "requisicion_oc_rechazada_compras",
  "requisicion_oc_rechazada_solicitante",
  "requisicion_compra_autorizada_picking",
  "requisicion_entrega_registrada",
  "tarea_asignada_empleado",
  "proveedor_correo_manual",
];

export default function EmailLogPage() {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterSuccess, setFilterSuccess] = useState<"" | "true" | "false">("");
  const [filterTo, setFilterTo] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("email_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (filterTemplate) q = q.eq("template", filterTemplate);
    if (filterSuccess !== "") q = q.eq("success", filterSuccess === "true");
    if (filterTo) q = q.ilike("to_email", `%${filterTo}%`);
    const { data } = await q;
    setRows((data as EmailLogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterTemplate, filterSuccess, filterTo]);

  const resumen = {
    total: rows.length,
    ok: rows.filter((r) => r.success).length,
    err: rows.filter((r) => !r.success).length,
    templates: new Set(rows.map((r) => r.template)).size,
  };

  return (
    <div className="aria-page-canon">
      <div className="sticky top-0 z-10 bg-[#040810]/80 backdrop-blur pb-3 border-b border-white/[0.08]">
        <AriaBackButton href="/dashboard" />
        <h1 className="mt-2 text-2xl font-bold text-white flex items-center gap-2">
          <Mail className="w-6 h-6 text-aria-accent" /> Email Log - ARIA27
        </h1>
        <p className="text-sm text-[#7f93b0]">
          Auditoria de correos transaccionales via Resend (noreply@mail.jjcrm27.com)
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#2C3D52] to-[#21303E] border border-[#3A5E9A]/40 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="text-xs text-[#7f93b0]">Total registros</div>
          <div className="text-2xl font-bold text-white">{resumen.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1F8A60]/30 to-[#16704D]/30 border border-emerald-500/30">
          <div className="text-xs text-[#7f93b0]">OK</div>
          <div className="text-2xl font-bold text-emerald-400">{resumen.ok}</div>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#C8444A]/30 to-[#A53039]/30 border border-rose-500/30">
          <div className="text-xs text-[#7f93b0]">Errores</div>
          <div className="text-2xl font-bold text-rose-400">{resumen.err}</div>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#2C3D52] to-[#21303E] border border-[#3A5E9A]/40">
          <div className="text-xs text-[#7f93b0]">Templates distintos</div>
          <div className="text-2xl font-bold text-white">{resumen.templates}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterTemplate}
          onChange={(e) => setFilterTemplate(e.target.value)}
          className="px-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm"
        >
          <option value="">Todas las plantillas</option>
          {TEMPLATES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterSuccess}
          onChange={(e) => setFilterSuccess(e.target.value as "" | "true" | "false")}
          className="px-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="true">Solo OK</option>
          <option value="false">Solo errores</option>
        </select>
        <div className="relative max-w-[360px] w-full md:w-auto">
          <Search className="w-4 h-4 text-[#7f93b0] absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            placeholder="Buscar por destinatario..."
            className="pl-8 pr-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm w-full"
          />
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-white text-sm hover:bg-white/[0.06]"
        >
          <RefreshCw className="w-4 h-4" /> Refrescar
        </button>
        <span className="text-sm text-[#7f93b0]">{rows.length} registros</span>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] sticky top-0">
              <tr className="text-left text-[#c9d8ed]">
                <th className="px-3 py-2 whitespace-nowrap">Fecha</th>
                <th className="px-3 py-2">Plantilla</th>
                <th className="px-3 py-2">Destinatario</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2">Por</th>
                <th className="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-[#7f93b0]">Cargando...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-[#4a6080]">
                  Sin registros. La tabla email_log se llenara cuando se envie el primer correo desde el sistema.
                </td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.05] text-[#c9d8ed] align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {new Date(r.created_at).toLocaleString("es-MX")}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.template}</td>
                  <td className="px-3 py-2 text-xs">{r.to_email}</td>
                  <td className="px-3 py-2 text-xs max-w-xs truncate" title={r.subject || ""}>
                    {r.subject || "-"}
                  </td>
                  <td className="px-3 py-2">
                    {r.success ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400">
                        <XCircle className="w-4 h-4" />ERR
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.origen || "-"}</td>
                  <td className="px-3 py-2 text-xs">{r.enviado_por || "-"}</td>
                  <td
                    className="px-3 py-2 text-xs text-[#7f93b0] max-w-xs truncate"
                    title={r.error || r.message_id || ""}
                  >
                    {r.error || r.message_id || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
