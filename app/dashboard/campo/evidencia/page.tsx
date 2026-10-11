"use client";
/** /dashboard/campo/evidencia — Registrar entrega: lo que te toca recibir; cada una abre la pantalla de entrega (Doménica 27 · 11-Oct-2026). */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { accionPara } from "@/lib/requi-stepper";
import { IcoCamion } from "@/components/domenica/IconosObra";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { Encabezado, Buscador, Pagina } from "@/components/movil/base";

type R = { id: string; folio: string; cost_center_name: string; status: string; purchase_status?: string | null; user_email?: string; responsable_email?: string | null; tipo_solicitud?: string | null; proveedor?: string | null; required_date?: string | null; created_at: string };
const corto = (f: string) => String(f || "").replace(/^REQ-\d{4}-/, "#");
const dias = (f: string) => Math.max(0, Math.floor((Date.now() - Date.parse(f)) / 864e5));

export default function EvidenciaPage() {
  const router = useRouter(); const [items, setItems] = useState<R[] | null>(null); const [q, setQ] = useState(""); const [obra, setObra] = useState("");
  useEffect(() => { let alive = true; (async () => { try {
    const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" }); if (r.status === 401) { router.replace("/"); return; }
    const u = await r.json(); const email = String(u.email || "").toLowerCase(); const role = String(u.role || "").toLowerCase();
    let qq = supabase.from("Requisiciones").select("id, folio, cost_center_name, status, purchase_status, user_email, responsable_email, tipo_solicitud, proveedor, required_date, created_at").order("created_at", { ascending: false }).limit(500);
    if (!["admin", "compras", "rh", "direccion"].includes(role)) qq = qq.eq("user_email", email);
    const { data } = await qq; if (!alive) return;
    setItems(((data || []) as R[]).filter(x => accionPara(x, role, email) === "REGISTRAR_ENTREGA"));
  } catch { if (alive) setItems([]); } })(); return () => { alive = false; }; }, [router]);
  const obras = useMemo(() => [...new Set((items || []).map(r => r.cost_center_name).filter(Boolean))].sort(), [items]);
  const vis = useMemo(() => { const t = q.trim().toLowerCase(); return (items || []).filter(r => (!obra || r.cost_center_name === obra) && (!t || `${r.folio} ${r.cost_center_name} ${r.proveedor || ""}`.toLowerCase().includes(t))); }, [items, q, obra]);
  return (
    <Pagina>
      <Encabezado ico={IcoCamion} color="#0086c0" titulo="Registrar entrega" sub={items ? `${items.length} esperan llegar` : "Cargando…"} atras="/dashboard/campo" />
      <Buscador valor={q} cambiar={setQ} texto="Buscar folio, obra o proveedor" />
      {obras.length > 1 && <select value={obra} onChange={e => setObra(e.target.value)} className="mt-2 w-full rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] px-3.5 h-11 text-[15px] text-[var(--d-text)]"><option value="">Todas las obras</option>{obras.map(o => <option key={o} value={o}>{o}</option>)}</select>}
      <div className="mt-3">
        {items === null ? <Esqueleto filas={6} alto={64} /> : vis.length === 0 ? <div className="dom-card rounded-3xl"><Vacio dibujo="listo" titulo="Nada por recibir" texto="Cuando una compra esté por llegar a tu obra, aparece aquí." /></div> : (
          <div className="dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">{vis.map(r => (
            <Link key={r.id} href={`/dashboard/requisiciones/requisiciones/entrega/${r.id}`} className="flex items-center gap-3 px-3.5 py-3 active:bg-[var(--d-hover)]">
              <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)] truncate">{r.cost_center_name || "Sin obra"}</div>
                <div className="text-[12.5px] text-[var(--d-muted)] truncate">{corto(r.folio)} · {r.proveedor || "Sin proveedor"} · hace {dias(r.created_at)} d</div></div>
              <span className="shrink-0 rounded-xl bg-[#3cde01] px-3 py-2 text-[13px] font-bold text-white sobre-verde">Recibir</span>
            </Link>))}</div>)}
      </div>
    </Pagina>
  );
}
