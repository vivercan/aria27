"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { Search, Plus, Trash2, Check, Loader2, ShoppingCart, Fuel, Hammer, Users2, Receipt } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AriaBackButton from "@/components/AriaBackButton";
import { useFlashMessage } from "@/lib/use-flash-message";
import FlashBanner from "@/components/FlashBanner";

type CostCenter = { id: string; code: string; name: string };
type Product = { id: number; sku: string | null; name: string | null; unit: string | null; category: string | null; description: string | null };
type MaterialRow = { id: number; name: string; unit: string; qty: number; observations: string };
type FreeRow = { tempId: number; descripcion: string; unidad: string; cantidad: number; monto: number; observaciones: string };

const TIPO_MAP: Record<string, string> = {
  "MATERIALES": "catalogo", "ACEROS": "catalogo", "FERRETERIA": "catalogo",
  "IMPERMEABILIZANTES": "catalogo", "TUBOS Y CONEXIONES": "catalogo",
  "MADERA": "catalogo", "CONCRETOS": "catalogo", "INSUMOS": "catalogo",
  "DESTAJOS": "libre", "MANO DE OBRA": "libre", "PERSONAL EXTERNO": "libre",
  "COMBUSTIBLES": "combustible",
  "LUBRICANTES": "combustible", "PIPA DE AGUA": "combustible",
  "GASTOS OPERATIVOS": "libre", "INDIRECTOS DE OBRA": "libre",
  "MAQUINARIA": "libre", "MANTENIMIENTO": "libre",
  "MANTENIMIENTO AUTOMOTRIZ": "libre", "OFICINA": "catalogo",
  "COMIDA COMPENSACION": "libre", "ACARREOS": "libre",
  "FLETE MAQUINARIA": "libre", "ESTIMACIONES": "libre",
};

export default function NewRequisitionPage() {
  const router = useRouter();
  const { msg, flash, clear } = useFlashMessage();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string | null>(null);
  const [requiredDate, setRequiredDate] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  const [solicitante, setSolicitante] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [solicitantes, setSolicitantes] = useState<string[]>([]);
  const [subcategorias, setSubcategorias] = useState<string[]>([]);

  // CATALOGO (materiales)
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const qtyInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // MANUAL (producto no en catálogo)
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualUnit, setManualUnit] = useState("PZA");
  const [manualTempId, setManualTempId] = useState(-1);

  // LIBRE (destajos, MO, gastos, maquinaria)
  const [freeRows, setFreeRows] = useState<FreeRow[]>([]);
  const [nextTempId, setNextTempId] = useState(1);

  // COMBUSTIBLE
  const [combRows, setCombRows] = useState<Array<{tempId:number; tipo:string; litros:number; unidad_destino:string; tipo_unidad:string}>>([]);

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formMode = TIPO_MAP[subcategoria] || "catalogo";

  useEffect(() => {
    supabase.from("centros_trabajo").select("id, code:codigo, name:nombre").order("nombre").then(({data}) => { if(data) setCostCenters(data); });
    supabase.from("catalogos_requisiciones").select("tipo, valor").eq("activo", true).order("valor").then(({data}) => {
      if(data) {
        setSolicitantes(data.filter(d => d.tipo === "SOLICITANTE").map(d => d.valor));
        setSubcategorias(data.filter(d => d.tipo === "SUBCATEGORIA").map(d => d.valor));
      }
    });
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setRequiredDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // Limpiar partidas cuando cambia el modo
  useEffect(() => {
    setMaterials([]); setFreeRows([]); setCombRows([]);
    setSearchTerm(""); setSearchResults([]); setShowManual(false); setManualName(""); setManualUnit("PZA");
  }, [subcategoria]);

  // ========== BUSQUEDA CATALOGO ==========
  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = term.trim().toLowerCase();
    const { data: d1 } = await supabase.from("Productos").select("id, sku, name, unit, category, description").ilike("name", `${t}%`).order("name").limit(15);
    const { data: d2 } = await supabase.from("Productos").select("id, sku, name, unit, category, description").or(`name.ilike.%${t}%,description.ilike.%${t}%,sku.ilike.%${t}%`).order("name").limit(30);
    const ids = new Set((d1||[]).map(p=>p.id));
    setSearchResults([...(d1||[]), ...(d2||[]).filter(p=>!ids.has(p.id))].slice(0,20) as Product[]);
    setSearching(false);
  };

  const addMaterial = (p: Product) => {
    if (!p.id || !p.name) return;
    setAddedIds(prev => new Set(prev).add(p.id));
    setTimeout(() => setAddedIds(prev => { const n = new Set(prev); n.delete(p.id); return n; }), 2000);
    setMaterials(prev => {
      const ex = prev.find(m => m.id === p.id);
      if (ex) return prev.map(m => m.id === p.id ? {...m, qty: m.qty+1} : m);
      setTimeout(() => qtyInputRefs.current.get(p.id)?.focus(), 100);
      return [...prev, { id: p.id, name: p.name??"", unit: p.unit||"", qty: 1, observations: "" }];
    });
  };

  const addFreeRow = () => {
    const u = subcategoria === "MANO DE OBRA" ? "JORNADA" : subcategoria === "DESTAJOS" ? "DESTAJO" : subcategoria === "PERSONAL EXTERNO" ? "PERSONA" : "SERVICIO";
    setFreeRows(prev => [...prev, { tempId: nextTempId, descripcion: "", unidad: u, cantidad: 1, monto: 0, observaciones: "" }]);
    setNextTempId(prev => prev + 1);
  };

  const addCombRow = () => {
    setCombRows(prev => [...prev, { tempId: nextTempId, tipo: "DIESEL", litros: 0, unidad_destino: "", tipo_unidad: "CAMION" }]);
    setNextTempId(prev => prev + 1);
  };

  const shortCat = (cat: string|null) => {
    if (!cat) return "";
    const m: Record<string,string> = { "Acero y productos metalicos":"Acero","Agregados y materiales de banco":"Agregados","Combustibles y lubricantes":"Combustible","Concretos asfaltos y estabilizantes":"Concreto","EPP y seguridad":"EPP","Ferreteria y fijacion":"Ferretería","Herramienta y equipo":"Herramienta","Material electrico":"Eléctrico","Miscelaneos de obra":"Misceláneo","Servicios y rentas":"Servicios","Tuberias y conexiones":"Tubería" };
    return m[cat] || cat.split(" ")[0];
  };

  const getTotalPartidas = () => {
    if (formMode === "catalogo") return materials.length;
    if (formMode === "combustible") return combRows.length;
    return freeRows.length;
  };

  const handleSubmit = async () => {
    setErrorMsg(null); setMessage(null);
    if (!selectedCostCenterId) { setErrorMsg("Selecciona un centro de costo."); return; }
    if (!requiredDate) { setErrorMsg("Selecciona la fecha requerida."); return; }
    if (getTotalPartidas() === 0) { setErrorMsg("Agrega al menos una partida."); return; }

    // Validar que la fecha sea hoy o en el futuro
    const today = new Date().toISOString().split("T")[0];
    if (requiredDate < today) { setErrorMsg("La fecha requerida debe ser hoy o en el futuro."); return; }

    const center = costCenters.find(c => c.id === selectedCostCenterId);
    if (!center) return;
    setSending(true);

    let materiales: Record<string, unknown>[] = [];
    if (formMode === "catalogo") {
      const invalidMats = materials.filter(m => !m.name?.trim() || isNaN(m.qty) || m.qty <= 0);
      if (invalidMats.length > 0) { setErrorMsg("Todos los materiales deben tener nombre y cantidad > 0."); setSending(false); return; }
      materiales = materials.map(m => ({ id: m.id > 0 ? m.id : null, name: m.name, unit: m.unit, qty: m.qty, comments: m.observations }));
    } else if (formMode === "combustible") {
      const invalidCombs = combRows.filter(c => !c.tipo?.trim() || isNaN(c.litros) || c.litros <= 0 || !c.unidad_destino?.trim());
      if (invalidCombs.length > 0) { setErrorMsg("Todos los combustibles deben tener tipo, litros > 0 y destino."); setSending(false); return; }
      materiales = combRows.map(c => ({ id: null, name: `${c.tipo} - ${c.litros}L → ${c.unidad_destino} (${c.tipo_unidad})`, unit: "LITRO", qty: c.litros, comments: `Tipo: ${c.tipo}, Destino: ${c.unidad_destino}, Unidad: ${c.tipo_unidad}` }));
    } else {
      const invalidFree = freeRows.filter(f => !f.descripcion?.trim() || isNaN(f.cantidad) || f.cantidad <= 0 || isNaN(f.monto) || f.monto < 0);
      if (invalidFree.length > 0) { setErrorMsg("Todos los conceptos deben tener descripción, cantidad > 0 y monto >= 0."); setSending(false); return; }
      materiales = freeRows.map(f => ({ id: null, name: f.descripcion, unit: f.unidad, qty: f.cantidad, comments: f.observaciones, price: f.monto }));
    }

    try {
      const res = await fetch("/api/requisicion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: { nombre: "Usuario ARIA27", email: "recursos.humanos@gcuavante.com" },
          obra: center.name, comentarios: generalComments, materiales,
          solicitante, subcategoria, requiredDate, costCenterId: center.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash("ok", "Requisición " + data.folio + " generada correctamente");
      setMessage("✅ Requisición " + data.folio + " generada exitosamente.");
      setMaterials([]); setFreeRows([]); setCombRows([]); setGeneralComments("");
      setTimeout(() => router.push("/dashboard/requisiciones/requisiciones/estatus"), 3000);
    } catch (err: unknown) {
      flash("err", "Error: " + (err instanceof Error ? err?.message : "desconocido"));
      setErrorMsg(err instanceof Error ? err?.message : "Error al generar la requisición.");
    } finally { setSending(false); }
  };

  const isEmpty = getTotalPartidas() === 0;

  return (
    <div className="flex flex-col gap-4 p-6 h-full overflow-auto">
      <FlashBanner msg={msg} />
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/requisiciones" />
        <h1 className="text-2xl font-bold">Nueva Requisición</h1>
      </div>

      {errorMsg && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{errorMsg}</div>}
      {message && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* SECCION 1: CONFIGURACION */}
        <section className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold">1. CONFIGURACIÓN</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Obra / Centro</label>
              <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400" value={selectedCostCenterId??""} onChange={e => setSelectedCostCenterId(e.target.value||null)}>
                <option value="">Seleccione...</option>
                {costCenters.map((c,i) => <option key={c.id} value={c.id}>{i+1}. {c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Fecha Requerida *</label>
              <input type="date" required className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Solicitante</label>
              <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400" value={solicitante} onChange={e => setSolicitante(e.target.value)}>
                <option value="">Seleccione...</option>
                {solicitantes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Tipo / Subcategoría</label>
              <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400" value={subcategoria} onChange={e => setSubcategoria(e.target.value)}>
                <option value="">MATERIALES (por defecto)</option>
                {subcategorias.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <label className="text-xs font-medium text-white/70">Instrucciones generales</label>
            <textarea className="h-16 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400" placeholder="Instrucciones de entrega, horarios, etc." value={generalComments} onChange={e => setGeneralComments(e.target.value)} />
          </div>

          {/* INDICADOR DE MODO */}
          {subcategoria && (
            <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
              formMode === "catalogo" ? "bg-blue-500/10 text-blue-300" :
              formMode === "combustible" ? "bg-amber-500/10 text-amber-300" :
              "bg-violet-500/10 text-violet-300"
            }`}>
              {formMode === "catalogo" && <><Search className="w-3 h-3" /> Buscar en catálogo de productos</>}
              {formMode === "combustible" && <><Fuel className="w-3 h-3" /> Captura de combustible/litros</>}
              {formMode === "libre" && <><Receipt className="w-3 h-3" /> Captura libre: descripción + monto</>}
            </div>
          )}
        </section>

        {/* SECCION 2: BUSQUEDA O CAPTURA */}
        <section className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          {formMode === "catalogo" && (
            <>
              <h2 className="mb-4 text-lg font-semibold">2. BUSCAR EN CATÁLOGO</h2>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2 mb-3">
                <Search className="h-4 w-4 opacity-70" />
                <input className="w-full bg-transparent text-sm outline-none" placeholder="Buscar por nombre, código o descripción..." value={searchTerm} onChange={e => handleSearch(e.target.value)} />
                {searching && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <div className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/20">
                <div className="grid grid-cols-[70px_1fr_80px] gap-2 border-b border-white/10 bg-[#0a1628] px-3 py-2 text-[11px] font-medium uppercase text-white/70 sticky top-0 z-10">
                  <div>Cat</div><div>Descripción</div><div className="text-right">Unidad</div>
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-white/40">{searchTerm.length < 2 ? "Busca un producto del catálogo" : "Sin resultados"}</div>
                ) : searchResults.map(p => {
                  const isSel = materials.some(m => m.id === p.id);
                  return (
                    <div key={p.id} onClick={() => isSel ? setMaterials(prev=>prev.filter(m=>m.id!==p.id)) : addMaterial(p)}
                      className={`grid grid-cols-[70px_1fr_80px] gap-2 items-center px-3 py-2.5 text-xs cursor-pointer transition-all ${isSel ? "bg-emerald-500/20 border-l-2 border-emerald-400" : "hover:bg-white/5 border-l-2 border-transparent"}`}>
                      <div className="text-cyan-400/80 text-[10px] truncate">{shortCat(p.category)}</div>
                      <div className={`truncate ${isSel ? "text-emerald-300 font-medium" : ""}`}>{p.name}</div>
                      <div className="text-white/60 truncate text-right">{p.unit}</div>
                    </div>
                  );
                })}
              </div>
              {/* AGREGAR PRODUCTO MANUAL */}
              {!showManual ? (
                <button onClick={() => setShowManual(true)} className="mt-3 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition">
                  <Plus className="w-3 h-3" /> ¿No encontraste el producto? Agregar manualmente
                </button>
              ) : (
                <div className="mt-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
                  <p className="text-xs text-blue-300 font-medium">Agregar producto manual</p>
                  <div className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50">Nombre del producto</label>
                      <input className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-blue-400" placeholder="Ej: Tornillo galvanizado 3/8..." value={manualName} onChange={e => setManualName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50">Unidad</label>
                      <select className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-blue-400" value={manualUnit} onChange={e => setManualUnit(e.target.value)}>
                        {["PZA","METRO","M2","M3","ML","CUBETA","SERVICIO","HORA","DIA","SEMANA","MES","GALON","LITRO","TRAMO","PRUEBA","EQUIPO","KG","TON","CAMION","LOTE","CAJA","ROLLO","SACO","BOLSA","JGO"].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        if (!manualName.trim()) return;
                        setMaterials(prev => [...prev, { id: manualTempId, name: manualName.trim(), unit: manualUnit || "PZA", qty: 1, observations: "" }]);
                        setManualTempId(prev => prev - 1);
                        setManualName(""); setManualUnit("PZA");
                      }} disabled={!manualName.trim()} className="rounded-lg bg-blue-500/30 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-500/40 disabled:opacity-40 transition">
                        <Plus className="w-3 h-3 inline mr-1" />Agregar
                      </button>
                      <button onClick={() => { setShowManual(false); setManualName(""); setManualUnit("PZA"); }} className="rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/50 hover:bg-white/10 transition">✕</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {formMode === "libre" && (
            <>
              <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
                {subcategoria === "DESTAJOS" && <><Hammer className="w-5 h-5 text-violet-400" /> 2. PARTIDAS DE DESTAJO</>}
                {subcategoria === "MANO DE OBRA" && <><Users2 className="w-5 h-5 text-violet-400" /> 2. PERSONAL / JORNADAS</>}
                {subcategoria === "PERSONAL EXTERNO" && <><Users2 className="w-5 h-5 text-violet-400" /> 2. PERSONAL EXTERNO</>}
                {!["DESTAJOS","MANO DE OBRA","PERSONAL EXTERNO"].includes(subcategoria) && <><Receipt className="w-5 h-5 text-violet-400" /> 2. CONCEPTOS</>}
              </h2>
              <button onClick={addFreeRow} className="mb-3 flex items-center gap-2 rounded-xl bg-violet-500/20 px-4 py-2 text-sm text-violet-300 hover:bg-violet-500/30 transition">
                <Plus className="w-4 h-4" /> Agregar partida
              </button>
              <div className="max-h-52 overflow-auto space-y-2">
                {freeRows.map((r, i) => (
                  <div key={r.tempId} className="grid grid-cols-[1fr_80px_80px_80px_30px] gap-2 items-center bg-black/20 rounded-xl px-3 py-2">
                    <input required className="bg-transparent text-sm outline-none border-b border-white/10 pb-1" placeholder="Descripción..." value={r.descripcion} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, descripcion: e.target.value} : x))} />
                    <input type="number" required min="0.01" step="0.01" className="bg-black/40 rounded-lg px-2 py-1 text-center text-sm" placeholder="Cant" value={r.cantidad||""} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, cantidad: Number(e.target.value)} : x))} />
                    <select className="bg-black/40 rounded-lg px-2 py-1 text-center text-sm" value={r.unidad || "PZA"} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, unidad: e.target.value} : x))}>
                      {["PZA","METRO","M2","M3","ML","CUBETA","SERVICIO","HORA","DIA","SEMANA","MES","GALON","LITRO","TRAMO","PRUEBA","EQUIPO","KG","TON","CAMION","LOTE","CAJA","ROLLO","SACO","BOLSA","JGO"].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" required min="0" step="0.01" className="bg-black/40 rounded-lg px-2 py-1 text-center text-sm" placeholder="$" value={r.monto||""} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, monto: Number(e.target.value)} : x))} />
                    <button onClick={() => setFreeRows(prev => prev.filter(x => x.tempId !== r.tempId))} className="rounded-full bg-red-500/70 p-1 hover:bg-red-500"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                {freeRows.length === 0 && <div className="text-center text-xs text-white/40 py-4">Sin partidas. Click "Agregar partida".</div>}
              </div>
            </>
          )}

          {formMode === "combustible" && (
            <>
              <h2 className="mb-3 text-lg font-semibold flex items-center gap-2"><Fuel className="w-5 h-5 text-amber-400" /> 2. DETALLE COMBUSTIBLE</h2>
              <button onClick={addCombRow} className="mb-3 flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/30 transition">
                <Plus className="w-4 h-4" /> Agregar línea
              </button>
              <div className="max-h-52 overflow-auto space-y-2">
                {combRows.map(r => (
                  <div key={r.tempId} className="grid grid-cols-[100px_80px_1fr_100px_30px] gap-2 items-center bg-black/20 rounded-xl px-3 py-2">
                    <select required className="bg-black/40 rounded-lg px-2 py-1 text-sm" value={r.tipo} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, tipo: e.target.value} : x))}>
                      <option>DIESEL</option><option>MAGNA</option><option>PREMIUM</option><option>GAS LP</option>
                    </select>
                    <input type="number" required min="0.01" step="0.01" className="bg-black/40 rounded-lg px-2 py-1 text-center text-sm" placeholder="Litros" value={r.litros||""} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, litros: Number(e.target.value)} : x))} />
                    <input required className="bg-transparent text-sm outline-none border-b border-white/10 pb-1" placeholder="Unidad destino (ej: Retroexcavadora CAT 420F)" value={r.unidad_destino} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, unidad_destino: e.target.value} : x))} />
                    <select className="bg-black/40 rounded-lg px-2 py-1 text-sm" value={r.tipo_unidad} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, tipo_unidad: e.target.value} : x))}>
                      <option>CAMION</option><option>RETROEXCAVADORA</option><option>CARGADOR</option><option>COMPACTADOR</option><option>CAMIONETA</option><option>PIPA</option><option>OTRO</option>
                    </select>
                    <button onClick={() => setCombRows(prev => prev.filter(x => x.tempId !== r.tempId))} className="rounded-full bg-red-500/70 p-1 hover:bg-red-500"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                {combRows.length === 0 && <div className="text-center text-xs text-white/40 py-4">Sin combustible. Click "Agregar línea".</div>}
              </div>
            </>
          )}
        </section>
      </div>

      {/* SECCION 3: RESUMEN */}
      <section className="flex-1 rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">3. PARTIDAS ({getTotalPartidas()})</h2>
          </div>
          {formMode === "libre" && freeRows.length > 0 && (
            <span className="text-sm text-emerald-400 font-medium">
              Total: ${freeRows.reduce((s,r) => s + (r.monto * r.cantidad), 0).toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-black/20 max-h-60">
          {formMode === "catalogo" && (
            <>
              <div className="grid grid-cols-[1fr_90px_90px_1.5fr_40px] gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase text-white/70 sticky top-0">
                <div>Descripción</div><div>Unidad</div><div>Cantidad</div><div>Observaciones</div><div></div>
              </div>
              {materials.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-white/40"><ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />Busca y agrega materiales arriba.</div>
              ) : materials.map(m => (
                <div key={m.id} className="grid grid-cols-[1fr_90px_90px_1.5fr_40px] gap-2 items-center px-3 py-2 text-xs">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-white/60">{m.unit}</div>
                  <input ref={el => { if(el) qtyInputRefs.current.set(m.id, el); }} type="number" min={1} className="w-full rounded-lg bg-black/40 px-2 py-1 text-center outline-none" value={m.qty} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, qty: Math.max(1,Number(e.target.value))} : x))} />
                  <input type="text" className="w-full rounded-lg bg-black/40 px-2 py-1 outline-none" placeholder="Opcional..." value={m.observations} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, observations: e.target.value} : x))} />
                  <button onClick={() => setMaterials(prev => prev.filter(x => x.id !== m.id))} className="rounded-full bg-red-500/70 p-1.5 hover:bg-red-500"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </>
          )}

          {formMode === "libre" && (
            <>
              <div className="grid grid-cols-[1fr_80px_80px_90px] gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase text-white/70 sticky top-0">
                <div>Descripción</div><div>Cant</div><div>Unidad</div><div className="text-right">Monto</div>
              </div>
              {freeRows.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-white/40">Agrega partidas en la sección 2.</div>
              ) : freeRows.map(r => (
                <div key={r.tempId} className="grid grid-cols-[1fr_80px_80px_90px] gap-2 items-center px-3 py-2 text-xs">
                  <div className="truncate font-medium">{r.descripcion || "(sin descripción)"}</div>
                  <div className="text-center">{r.cantidad}</div>
                  <div className="text-white/60">{r.unidad}</div>
                  <div className="text-right text-emerald-400 font-medium">${(r.monto * r.cantidad).toLocaleString()}</div>
                </div>
              ))}
            </>
          )}

          {formMode === "combustible" && (
            <>
              <div className="grid grid-cols-[100px_80px_1fr_100px] gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase text-white/70 sticky top-0">
                <div>Tipo</div><div>Litros</div><div>Destino</div><div>Unidad</div>
              </div>
              {combRows.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-white/40">Agrega líneas de combustible en la sección 2.</div>
              ) : combRows.map(r => (
                <div key={r.tempId} className="grid grid-cols-[100px_80px_1fr_100px] gap-2 items-center px-3 py-2 text-xs">
                  <div className="font-medium text-amber-300">{r.tipo}</div>
                  <div className="text-center">{r.litros}L</div>
                  <div className="truncate">{r.unidad_destino}</div>
                  <div className="text-white/60">{r.tipo_unidad}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={handleSubmit} disabled={sending || isEmpty}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg transition ${isEmpty ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"}`}>
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Generando...</> : <><Check className="h-4 w-4" />Generar Requisición</>}
          </button>
        </div>
      </section>
    </div>
  );
}
