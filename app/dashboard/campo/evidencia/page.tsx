"use client";
/** /dashboard/campo/evidencia — lista de requis que puedo recibir; cada una abre la pantalla de entrega. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { accionPara, statusLabel } from "@/lib/requi-stepper";
import AriaBackButton from "@/components/AriaBackButton";
import CampoNav from "@/components/campo/CampoNav";
import { useListFilter } from "@/hooks/useListFilter";
import ListToolbar from "@/components/ListToolbar";

type R = { id: string; folio: string; cost_center_name: string; status: string; purchase_status?: string | null; user_email?: string; responsable_email?: string | null; tipo_solicitud?: string | null; proveedor?: string | null; required_date?: string | null; created_at: string };

export default function EvidenciaPage() {
  const router = useRouter(); const [items, setItems] = useState<R[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { let alive = true; (async () => { try {
    const r = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" }); if (r.status === 401) { router.replace("/"); return; }
    const u = await r.json(); const email = String(u.email || "").toLowerCase(); const role = String(u.role || "").toLowerCase();
    let q = supabase.from("Requisiciones").select("id, folio, cost_center_name, status, purchase_status, user_email, responsable_email, tipo_solicitud, proveedor, required_date, created_at").order("created_at", { ascending: false }).limit(500);
    if (!["admin", "compras", "rh", "direccion"].includes(role)) q = q.eq("user_email", email);
    const { data } = await q; if (!alive) return;
    setItems(((data || []) as R[]).filter(x => accionPara(x, role, email) === "REGISTRAR_ENTREGA"));
  } finally { if (alive) setLoading(false); } })(); return () => { alive = false; }; }, [router]);
  const lf = useListFilter<R>({ items, storageKey: "aria:filtro:campo-evidencia", searchFields: r => [r.folio, r.cost_center_name, r.proveedor], chips: [{ key: "", label: "Todas" }], chipOf: () => null, selects: { obra: { label: "Obra", pick: r => r.cost_center_name } } });
  return (
    <div className="aria-page-canon pb-24 max-w-2xl mx-auto">
      <div className="flex items-center gap-3"><AriaBackButton href="/dashboard/campo" /><div><h1 className="text-xl font-bold text-white">Evidencia de entrega</h1><p className="text-[#7f93b0] text-sm">Toca una requi para registrar qué llegó, con foto y ubicación.</p></div></div>
      <div className="mt-3"><ListToolbar search={lf.search} onSearch={lf.setSearch} placeholder="Buscar folio, obra, proveedor…" chips={[{ key: "", label: "Todas" }]} chip={lf.chip} onChip={lf.setChip} counts={lf.counts} selects={[{ key: "obra", label: "Obra", options: lf.selectOptions.obra || [], value: lf.selects.obra || "" }]} onSelect={lf.setSelect} shown={lf.filtered.length} total={items.length} isActive={lf.isActive} onClear={lf.clear} /></div>
      {loading ? <div className="py-12 text-center"><Loader2 className="w-7 h-7 animate-spin text-aria-accent mx-auto" /></div> : lf.filtered.length === 0 ? <div className="py-12 text-center text-sm text-[#7f93b0]">No tienes requisiciones por entregar.</div> : (
        <ul className="mt-3 space-y-2">{lf.filtered.map(r => (<li key={r.id}><Link href={`/dashboard/requisiciones/requisiciones/entrega/${r.id}`} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 active:bg-white/[0.06]"><Camera className="w-5 h-5 text-aria-accent shrink-0" /><div className="flex-1 min-w-0"><div className="text-sm text-white font-medium">{r.folio} <span className="text-[#7f93b0] font-normal">· {r.cost_center_name}</span></div><div className="text-[11px] text-[#7f93b0] truncate">{statusLabel(r.status)}{r.proveedor ? ` · ${r.proveedor}` : ""}</div></div><ChevronRight className="w-4 h-4 text-[#7f93b0]" /></Link></li>))}</ul>
      )}
      <CampoNav />
    </div>
  );
}
