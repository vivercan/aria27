"use client";
/**
 * /dashboard/configuracion/maestros/catalogos — ARIA27 Campo F7 (Solicitud 3 Compras, 10-Oct-2026)
 * Compras/admin editan sin pedirle a nadie: Subcategorías (con flujo Compras/Dirección) y Tipos de compra.
 * Fuente: tabla catalogos_requisiciones (tipo SUBCATEGORIA | TIPO_COMPRA). Nueva Requisición los lee en vivo.
 * Nombres de obras se editan en Obras > Catálogo (liga abajo).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Save, Loader2, Check, X, Pencil, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

type Row = { id: number | string; tipo: string; valor: string; activo: boolean; flujo?: string | null };
const TABS = [{ key: "SUBCATEGORIA", label: "Subcategorías", hint: "Lo que elige el usuario en “Tipo / Subcategoría”. El flujo decide si va a Compras (cotiza) o directo a Dirección." }, { key: "TIPO_COMPRA", label: "Tipos de compra", hint: "Lo que elige el usuario en “Tipo de compra” (Materiales, Refacciones, Destajos…)." }];

export default function CatalogosPage() {
  const { msg, flash } = useFlashMessage();
  const [tab, setTab] = useState("SUBCATEGORIA"); const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState(""); const [nuevoFlujo, setNuevoFlujo] = useState("compras"); const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<Row["id"] | null>(null); const [editVal, setEditVal] = useState(""); const [editFlujo, setEditFlujo] = useState("compras");

  const load = async () => { setLoading(true); const { data } = await supabase.from("catalogos_requisiciones").select("id, tipo, valor, activo, flujo").eq("tipo", tab).order("valor"); setRows((data || []) as Row[]); setLoading(false); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tab]);

  const agregar = async () => {
    const v = nuevo.trim().toUpperCase(); if (!v) return;
    if (rows.some(r => r.valor.toUpperCase() === v)) { flash("err", "Ya existe."); return; }
    setSaving(true);
    const { error } = await supabase.from("catalogos_requisiciones").insert({ tipo: tab, valor: v, activo: true, ...(tab === "SUBCATEGORIA" ? { flujo: nuevoFlujo } : {}) });
    setSaving(false); if (error) { flash("err", error.message); return; } setNuevo(""); flash("ok", `“${v}” agregado.`); load();
  };
  const guardar = async (r: Row) => {
    const v = editVal.trim().toUpperCase(); if (!v) return; setSaving(true);
    const { error } = await supabase.from("catalogos_requisiciones").update({ valor: v, ...(tab === "SUBCATEGORIA" ? { flujo: editFlujo } : {}) }).eq("id", r.id);
    setSaving(false); if (error) { flash("err", error.message); return; } setEditId(null); flash("ok", "Guardado. Las requis anteriores conservan el nombre con el que se crearon."); load();
  };
  const toggle = async (r: Row) => { const { error } = await supabase.from("catalogos_requisiciones").update({ activo: !r.activo }).eq("id", r.id); if (error) flash("err", error.message); else load(); };

  return (
    <div className="aria-page-canon max-w-3xl">
      <FlashBanner msg={msg} className="mx-0 mb-2" />
      <div className="flex items-center gap-3"><AriaBackButton href="/dashboard/configuracion/maestros" /><div><h1 className="text-2xl font-bold text-white">Catálogos de requisiciones</h1><p className="text-[#7f93b0] text-sm">Lo que cambies aquí aparece de inmediato en Nueva Requisición.</p></div></div>
      <Link href="/dashboard/obras/catalogo" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.03] px-3 py-2 text-sm text-[#c9d8ed] hover:bg-white/[0.07]"><Building2 className="w-4 h-4 text-aria-accent" />Nombres de obras: se editan en Obras › Catálogo</Link>
      <div className="mt-4 flex gap-2">{TABS.map(t => <button key={t.key} onClick={() => { setTab(t.key); setEditId(null); }} className={`btn-flat px-4 py-2 rounded-full text-sm font-semibold border ${tab === t.key ? "border-aria-accent bg-aria-accent/20 text-white" : "border-white/[0.10] text-[#c9d8ed]"}`}>{t.label}</button>)}</div>
      <p className="mt-2 text-xs text-[#7f93b0]">{TABS.find(t => t.key === tab)?.hint}</p>

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === "Enter" && agregar()} placeholder={tab === "SUBCATEGORIA" ? "Nueva subcategoría (ej. ACARREOS)" : "Nuevo tipo de compra (ej. EQUIPO DE SEGURIDAD)"} className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm" />
        {tab === "SUBCATEGORIA" && <select value={nuevoFlujo} onChange={e => setNuevoFlujo(e.target.value)} className="rounded-xl px-3 py-2.5 text-sm sm:w-48"><option value="compras">Va a Compras</option><option value="direccion">Directo a Dirección</option></select>}
        <button onClick={agregar} disabled={saving || !nuevo.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><Plus className="w-4 h-4" />Agregar</button>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.08] overflow-hidden">
        {loading ? <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></div> : rows.length === 0 ? <div className="py-10 text-center text-sm text-[#7f93b0]">Sin registros.</div> : (
          <ul className="divide-y divide-white/[0.06]">
            {rows.map(r => (
              <li key={String(r.id)} className={`flex items-center gap-2 px-3 py-2 ${r.activo ? "" : "opacity-50"}`}>
                {editId === r.id ? (<>
                  <input value={editVal} onChange={e => setEditVal(e.target.value)} className="flex-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm" autoFocus />
                  {tab === "SUBCATEGORIA" && <select value={editFlujo} onChange={e => setEditFlujo(e.target.value)} className="rounded-lg px-2 py-1.5 text-xs w-40"><option value="compras">Compras</option><option value="direccion">Dirección</option></select>}
                  <button onClick={() => guardar(r)} disabled={saving} className="btn-flat aria-no-min-tap p-2 rounded-lg bg-emerald-500/20 text-emerald-300" aria-label="Guardar"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setEditId(null)} className="btn-flat aria-no-min-tap p-2 rounded-lg bg-white/[0.06] text-[#c9d8ed]" aria-label="Cancelar"><X className="w-4 h-4" /></button>
                </>) : (<>
                  <span className="flex-1 text-sm text-white">{r.valor}</span>
                  {tab === "SUBCATEGORIA" && <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.flujo === "direccion" ? "bg-purple-500/20 text-purple-200" : "bg-aria-accent/20 text-aria-accent"}`}>{r.flujo === "direccion" ? "Dirección" : "Compras"}</span>}
                  <button onClick={() => { setEditId(r.id); setEditVal(r.valor); setEditFlujo(r.flujo || "compras"); }} className="btn-flat aria-no-min-tap p-2 rounded-lg bg-white/[0.06] text-[#c9d8ed] hover:text-white" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => toggle(r)} className={`btn-flat aria-no-min-tap px-2 py-1 rounded-lg text-[11px] border ${r.activo ? "border-emerald-500/40 text-emerald-300" : "border-white/15 text-[#7f93b0]"}`} title={r.activo ? "Activo: clic para ocultar" : "Oculto: clic para activar"}>{r.activo ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" />Activo</span> : "Oculto"}</button>
                </>)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
