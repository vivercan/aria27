"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CanonPageHeader from "@/components/ui/CanonPageHeader";

interface Solicitud {
  id: string;
  folio: string;
  solicitante_nombre: string | null;
  tipo_combustible: string;
  litros: number;
  obra_nombre: string | null;
  vehiculo_libre: string | null;
  status: string;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  SOLICITADA: "bg-blue-500/20 text-blue-300",
  CONSOLIDADA: "bg-amber-500/20 text-amber-300",
  ENVIADA_DIRECTOR: "bg-purple-500/20 text-purple-300",
  AUTORIZADA: "bg-emerald-500/20 text-emerald-300",
  RECHAZADA: "bg-red-500/20 text-red-300",
  TRANSFERIDA_COMPRAS: "bg-cyan-500/20 text-cyan-300",
  DEPOSITADA: "bg-teal-500/20 text-teal-300",
  CARGADA: "bg-indigo-500/20 text-indigo-300",
  FACTURADA: "bg-violet-500/20 text-violet-300",
  CONCILIADA: "bg-green-500/20 text-green-300",
  CANCELADA: "bg-gray-500/20 text-gray-300",
};

export default function CombustiblesV2Page() {
  const [rows, setRows] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [consolidando, setConsolidando] = useState(false);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("combustible_solicitudes")
      .select("id, folio, solicitante_nombre, tipo_combustible, litros, obra_nombre, vehiculo_libre, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) console.error("Error solicitudes:", error);
    setRows((data || []) as Solicitud[]);
    setLoading(false);
  }

   
  useEffect(() => { void cargar(); }, []);

  async function consolidarTodas() {
    if (!confirm("¿Consolidar todas las solicitudes SOLICITADAS de hoy?")) return;
    setConsolidando(true);
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const r = await fetch("/api/combustibles/consolidar", {
        credentials: "include", method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ armado_por_email: email }),
      });
      const d = await r.json();
      if (d.ok) {
        alert(`Consolidado ${d.consolidado.folio} creado con ${d.solicitudes_count} solicitudes.`);
        cargar();
      } else {
        alert("Error: " + (d.error || "desconocido"));
      }
    } catch (e) {
      alert("Error: " + String(e));
    } finally {
      setConsolidando(false);
    }
  }

  const totalSolicitadas = rows.filter(r => r.status === "SOLICITADA").length;
  const totalLitros = rows.filter(r => r.status === "SOLICITADA").reduce((a, b) => a + Number(b.litros), 0);

  return (
    <div className="min-h-screen bg-[#04081A] text-white">
      <CanonPageHeader
        title="Combustibles"
        subtitle="Solicitudes operativas, consolidados y facturación con IA"
      />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-5">
            <div className="text-xs text-[#7f93b0] uppercase tracking-wider">Solicitadas hoy</div>
            <div className="text-3xl font-bold text-blue-300 mt-1">{totalSolicitadas}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-5">
            <div className="text-xs text-[#7f93b0] uppercase tracking-wider">Litros pendientes</div>
            <div className="text-3xl font-bold text-amber-300 mt-1">{totalLitros.toLocaleString("es-MX")}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5">
            <div className="text-xs text-[#7f93b0] uppercase tracking-wider">Total registradas</div>
            <div className="text-3xl font-bold text-emerald-300 mt-1">{rows.length}</div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={cargar}
            className="flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] px-4 py-2 text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refrescar
          </button>
          <button
            onClick={consolidarTodas}
            disabled={consolidando || totalSolicitadas === 0}
            className="flex items-center gap-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 disabled:opacity-40 px-4 py-2 text-sm font-medium text-amber-200 transition"
          >
            <Send className="w-4 h-4" />
            {consolidando ? "Consolidando..." : `Consolidar ${totalSolicitadas} pendientes`}
          </button>
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] sticky top-0">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#7f93b0]">
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Litros</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Obra</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#7f93b0]">Cargando…</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#7f93b0]">
                    Sin solicitudes aún. Los operadores las crearán desde WhatsApp.
                  </td>
                </tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs text-aria-accent">{r.folio}</td>
                  <td className="px-4 py-3">{r.solicitante_nombre || "—"}</td>
                  <td className="px-4 py-3">{r.tipo_combustible}</td>
                  <td className="px-4 py-3 text-right font-medium">{Number(r.litros).toLocaleString("es-MX")} L</td>
                  <td className="px-4 py-3 text-xs">{r.vehiculo_libre || `Equipo #${r.id.slice(0,6)}`}</td>
                  <td className="px-4 py-3 text-xs">{r.obra_nombre || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider ${STATUS_COLOR[r.status] || "bg-gray-500/20 text-gray-300"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#7f93b0]">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
          <strong>Combustibles 2.0 - Fase 1:</strong> esquema BD listo, endpoint <code>/api/combustibles/solicitar</code> y
          <code>/api/combustibles/factura-parse-ia</code> activos. Próximo: aprobar plantillas Meta (5 templates listas en docs),
          y conectar webhook WA para que operadores soliciten directo desde su celular.
        </div>
      </div>
    </div>
  );
}
