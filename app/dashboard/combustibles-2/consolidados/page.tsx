"use client";
import { useEffect, useState } from "react";
import { Send, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CanonPageHeader from "@/components/ui/CanonPageHeader";

interface Cons {
  id: string;
  folio: string;
  fecha: string;
  total_litros_gasolina: number;
  total_litros_diesel: number;
  total_solicitudes: number;
  monto_estimado: number;
  status: string;
  enviado_director_at: string | null;
  autorizado_at: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  BORRADOR: "bg-gray-500/20 text-gray-300",
  ENVIADO_DIRECTOR: "bg-amber-500/20 text-amber-300",
  AUTORIZADO: "bg-emerald-500/20 text-emerald-300",
  RECHAZADO: "bg-red-500/20 text-red-300",
  TRANSFERIDO: "bg-cyan-500/20 text-cyan-300",
  CERRADO: "bg-green-500/20 text-green-300",
};

export default function ConsolidadosPage() {
  const [rows, setRows] = useState<Cons[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("combustible_consolidados")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) console.error(error);
    setRows((data || []) as Cons[]);
    setLoading(false);
  }
   
  useEffect(() => { void cargar(); }, []);

  async function enviar(consId: string) {
    if (!confirm("¿Enviar este consolidado a Dirección (Fernando) para autorización?")) return;
    setSending(consId);
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const r = await fetch("/api/combustibles/enviar-director", {
        credentials: "include", method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ consolidado_id: consId }),
      });
      const d = await r.json();
      if (d.ok) {
        alert(`Consolidado enviado a Fernando${d.wa_sent ? " (WA OK)" : " (WA pendiente)"}`);
        cargar();
      } else {
        alert("Error: " + (d.error || "?"));
      }
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#04081A] text-white">
      <CanonPageHeader title="Consolidados Combustibles" subtitle="Genera y envía a Dirección para autorización" />
      <div className="p-6 space-y-6">
        <button onClick={cargar} className="flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] px-4 py-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refrescar
        </button>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#7f93b0]">
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Solicitudes</th>
                <th className="px-4 py-3 text-right">Gasolina L</th>
                <th className="px-4 py-3 text-right">Diésel L</th>
                <th className="px-4 py-3 text-right">$ Estimado</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#7f93b0]">Sin consolidados todavía.</td></tr>
              )}
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-white/[0.04]">
                  <td className="px-4 py-3 font-mono text-aria-accent">{c.folio}</td>
                  <td className="px-4 py-3 text-xs">{c.fecha}</td>
                  <td className="px-4 py-3 text-right">{c.total_solicitudes}</td>
                  <td className="px-4 py-3 text-right">{Number(c.total_litros_gasolina).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">{Number(c.total_litros_diesel).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">${Number(c.monto_estimado || 0).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-medium uppercase ${STATUS_COLOR[c.status] || ""}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "BORRADOR" && (
                      <button
                        onClick={() => enviar(c.id)}
                        disabled={sending === c.id}
                        className="flex items-center gap-2 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 px-3 py-1.5 text-xs text-amber-200 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" /> Enviar a Director
                      </button>
                    )}
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
