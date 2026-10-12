"use client";
/**
 * Entregas de una solicitud, con sus fotos (11-Oct-2026 · JJ)
 * Antes la foto de lo que llegó y la nota de remisión se guardaban bien, pero no se veían en el detalle de la solicitud.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Ent = { id: string; folio: string | null; fecha_entrega: string | null; hora_entrega: string | null; recibido_por_nombre: string | null; status: string | null; foto_url: string | null; notas: string | null; observaciones: string | null; materiales_recibidos: { product_name?: string; recibida?: number; quantity?: number; unit?: string }[] | null };

const urlEn = (s?: string | null) => (String(s || "").match(/https?:\/\/\S+/) || [])[0] || null;
const fecha = (d?: string | null) => d ? new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function EntregasDeRequi({ reqId }: { reqId: string }) {
  const [l, setL] = useState<Ent[] | null>(null);
  useEffect(() => { let v = true; supabase.from("entregas").select("id, folio, fecha_entrega, hora_entrega, recibido_por_nombre, status, foto_url, notas, observaciones, materiales_recibidos").eq("requisicion_id", reqId).order("created_at", { ascending: false })
    .then(({ data }) => { if (v) setL((data || []) as Ent[]); }); return () => { v = false; }; }, [reqId]);
  if (!l || !l.length) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-[var(--d-muted)] mb-2">ENTREGAS ({l.length})</p>
      <div className="space-y-2">
        {l.map(e => { const nota = urlEn(e.notas); return (
          <div key={e.id} className="rounded-xl border border-[var(--d-border)] bg-[var(--d-card)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0"><div className="text-[15px] font-bold text-[var(--d-text)]">{e.folio || "Entrega"} · {e.status === "COMPLETA" ? "Completa" : e.status === "PARCIAL" ? "Parcial" : (e.status || "")}</div>
                <div className="text-[13.5px] text-[var(--d-muted)]">{fecha(e.fecha_entrega)}{e.hora_entrega ? ` · ${String(e.hora_entrega).slice(0, 5)}` : ""}{e.recibido_por_nombre ? ` · recibió ${e.recibido_por_nombre}` : ""}</div></div>
            </div>
            {(e.foto_url || nota) && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {e.foto_url && <a href={e.foto_url} target="_blank" rel="noopener noreferrer" className="block"><img src={e.foto_url} alt="Foto de lo que llegó" className="w-full h-32 object-cover rounded-lg border border-[var(--d-border)]" /><span className="block mt-1 text-[13px] font-semibold text-[var(--d-link)]">Foto de lo que llegó</span></a>}
                {nota && <a href={nota} target="_blank" rel="noopener noreferrer" className="block"><img src={nota} alt="Nota de remisión" className="w-full h-32 object-cover rounded-lg border border-[var(--d-border)]" /><span className="block mt-1 text-[13px] font-semibold text-[var(--d-link)]">Nota de remisión / factura</span></a>}
              </div>
            )}
            {e.observaciones && <p className="mt-2 text-[14px] text-[var(--d-text-2)]">{e.observaciones}</p>}
          </div>); })}
      </div>
    </div>
  );
}
