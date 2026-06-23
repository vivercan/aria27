"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CanonPageHeader from "@/components/ui/CanonPageHeader";

interface Saldo {
  solicitante_nombre: string;
  solicitante_wa: string;
  pendientes: number;
  litros_pendientes: number;
  ultima: string;
}

export default function SaldosPage() {
  const [rows, setRows] = useState<Saldo[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from("combustible_solicitudes")
      .select("solicitante_nombre, solicitante_wa, litros, status, created_at")
      .in("status", ["SOLICITADA", "CONSOLIDADA", "ENVIADA_DIRECTOR", "AUTORIZADA", "TRANSFERIDA_COMPRAS"])
      .order("created_at", { ascending: false });
    const map = new Map<string, Saldo>();
    for (const r of (data || []) as Array<{ solicitante_nombre: string | null; solicitante_wa: string; litros: number; created_at: string }>) {
      const k = r.solicitante_wa || "?";
      const cur = map.get(k) || { solicitante_nombre: r.solicitante_nombre || k, solicitante_wa: k, pendientes: 0, litros_pendientes: 0, ultima: r.created_at };
      cur.pendientes += 1;
      cur.litros_pendientes += Number(r.litros) || 0;
      if (r.created_at > cur.ultima) cur.ultima = r.created_at;
      map.set(k, cur);
    }
    setRows(Array.from(map.values()).sort((a, b) => b.litros_pendientes - a.litros_pendientes));
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void cargar(); }, []);

  return (
    <div className="min-h-screen bg-[#04081A] text-white">
      <CanonPageHeader title="Saldos pendientes" subtitle="Operadores con solicitudes sin completar" />
      <div className="p-6 space-y-6">
        <button onClick={cargar} className="flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] px-4 py-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refrescar
        </button>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#7f93b0]">
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3">WA</th>
                <th className="px-4 py-3 text-right">Pendientes</th>
                <th className="px-4 py-3 text-right">Litros</th>
                <th className="px-4 py-3">Última</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#7f93b0]">Sin saldos pendientes.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.solicitante_wa} className="border-t border-white/[0.04]">
                  <td className="px-4 py-3 font-medium">{r.solicitante_nombre}</td>
                  <td className="px-4 py-3 text-xs text-[#7f93b0]">{r.solicitante_wa}</td>
                  <td className="px-4 py-3 text-right">{r.pendientes}</td>
                  <td className="px-4 py-3 text-right font-semibold text-aria-accent">{r.litros_pendientes.toLocaleString("es-MX")} L</td>
                  <td className="px-4 py-3 text-xs text-[#7f93b0]">{new Date(r.ultima).toLocaleString("es-MX")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
