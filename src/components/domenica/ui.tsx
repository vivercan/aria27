"use client";
/** ARIA Doménica · piezas compartidas de las pantallas (11-Oct-2026) */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

export type Emp = { id: string; full_name: string };
export type Obra = { id: string; nombre: string };
export type Yo = { email: string; role: string; name: string };

export async function api<T = Record<string, unknown>>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error || `Error ${r.status}`);
  return j as T;
}

/** Usuario, personal activo, obras activas y mi empleado */
export function useBase() {
  const router = useRouter();
  const [s, setS] = useState<{ me: Yo | null; emps: Emp[]; obras: Obra[]; miEmp: string | null; listo: boolean }>({ me: null, emps: [], obras: [], miEmp: null, listo: false });
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (r.status === 401) { router.replace("/"); return; }
        const u = await r.json(); const email = String(u.email || "").toLowerCase();
        const [{ data: e }, { data: o }, { data: mine }] = await Promise.all([
          supabase.from("employees").select("id, full_name").eq("status", "ACTIVO").order("full_name"),
          supabase.from("centros_trabajo").select("id, nombre").eq("activo", true).order("nombre"),
          supabase.from("employees").select("id").or(`usuario_email.eq.${email},email.eq.${email}`).limit(1).maybeSingle(),
        ]);
        if (!vivo) return;
        setS({ me: { email, role: String(u.role || "").toLowerCase(), name: u.display_name || u.name || email }, emps: (e || []) as Emp[], obras: (o || []) as Obra[], miEmp: (mine as { id?: string } | null)?.id || null, listo: true });
      } catch { if (vivo) setS(p => ({ ...p, listo: true })); }
    })();
    return () => { vivo = false; };
  }, [router]);
  return s;
}

export function useAviso() {
  const [t, setT] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const flash = useCallback((tipo: "ok" | "err", m: string) => { setT({ t: tipo, m }); setTimeout(() => setT(null), 3500); }, []);
  const nodo = t ? <div className={`fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 z-[90] rounded-xl px-4 py-2.5 text-sm font-semibold shadow-2xl ${t.t === "ok" ? "bg-[#00c875] text-[#06281a]" : "bg-[#e2445c] text-white"}`}>{t.m}</div> : null;
  return { flash, nodo };
}

export function DomHeader({ icon: Icon, from, to, titulo, desc, accion }: { icon: LucideIcon; from: string; to: string; titulo: string; desc: string; accion?: React.ReactNode }) {
  return (
    <>
      <Link href="/dashboard/domenica" className="inline-flex items-center gap-1 text-xs text-[var(--d-link)] mb-2"><ArrowLeft className="w-3.5 h-3.5" />ARIA Doménica</Link>
      <div className="flex items-start gap-3 dom-in">
        <span className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center shadow-[0_8px_18px_-8px_rgba(15,23,42,.45)]" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}><Icon className="w-6 h-6 text-white" /></span>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[var(--d-text)] tracking-tight">{titulo}</h1>
          <p className="text-[13px] text-[var(--d-muted)]">{desc}</p>
        </div>
        {accion}
      </div>
    </>
  );
}

/** Hoja inferior en celular / panel centrado en web */
export function Hoja({ titulo, onClose, children, pie }: { titulo: string; onClose: () => void; children: React.ReactNode; pie?: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="aria-sheet fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/55 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full md:w-[620px] max-h-[94dvh] md:max-h-[88vh] rounded-t-3xl md:rounded-3xl bg-[var(--d-surface)] border border-[var(--d-border)] shadow-2xl flex flex-col dom-in">
        <div className="md:hidden mx-auto mt-2 h-1.5 w-12 rounded-full bg-[var(--d-border)]" />
        <div className="flex items-center gap-2 px-5 pt-3 md:pt-5 pb-3 border-b border-[var(--d-border)]">
          <h2 className="flex-1 text-lg font-bold text-[var(--d-text)]">{titulo}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--d-hover)] text-[var(--d-text-2)]" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="px-5 py-3 border-t border-[var(--d-border)]" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>{pie}</div>}
      </div>
    </div>
  );
}

export const etiqueta = "text-[11px] uppercase tracking-wide text-[var(--d-muted)] font-semibold";
export const campo = "mt-1 w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-field)] px-3 py-2.5 text-sm text-[var(--d-text)]";
export const boton = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0073ea] to-[#579bfc] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_-8px_#0073ea] active:scale-95 disabled:opacity-50";
export const ymdLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Número que cuenta hacia arriba al aparecer (respeta "reducir movimiento") */
export function Contador({ n, ms = 650 }: { n: number; ms?: number }) {
  const [v, setV] = useState(0);
  const quieto = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (quieto || n <= 0) return;
    let raf = 0; const t0 = performance.now();
    const paso = (t: number) => { const p = Math.min(1, (t - t0) / ms); setV(Math.round(n * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(paso); };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [n, ms, quieto]);
  return <>{quieto || n <= 0 ? n : v}</>;
}
