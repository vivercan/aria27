"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, X, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CanonPageHeader from "@/components/ui/CanonPageHeader";

interface NormRow {
  id: string;
  texto_libre: string;
  ia_sugerencia_marca: string | null;
  ia_sugerencia_modelo: string | null;
  ia_sugerencia_anio: number | null;
  ia_sugerencia_tipo: string | null;
  ia_sugerencia_combustible: string | null;
  status: string;
  created_at: string;
}

export default function NormalizacionPage() {
  const [rows, setRows] = useState<NormRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase
      .from("vehiculo_normalizacion_pendiente")
      .select("*")
      .eq("status", "PENDIENTE")
      .order("created_at", { ascending: false });
    setRows((data || []) as NormRow[]);
    setLoading(false);
  }
  useEffect(() => { cargar(); }, []);

  async function decidir(id: string, status: "APROBADA" | "RECHAZADA") {
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
    await supabase
      .from("vehiculo_normalizacion_pendiente")
      .update({ status, revisor_email: email, revisado_at: new Date().toISOString() })
      .eq("id", id);
    cargar();
  }

  return (
    <div className="min-h-screen bg-[#04081A] text-white">
      <CanonPageHeader title="Normalización vehículos" subtitle="Operadores escribieron texto libre. IA sugirió marca/modelo. Aprueba o rechaza." />
      <div className="p-6 space-y-6">
        <button onClick={cargar} className="flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] px-4 py-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refrescar
        </button>
        {rows.length === 0 && !loading && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-[#7f93b0]">
            Sin vehículos pendientes de normalizar.
          </div>
        )}
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium">Texto libre: <span className="text-aria-accent">{r.texto_libre}</span></div>
                <div className="text-xs text-[#7f93b0] mt-1">
                  IA sugiere: <strong>{r.ia_sugerencia_marca || "?"}</strong> {r.ia_sugerencia_modelo || ""} {r.ia_sugerencia_anio || ""} ·
                  {" "}{r.ia_sugerencia_tipo || "?"} · {r.ia_sugerencia_combustible || "?"}
                </div>
              </div>
              <button onClick={() => decidir(r.id, "APROBADA")} className="rounded-lg bg-emerald-500/30 hover:bg-emerald-500/50 px-3 py-2 text-emerald-200 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Aprobar
              </button>
              <button onClick={() => decidir(r.id, "RECHAZADA")} className="rounded-lg bg-red-500/30 hover:bg-red-500/50 px-3 py-2 text-red-200 text-xs flex items-center gap-1">
                <X className="w-3 h-3" /> Rechazar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
