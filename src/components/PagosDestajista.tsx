"use client";
/**
 * Lista de pagos a un destajista (16-Oct-2026 · pidió Daisy): qué se le ha pagado, en qué obra, cuánto ya está
 * autorizado y cuánto apenas va en trámite. Se usa como ficha desde "Nueva solicitud" y en la pantalla Destajos.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { grupoDe, montoDe, resumenDestajo, TIPO_TXT, type PagoDestajo } from "@/lib/destajo";

const mx = (n: number) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (s: string) => new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
const num = (f?: string | null) => String(f || "").replace(/^REQ-\d{4}-0*/, "#");

export function useCargarPagosDestajo(proveedor: string | null, obra: string | null, todasLasObras: boolean) {
  const [rows, setRows] = useState<PagoDestajo[] | null>(null);
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => { if (vivo) setRows(null); }, 0); // fuera del render (regla react-hooks)
    if (!proveedor) { clearTimeout(t); const t2 = setTimeout(() => { if (vivo) setRows([]); }, 0); return () => { vivo = false; clearTimeout(t2); }; }
    let q = supabase.from("Requisiciones").select("id, folio, created_at, status, destajo_tipo_pago, destajo_concepto, total, monto, cost_center_name, proveedor, comprobante_pago_url, fecha_pago")
      .eq("tipo_solicitud", "DESTAJO").eq("proveedor", proveedor).not("status", "in", "(CANCELADA,RECHAZADA_DIRECCION,RECHAZADA_RESPONSABLE)").order("created_at", { ascending: false }).limit(500);
    if (!todasLasObras && obra) q = q.eq("cost_center_name", obra);
    q.then(({ data }) => { if (vivo) setRows((data || []) as PagoDestajo[]); });
    return () => { vivo = false; clearTimeout(t); };
  }, [proveedor, obra, todasLasObras]);
  return rows;
}

export function ResumenPagos({ rows }: { rows: PagoDestajo[] }) {
  const r = resumenDestajo(rows);
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl bg-[var(--d-card-2)] p-2.5"><div className="text-[11px] text-[var(--d-muted)]">Autorizado</div><div className="text-[15px] font-bold text-[#00873f]">{mx(r.autorizado)}</div><div className="text-[11px] text-[var(--d-muted)]">{r.nAutorizado} pago{r.nAutorizado === 1 ? "" : "s"}</div></div>
      <div className="rounded-xl bg-[var(--d-card-2)] p-2.5"><div className="text-[11px] text-[var(--d-muted)]">En trámite</div><div className="text-[15px] font-bold text-[#b45309]">{mx(r.tramite)}</div><div className="text-[11px] text-[var(--d-muted)]">{r.nTramite} pago{r.nTramite === 1 ? "" : "s"}</div></div>
      <div className="rounded-xl bg-[var(--d-card-2)] p-2.5"><div className="text-[11px] text-[var(--d-muted)]">Total</div><div className="text-[15px] font-bold text-[var(--d-text)]">{mx(r.total)}</div><div className="text-[11px] text-[var(--d-muted)]">{r.n} pago{r.n === 1 ? "" : "s"}</div></div>
    </div>
  );
}

export function TablaPagos({ rows, conObra }: { rows: PagoDestajo[]; conObra: boolean }) {
  return (
    <div className="divide-y divide-[var(--d-border)] rounded-xl border border-[var(--d-border)] overflow-hidden">
      {rows.map(r => { const g = grupoDe(r.status); return (
        <Link key={r.id} href={`/dashboard/requisiciones/requisiciones/estatus?open=${r.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--d-hover)]">
          <div className="w-[52px] shrink-0 text-[12.5px] font-bold text-[var(--d-link)]">{num(r.folio)}</div>
          <div className="w-[70px] shrink-0 text-[12px] text-[var(--d-muted)]">{fecha(r.created_at)}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-[var(--d-text)] truncate">{r.destajo_tipo_pago ? `${TIPO_TXT[r.destajo_tipo_pago] || r.destajo_tipo_pago} · ` : ""}{r.destajo_concepto || "Sin concepto"}</div>
            {conObra && <div className="text-[11.5px] text-[var(--d-muted)] truncate">{r.cost_center_name}</div>}
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white ${g === "autorizado" ? "bg-[#00873f]" : "bg-[#b45309]"}`}>{g === "autorizado" ? (r.comprobante_pago_url ? "Pagado" : "Autorizado") : "En trámite"}</span>
          <div className="w-[92px] shrink-0 text-right text-[13.5px] font-bold text-[var(--d-text)]">{mx(montoDe(r))}</div>
        </Link>); })}
      {!rows.length && <div className="px-3 py-6 text-center text-[13px] text-[var(--d-muted)]">Sin pagos registrados.</div>}
    </div>
  );
}

export function descargarCSV(rows: PagoDestajo[], nombre: string) {
  const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const lineas = [["Folio", "Fecha", "Obra", "Destajista", "Tipo", "Concepto", "Estado", "Monto"].join(",")];
  for (const r of rows) lineas.push([r.folio, r.created_at.slice(0, 10), r.cost_center_name, r.proveedor, TIPO_TXT[r.destajo_tipo_pago || ""] || r.destajo_tipo_pago || "", r.destajo_concepto, grupoDe(r.status) === "autorizado" ? "Autorizado" : "En trámite", montoDe(r).toFixed(2)].map(esc).join(","));
  const blob = new Blob(["﻿" + lineas.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${nombre}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Ficha deslizable: pagos de un destajista (en esta obra o en todas) */
export default function PagosDestajistaSheet({ proveedor, obra, onClose }: { proveedor: string; obra: string | null; onClose: () => void }) {
  const [todas, setTodas] = useState(!obra);
  const rows = useCargarPagosDestajo(proveedor, obra, todas);
  const lista = useMemo(() => rows || [], [rows]);
  return (
    <div className="aria-sheet fixed inset-0 z-[70] flex md:justify-end bg-black/55 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label={`Pagos a ${proveedor}`} className="mt-auto md:mt-0 w-full md:w-[560px] max-h-[92dvh] md:max-h-full md:h-full rounded-t-3xl md:rounded-none bg-[var(--d-surface)] border-t md:border-t-0 md:border-l border-[var(--d-border)] flex flex-col shadow-2xl">
        <div className="px-5 pt-4 pb-3 border-b border-[var(--d-border)] flex items-start gap-2">
          <div className="flex-1 min-w-0"><div className="text-[17px] font-bold text-[var(--d-text)] truncate">{proveedor}</div><div className="text-[12.5px] text-[var(--d-muted)]">{todas ? "Todas las obras" : obra}</div></div>
          <button type="button" onClick={() => lista.length && descargarCSV(lista, `pagos-${proveedor}`)} className="p-2 rounded-xl hover:bg-[var(--d-hover)] text-[var(--d-text-2)]" aria-label="Descargar lista"><Download className="w-5 h-5" /></button>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--d-hover)] text-[var(--d-text-2)]" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-3 space-y-3 overflow-y-auto">
          {obra && (
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--d-card-2)] p-1" role="tablist">
              {([[false, "Esta obra"], [true, "Todas las obras"]] as [boolean, string][]).map(([v, l]) => (
                <button key={l} role="tab" aria-selected={todas === v} type="button" onClick={() => setTodas(v)} className={`rounded-xl py-2 text-[13px] font-bold ${todas === v ? "bg-[var(--d-surface)] text-[var(--d-text)] shadow-[var(--d-shadow)]" : "text-[var(--d-muted)]"}`}>{l}</button>))}
            </div>)}
          {rows === null ? <div className="py-8 text-center text-[13px] text-[var(--d-muted)]">Cargando…</div> : <><ResumenPagos rows={lista} /><TablaPagos rows={lista} conObra={todas} /></>}
          <p className="text-[11.5px] text-[var(--d-muted)]">Autorizado = Dirección ya la aprobó (o es histórica). En trámite = todavía la está revisando alguien. Canceladas y rechazadas no se cuentan.</p>
        </div>
      </div>
    </div>
  );
}
