"use client";
/** Proveedores en el teléfono (Doménica 27 · 11-Oct-2026): buscar, llamar/WhatsApp y ver datos bancarios en un toque. Alta y edición: modo completo. */
import { useEffect, useMemo, useState } from "react";
import { Plus, Copy, ChevronRight } from "lucide-react";
import { IcoBodega } from "@/components/domenica/IconosObra";
import { Hoja, useAviso } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { supabase } from "@/lib/supabase";
import { Encabezado, Buscador, Pestanas, Contacto, ModoCompleto, Pagina } from "./base";

type S = { id: number; name: string; contact_name: string | null; phone: string | null; celular: string | null; whatsapp: string | null; email: string | null; categories: string | string[] | null; active: boolean | null; rfc: string | null; bank_name: string | null; banco: string | null; bank_clabe: string | null; clabe: string | null; bank_account: string | null; numero_cuenta: string | null; nombre_cuenta: string | null; credit_days: number | null; ciudad: string | null };
const cats = (c: S["categories"]) => (Array.isArray(c) ? c : String(c || "").split(",")).map(x => String(x).trim()).filter(Boolean);

export default function ProveedoresMovil() {
  const { flash, nodo } = useAviso();
  const [lista, setLista] = useState<S[] | null>(null); const [q, setQ] = useState(""); const [tab, setTab] = useState<"activos" | "todos">("activos"); const [ver, setVer] = useState<S | null>(null);
  useEffect(() => { supabase.from("suppliers").select("id, name, contact_name, phone, celular, whatsapp, email, categories, active, rfc, bank_name, banco, bank_clabe, clabe, bank_account, numero_cuenta, nombre_cuenta, credit_days, ciudad").order("name").limit(2000).then(({ data }) => setLista((data || []) as S[])); }, []);
  const vis = useMemo(() => { const t = q.trim().toLowerCase(); return (lista || []).filter(s => (tab === "todos" || s.active) && (!t || `${s.name} ${s.contact_name || ""} ${s.rfc || ""} ${cats(s.categories).join(" ")}`.toLowerCase().includes(t))).slice(0, 150); }, [lista, q, tab]);
  const tel = (s: S) => s.whatsapp || s.celular || s.phone;
  const copiar = (t: string) => { try { navigator.clipboard.writeText(t); flash("ok", "Copiado"); } catch { /* */ } };

  return (
    <Pagina>
      <Encabezado ico={IcoBodega} color="#0086c0" titulo="Proveedores" sub={lista ? `${lista.filter(s => s.active).length} activos` : "Cargando…"}
        accion={<a href="/dashboard/requisiciones/proveedores?web=1" className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-[#0073ea] px-3 py-2.5 text-[14px] font-bold text-white"><Plus className="w-4 h-4" />Nuevo</a>} />
      <Buscador valor={q} cambiar={setQ} texto="Buscar nombre, contacto, RFC o rubro" />
      <Pestanas valor={tab} cambiar={setTab} opciones={[{ v: "activos", l: "Activos" }, { v: "todos", l: "Todos" }]} />
      <div className="mt-3 dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
        {lista === null ? <div className="p-3"><Esqueleto filas={6} alto={56} /></div> : vis.length === 0 ? <p className="p-6 text-center text-[var(--d-muted)]">Sin resultados.</p> : vis.map(s => (
          <div key={s.id} role="button" tabIndex={0} onClick={() => setVer(s)} className="flex items-center gap-3 px-3.5 py-3 active:bg-[var(--d-hover)]">
            <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold text-[var(--d-text)] truncate">{s.name}</div><div className="text-[12.5px] text-[var(--d-muted)] truncate">{[s.contact_name, cats(s.categories)[0]].filter(Boolean).join(" · ") || "Sin contacto"}</div></div>
            <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />
          </div>))}
      </div>
      {lista && vis.length === 150 && <p className="mt-2 text-center text-[12px] text-[var(--d-muted)]">Escribe para encontrar más.</p>}
      <ModoCompleto texto="Alta, edición y documentos: modo completo" />
      {ver && (
        <Hoja titulo={ver.name} onClose={() => setVer(null)}>
          <div className="flex items-center gap-3"><div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-[var(--d-text)]">{ver.contact_name || "Sin contacto"}</div><div className="text-[12.5px] text-[var(--d-muted)] truncate">{ver.email || ""}</div></div><Contacto tel={tel(ver)} /></div>
          {!!cats(ver.categories).length && <div className="mt-3 flex flex-wrap gap-1.5">{cats(ver.categories).map(c => <span key={c} className="rounded-md bg-[var(--d-card-2)] px-2 py-1 text-[12px] font-semibold text-[var(--d-text-2)]">{c}</span>)}</div>}
          <div className="mt-4 rounded-2xl bg-[var(--d-card-2)] divide-y divide-[var(--d-border)]">
            {[["Banco", ver.bank_name || ver.banco], ["CLABE", ver.bank_clabe || ver.clabe], ["Cuenta", ver.bank_account || ver.numero_cuenta], ["A nombre de", ver.nombre_cuenta], ["RFC", ver.rfc], ["Crédito", ver.credit_days ? `${ver.credit_days} días` : null], ["Ciudad", ver.ciudad]].filter(x => x[1]).map(([k, v]) => (
              <div key={String(k)} className="flex items-center gap-2 px-3.5 py-2.5"><span className="w-24 shrink-0 text-[12px] font-semibold text-[var(--d-muted)]">{k}</span><span className="flex-1 min-w-0 text-[14px] font-semibold text-[var(--d-text)] break-all">{v}</span>
                {(k === "CLABE" || k === "Cuenta" || k === "RFC") && <button onClick={() => copiar(String(v))} aria-label={`Copiar ${k}`} className="p-2 -m-1 rounded-lg text-[var(--d-link)]"><Copy className="w-4 h-4" /></button>}</div>))}
          </div>
        </Hoja>)}
      {nodo}
    </Pagina>
  );
}
