"use client";
/** Cotizaciones de proveedores por link (sin usuario) dentro del detalle de una requisición · 11-Oct-2026 */
import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Copy, MessageCircle, FileText, X } from "lucide-react";
import { fmtMoney } from "@/lib/formatters";

type Cot = { id: number; supplier_name: string; total: number | null; file_url: string | null; file_name: string | null; notes: string | null; dias_entrega: number | null; forma_pago: string | null; emite_factura: boolean | null; created_at: string };
type Lnk = { id: string; supplier_name: string; expira: string; activo: boolean; usado_veces: number };

export default function CotizacionesProveedor({ reqId, puedePedir }: { reqId: string; puedePedir: boolean }) {
  const [cots, setCots] = useState<Cot[] | null>(null); const [links, setLinks] = useState<Lnk[]>([]);
  const [prov, setProv] = useState(""); const [busy, setBusy] = useState(false); const [nuevo, setNuevo] = useState<{ url: string; mensaje: string } | null>(null); const [err, setErr] = useState(""); const [copiado, setCopiado] = useState(false);
  const cargar = useCallback(async () => {
    try { const r = await fetch(`/api/requisicion/cotizacion-link?requisition_id=${reqId}`, { credentials: "include", cache: "no-store" }); const j = await r.json(); if (r.ok) { setCots(j.cotizaciones || []); setLinks(j.links || []); } else setCots([]); } catch { setCots([]); }
  }, [reqId]);
  useEffect(() => { cargar(); }, [cargar]);
  const crear = async () => {
    setErr(""); if (!prov.trim()) { setErr("Escribe el nombre del proveedor"); return; }
    setBusy(true);
    try { const r = await fetch("/api/requisicion/cotizacion-link", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requisition_id: reqId, supplier_name: prov.trim() }) }); const j = await r.json(); if (!r.ok) setErr(j.error || "No se pudo crear"); else { setNuevo({ url: j.url, mensaje: j.mensaje }); setProv(""); cargar(); } }
    catch { setErr("Sin conexión"); } finally { setBusy(false); }
  };
  const desactivar = async (id: string) => { await fetch(`/api/requisicion/cotizacion-link?id=${id}`, { method: "DELETE", credentials: "include" }); cargar(); };
  const vigentes = links.filter(l => l.activo && new Date(l.expira).getTime() > Date.now());

  return (
    <div className="mt-4 rounded-2xl border border-[var(--d-border)] bg-[var(--d-card)] p-3">
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--d-text)]"><Link2 className="w-4 h-4 text-[var(--d-link)]" />Cotizaciones de proveedores</div>
      {cots === null ? <div className="py-3 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-[var(--d-muted)]" /></div> : (
        <div className="mt-2 space-y-2">
          {cots.map(c => (
            <div key={c.id} className="rounded-xl border border-[var(--d-border)] bg-[var(--d-surface)] px-3 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0"><div className="text-[13.5px] font-semibold text-[var(--d-text)] truncate">{c.supplier_name}</div>
                <div className="text-[11.5px] text-[var(--d-muted)]">{c.dias_entrega ? `Entrega ${c.dias_entrega} d · ` : ""}{c.forma_pago || ""}{c.emite_factura ? " · con factura" : ""}{c.notes ? ` · ${c.notes}` : ""}</div></div>
              <div className="text-right"><div className="text-[14px] font-bold text-[var(--d-text)]">{c.total ? fmtMoney(c.total) : "—"}</div>
                {c.file_url && <a href={c.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--d-link)]"><FileText className="w-3.5 h-3.5" />Ver archivo</a>}</div>
            </div>))}
          {cots.length === 0 && <div className="text-[12px] text-[var(--d-muted)]">Aún no llegan cotizaciones por link.</div>}
        </div>)}
      {vigentes.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{vigentes.map(l => <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--d-card-2)] px-2.5 py-1 text-[11px] text-[var(--d-text-2)]">Link a {l.supplier_name}{l.usado_veces ? ` · respondió ${l.usado_veces}` : ""}{puedePedir && <button onClick={() => desactivar(l.id)} aria-label="Desactivar link" className="ml-0.5 text-[var(--d-muted)]"><X className="w-3 h-3" /></button>}</span>)}</div>}
      {puedePedir && (
        <div className="mt-3">
          {nuevo ? (
            <div className="rounded-xl bg-[#0073ea]/8 border border-[#0073ea]/25 p-3">
              <div className="text-[12.5px] font-semibold text-[var(--d-text)]">Link listo. Mándalo al proveedor:</div>
              <div className="mt-1 break-all text-[12px] text-[var(--d-link)]">{nuevo.url}</div>
              <div className="mt-2 flex gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(nuevo.mensaje)}`} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-2 text-[13px] font-bold text-white"><MessageCircle className="w-4 h-4" />WhatsApp</a>
                <button onClick={async () => { try { await navigator.clipboard.writeText(nuevo.mensaje); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* */ } }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--d-card-2)] px-3 py-2 text-[13px] font-semibold text-[var(--d-text)]"><Copy className="w-4 h-4" />{copiado ? "Copiado" : "Copiar"}</button>
              </div>
              <button onClick={() => setNuevo(null)} className="mt-2 text-[12px] text-[var(--d-muted)] underline">Pedir a otro proveedor</button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={prov} onChange={e => setProv(e.target.value)} placeholder="Nombre del proveedor" className="flex-1 min-w-0 rounded-lg border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm text-[var(--d-text)]" />
              <button onClick={crear} disabled={busy} className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0073ea] px-3 py-2.5 text-[13px] font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}Pedir cotización</button>
            </div>)}
          {err && <div className="mt-1 text-[12px] text-[var(--d-danger)]">{err}</div>}
          <div className="mt-1.5 text-[11px] text-[var(--d-faint)]">El proveedor abre el link sin cuenta, ve el material y sube su cotización. Vence en 7 días.</div>
        </div>
      )}
    </div>
  );
}
