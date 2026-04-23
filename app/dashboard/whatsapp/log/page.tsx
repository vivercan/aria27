"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, RefreshCw, MessageCircle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AriaBackButton from "@/components/AriaBackButton";

interface WaLogRow {
  id: string;
  template: string;
  phone: string;
  params: Record<string, string>;
  success: boolean;
  message_id: string | null;
  error: string | null;
  origen: string | null;
  enviado_por: string | null;
  created_at: string;
}

const TEMPLATES = [
  "requisicion_creada",
  "requisicion_validar",
  "requisicion_compras",
  "compra_autorizar",
  "oc_generada",
  "requisicion_rechazada",
  "entrega_material",
  "comparativa_enviar",
  "solicitar_cotizacion",
];

export default function WhatsAppLogPage() {
  const [rows, setRows] = useState<WaLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterSuccess, setFilterSuccess] = useState<"" | "true" | "false">("");

  // Test form
  const [tplTest, setTplTest] = useState("requisicion_creada");
  const [phoneTest, setPhoneTest] = useState("");
  const [paramsTest, setParamsTest] = useState("REQ-TEST,JJ,MIRAVALLE,2026-04-07");
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<string>("");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("wa_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (filterTemplate) q = q.eq("template", filterTemplate);
    if (filterSuccess !== "") q = q.eq("success", filterSuccess === "true");
    const { data } = await q;
    setRows((data as WaLogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterTemplate, filterSuccess]);

  const enviarTest = async () => {
    setSending(true);
    setTestResult("");
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": email },
        body: JSON.stringify({
          template: tplTest,
          phone: phoneTest,
          params: paramsTest.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const j = await res.json().catch(() => ({}));
      setTestResult(j.success ? `OK msg ${j.messageId}` : `ERROR: ${j.error}`);
      load();
    } catch (e: unknown) {
      setTestResult(`ERROR: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 bg-[#040810]/80 backdrop-blur pb-3 border-b border-white/[0.08]">
        <AriaBackButton href="/dashboard" />
        <h1 className="mt-2 text-2xl font-bold text-white flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-aria-accent" /> WhatsApp Log — JJCRM27
        </h1>
        <p className="text-sm text-[#7f93b0]">Auditoría de envíos vía WABA 842930185269415 / Phone 963627606824867</p>
      </div>

      {/* Test send */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 shadow-[0_4px_16px_rgba(0,0,0,0.3)] space-y-3">
        <h2 className="text-white font-semibold flex items-center gap-2"><Send className="w-4 h-4" /> Enviar prueba</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={tplTest} onChange={(e) => setTplTest(e.target.value)} className="px-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm">
            {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={phoneTest} onChange={(e) => setPhoneTest(e.target.value)} placeholder="Tel 10 dígitos" className="px-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm" />
          <input value={paramsTest} onChange={(e) => setParamsTest(e.target.value)} placeholder="Params separados por coma" className="px-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm md:col-span-2" />
        </div>
        <button onClick={enviarTest} disabled={sending || !phoneTest} className="px-4 py-2 rounded aria-btn-emerald-solid disabled:opacity-50 text-white text-sm">
          {sending ? "Enviando..." : "Enviar"}
        </button>
        {testResult && <p className="text-sm text-[#c9d8ed]">{testResult}</p>}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterTemplate} onChange={(e) => setFilterTemplate(e.target.value)} className="px-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm">
          <option value="">Todas las plantillas</option>
          {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterSuccess} onChange={(e) => setFilterSuccess(e.target.value as "" | "true" | "false")} className="px-3 py-2 bg-[#0a1628] border border-white/[0.08] rounded text-white text-sm">
          <option value="">Todos</option>
          <option value="true">Solo OK</option>
          <option value="false">Solo errores</option>
        </select>
        <button onClick={load} className="inline-flex items-center gap-1 px-3 py-2 rounded bg-white/[0.04] border border-white/[0.08] text-white text-sm hover:bg-white/[0.06]">
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
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Plantilla</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Origen</th>
                <th className="px-3 py-2">Por</th>
                <th className="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-3 py-6 text-center text-[#7f93b0]">Cargando...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-[#4a6080]">Sin registros</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.05] text-[#c9d8ed]">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.template}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.phone}</td>
                  <td className="px-3 py-2">
                    {r.success
                      ? <span className="inline-flex items-center gap-1 text-aria-accent"><CheckCircle2 className="w-4 h-4" />OK</span>
                      : <span className="inline-flex items-center gap-1 text-rose-400"><XCircle className="w-4 h-4" />ERR</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.origen || "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.enviado_por || "—"}</td>
                  <td className="px-3 py-2 text-xs text-[#7f93b0] max-w-xs truncate" title={r.error || r.message_id || ""}>
                    {r.error || r.message_id || "—"}
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
