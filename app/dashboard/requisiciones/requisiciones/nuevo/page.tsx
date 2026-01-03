"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Plus, Trash2, Check, Loader2, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type CostCenter = { id: number; code: string; name: string };
type Product = { id: number; name: string | null; unit: string | null; category: string | null; description: string | null };
type MaterialRow = { id: number; name: string; unit: string; qty: number; observations: string };

export default function NewRequisitionPage() {
  const router = useRouter();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<number | null>(null);
  const [requiredDate, setRequiredDate] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const qtyInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  useEffect(() => {
    const loadCenters = async () => {
      const { data } = await supabase.from("cost_centers").select("id, code, name").order("name");
      if (data) setCostCenters(data);
    };
    loadCenters();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRequiredDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("Productos")
      .select("id, name, unit, category, description")
      .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
      .limit(15);
    setSearchResults((data || []) as Product[]);
    setSearching(false);
  };

  const addMaterial = (product: Product) => {
    if (!product.id || !product.name) return;
    setAddedIds(prev => new Set(prev).add(product.id));
    setTimeout(() => setAddedIds(prev => { const n = new Set(prev); n.delete(product.id); return n; }), 2000);
    setMaterials(prev => {
      const exists = prev.find(m => m.id === product.id);
      if (exists) return prev.map(m => m.id === product.id ? { ...m, qty: m.qty + 1 } : m);
      setTimeout(() => qtyInputRefs.current.get(product.id)?.focus(), 100);
      return [...prev, { id: product.id, name: product.name ?? "", unit: product.unit || "", qty: 1, observations: "" }];
    });
  };

  const removeMaterial = (id: number) => setMaterials(prev => prev.filter(m => m.id !== id));
  const updateQty = (id: number, v: number) => setMaterials(prev => prev.map(m => m.id === id ? { ...m, qty: Math.max(1, v) } : m));
  const updateObs = (id: number, v: string) => setMaterials(prev => prev.map(m => m.id === id ? { ...m, observations: v } : m));

  const handleSubmit = async () => {
    setErrorMsg(null); setMessage(null);
    if (!selectedCostCenterId) { setErrorMsg("Selecciona un centro de costo."); return; }
    if (!requiredDate) { setErrorMsg("Selecciona la fecha requerida."); return; }
    if (materials.length === 0) { setErrorMsg("Agrega al menos un material."); return; }

    const center = costCenters.find(c => c.id === selectedCostCenterId);
    if (!center) return;

    setSending(true);
    try {
      const res = await fetch("/api/requisicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: { nombre: "Usuario ARIA27", email: "recursos.humanos@gcuavante.com" },
          obra: center.name,
          comentarios: generalComments,
          materiales: materials.map(m => ({ id: m.id, name: m.name, unit: m.unit, qty: m.qty, comments: m.observations })),
          requiredDate,
          costCenterId: center.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(`✅ Requisición ${data.folio} generada exitosamente. Se enviaron notificaciones por email.`);
      setMaterials([]);
      setGeneralComments("");
      setTimeout(() => router.push("/dashboard/requisiciones/Requisiciones/estatus"), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al generar la requisición.");
    } finally {
      setSending(false);
    }
  };

  const isCartEmpty = materials.length === 0;

  return (
    <div className="flex flex-col gap-4 p-6 h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nueva Requisición</h1>
      </div>

      {errorMsg && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{errorMsg}</div>}
      {message && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold">1. CONFIGURACIÓN</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Obra / Centro de Costos</label>
              <select
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400"
                value={selectedCostCenterId ?? ""}
                onChange={(e) => setSelectedCostCenterId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Seleccione...</option>
                {costCenters.map((c, i) => (
                  <option key={c.id} value={c.id}>{i + 1}. {c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Fecha Requerida</label>
              <input
                type="date"
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <label className="text-xs font-medium text-white/70">Instrucciones generales</label>
            <textarea
              className="h-20 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400"
              placeholder="Instrucciones de entrega, horarios, etc."
              value={generalComments}
              onChange={(e) => setGeneralComments(e.target.value)}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold">2. BUSCAR EN CATÁLOGO</h2>
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2 mb-3">
            <Search className="h-4 w-4 opacity-70" />
            <input className="w-full bg-transparent text-sm outline-none" placeholder="Escribe al menos 2 letras..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
            {searching && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <div className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/20">
            <div className="grid grid-cols-[1fr_80px_50px] gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase text-white/70">
              <div>Descripción</div><div>Unidad</div><div></div>
            </div>
            {searchResults.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-white/40">{searchTerm.length < 2 ? "Escribe para buscar..." : "Sin resultados"}</div>
            ) : searchResults.map(p => (
              <div key={p.id} className="grid grid-cols-[1fr_80px_50px] gap-2 items-center px-3 py-2 text-xs hover:bg-white/5">
                <div className="truncate">{p.name}</div>
                <div className="text-white/60 truncate">{p.unit}</div>
                <button onClick={() => addMaterial(p)} disabled={addedIds.has(p.id)} className={`rounded-full p-1.5 ${addedIds.has(p.id) ? "bg-gray-500" : "bg-emerald-500 hover:bg-emerald-400"}`}>
                  {addedIds.has(p.id) ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="flex-1 rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">3. PARTIDAS DE LA REQUISICIÓN</h2>
          </div>
          <span className="text-xs text-white/50">{materials.length} partidas</span>
        </div>
        <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-black/20">
          <div className="grid grid-cols-[1fr_90px_90px_1.5fr_40px] gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase text-white/70 sticky top-0">
            <div>Descripción</div><div>Unidad</div><div>Cantidad</div><div>Observaciones</div><div></div>
          </div>
          {isCartEmpty ? (
            <div className="px-3 py-8 text-center text-sm text-white/40">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Requisición vacía. Busca y agrega materiales arriba.
            </div>
          ) : materials.map(m => (
            <div key={m.id} className="grid grid-cols-[1fr_90px_90px_1.5fr_40px] gap-2 items-center px-3 py-2 text-xs">
              <div className="truncate font-medium">{m.name}</div>
              <div className="text-white/60">{m.unit}</div>
              <input ref={el => { if (el) qtyInputRefs.current.set(m.id, el); }} type="number" min={1} className="w-full rounded-lg bg-black/40 px-2 py-1 text-center outline-none" value={m.qty} onChange={e => updateQty(m.id, Number(e.target.value))} />
              <input type="text" className="w-full rounded-lg bg-black/40 px-2 py-1 outline-none" placeholder="Opcional..." value={m.observations} onChange={e => updateObs(m.id, e.target.value)} />
              <button onClick={() => removeMaterial(m.id)} className="rounded-full bg-red-500/70 p-1.5 hover:bg-red-500"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSubmit} disabled={sending || isCartEmpty} className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg transition ${isCartEmpty ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"}`}>
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Generando...</> : <><Check className="h-4 w-4" />Generar Requisición</>}
          </button>
        </div>
      </section>
    </div>
  );
}
