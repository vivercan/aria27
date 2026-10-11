"use client";
/** Catálogo de productos en el teléfono (Doménica 27 · 11-Oct-2026): buscar rápido y ver unidad, rubro y proveedores. Importar/editar: modo completo. */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { IcoSaco } from "@/components/domenica/IconosObra";
import { Hoja } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { supabase } from "@/lib/supabase";
import { Encabezado, Buscador, ModoCompleto, Pagina } from "./base";

type P = { id: number; sku: string | null; name: string; description: string | null; unit: string | null; category: string | null };
type PS = { precio_referencia: number | null; tiempo_entrega_dias: number | null; es_proveedor_preferido: boolean | null; suppliers: { name: string } | { name: string }[] | null };
const PAG = 40;

export default function ProductosMovil() {
  const [q, setQ] = useState(""); const [lista, setLista] = useState<P[] | null>(null); const [total, setTotal] = useState(0); const [pag, setPag] = useState(0); const [mas, setMas] = useState(false);
  const [ver, setVer] = useState<P | null>(null); const [prov, setProv] = useState<PS[] | null>(null);
  useEffect(() => {
    let vivo = true; const t = setTimeout(async () => {
      let qq = supabase.from("products").select("id, sku, name, description, unit, category", { count: "exact" }).order("name").range(pag * PAG, pag * PAG + PAG - 1);
      const s = q.trim(); if (s) qq = qq.or(`name.ilike.%${s.replace(/[%,()]/g, " ")}%,sku.ilike.%${s.replace(/[%,()]/g, " ")}%,category.ilike.%${s.replace(/[%,()]/g, " ")}%`);
      const { data, count } = await qq; if (!vivo) return;
      setLista(l => pag === 0 ? (data || []) as P[] : [...(l || []), ...((data || []) as P[])]); setTotal(count || 0); setMas(false);
    }, q ? 250 : 0);
    return () => { vivo = false; clearTimeout(t); };
  }, [q, pag]);
  useEffect(() => { if (!ver) return; setProv(null); supabase.from("product_suppliers").select("precio_referencia, tiempo_entrega_dias, es_proveedor_preferido, suppliers(name)").eq("product_id", ver.id).then(({ data }) => setProv((data || []) as PS[])); }, [ver]);
  const nombreProv = (s: PS["suppliers"]) => Array.isArray(s) ? s[0]?.name : s?.name;

  return (
    <Pagina>
      <Encabezado ico={IcoSaco} color="#0073ea" titulo="Productos" sub={lista ? `${total.toLocaleString("es-MX")} en el catálogo` : "Cargando…"} />
      <Buscador valor={q} cambiar={v => { setQ(v); setPag(0); }} texto="Ej. cemento, varilla 3/8, cable" />
      <div className="mt-3 dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
        {lista === null ? <div className="p-3"><Esqueleto filas={6} alto={52} /></div> : lista.length === 0 ? <p className="p-6 text-center text-[var(--d-muted)]">Sin resultados.</p> : lista.map(p => (
          <button key={p.id} onClick={() => setVer(p)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-[var(--d-hover)]">
            <div className="flex-1 min-w-0"><div className="text-[14.5px] font-semibold text-[var(--d-text)] line-clamp-2">{p.name}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{[p.category, p.sku].filter(Boolean).join(" · ")}</div></div>
            {p.unit && <span className="shrink-0 rounded-md bg-[var(--d-card-2)] px-2 py-1 text-[11.5px] font-bold text-[var(--d-text-2)]">{p.unit.replace(/_/g, " ").toLowerCase()}</span>}
          </button>))}
      </div>
      {lista && lista.length < total && <button onClick={() => { setMas(true); setPag(x => x + 1); }} className="mt-3 w-full rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] py-3 text-[14px] font-bold text-[var(--d-text)] inline-flex items-center justify-center gap-2">{mas && <Loader2 className="w-4 h-4 animate-spin" />}Ver más</button>}
      <ModoCompleto texto="Importar, editar y precios: modo completo" />
      {ver && (
        <Hoja titulo={ver.name} onClose={() => setVer(null)}>
          <div className="flex flex-wrap gap-1.5">{[ver.category, ver.unit && `Unidad: ${ver.unit.replace(/_/g, " ").toLowerCase()}`, ver.sku].filter(Boolean).map(x => <span key={String(x)} className="rounded-md bg-[var(--d-card-2)] px-2 py-1 text-[12px] font-semibold text-[var(--d-text-2)]">{x}</span>)}</div>
          {ver.description && <p className="mt-3 text-[14px] text-[var(--d-text-2)]">{ver.description}</p>}
          <h3 className="mt-4 mb-2 text-[12px] font-bold uppercase tracking-wider text-[var(--d-faint)]">Proveedores</h3>
          {prov === null ? <Loader2 className="w-5 h-5 animate-spin text-[var(--d-muted)]" /> : !prov.length ? <p className="text-[13px] text-[var(--d-muted)]">Sin proveedores ligados.</p> : (
            <div className="rounded-2xl bg-[var(--d-card-2)] divide-y divide-[var(--d-border)]">{prov.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-3.5 py-2.5"><span className="flex-1 min-w-0 text-[14px] font-semibold text-[var(--d-text)] truncate">{nombreProv(s.suppliers) || "Proveedor"}{s.es_proveedor_preferido ? " ★" : ""}</span>
                {s.precio_referencia ? <span className="text-[13px] font-bold text-[var(--d-text)]">{Number(s.precio_referencia).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</span> : null}</div>))}</div>)}
        </Hoja>)}
    </Pagina>
  );
}
