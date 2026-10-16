"use client";
/** /dashboard/requisiciones/destajos — Pagos a destajistas por obra y por destajista (16-Oct-2026 · pidió Daisy) */
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DomHeader } from "@/components/domenica/ui";
import { IcoCasco } from "@/components/domenica/IconosObra";
import { ResumenPagos, TablaPagos, descargarCSV } from "@/components/PagosDestajista";
import type { PagoDestajo } from "@/lib/destajo";

export default function DestajosPage() {
  const [rows, setRows] = useState<PagoDestajo[] | null>(null);
  const [obra, setObra] = useState(""); const [dest, setDest] = useState("");
  useEffect(() => {
    supabase.from("Requisiciones").select("id, folio, created_at, status, destajo_tipo_pago, destajo_concepto, total, monto, cost_center_name, proveedor, comprobante_pago_url, fecha_pago")
      .eq("tipo_solicitud", "DESTAJO").not("status", "in", "(CANCELADA,RECHAZADA_DIRECCION,RECHAZADA_RESPONSABLE)").order("created_at", { ascending: false }).limit(3000)
      .then(({ data }) => setRows((data || []) as PagoDestajo[]));
  }, []);
  const obras = useMemo(() => [...new Set((rows || []).map(r => r.cost_center_name || "").filter(Boolean))].sort(), [rows]);
  const dests = useMemo(() => [...new Set((rows || []).filter(r => !obra || r.cost_center_name === obra).map(r => r.proveedor || "").filter(Boolean))].sort(), [rows, obra]);
  const lista = useMemo(() => (rows || []).filter(r => (!obra || r.cost_center_name === obra) && (!dest || r.proveedor === dest)), [rows, obra, dest]);
  const sel = "w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 h-11 text-[14px] text-[var(--d-text)]";
  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-4xl mx-auto">
        <DomHeader icon={IcoCasco} from="#b45309" titulo="Pagos a destajistas" desc="Filtra por obra o por destajista. Autorizado es lo que Dirección ya aprobó; en trámite, lo que sigue en revisión." />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          <select aria-label="Obra" value={obra} onChange={e => { setObra(e.target.value); setDest(""); }} className={sel}><option value="">Todas las obras</option>{obras.map(o => <option key={o} value={o}>{o}</option>)}</select>
          <select aria-label="Destajista" value={dest} onChange={e => setDest(e.target.value)} className={sel}><option value="">Todos los destajistas</option>{dests.map(d => <option key={d} value={d}>{d}</option>)}</select>
        </div>
        {rows === null ? <div className="py-10 text-center text-[13px] text-[var(--d-muted)]">Cargando…</div> : (
          <div className="mt-4 space-y-3">
            <ResumenPagos rows={lista} />
            <div className="flex items-center justify-between"><span className="text-[12.5px] text-[var(--d-muted)]">{lista.length} pago{lista.length === 1 ? "" : "s"}</span>
              <button type="button" onClick={() => lista.length && descargarCSV(lista, `pagos-destajistas${obra ? "-" + obra : ""}${dest ? "-" + dest : ""}`)} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--d-border)] px-3 py-2 text-[13px] font-semibold text-[var(--d-text)]"><Download className="w-4 h-4" />Descargar Excel (CSV)</button></div>
            <TablaPagos rows={lista} conObra={!obra} />
          </div>)}
      </div>
    </div>
  );
}
