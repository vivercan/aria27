"use client";
/**
 * /dashboard/administracion/fiel — e.firma (FIEL) de las empresas y sus representantes (20-Oct-2026 · pidió Deyanira)
 * Solo admin, Dirección y RH. Cada descarga y cada "ver contraseña" queda registrado.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, User, Download, KeyRound, Upload, Loader2, ShieldCheck, Copy, Check, X } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

type Arc = { nombre: string; tipo: string; tamano: number };
type Reg = { id: string; tipo: "EMPRESA" | "REPRESENTANTE"; nombre: string; rfc: string; empresa?: string | null; representante?: string | null; vigencia_desde?: string | null; vigencia_hasta?: string | null; correo_sat?: string | null; notas?: string | null; tiene_password: boolean; archivos: Arc[] };

const fecha = (s?: string | null) => s ? new Date(s + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const diasPara = (s?: string | null) => s ? Math.floor((new Date(s + "T12:00:00").getTime() - Date.now()) / 864e5) : null;
const kb = (n: number) => n > 1024 * 100 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const ICO: Record<string, string> = { cer: "Certificado", key: "Llave privada", pdf: "Acuse", ren: "Renovación", req: "Requerimiento", txt: "Texto", zip: "ZIP" };

export default function FielPage() {
  const [lista, setLista] = useState<Reg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pwd, setPwd] = useState<Record<string, string | null>>({});
  const [copiado, setCopiado] = useState<string | null>(null);
  const [alta, setAlta] = useState(false);
  const cargar = useCallback(async () => {
    try { const r = await fetch("/api/administracion/fiel", { credentials: "include", cache: "no-store" }); const j = await r.json(); if (!r.ok) throw new Error(j.error || "No se pudo cargar"); setLista(j.lista || []); }
    catch (e) { setError((e as Error).message); setLista([]); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const verPwd = async (id: string) => {
    if (pwd[id] !== undefined) { setPwd(p => { const q = { ...p }; delete q[id]; return q; }); return; }
    const r = await fetch(`/api/administracion/fiel?id=${id}&password=1`, { credentials: "include", cache: "no-store" }); const j = await r.json();
    setPwd(p => ({ ...p, [id]: r.ok ? (j.password ?? null) : null }));
  };
  const copiar = async (id: string) => { const v = pwd[id]; if (!v) return; try { await navigator.clipboard.writeText(v); setCopiado(id); setTimeout(() => setCopiado(null), 1800); } catch { /* sin portapapeles */ } };
  const grupos = useMemo(() => {
    const l = lista || [];
    return [{ t: "Empresas", items: l.filter(x => x.tipo === "EMPRESA") }, { t: "Representantes legales", items: l.filter(x => x.tipo === "REPRESENTANTE") }];
  }, [lista]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <AriaBackButton />
      <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
        <div><h1 className="text-xl font-bold text-[var(--d-text)] flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-emerald-400" />e.firma (FIEL)</h1>
          <p className="text-sm text-[var(--d-muted)] mt-1">Certificados, llaves y contraseñas de las empresas y sus representantes. Cada descarga y cada contraseña vista queda registrada con nombre y hora.</p></div>
        <button type="button" onClick={() => setAlta(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white"><Upload className="w-4 h-4" />Subir FIEL nueva o renovación</button>
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-500/15 border border-red-500/40 px-4 py-3 text-sm text-red-300">{error}</p>}
      {lista === null ? <div className="py-12 text-center text-[var(--d-muted)]"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div> : grupos.map(g => (
        <section key={g.t} className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--d-muted)] mb-2">{g.t} ({g.items.length})</h2>
          {!g.items.length && <p className="text-sm text-[var(--d-faint)]">Ninguna todavía.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {g.items.map(r => { const d = diasPara(r.vigencia_hasta); const sem = d === null ? "#64748b" : d < 0 ? "#c2182b" : d < 90 ? "#b45309" : "#00873f"; return (
              <div key={r.id} className="rounded-2xl border border-[var(--d-border)] bg-[var(--d-card)] p-4">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: r.tipo === "EMPRESA" ? "#0073ea" : "#7e3bdd" }}>{r.tipo === "EMPRESA" ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[var(--d-text)] leading-tight">{r.nombre}</div>
                    <div className="text-[12.5px] text-[var(--d-muted)]">RFC {r.rfc}{r.tipo === "EMPRESA" && r.representante ? ` · Rep. legal: ${r.representante}` : ""}{r.tipo === "REPRESENTANTE" && r.empresa ? ` · ${r.empresa}` : ""}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: sem }}>{d === null ? "Sin vigencia" : d < 0 ? `Venció hace ${-d} días` : `Vence ${fecha(r.vigencia_hasta)} · ${d} días`}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.archivos.map(a => (
                    <a key={a.nombre} href={`/api/administracion/fiel?id=${r.id}&archivo=${encodeURIComponent(a.nombre)}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--d-border)] bg-[var(--d-input)] px-2 py-1 text-[12px] text-[var(--d-text)] hover:border-aria-accent" title={a.nombre}><Download className="w-3 h-3" />{ICO[a.tipo] || a.tipo} <span className="text-[var(--d-faint)]">{kb(a.tamano)}</span></a>))}
                  {!r.archivos.length && <span className="text-[12px] text-[var(--d-faint)]">Sin archivos</span>}
                </div>
                {r.tiene_password && (
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => verPwd(r.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--d-card-2)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--d-text)]"><KeyRound className="w-3.5 h-3.5" />{pwd[r.id] !== undefined ? "Ocultar contraseña" : "Ver contraseña"}</button>
                    {pwd[r.id] !== undefined && (<>
                      <code className="rounded-lg bg-black/30 px-2 py-1 text-[13px] text-amber-300 select-all">{pwd[r.id] ?? "no disponible"}</code>
                      {pwd[r.id] && <button type="button" onClick={() => copiar(r.id)} className="p-1.5 rounded-lg hover:bg-[var(--d-hover)] text-[var(--d-text-2)]" aria-label="Copiar contraseña">{copiado === r.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}</button>}
                    </>)}
                  </div>)}
                {r.notas && <p className="mt-2 text-[12px] text-[var(--d-muted)]">{r.notas}</p>}
              </div>); })}
          </div>
        </section>))}
      {alta && <AltaFiel onClose={() => setAlta(false)} onDone={() => { setAlta(false); cargar(); }} />}
    </div>
  );
}

function AltaFiel({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ tipo: "EMPRESA", nombre: "", rfc: "", empresa: "", representante: "", vigencia_desde: "", vigencia_hasta: "", password: "", notas: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false); const [err, setErr] = useState<string | null>(null);
  const inp = "w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm text-[var(--d-text)] outline-none focus:border-aria-accent";
  const enviar = async () => {
    setErr(null); if (!f.nombre.trim() || !f.rfc.trim()) { setErr("Escribe nombre y RFC"); return; }
    setEnviando(true);
    try {
      const archivos = await Promise.all(files.map(async x => ({ nombre: x.name, base64: btoa(String.fromCharCode(...new Uint8Array(await x.arrayBuffer()))) })));
      const r = await fetch("/api/administracion/fiel", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registro: { tipo: f.tipo, nombre: f.nombre, rfc: f.rfc, empresa: f.empresa || null, representante: f.representante || null, vigencia_desde: f.vigencia_desde || null, vigencia_hasta: f.vigencia_hasta || null, notas: f.notas || null }, archivos, password: f.password || undefined }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || "No se pudo guardar");
      onDone();
    } catch (e) { setErr((e as Error).message); } finally { setEnviando(false); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Subir FIEL" className="w-full md:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl md:rounded-2xl bg-[var(--d-surface)] border border-[var(--d-border)] p-5 space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-[var(--d-text)]">Subir FIEL</h2><button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--d-hover)]" aria-label="Cerrar"><X className="w-5 h-5" /></button></div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--d-card-2)] p-1">{(["EMPRESA", "REPRESENTANTE"] as const).map(t => <button key={t} type="button" onClick={() => setF({ ...f, tipo: t })} className={`rounded-lg py-2 text-[13px] font-bold ${f.tipo === t ? "bg-[var(--d-surface)] text-[var(--d-text)]" : "text-[var(--d-muted)]"}`}>{t === "EMPRESA" ? "Empresa" : "Representante"}</button>)}</div>
        <input className={inp} placeholder={f.tipo === "EMPRESA" ? "Razón social" : "Nombre completo"} value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} aria-label="Nombre" />
        <input className={inp} placeholder="RFC" value={f.rfc} onChange={e => setF({ ...f, rfc: e.target.value.toUpperCase() })} aria-label="RFC" />
        {f.tipo === "EMPRESA" ? <input className={inp} placeholder="Representante legal" value={f.representante} onChange={e => setF({ ...f, representante: e.target.value })} aria-label="Representante" /> : <input className={inp} placeholder="Empresa que representa" value={f.empresa} onChange={e => setF({ ...f, empresa: e.target.value })} aria-label="Empresa" />}
        <div className="grid grid-cols-2 gap-2"><label className="text-[12px] text-[var(--d-muted)]">Vigencia desde<input type="date" className={inp} value={f.vigencia_desde} onChange={e => setF({ ...f, vigencia_desde: e.target.value })} /></label><label className="text-[12px] text-[var(--d-muted)]">Vigencia hasta<input type="date" className={inp} value={f.vigencia_hasta} onChange={e => setF({ ...f, vigencia_hasta: e.target.value })} /></label></div>
        <input className={inp} type="password" placeholder="Contraseña de la llave (se guarda cifrada)" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} aria-label="Contraseña" />
        <label className="block text-[12px] text-[var(--d-muted)]">Archivos (.cer, .key, acuse .pdf, .ren, .req o el .zip completo)<input type="file" multiple accept=".cer,.key,.pdf,.ren,.req,.txt,.zip" className="mt-1 block w-full text-sm" onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
        <textarea className={inp} rows={2} placeholder="Notas (opcional)" value={f.notas} onChange={e => setF({ ...f, notas: e.target.value })} aria-label="Notas" />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="button" disabled={enviando} onClick={enviar} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-sm font-bold text-white disabled:opacity-60">{enviando ? "Guardando…" : "Guardar"}</button>
      </div>
    </div>
  );
}
