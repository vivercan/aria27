"use client";
/**
 * /dashboard/requisiciones/requisiciones/entrega/[id] — ARIA27 Campo F3
 * Evidencia de entrega desde el celular: checklist de partidas, foto (cámara),
 * ubicación, quién recibió y nota. Una acción principal, abajo, ancho completo.
 */
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Camera, MapPin, Check, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { IcoEscanear } from "@/components/domenica/IconosObra";
import { guardarPendiente, esSinSenal } from "@/lib/cola-offline";
import { supabase } from "@/lib/supabase";
import AriaBackButton from "@/components/AriaBackButton";
import RequiStepper from "@/components/RequiStepper";

interface Req { id: string; folio: string; cost_center_name: string; proveedor?: string | null; status: string; user_email?: string; created_by?: string; tipo_solicitud?: string | null; purchase_status?: string | null; forma_pago?: string | null; created_at?: string; responsable_email?: string | null; responsable_autorizo_at?: string | null; authorized_at?: string | null; fecha_pago?: string | null; fecha_entrega?: string | null }
interface Item { id: number; product_name: string; unit: string; quantity: number; recibida: number }

async function comprimir(file: File, max = 1600, q = 0.8): Promise<Blob> {
  const img = document.createElement("img"); const url = URL.createObjectURL(file);
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("No se pudo leer la foto")); img.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return await new Promise<Blob>((res) => c.toBlob(b => res(b || file), "image/jpeg", q));
}

export default function EntregaPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter();
  const [req, setReq] = useState<Req | null>(null); const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string>("");
  const [foto, setFoto] = useState<File | null>(null); const [preview, setPreview] = useState<string>("");
  const [gps, setGps] = useState<{ lat: number; lng: number; acc?: number } | null>(null); const [gpsBusy, setGpsBusy] = useState(false);
  const [recibidoPor, setRecibidoPor] = useState<string>(""); const [nota, setNota] = useState<string>("");
  const [sending, setSending] = useState(false); const [done, setDone] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  // Escanear la nota de remisión: la IA lee la nota y llena cuánto llegó de cada partida
  const notaRef = useRef<HTMLInputElement>(null); const [leyendo, setLeyendo] = useState(false); const [leida, setLeida] = useState("");
  const escanearNota = async (f: File | null) => {
    if (!f || !req) return; setLeyendo(true); setError(""); setLeida("");
    try {
      const blob = await comprimir(f, 1800, 0.85);
      const path = `entregas/notas/${req.folio}_${Date.now()}.jpg`;
      const { data: up, error: upErr } = await supabase.storage.from("expedientes").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw new Error("No se pudo subir la foto de la nota");
      const url = supabase.storage.from("expedientes").getPublicUrl(up.path).data.publicUrl;
      const r = await fetch("/api/requisicion/leer-nota", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requisition_id: req.id, url }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No pude leer la nota");
      const porIdx = new Map<number, number>((j.items as { i: number; recibida: number }[]).map(x => [x.i, x.recibida]));
      setItems(p => p.map((x, i) => porIdx.has(i) ? { ...x, recibida: porIdx.get(i)! } : { ...x, recibida: 0 }));
      setNota(n => [n, `Nota de remisión${j.folio_nota ? ` ${j.folio_nota}` : ""}${j.proveedor ? ` (${j.proveedor})` : ""}: ${url}`].filter(Boolean).join("\n"));
      setLeida(`Leí la nota: ${j.leidas} de ${j.total} partidas. Revisa las cantidades.`);
      try { navigator.vibrate?.(30); } catch { /* */ }
    } catch (e) { setError((e as Error).message); } finally { setLeyendo(false); }
  };

  useEffect(() => {
    setRecibidoPor(localStorage.getItem("userDisplayName") || localStorage.getItem("userName") || "");
    let alive = true;
    (async () => {
      try {
        const { data: r, error: e1 } = await supabase.from("Requisiciones").select("*").eq("id", id).maybeSingle();
        if (e1 || !r) throw new Error("No se encontró la requisición");
        const { data: its } = await supabase.from("requisition_items").select("id, product_name, unit, quantity").eq("requisition_id", id).order("id");
        if (!alive) return;
        setReq(r as Req); setItems(((its || []) as Array<{ id: number; product_name: string; unit: string; quantity: number }>).map(i => ({ ...i, recibida: Number(i.quantity) })));
      } catch (e) { if (alive) setError((e as Error).message); } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  const pedirGps = () => {
    if (!navigator.geolocation) { setError("Este navegador no tiene ubicación."); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(p => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }); setGpsBusy(false); },
      () => { setError("No se pudo obtener la ubicación. Revisa el permiso del navegador."); setGpsBusy(false); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  };
  const onFoto = (f: File | null) => { setFoto(f); if (preview) URL.revokeObjectURL(preview); setPreview(f ? URL.createObjectURL(f) : ""); };

  const enviar = async () => {
    if (!req) return; setSending(true); setError("");
    const completa0 = items.every(i => i.recibida >= i.quantity);
    const cuerpo = { requisition_id: req.id, items: items.map(i => ({ product_name: i.product_name, unit: i.unit, quantity: i.quantity, recibida: i.recibida })), recibido_por: recibidoPor, nota, lat: gps?.lat ?? null, lng: gps?.lng ?? null, foto_url: null as string | null, completa: completa0 };
    // Sin señal: se guarda en el teléfono (con la foto) y se manda sola al volver la señal
    const guardarSinSenal = async () => {
      const blob = foto ? await comprimir(foto) : undefined;
      await guardarPendiente({ tipo: "entrega", titulo: `Entrega ${req.folio}`, url: "/api/requisicion/entrega", body: cuerpo, foto: blob ? { blob, path: `entregas/${req.folio}_${Date.now()}.jpg`, campo: "foto_url" } : undefined });
      setDone("Sin señal: la entrega quedó guardada en tu teléfono y se manda sola en cuanto haya señal.");
      setTimeout(() => router.push("/dashboard/campo"), 2500);
    };
    if (typeof navigator !== "undefined" && navigator.onLine === false) { try { await guardarSinSenal(); } catch (e) { setError((e as Error).message); } finally { setSending(false); } return; }
    try {
      let foto_url: string | null = null;
      if (foto) {
        const blob = await comprimir(foto);
        const path = `entregas/${req.folio}_${Date.now()}.jpg`;
        const { data: up, error: upErr } = await supabase.storage.from("expedientes").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw new Error("No se pudo subir la foto: " + upErr.message);
        foto_url = supabase.storage.from("expedientes").getPublicUrl(up.path).data.publicUrl;
      }
      const completa = items.every(i => i.recibida >= i.quantity);
      const res = await fetch("/api/requisicion/entrega", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisition_id: req.id, items: items.map(i => ({ product_name: i.product_name, unit: i.unit, quantity: i.quantity, recibida: i.recibida })), recibido_por: recibidoPor, nota, lat: gps?.lat ?? null, lng: gps?.lng ?? null, foto_url, completa }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `Error ${res.status}`);
      setDone(j.status === "ENTREGADA" ? "Entrega completa registrada." : "Entrega parcial registrada.");
      setTimeout(() => router.push("/dashboard/requisiciones/requisiciones/estatus"), 1800);
    } catch (e) { if (esSinSenal(e)) { try { await guardarSinSenal(); } catch (e2) { setError((e2 as Error).message); } } else setError((e as Error).message); } finally { setSending(false); }
  };

  if (loading) return <div className="aria-page-canon flex items-center justify-center min-h-[50dvh]"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>;
  if (!req) return <div className="aria-page-canon"><AriaBackButton href="/dashboard/requisiciones/requisiciones/estatus" /><div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error || "No se encontró la requisición."}</div></div>;
  const bloqueada = ["ENTREGADA", "CANCELADA", "RECHAZADA_RESPONSABLE", "RECHAZADA_DIRECCION", "PENDIENTE_RESPONSABLE"].includes(req.status);

  return (
    <div className="aria-page-canon pb-28 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/requisiciones/requisiciones/estatus" />
        <div><h1 className="text-xl font-bold text-[var(--d-text)]">Registrar entrega</h1><p className="text-[var(--d-muted)] text-sm">{req.folio} · {req.cost_center_name}{req.proveedor ? ` · ${req.proveedor}` : ""}</p></div>
      </div>
      <div className="mt-3 rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-2 py-2"><RequiStepper req={req} compact /></div>
      {bloqueada && <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />Esta requisición no admite entrega en su estado actual ({req.status}).</div>}
      {error && <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      {done && <div className="mt-3 rounded-xl bg-[#00953f] p-3 text-sm font-semibold text-white flex gap-2 sobre-verde"><Check className="w-4 h-4" />{done}</div>}

      <section className="mt-4 rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] p-4">
        <div className="flex items-center gap-2 mb-2"><h2 className="flex-1 text-sm font-semibold text-[var(--d-text)]">1. ¿Qué llegó?</h2>
          <input ref={notaRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { escanearNota(e.target.files?.[0] || null); e.target.value = ""; }} />
          {items.length > 0 && !bloqueada && <button type="button" onClick={() => notaRef.current?.click()} disabled={leyendo} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0077ad] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-60">{leyendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <IcoEscanear className="w-4 h-4" color="#fff" fondo="#0077ad" />}{leyendo ? "Leyendo…" : "Escanear nota"}</button>}
        </div>
        {leida && <div className="mb-2 rounded-xl bg-[#0077ad] px-3 py-2 text-[13px] font-semibold text-white">{leida}</div>}
        {items.length === 0 ? <p className="text-xs text-[var(--d-muted)]">Sin partidas registradas.</p> : (
          <ul className="divide-y divide-[var(--d-border)]">
            {items.map((it, idx) => (
              <li key={it.id} className="py-2 flex items-center gap-3">
                <button type="button" aria-pressed={it.recibida >= it.quantity} onClick={() => setItems(p => p.map((x, i) => i === idx ? { ...x, recibida: x.recibida >= x.quantity ? 0 : x.quantity } : x))}
                  className={`btn-flat w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${it.recibida >= it.quantity ? "bg-[#00953f] border-[#00953f] text-white" : "border-[var(--d-border)] text-transparent"} sobre-verde`}><Check className="w-5 h-5" /></button>
                <div className="flex-1 min-w-0"><div className="text-sm text-[var(--d-text)] truncate">{it.product_name}</div><div className="text-[11px] text-[var(--d-muted)]">pedido: {it.quantity} {it.unit}</div></div>
                <input type="number" inputMode="decimal" min={0} value={it.recibida} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, recibida: Number(e.target.value) } : x))} className="w-20 rounded-lg border border-[var(--d-border)] bg-[var(--d-input)] px-2 py-1.5 text-sm text-right" aria-label={`Cantidad recibida de ${it.product_name}`} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-3 rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] p-4">
        <h2 className="text-sm font-semibold text-[var(--d-text)] mb-2">2. Foto de la entrega</h2>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => onFoto(e.target.files?.[0] || null)} />
        {preview ? (
          <div className="relative"><img src={preview} alt="Vista previa de la entrega" className="w-full max-h-72 object-cover rounded-xl border border-[var(--d-border)]" />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-flat absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-xs text-[var(--d-text)]"><RefreshCw className="w-3.5 h-3.5" />Retomar</button></div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-dashed border-[var(--d-border)] bg-[var(--d-card)] py-8 flex flex-col items-center gap-2 text-[var(--d-text-2)] hover:bg-[var(--d-hover)]"><Camera className="w-7 h-7 text-aria-accent" /><span className="text-sm">Tomar foto</span><span className="text-[11px] text-[var(--d-muted)]">Nota de remisión, material en obra o ambos</span></button>
        )}
      </section>

      <section className="mt-3 rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--d-text)]">3. Quién y dónde</h2>
        <div><label className="text-xs text-[var(--d-muted)]">Recibió</label><input value={recibidoPor} onChange={e => setRecibidoPor(e.target.value)} className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2.5 text-sm" placeholder="Nombre de quien recibió" /></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={pedirGps} disabled={gpsBusy} className={`btn-flat inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${gps ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200" : "border-[var(--d-border)] bg-[var(--d-input)] text-[var(--d-text-2)]"}`}>{gpsBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}{gps ? "Ubicación lista" : "Usar mi ubicación"}</button>
          {gps && <span className="text-[11px] text-[var(--d-muted)]">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}{gps.acc ? ` · ±${Math.round(gps.acc)} m` : ""}</span>}
        </div>
        <div><label className="text-xs text-[var(--d-muted)]">Nota (opcional)</label><textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm" placeholder="Faltó algo, llegó dañado, quién entregó…" /></div>
      </section>

      <div className="campo-bottom-bar fixed left-0 right-0 bottom-0 md:left-[220px] p-3 bg-[var(--d-surface)] border-t border-[var(--d-border)]" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <button onClick={enviar} disabled={sending || bloqueada || !!done || items.length === 0} className="w-full max-w-2xl mx-auto block rounded-full bg-[#00953f] hover:bg-[#35c801] text-white font-bold py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg sobre-verde">
          {sending ? <span className="inline-flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Guardando…</span> : items.every(i => i.recibida >= i.quantity) ? "Registrar entrega completa" : "Registrar entrega parcial"}
        </button>
      </div>
    </div>
  );
}
