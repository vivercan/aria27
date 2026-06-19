"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { Search, Plus, Trash2, Check, Loader2, ShoppingCart, Fuel, Hammer, Users2, Receipt, Sparkles, AlertTriangle, Bot, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import AriaBackButton from "@/components/AriaBackButton";

type CostCenter = { id: string; code: string; name: string };
type Product = { id: number; sku: string | null; name: string | null; unit: string | null; category: string | null; description: string | null };
type MaterialRow = { id: number; name: string; unit: string; qty: number; observations: string; price?: number };
type FreeRow = { tempId: number; descripcion: string; unidad: string; cantidad: number; monto: number; observaciones: string };
type ProveedorOption = { id: string; name: string; bank_name: string | null; bank_clabe: string | null; bank_account_number: string | null; payment_method: string | null; razon_social: string | null };

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
  // FC3 23-Abr-2026 Jessica Gallardo: nuevas subcategorias
  "OTROS": "libre", "SANITARIOS": "catalogo", "HERRERIA": "catalogo",
  "MATERIAL AUTOMOTRIZ": "catalogo", "IMPRESION DIGITAL": "libre",
  "LONAS": "libre", "LUMINARIAS": "catalogo",
  "ARADO DE DADOS Y ZAPATAS": "libre",
  "REPARACIONES": "libre", "GASTOS ADMINISTRATIVOS": "libre",
  "RENTA MAQUINARIA": "libre",
};

export default function NewRequisitionPage() {
  const router = useRouter();
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string | null>(null);
  const [requiredDate, setRequiredDate] = useState("");
  const [generalComments, setGeneralComments] = useState("");
  // const [solicitante, setSolicitante] = useState(""); // 26-Abr-2026 eliminado: el solicitante = usuario logueado
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

  // ── ERP: Prioridad + Presupuesto ─────────────────────────────────────────
  const [prioridad, setPrioridad] = useState<"CRITICO"|"URGENTE"|"NORMAL"|"PLANIFICADO">("NORMAL");
  const [presupuesto, setPresupuesto] = useState<string>("");

  // ── Datos de pago e IVA (para PDF) ───────────────────────────────────────
  const [formaPago, setFormaPago] = useState<string>("EFECTIVO");
  const [fechaPago, setFechaPago] = useState<string>("");
  const [ivaPorcentaje, setIvaPorcentaje] = useState<number>(0);
  const [descripcionCompra, setDescripcionCompra] = useState<string>("");
  const [motivoSolicitud, setMotivoSolicitud] = useState<string>("");
  // 30-Abr PR gastos: solicitante nombre completo + foto ticket
  const [solicitanteCompleto, setSolicitanteCompleto] = useState<string>("");
  const [solicitanteVisible, setSolicitanteVisible] = useState<string>("");

  // 04-Jun-2026 — resolver nombre completo del solicitante automaticamente al montar
  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail") || "";
    if (!userEmail) return;
    fetch(`/api/employees/by-email?email=${encodeURIComponent(userEmail)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const full = (d?.full_name as string) || "";
        if (full) {
          setSolicitanteVisible(full);
          setSolicitanteCompleto(full);
        }
      })
      .catch(() => {});
  }, []);
  const [fotoTicket, setFotoTicket] = useState<File | null>(null);
  const TIPOS_GASTO_REQ = ["GASTOS ADMINISTRATIVOS","GASTOS OPERATIVOS","PRESTAMOS","MANO DE OBRA","DESTAJOS","COMBUSTIBLE","SERVICIOS","RENTA MAQUINARIA"];
  const esGastoTipo = TIPOS_GASTO_REQ.includes(descripcionCompra);

  // ── Proveedor pre-seleccionado ───────────────────────────────────────────
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [proveedoresResults, setProveedoresResults] = useState<ProveedorOption[]>([]);
  const [proveedorSearch, setProveedorSearch] = useState<string>("");
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorOption | null>(null);

  // ── AI Assist: extracción de texto/WA ────────────────────────────────────
  const [showAI, setShowAI] = useState(false);
  const [aiTexto, setAiTexto] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ── Duplicate warning ────────────────────────────────────────────────────
  const [duplicadoWarning, setDuplicadoWarning] = useState<{folio:string; obra:string; material:string} | null>(null);

  const searchParams = useSearchParams();
  const formMode = TIPO_MAP[subcategoria] || "catalogo";

  useEffect(() => {
    supabase.from("centros_trabajo").select("id, code:codigo, name:nombre").order("nombre").then(({data}) => { if(data) setCostCenters(data); });
    supabase.from("catalogos_requisiciones").select("tipo, valor").eq("activo", true).order("valor").then(({data}) => {
      if(data) {
        setSolicitantes(data.filter(d => d.tipo === "SOLICITANTE").map(d => d.valor));
        setSubcategorias(data.filter(d => d.tipo === "SUBCATEGORIA").map(d => d.valor));
      }
    });
    supabase.from("Proveedores").select("id, name, bank_name, bank_clabe, bank_account_number, payment_method, razon_social").eq("status", "ACTIVO").order("name").range(0, 1999).then(({data}) => { if(data) setProveedores(data as ProveedorOption[]); });
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setRequiredDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // 04-Jun-2026 Daisy bug3 FIX DEFINITIVO: endpoint server-side con service_role
  // (elimina problemas con anon client, paginacion, RLS, ordering case-sensitive)
  useEffect(() => {
    if (proveedorSearch.length < 2) {
      setProveedoresResults([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/proveedores/search?q=${encodeURIComponent(proveedorSearch)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (d?.proveedores) setProveedoresResults(d.proveedores as ProveedorOption[]);
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(handle);
  }, [proveedorSearch]);

  // Pre-fill desde URL params (generados por AI extractor via WhatsApp link)
  useEffect(() => {
    if (!costCenters.length) return; // esperar a que carguen
    const obra = searchParams.get("obra");
    const prioParam = searchParams.get("prioridad");
    const fechaParam = searchParams.get("fecha");
    const comentariosParam = searchParams.get("comentarios");
    const matsParam = searchParams.get("mats");

    if (obra) {
      const match = costCenters.find(c =>
        c.name.toLowerCase().includes(obra.toLowerCase()) ||
        obra.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
      );
      if (match) setSelectedCostCenterId(match.id);
    }
    if (prioParam && ["CRITICO","URGENTE","NORMAL","PLANIFICADO"].includes(prioParam)) {
      setPrioridad(prioParam as "CRITICO"|"URGENTE"|"NORMAL"|"PLANIFICADO");
    }
    if (fechaParam) setRequiredDate(fechaParam);
    if (comentariosParam) setGeneralComments(comentariosParam);
    if (matsParam) {
      try {
        const mats = JSON.parse(matsParam) as Array<{name:string;qty:number;unit:string;observations?:string}>;
        const mapped = mats.map((m, i) => ({
          id: -(i + 1), // id negativo = manual
          name: m.name,
          unit: m.unit || "PZA",
          qty: m.qty || 1,
          observations: m.observations || "",
        }));
        if (mapped.length > 0) {
          setMaterials(mapped);
          // Mostrar banner informativo
          setAiTexto("(datos pre-llenados desde WhatsApp)");
          setShowAI(false);
        }
      } catch { /* silencio si JSON malformado */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costCenters]);

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

  // ── AI Assist: extraer datos de texto libre ──────────────────────────────
  const handleAI = async () => {
    if (!aiTexto.trim() || aiTexto === "(datos pre-llenados desde WhatsApp)") return;
    setAiLoading(true); setAiError(null);
    const userEmail = localStorage.getItem("userEmail") || "";
    try {
      const res = await fetch("/api/requisicion/extraer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": userEmail },
        body: JSON.stringify({ texto: aiTexto }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setAiError((data as {error?: string}).error || "Error de extracción"); return; }

      const { extracted, duplicado } = data;

      // Pre-llenar obra
      if (extracted.obra) {
        const match = costCenters.find(c =>
          c.name.toLowerCase().includes(extracted.obra!.toLowerCase()) ||
          extracted.obra!.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
        );
        if (match) setSelectedCostCenterId(match.id);
      }
      // Pre-llenar fecha
      if (extracted.fecha_requerida) setRequiredDate(extracted.fecha_requerida);
      // Pre-llenar comentarios
      if (extracted.comentarios) setGeneralComments(extracted.comentarios);
      // Pre-llenar prioridad
      if (extracted.prioridad) setPrioridad(extracted.prioridad);
      // Pre-llenar materiales
      if (extracted.materiales?.length > 0) {
        setMaterials(extracted.materiales.map((m: {name:string;qty:number;unit:string;observations?:string}, i: number) => ({
          id: -(i + 1),
          name: m.name,
          unit: m.unit || "PZA",
          qty: m.qty || 1,
          observations: m.observations || "",
        })));
      }
      // Pre-llenar presupuesto
      if (extracted.presupuesto_estimado) setPresupuesto(String(extracted.presupuesto_estimado));

      // Duplicate warning
      if (duplicado) setDuplicadoWarning({ folio: duplicado.folio, obra: duplicado.obra, material: duplicado.material_coincidente });

      setShowAI(false);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setAiLoading(false);
    }
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

    const userEmail = localStorage.getItem("userEmail") || "";
    // 26-Abr-2026: solicitante = nombre del usuario logueado (ya no hay dropdown).
    // 7-May-2026: BUG FIX. Antes el fallback era "Usuario ARIA27" hardcoded
    // cuando localStorage no tenia displayName. Ahora consultamos Users por
    // email para obtener name/display_name real, y solo si falla todo usamos
    // el email (no string placeholder).
    let userDisplay = localStorage.getItem("userDisplayName") || localStorage.getItem("userName") || "";
    if (!userDisplay && userEmail) {
      try {
        const { data: u } = await supabase.from("Users").select("name, display_name").eq("email", userEmail).single();
        const row = (u as { name?: string; display_name?: string } | null);
        userDisplay = row?.display_name || row?.name || "";
        if (userDisplay) {
          // Cache en localStorage para futuras requisiciones
          localStorage.setItem("userDisplayName", userDisplay);
        }
      } catch {
        // ignore - usar fallback
      }
    }
    const userName = userDisplay || userEmail || "Sin identificar";

    let materiales: Record<string, unknown>[] = [];
    if (formMode === "catalogo") {
      const invalidMats = materials.filter(m => !m.name?.trim() || isNaN(m.qty) || m.qty === 0);
      if (invalidMats.length > 0) { setErrorMsg("Todos los materiales deben tener nombre y cantidad distinta de 0. (Usa cantidad negativa para descontar anticipos.)"); setSending(false); return; }
      materiales = materials.map(m => ({ id: m.id > 0 ? m.id : null, name: m.name, unit: m.unit, qty: m.qty, comments: m.observations, price: m.price ?? 0 }));
    } else if (formMode === "combustible") {
      const invalidCombs = combRows.filter(c => !c.tipo?.trim() || isNaN(c.litros) || c.litros <= 0 || !c.unidad_destino?.trim());
      if (invalidCombs.length > 0) { setErrorMsg("Todos los combustibles deben tener tipo, litros > 0 y destino."); setSending(false); return; }
      materiales = combRows.map(c => ({ id: null, name: `${c.tipo} - ${c.litros}L → ${c.unidad_destino} (${c.tipo_unidad})`, unit: "LITRO", qty: c.litros, comments: `Tipo: ${c.tipo}, Destino: ${c.unidad_destino}, Unidad: ${c.tipo_unidad}` }));
    } else {
      const invalidFree = freeRows.filter(f => !f.descripcion?.trim() || isNaN(f.cantidad) || f.cantidad === 0 || isNaN(f.monto) || f.monto < 0);
      if (invalidFree.length > 0) { setErrorMsg("Todos los conceptos deben tener descripción, cantidad distinta de 0 y monto >= 0. (Usa cantidad negativa para descontar anticipos.)"); setSending(false); return; }
      materiales = freeRows.map(f => ({ id: null, name: f.descripcion, unit: f.unidad, qty: f.cantidad, comments: f.observaciones, price: f.monto }));
    }

    try {
      // PR 30-Abr: subir foto ticket a Storage si hay
      let fotoTicketUrl = "";
      if (fotoTicket) {
        try {
          const fname = `tickets/${Date.now()}_${fotoTicket.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const { data: up, error: upErr } = await supabase.storage.from("expedientes").upload(fname, fotoTicket, { upsert: false });
          if (!upErr && up) {
            const { data: pub } = supabase.storage.from("expedientes").getPublicUrl(up.path);
            fotoTicketUrl = pub.publicUrl;
          }
        } catch (e) { console.warn("upload ticket fallo", e); }
      }
      const res = await fetch("/api/requisicion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: { nombre: userName, email: userEmail },
          obra: center.name, comentarios: generalComments, materiales,
          solicitante: userName, subcategoria, requiredDate, costCenterId: center.id,
          // ERP fields
          prioridad,
          presupuesto_estimado: presupuesto ? Number(presupuesto) : null,
          canal_origen: searchParams.get("mats") ? "WHATSAPP" : "WEB",
          // Datos de pago e IVA
          forma_pago: formaPago,
          fecha_pago: fechaPago || null,
          iva_porcentaje: ivaPorcentaje,
          descripcion_compra: descripcionCompra || null,
          motivo_solicitud: motivoSolicitud || null,
          solicitante_nombre_completo: solicitanteCompleto || null,
          foto_ticket_url: fotoTicketUrl || null,
          // Proveedor pre-seleccionado
          ...(selectedProveedor ? {
            proveedor_nombre: selectedProveedor.name,
            proveedor_banco: selectedProveedor.bank_name || null,
            proveedor_clabe: selectedProveedor.bank_clabe || null,
            proveedor_cuenta: selectedProveedor.bank_account_number || null,
            proveedor_razon_social: selectedProveedor.razon_social || null,
          } : {}),
        })
      });
      const data = await res.json().catch(() => ({})) as { folio?: string; error?: string };
      if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`);
      setMessage("✅ Requisición " + data.folio + " generada exitosamente.");
      setMaterials([]); setFreeRows([]); setCombRows([]); setGeneralComments(""); setDescripcionCompra(""); setMotivoSolicitud(""); setSolicitanteCompleto(""); setFotoTicket(null);
      setTimeout(() => router.push("/dashboard/requisiciones/requisiciones/estatus"), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err?.message : "Error al generar la requisición. Intenta de nuevo.");
    } finally { setSending(false); }
  };

  const isEmpty = getTotalPartidas() === 0;

  return (
    <div className="aria-bg-canon flex flex-col gap-5 p-6 h-full overflow-y-auto pb-12">
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/requisiciones" />
        <h1 className="text-2xl font-bold">Nueva Requisición</h1>
        {solicitanteVisible ? (
          <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-xs">
            <span className="text-emerald-300 font-semibold">Solicitante:</span>
            <span className="text-white font-medium">{solicitanteVisible}</span>
          </div>
        ) : null}
      </div>

      {errorMsg && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{errorMsg}</div>}
      {message && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{message}</div>}

      {/* ── DUPLICATE WARNING ───────────────────────────────────────────────────── */}
      {duplicadoWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <div className="flex-1">
            <span className="font-semibold">Posible duplicado detectado: </span>
            La requisición <span className="font-mono font-bold">{duplicadoWarning.folio}</span> en obra <strong>{duplicadoWarning.obra}</strong> tiene un material similar (<em>{duplicadoWarning.material}</em>) en las últimas 48h. Verifica antes de enviar.
          </div>
          <button onClick={() => setDuplicadoWarning(null)} className="text-amber-400/60 hover:text-amber-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── AI ASSIST PANEL ───────────────────────────────────────────────────── */}
      {showAI ? (
        <div className="rounded-2xl border border-aria-primary/30 bg-aria-primary/5 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-aria-accent font-semibold">
              <Bot className="h-4 w-4" />
              Asistente IA — Extraer requisición
            </div>
            <button onClick={() => { setShowAI(false); setAiError(null); }} className="text-white/40 hover:text-white/70"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-white/50 mb-3">Pega el mensaje de WhatsApp, describe lo que necesitas, o cualquier lista de materiales. La IA llenará el formulario automáticamente.</p>
          <textarea
            className="h-24 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent"
            placeholder={'Ejemplo: "Necesito 10 sacos de cemento, 5 varillas 3/8 y 2 rollos de alambre para la obra Miravalle, lo necesito mañana URGENTE"'}
            value={aiTexto}
            onChange={e => setAiTexto(e.target.value)}
          />
          {aiError && <p className="mt-1 text-xs text-red-400">{aiError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => { setShowAI(false); setAiError(null); }} className="rounded-full bg-white/[0.04] px-4 py-2 text-xs text-white/50 hover:bg-white/[0.08]">Cancelar</button>
            <button onClick={handleAI} disabled={aiLoading || !aiTexto.trim()} className="inline-flex items-center gap-2 rounded-full bg-aria-primary/40 px-5 py-2 text-xs font-semibold text-aria-accent hover:bg-aria-primary/60 disabled:opacity-40 transition">
              {aiLoading ? <><Loader2 className="h-3 w-3 animate-spin" />Analizando...</> : <><Sparkles className="h-3 w-3" />Extraer con IA</>}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAI(true)} className="inline-flex items-center gap-2 self-start rounded-full border border-aria-primary/40 bg-aria-primary/10 px-4 py-2 text-xs font-medium text-aria-accent hover:bg-aria-primary/20 transition">
          <Sparkles className="h-3 w-3" />
          Extraer datos con IA desde texto o WhatsApp
        </button>
      )}

      <div className="grid gap-5 lg:grid-cols-1 xl:grid-cols-2">
        {/* SECCION 1: CONFIGURACION */}
        <section className="rounded-2xl bg-white/[0.04] p-5 shadow-lg backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold">1. CONFIGURACIÓN</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Obra / Centro</label>
              <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={selectedCostCenterId??""} onChange={e => setSelectedCostCenterId(e.target.value||null)}>
                <option value="">Seleccione...</option>
                {costCenters.map((c,i) => <option key={c.id} value={c.id}>{i+1}. {c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Fecha Requerida *</label>
              <input type="date" required className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Tipo / Subcategoría</label>
              <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={subcategoria} onChange={e => setSubcategoria(e.target.value)}>
                <option value="">MATERIALES (por defecto)</option>
                {subcategorias.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Prioridad</label>
              <select
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-aria-accent ${
                  prioridad === "CRITICO" ? "border-red-500/60 bg-red-500/10 text-red-300" :
                  prioridad === "URGENTE" ? "border-orange-500/60 bg-orange-500/10 text-orange-300" :
                  prioridad === "PLANIFICADO" ? "border-emerald-500/40 bg-emerald-500/5 text-aria-accent" :
                  "border-white/15 bg-black/30 text-white"
                }`}
                value={prioridad}
                onChange={e => setPrioridad(e.target.value as "CRITICO"|"URGENTE"|"NORMAL"|"PLANIFICADO")}
              >
                <option value="CRITICO">🔴 CRÍTICO — Hoy/Emergencia</option>
                <option value="URGENTE">🟠 URGENTE — Mañana/Esta semana</option>
                <option value="NORMAL">🟡 NORMAL</option>
                <option value="PLANIFICADO">🟢 PLANIFICADO — +7 días</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Presupuesto estimado (opcional)</label>
              <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2">
                <span className="text-sm text-white/40">$</span>
                <input
                  type="number" min="0" step="0.01"
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="0.00"
                  value={presupuesto}
                  onChange={e => setPresupuesto(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── DATOS DE PAGO E IVA ─────────────────────────────────────────── */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Forma de pago</label>
              <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Fecha de pago</label>
              <input type="date" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">IVA</label>
              <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={ivaPorcentaje} onChange={e => setIvaPorcentaje(Number(e.target.value))}>
                <option value={0}>0% (Sin IVA)</option>
                <option value={3}>3%</option>
                <option value={7}>7%</option>
                <option value={8}>8% (Frontera Norte)</option>
                <option value={10}>10%</option>
                <option value={11}>11%</option>
                <option value={16}>16% (General Mexico)</option>
              </select>
            </div>
          </div>

          {/* ── PROVEEDOR PRE-SELECCIONADO ─────────────────────────────────── */}
          <div className="mt-3 space-y-1">
            <label className="text-xs font-medium text-white/70">Proveedor (opcional — auto-llena datos de pago)</label>
            <div className="relative">
              <input
                type="text"
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent"
                placeholder="Buscar proveedor..."
                value={selectedProveedor ? selectedProveedor.name : proveedorSearch}
                onChange={e => { setProveedorSearch(e.target.value); setSelectedProveedor(null); }}
                onFocus={() => {
                  // 03-Jun-2026 Daisy bug3: refresh on focus para detectar proveedores recien dados de alta
                  supabase.from("Proveedores").select("id, name, bank_name, bank_clabe, bank_account_number, payment_method, razon_social").eq("status", "ACTIVO").order("name").range(0, 1999).then(({data}) => { if(data) setProveedores(data as ProveedorOption[]); });
                }}
              />
              {selectedProveedor && (
                <button onClick={() => { setSelectedProveedor(null); setProveedorSearch(""); }} className="absolute right-2 top-2 text-white/40 hover:text-white/70">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {!selectedProveedor && proveedorSearch.length >= 2 && (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0c1d38]">
                {proveedoresResults.slice(0, 20).map(p => (
                  <div key={p.id} onClick={() => { setSelectedProveedor(p); setProveedorSearch(""); if (p.payment_method) setFormaPago(p.payment_method); }} className="cursor-pointer px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors">
                    <div className="text-white">{p.name}</div>
                    {(p.bank_name || p.bank_clabe) && <div className="text-xs text-white/40">{p.bank_name}{p.bank_clabe ? ` · CLABE: ${p.bank_clabe.slice(0,6)}…` : ""}</div>}
                  </div>
                ))}
                {proveedoresResults.length === 0 && (
                  <div className="px-3 py-2 text-xs text-white/40">Sin resultados</div>
                )}
              </div>
            )}
            {selectedProveedor && (
              <div className="mt-2 rounded-xl bg-white/[0.02] border border-white/[0.08] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{selectedProveedor.name}</span>
                  {(() => {
                    const m = (selectedProveedor.payment_method || formaPago || "").toUpperCase();
                    let bg = "linear-gradient(180deg, #D97706 0%, #B45309 100%)"; // EFECTIVO ambar
                    let label: string = "EFECTIVO";
                    if (m.includes("TRANSFER")) { bg = "linear-gradient(180deg, #1E3E7A 0%, #163068 100%)"; label = "TRANSFERENCIA"; }
                    else if (m.includes("CHEQUE")) { bg = "linear-gradient(180deg, #1F8A60 0%, #16704D 100%)"; label = "CHEQUE"; }
                    else if (m.includes("CREDITO") || m.includes("CRÉDITO")) { bg = "linear-gradient(180deg, #7C3AED 0%, #5B21B6 100%)"; label = "CREDITO"; }
                    else if (m === "" || m === "EFECTIVO") { /* defaults */ }
                    else { bg = "linear-gradient(180deg, #475569 0%, #334155 100%)"; label = m; }
                    return (
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide text-white shadow-[inset_0_1px_0_rgba(220,235,255,0.15),0_2px_4px_rgba(0,0,0,0.30)] border border-[rgba(140,178,228,0.25)]"
                        style={{ background: bg }}
                      >
                        {label}
                      </span>
                    );
                  })()}
                </div>
                {(selectedProveedor.bank_name || selectedProveedor.bank_clabe || selectedProveedor.razon_social) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-aria-accent">
                    {selectedProveedor.razon_social && <span>Cuenta: {selectedProveedor.razon_social}</span>}
                    {selectedProveedor.bank_name && <span>Banco: {selectedProveedor.bank_name}</span>}
                    {selectedProveedor.bank_clabe && <span>CLABE: {selectedProveedor.bank_clabe}</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DESCRIPCION DE LA COMPRA + MOTIVO - 28-Abr-2026 PR #108 */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Tipo de compra *</label>
              <select required className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" value={descripcionCompra} onChange={e => setDescripcionCompra(e.target.value)}>
                <option value="">Selecciona tipo...</option>
                <option value="MATERIALES">Materiales</option>
                <option value="GASTOS ADMINISTRATIVOS">Gastos Administrativos</option>
                <option value="GASTOS OPERATIVOS">Gastos Operativos</option>
                <option value="DESTAJOS">Destajos</option>
                <option value="MANO DE OBRA">Mano de Obra</option>
                <option value="PRESTAMOS">Prestamos</option>
                <option value="SERVICIOS">Servicios</option>
                <option value="HERRAMIENTAS">Herramientas</option>
                <option value="REFACCIONES">Refacciones</option>
                <option value="COMBUSTIBLE">Combustible</option>
                <option value="RENTA MAQUINARIA">Renta Maquinaria</option>
                <option value="OTROS">Otros</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Motivo de la solicitud *</label>
              <textarea required className="h-[42px] w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" placeholder="Razon o motivo..." value={motivoSolicitud} onChange={e => setMotivoSolicitud(e.target.value)} />
            </div>
          </div>

          {/* PR 30-Abr: campos extra cuando es GASTO POR PAGAR */}
          {esGastoTipo && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-3 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Datos para pago en efectivo / gasto por pagar</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/70">Solicitante (nombre completo) *</label>
                  <input type="text" required className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" placeholder="Ej: Juan Carlos Mendez Lopez" value={solicitanteCompleto} onChange={e => setSolicitanteCompleto(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/70">Foto del ticket / comprobante</label>
                  <input type="file" accept="image/*,application/pdf" className="w-full text-xs text-white/80 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-aria-primary-light file:text-aria-accent file:cursor-pointer" onChange={e => setFotoTicket(e.target.files?.[0] || null)} />
                  {fotoTicket && <div className="text-[10px] text-emerald-300 mt-1">{fotoTicket.name} ({(fotoTicket.size/1024).toFixed(0)}KB)</div>}
                </div>
              </div>
              <div className="text-[10px] text-amber-200/70">Esta requisicion se enviara al area de PAGOS POR PAGAR (no a Compras para cotizar).</div>
            </div>
          )}

          <div className="mt-3 space-y-1">
            <label className="text-xs font-medium text-white/70">Instrucciones generales</label>
            <textarea className="h-16 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-aria-accent" placeholder="Instrucciones de entrega, horarios, etc." value={generalComments} onChange={e => setGeneralComments(e.target.value)} />
          </div>

          {/* INDICADOR DE MODO */}
          {subcategoria && (
            <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
              formMode === "catalogo" ? "bg-aria-primary/10 text-aria-accent" :
              formMode === "combustible" ? "bg-amber-500/10 text-amber-300" :
              "bg-aria-primary/10 text-aria-accent"
            }`}>
              {formMode === "catalogo" && <><Search className="w-3 h-3" /> Buscar en catálogo de productos</>}
              {formMode === "combustible" && <><Fuel className="w-3 h-3" /> Captura de combustible/litros</>}
              {formMode === "libre" && <><Receipt className="w-3 h-3" /> Captura libre: descripción + monto</>}
            </div>
          )}
        </section>

        {/* SECCION 2: BUSQUEDA O CAPTURA */}
        <section className="rounded-2xl bg-white/[0.04] p-5 shadow-lg backdrop-blur">
          {formMode === "catalogo" && (
            <>
              <h2 className="mb-4 text-lg font-semibold">2. BUSCAR EN CATÁLOGO</h2>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2 mb-3">
                <Search className="h-4 w-4 opacity-70" />
                <input className="w-full bg-transparent text-sm outline-none" placeholder="Buscar por nombre, código o descripción..." value={searchTerm} onChange={e => handleSearch(e.target.value)} />
                {searching && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <div className="max-h-48 overflow-auto rounded-xl border border-white/[0.08] bg-black/20">
                <div className="grid grid-cols-[70px_1fr_80px] gap-2 border-b border-white/[0.08] bg-aria-bg px-3 py-2 text-[11px] font-medium uppercase text-white/70 sticky top-0 z-10">
                  <div>Cat</div><div>Descripción</div><div className="text-right">Unidad</div>
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-white/40">{searchTerm.length < 2 ? "Busca un producto del catálogo" : "Sin resultados"}</div>
                ) : searchResults.map(p => {
                  const isSel = materials.some(m => m.id === p.id);
                  return (
                    <div key={p.id} onClick={() => isSel ? setMaterials(prev=>prev.filter(m=>m.id!==p.id)) : addMaterial(p)}
                      className={`grid grid-cols-[70px_1fr_80px] gap-2 items-center px-3 py-2.5 text-xs cursor-pointer transition-all ${isSel ? "bg-emerald-500/20 border-l-2 border-emerald-400" : "hover:bg-white/[0.04] border-l-2 border-transparent"}`}>
                      <div className="text-aria-accent/80 text-[10px] truncate">{shortCat(p.category)}</div>
                      <div className={`truncate ${isSel ? "text-aria-accent font-medium" : ""}`}>{p.name}</div>
                      <div className="text-white/60 truncate text-right">{p.unit}</div>
                    </div>
                  );
                })}
              </div>
              {/* AGREGAR PRODUCTO MANUAL */}
              {!showManual ? (
                <button onClick={() => setShowManual(true)} className="mt-3 flex items-center gap-2 text-xs text-aria-accent hover:text-aria-accent transition">
                  <Plus className="w-3 h-3" /> ¿No encontraste el producto? Agregar manualmente
                </button>
              ) : (
                <div className="mt-3 rounded-xl border border-aria-primary/30 bg-aria-primary/5 p-3 space-y-2">
                  <p className="text-xs text-aria-accent font-medium">Agregar producto manual</p>
                  <div className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50">Nombre del producto</label>
                      <input className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-aria-accent" placeholder="Ej: Tornillo galvanizado 3/8..." value={manualName} onChange={e => setManualName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50">Unidad</label>
                      <select className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-aria-accent" value={manualUnit} onChange={e => setManualUnit(e.target.value)}>
                        {["PZA","METRO","M2","M3","ML","CUBETA","SERVICIO","HORA","DIA","SEMANA","MES","GALON","LITRO","TRAMO","PRUEBA","EQUIPO","KG","TON","CAMION","LOTE","CAJA","ROLLO","SACO","BOLSA","JGO"].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        if (!manualName.trim()) return;
                        setMaterials(prev => [...prev, { id: manualTempId, name: manualName.trim(), unit: manualUnit || "PZA", qty: 1, observations: "" }]);
                        setManualTempId(prev => prev - 1);
                        setManualName(""); setManualUnit("PZA");
                      }} disabled={!manualName.trim()} className="rounded-lg bg-aria-primary/30 px-3 py-1.5 text-xs text-aria-accent hover:bg-aria-primary-hover/40 disabled:opacity-40 transition">
                        <Plus className="w-3 h-3 inline mr-1" />Agregar
                      </button>
                      <button onClick={() => { setShowManual(false); setManualName(""); setManualUnit("PZA"); }} className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs text-white/50 hover:bg-white/[0.06] transition">✕</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {formMode === "libre" && (
            <>
              <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
                {subcategoria === "DESTAJOS" && <><Hammer className="w-5 h-5 text-aria-accent" /> 2. PARTIDAS DE DESTAJO</>}
                {subcategoria === "MANO DE OBRA" && <><Users2 className="w-5 h-5 text-aria-accent" /> 2. PERSONAL / JORNADAS</>}
                {subcategoria === "PERSONAL EXTERNO" && <><Users2 className="w-5 h-5 text-aria-accent" /> 2. PERSONAL EXTERNO</>}
                {!["DESTAJOS","MANO DE OBRA","PERSONAL EXTERNO"].includes(subcategoria) && <><Receipt className="w-5 h-5 text-aria-accent" /> 2. CONCEPTOS</>}
              </h2>
              <button onClick={addFreeRow} className="mb-3 flex items-center gap-2 rounded-xl bg-aria-primary-light px-4 py-2 text-sm text-aria-accent hover:bg-aria-primary-hover/30 transition">
                <Plus className="w-4 h-4" /> Agregar partida
              </button>
              <div className="max-h-96 overflow-auto space-y-2">
                {freeRows.map((r, i) => (
                  <div key={r.tempId} className="grid grid-cols-[1fr_80px_80px_80px_30px] gap-2 items-center bg-black/20 rounded-xl px-3 py-2">
                    <input required className="bg-transparent text-sm outline-none border-b border-white/[0.08] pb-1" placeholder="Descripción..." value={r.descripcion} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, descripcion: e.target.value} : x))} />
                    <input type="number" required step="0.01" className="bg-black/40 rounded-lg px-2 py-1 text-center text-sm" placeholder="Cant" value={r.cantidad||""} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, cantidad: Number(e.target.value)} : x))} title="Acepta negativos para anticipos descontados" />
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
              <div className="max-h-96 overflow-auto space-y-2">
                {combRows.map(r => (
                  <div key={r.tempId} className="grid grid-cols-[100px_80px_1fr_100px_30px] gap-2 items-center bg-black/20 rounded-xl px-3 py-2">
                    <select required className="bg-black/40 rounded-lg px-2 py-1 text-sm" value={r.tipo} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, tipo: e.target.value} : x))}>
                      <option>DIESEL</option><option>MAGNA</option><option>PREMIUM</option><option>GAS LP</option>
                    </select>
                    <input type="number" required min="0.01" step="0.01" className="bg-black/40 rounded-lg px-2 py-1 text-center text-sm" placeholder="Litros" value={r.litros||""} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, litros: Number(e.target.value)} : x))} />
                    <input required className="bg-transparent text-sm outline-none border-b border-white/[0.08] pb-1" placeholder="Unidad destino (ej: Retroexcavadora CAT 420F)" value={r.unidad_destino} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, unidad_destino: e.target.value} : x))} />
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
      <section className="flex-1 rounded-2xl bg-white/[0.04] p-5 shadow-lg backdrop-blur flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-aria-accent" />
            <h2 className="text-lg font-semibold">3. PARTIDAS ({getTotalPartidas()})</h2>
          </div>
          {(() => {
            const subtotalLibre = freeRows.reduce((s,r) => s + (r.monto * r.cantidad), 0);
            const subtotalCat = materials.reduce((s,m) => s + ((m.price ?? 0) * m.qty), 0);
            const subtotal = formMode === "libre" ? subtotalLibre : subtotalCat;
            const tieneFilas = (formMode === "libre" && freeRows.length > 0) || (formMode === "catalogo" && materials.length > 0);
            if (!tieneFilas) return null;
            const ivaMonto = subtotal * (ivaPorcentaje / 100);
            const totalConIva = subtotal + ivaMonto;
            const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase text-white/50">Subtotal</span>
                  <span className="text-white font-medium">${fmt(subtotal)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase text-white/50">IVA {ivaPorcentaje}%</span>
                  <span className="text-white font-medium">${fmt(ivaMonto)}</span>
                </div>
                <div className="flex flex-col items-end rounded-lg bg-aria-accent/15 border border-aria-accent/40 px-3 py-1">
                  <span className="text-[10px] uppercase text-aria-accent">Total</span>
                  <span className="text-aria-accent font-bold text-base">${fmt(totalConIva)}</span>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-white/[0.08] bg-black/20 max-h-60">
          {formMode === "catalogo" && (
            <>
              <div className="grid grid-cols-[1.4fr_70px_70px_90px_100px_1.4fr_36px] gap-2 border-b border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-medium uppercase text-white/70 sticky top-0">
                <div>Descripcion</div><div>Unidad</div><div>Cantidad</div><div className="text-right">P.U.</div><div className="text-right">Subtotal</div><div>Observaciones</div><div></div>
              </div>
              {materials.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-white/40"><ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />Busca y agrega materiales arriba.</div>
              ) : materials.map(m => (
                <div key={m.id} className="grid grid-cols-[1.4fr_70px_70px_90px_100px_1.4fr_36px] gap-2 items-center px-3 py-2 text-xs">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-white/60">{m.unit}</div>
                  <input ref={el => { if(el) qtyInputRefs.current.set(m.id, el); }} type="number" className="w-full rounded-lg bg-black/40 px-2 py-1 text-center outline-none" value={m.qty} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, qty: Number(e.target.value)} : x))} title="Acepta negativos para anticipos descontados" />
                  <input type="number" min={0} step="0.01" placeholder="$" className="w-full rounded-lg bg-black/40 px-2 py-1 text-right outline-none" value={m.price ?? ""} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, price: Number(e.target.value)} : x))} />
                  <div className="text-right text-aria-accent font-medium">${(((m.price ?? 0) * m.qty) || 0).toLocaleString("es-MX", {minimumFractionDigits: 2})}</div>
                  <input type="text" className="w-full rounded-lg bg-black/40 px-2 py-1 outline-none" placeholder="Opcional..." value={m.observations} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, observations: e.target.value} : x))} />
                  <button onClick={() => setMaterials(prev => prev.filter(x => x.id !== m.id))} className="rounded-full bg-red-500/70 p-1.5 hover:bg-red-500"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </>
          )}

          {formMode === "libre" && (
            <>
              <div className="grid grid-cols-[1fr_80px_80px_90px] gap-2 border-b border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-medium uppercase text-white/70 sticky top-0">
                <div>Descripción</div><div>Cant</div><div>Unidad</div><div className="text-right">Monto</div>
              </div>
              {freeRows.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-white/40">Agrega partidas en la sección 2.</div>
              ) : freeRows.map(r => (
                <div key={r.tempId} className="grid grid-cols-[1fr_80px_80px_90px] gap-2 items-center px-3 py-2 text-xs">
                  <div className="truncate font-medium">{r.descripcion || "(sin descripción)"}</div>
                  <div className="text-center">{r.cantidad}</div>
                  <div className="text-white/60">{r.unidad}</div>
                  <div className="text-right text-aria-accent font-medium">${(r.monto * r.cantidad).toLocaleString()}</div>
                </div>
              ))}
            </>
          )}

          {formMode === "combustible" && (
            <>
              <div className="grid grid-cols-[100px_80px_1fr_100px] gap-2 border-b border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] font-medium uppercase text-white/70 sticky top-0">
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
