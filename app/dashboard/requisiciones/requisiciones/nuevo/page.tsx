"use client";
import { IcoSaco, IcoCasco, IcoTarea } from "@/components/domenica/IconosObra";
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
  // F7: tipos de compra editables en Configuración > Maestros > Catálogos (fallback a la lista historica)
  const [tiposCompra, setTiposCompra] = useState<string[]>(["MATERIALES","GASTOS ADMINISTRATIVOS","GASTOS OPERATIVOS","DESTAJOS","MANO DE OBRA","PRESTAMOS","SERVICIOS","HERRAMIENTAS","REFACCIONES","COMBUSTIBLE","RENTA MAQUINARIA","MANTENIMIENTO","INDIRECTOS","OTROS"]);

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
  // 24-Jun-2026 P0 fix: agregar precio_unitario (usuarios reportaban no poder capturar monto)
  const [combRows, setCombRows] = useState<Array<{tempId:number; tipo:string; litros:number; precio_unitario:number; unidad_destino:string; tipo_unidad:string}>>([]);

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
  // 11-Oct-2026 Doménica 27: en celular solo lo esencial; lo de pago/proveedor/IVA va en "Más detalles" (Compras lo completa)
  const [masDetalles, setMasDetalles] = useState(false);
  // Celular: 3 pasos (1 Qué · 2 Dónde y cuándo · 3 Lista). En computadora se ve todo junto, como antes.
  const [pasoM, setPasoM] = useState(1);
  const vis = (n: number) => (pasoM === n ? "" : "hidden md:block");
  const avz = masDetalles ? "" : "hidden md:block";
  // 30-Abr PR gastos: solicitante nombre completo + foto ticket
  const [solicitanteCompleto, setSolicitanteCompleto] = useState<string>("");
  const [solicitanteVisible, setSolicitanteVisible] = useState<string>("");

  // 04-Jun-2026 — resolver nombre completo del solicitante automaticamente al montar
  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail") || "";
    if (!userEmail) return;
    fetch(`/api/employees/by-email?email=${encodeURIComponent(userEmail)}`, { cache: "no-store", credentials: "include" })
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
  const TIPOS_GASTO_REQ = ["GASTOS ADMINISTRATIVOS","GASTOS OPERATIVOS","PRESTAMOS","MANO DE OBRA","DESTAJOS","COMBUSTIBLE","SERVICIOS","RENTA MAQUINARIA","MANTENIMIENTO","INDIRECTOS"];
  const esGastoTipo = TIPOS_GASTO_REQ.includes(descripcionCompra);

  // ── Proveedor pre-seleccionado ───────────────────────────────────────────
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [proveedoresResults, setProveedoresResults] = useState<ProveedorOption[]>([]);
  const [proveedorSearch, setProveedorSearch] = useState<string>("");
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorOption | null>(null);
  // FIX 544: modal captura CLABE al vuelo
  const [showClabeModal, setShowClabeModal] = useState(false);
  // ── ARIA27 Campo F1: tipo de solicitud (3 vias) + destajo ───────────────
  type TipoSolicitud = "MATERIALES" | "DESTAJO" | null;
  const [tipoSolicitud, setTipoSolicitud] = useState<TipoSolicitud>(null);
  const [destajoTipoPago, setDestajoTipoPago] = useState<"ANTICIPO" | "SEMANA" | "FINIQUITO">("SEMANA");
  const [destajoConcepto, setDestajoConcepto] = useState<string>("");
  const [destajoMonto, setDestajoMonto] = useState<string>("");
  const [saldoDestajista, setSaldoDestajista] = useState<{ total: number; n: number } | null>(null);
  const [clabeForm, setClabeForm] = useState({ bank_name: "", bank_clabe: "", bank_account_number: "", nombre_cuenta: "" });
  const [clabeSaving, setClabeSaving] = useState(false);
  const [clabeError, setClabeError] = useState<string | null>(null);

  // ── AI Assist: extracción de texto/WA ────────────────────────────────────
  const [showAI, setShowAI] = useState(false);
  const [aiTexto, setAiTexto] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ── Duplicate warning ────────────────────────────────────────────────────
  const [duplicadoWarning, setDuplicadoWarning] = useState<{folio:string; obra:string; material:string} | null>(null);

  // FIX 544 · Guardar CLABE al vuelo en suppliers via PATCH
  async function guardarClabeSupplier() {
    if (!selectedProveedor) return;
    const clabeClean = clabeForm.bank_clabe.replace(/\s+/g, "");
    if (!/^\d{18}$/.test(clabeClean)) {
      setClabeError("CLABE debe tener exactamente 18 dígitos numéricos");
      return;
    }
    setClabeSaving(true);
    setClabeError(null);
    try {
      const res = await fetch(`/api/proveedores/${selectedProveedor.id}/banking`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_name: clabeForm.bank_name || null,
          bank_clabe: clabeClean,
          bank_account_number: clabeForm.bank_account_number || null,
          nombre_cuenta: clabeForm.nombre_cuenta || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      // Actualizar el selectedProveedor local con los nuevos datos
      setSelectedProveedor({
        ...selectedProveedor,
        bank_name: clabeForm.bank_name || null,
        bank_clabe: clabeClean,
        bank_account_number: clabeForm.bank_account_number || null,
        razon_social: clabeForm.nombre_cuenta || selectedProveedor.razon_social,
      });
      setShowClabeModal(false);
    } catch (e: unknown) {
      setClabeError((e as Error).message || "Error al guardar");
    } finally {
      setClabeSaving(false);
    }
  }

  const searchParams = useSearchParams();
  const formMode = TIPO_MAP[subcategoria] || "catalogo";

  // F1: al elegir Destajo, fijar subcategoria y pre-tipo
  useEffect(() => {
    if (tipoSolicitud === "DESTAJO") { setSubcategoria("DESTAJOS"); setDescripcionCompra("DESTAJOS"); }
  }, [tipoSolicitud]);

  // F1: saldo acumulado del destajista en la obra (suma de requis DESTAJO previas)
  useEffect(() => {
    if (tipoSolicitud !== "DESTAJO" || !selectedProveedor || !selectedCostCenterId) { setSaldoDestajista(null); return; }
    const center = costCenters.find(c => c.id === selectedCostCenterId);
    if (!center) return;
    let alive = true;
    supabase.from("Requisiciones").select("total, monto, status")
      .eq("tipo_solicitud", "DESTAJO").eq("proveedor", selectedProveedor.name).eq("cost_center_name", center.name)
      .not("status", "in", "(CANCELADA,RECHAZADA_DIRECCION,RECHAZADA_RESPONSABLE)")
      .then(({ data }) => {
        if (!alive) return;
        const rows = (data || []) as Array<{ total: number | null; monto: number | null }>;
        setSaldoDestajista({ total: rows.reduce((a, r) => a + Number(r.total ?? r.monto ?? 0), 0), n: rows.length });
      });
    return () => { alive = false; };
  }, [tipoSolicitud, selectedProveedor, selectedCostCenterId, costCenters]);

  // FIX 544 gap: si la forma de pago es TRANSFERENCIA y el proveedor elegido no tiene CLABE, pedirla
  useEffect(() => {
    if (!selectedProveedor || showClabeModal) return;
    if (/TRANSFER/i.test(formaPago) && !selectedProveedor.bank_clabe) {
      setClabeForm({ bank_name: selectedProveedor.bank_name || "", bank_clabe: "", bank_account_number: selectedProveedor.bank_account_number || "", nombre_cuenta: selectedProveedor.razon_social || "" });
      setClabeError(null); setShowClabeModal(true);
    }
  }, [formaPago, selectedProveedor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.from("centros_trabajo").select("id, code:codigo, name:nombre").order("nombre").then(({data}) => { if(data) setCostCenters(data); });
    supabase.from("catalogos_requisiciones").select("tipo, valor").eq("activo", true).order("valor").then(({data}) => {
      if(data) {
        setSolicitantes(data.filter(d => d.tipo === "SOLICITANTE").map(d => d.valor));
        setSubcategorias(data.filter(d => d.tipo === "SUBCATEGORIA").map(d => d.valor));
        const tc = data.filter(d => d.tipo === "TIPO_COMPRA").map(d => d.valor); if (tc.length) setTiposCompra(tc);
      }
    });
    supabase.from("Proveedores").select("id, name, bank_name, bank_clabe, bank_account_number, payment_method, razon_social").eq("status", "ACTIVO").order("name").range(0, 1999).then(({data}) => { if(data) setProveedores(data as ProveedorOption[]); });
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    setRequiredDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  // 04-Jun-2026 Daisy bug3 FIX DEFINITIVO: endpoint server-side con service_role
  // (elimina problemas con anon client, paginacion, RLS, ordering case-sensitive)
  // FIX 541.1 24-Jun-2026: cookie HttpOnly viaja sola (credentials include).
  // Side effect del sweep SEC T10 19-Jun: endpoints migrados a requireUser sin auditar callers frontend.
  useEffect(() => {
    if (proveedorSearch.length < 2) {
      setProveedoresResults([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/proveedores/search?q=${encodeURIComponent(proveedorSearch)}`, {
        cache: "no-store",
        credentials: "include",
      })
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
    const tipoParam = searchParams.get("tipo");
    if (tipoParam === "DESTAJO") { setTipoSolicitud("DESTAJO"); setPasoM(2); } else if (matsParam || tipoParam === "MATERIALES" || searchParams.get("obra")) { setTipoSolicitud("MATERIALES"); setPasoM(2); }

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
    setCombRows(prev => [...prev, { tempId: nextTempId, tipo: "DIESEL", litros: 0, precio_unitario: 0, unidad_destino: "", tipo_unidad: "CAMION" }]);
    setNextTempId(prev => prev + 1);
  };

  const shortCat = (cat: string|null) => {
    if (!cat) return "";
    const m: Record<string,string> = { "Acero y productos metalicos":"Acero","Agregados y materiales de banco":"Agregados","Combustibles y lubricantes":"Combustible","Concretos asfaltos y estabilizantes":"Concreto","EPP y seguridad":"EPP","Ferreteria y fijacion":"Ferretería","Herramienta y equipo":"Herramienta","Material electrico":"Eléctrico","Miscelaneos de obra":"Misceláneo","Servicios y rentas":"Servicios","Tuberias y conexiones":"Tubería" };
    return m[cat] || cat.split(" ")[0];
  };

  const getTotalPartidas = () => {
    if (tipoSolicitud === "DESTAJO") return Number(destajoMonto) > 0 && destajoConcepto.trim() ? 1 : 0;
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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
      const invalidCombs = combRows.filter(c => !c.tipo?.trim() || isNaN(c.litros) || c.litros <= 0 || !c.unidad_destino?.trim() || isNaN(c.precio_unitario) || c.precio_unitario <= 0);
      if (invalidCombs.length > 0) { setErrorMsg("Todos los combustibles deben tener tipo, litros > 0, precio unitario > 0 y destino."); setSending(false); return; }
      materiales = combRows.map(c => ({ id: null, name: `${c.tipo} - ${c.litros}L → ${c.unidad_destino} (${c.tipo_unidad})`, unit: "LITRO", qty: c.litros, precio_unitario: c.precio_unitario, price: c.precio_unitario, comments: `Tipo: ${c.tipo}, Destino: ${c.unidad_destino}, Unidad: ${c.tipo_unidad}, P.U. $${c.precio_unitario.toFixed(2)}` }));
    } else if (tipoSolicitud === "DESTAJO") {
      const monto = Number(destajoMonto);
      if (!selectedProveedor) { setErrorMsg("Elige al destajista."); setSending(false); return; }
      if (!destajoConcepto.trim()) { setErrorMsg("Escribe el concepto del destajo (ej. Muros PB, Redes hidráulicas)."); setSending(false); return; }
      if (!(monto > 0)) { setErrorMsg("El monto del destajo debe ser mayor a 0."); setSending(false); return; }
      const etiqueta = destajoTipoPago === "ANTICIPO" ? "Anticipo" : destajoTipoPago === "FINIQUITO" ? "Finiquito" : "Pago semanal";
      materiales = [{ id: null, name: `${etiqueta} destajo: ${destajoConcepto.trim()}`, unit: "PAGO", qty: 1, comments: generalComments || "", price: monto }];
    } else {
      const invalidFree = freeRows.filter(f => !f.descripcion?.trim() || isNaN(f.cantidad) || f.cantidad === 0 || isNaN(f.monto));
      if (invalidFree.length > 0) { setErrorMsg("Todos los conceptos deben tener descripción y cantidad distinta de 0. Usa monto en negativo para descontar (anticipos, descuentos)."); setSending(false); return; }
      const sumFree = freeRows.reduce((s, f) => s + (Number(f.monto || 0) * Number(f.cantidad || 0)), 0);
      if (sumFree < 0) { setErrorMsg("El total no puede quedar negativo. Revisa los descuentos."); setSending(false); return; }
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
        method: "POST",
        credentials: "include", headers: { "Content-Type": "application/json" },
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
          // ARIA27 Campo F1
          tipo_solicitud: tipoSolicitud || "MATERIALES",
          ...(tipoSolicitud === "DESTAJO" ? { destajo_tipo_pago: destajoTipoPago, destajo_concepto: destajoConcepto || null } : {}),
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
      setMessage("Requisición " + data.folio + " generada exitosamente.");
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
        <h1 className="text-2xl font-bold"><span className="md:hidden">Pedir material</span><span className="hidden md:inline">Nueva Requisición</span></h1>
        {solicitanteVisible ? (
          <div className="ml-auto hidden md:inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-xs">
            <span className="text-emerald-300 font-semibold">Solicitante:</span>
            <span className="text-[var(--d-text)] font-medium">{solicitanteVisible}</span>
          </div>
        ) : null}
      </div>

      {errorMsg && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200 max-md:fixed max-md:left-3 max-md:right-3 max-md:z-50 max-md:shadow-xl max-md:bg-[var(--d-surface)]" style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }}>{errorMsg}</div>}
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
            <button onClick={() => { setShowAI(false); setAiError(null); }} className="text-[var(--d-faint)] hover:text-[var(--d-text-2)]"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-[var(--d-muted)] mb-3">Pega el mensaje de WhatsApp, describe lo que necesitas, o cualquier lista de materiales. La IA llenará el formulario automáticamente.</p>
          <textarea
            className="h-24 w-full resize-none rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent"
            placeholder={'Ejemplo: "Necesito 10 sacos de cemento, 5 varillas 3/8 y 2 rollos de alambre para la obra Miravalle, lo necesito mañana URGENTE"'}
            value={aiTexto}
            onChange={e => setAiTexto(e.target.value)}
          />
          {aiError && <p className="mt-1 text-xs text-red-400">{aiError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => { setShowAI(false); setAiError(null); }} className="rounded-full bg-[var(--d-card)] px-4 py-2 text-xs text-[var(--d-muted)] hover:bg-[var(--d-hover)]">Cancelar</button>
            <button onClick={handleAI} disabled={aiLoading || !aiTexto.trim()} className="inline-flex items-center gap-2 rounded-full bg-aria-primary/40 px-5 py-2 text-xs font-semibold text-aria-accent hover:bg-aria-primary/60 disabled:opacity-40 transition">
              {aiLoading ? <><Loader2 className="h-3 w-3 animate-spin" />Analizando...</> : <><Sparkles className="h-3 w-3" />Extraer con IA</>}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAI(true)} className="hidden md:inline-flex items-center gap-2 self-start rounded-full border border-aria-primary/40 bg-aria-primary/10 px-4 py-2 text-xs font-medium text-aria-accent hover:bg-aria-primary/20 transition">
          <Sparkles className="h-3 w-3" />
          Extraer datos con IA desde texto o WhatsApp
        </button>
      )}

      {/* Celular: progreso de 3 pasos */}
      <div className="md:hidden">
        <div className="flex gap-1.5">{[1, 2, 3].map(n => <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${pasoM >= n ? "bg-[#0073ea]" : "bg-[var(--d-border)]"}`} />)}</div>
        <div className="mt-1.5 flex justify-between text-[11.5px] font-semibold">{["1 · Qué", "2 · Dónde y cuándo", "3 · Tu lista"].map((t, i) => <span key={t} className={pasoM === i + 1 ? "text-[var(--d-link)]" : "text-[var(--d-faint)]"}>{t}</span>)}</div>
      </div>

      <div className="grid gap-5 lg:grid-cols-1 xl:grid-cols-2">
        {/* ARIA27 Campo F1: ¿Qué vas a solicitar? */}
        <section className={`rounded-2xl bg-[var(--d-card)] p-4 shadow-lg backdrop-blur ${vis(1)}`}>
          <h2 className="mb-3 text-lg font-semibold">¿Qué vas a solicitar?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { k: "MATERIALES", icon: IcoSaco, c: "#0073ea", t: "Materiales o servicios", d: "Compra con cotización. Crédito o contado." },
              { k: "DESTAJO", icon: IcoCasco, c: "#ff642e", t: "Destajo", d: "Anticipo, pago semanal o finiquito a destajista." },
              { k: "ACTIVIDAD", icon: IcoTarea, c: "#7e3bdd", t: "Actividad", d: "Una tarea para alguien. No genera gasto." },
            ] as const).map(({ k, icon: Icon, c, t, d }) => {
              const active = tipoSolicitud === k;
              return (
                <button key={k} type="button"
                  onClick={() => { if (k === "ACTIVIDAD") { router.push("/dashboard/actividades?nueva=1"); return; } setTipoSolicitud(k as TipoSolicitud); setPasoM(2); if (k === "MATERIALES") { setSubcategoria(""); setDescripcionCompra(""); } }}
                  className={`btn-flat text-left rounded-2xl border p-4 transition min-h-[88px] flex sm:block items-center gap-3 ${active ? "border-[#0073ea] ring-2 ring-[#0073ea]/40 bg-[var(--d-card)]" : "border-[var(--d-border)] bg-[var(--d-card)] hover:bg-[var(--d-hover)]"}`}
                  aria-pressed={active}>
                  <span className="shrink-0 sm:mb-2 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: c }}><Icon className="w-6 h-6" color="#fff" /></span>
                  <span className="block min-w-0"><span className="block text-[15px] sm:text-sm font-semibold text-[var(--d-text)]">{t}</span>
                  <span className="block text-[12px] sm:text-[11px] text-[var(--d-muted)] mt-0.5">{d}</span></span>
                </button>
              );
            })}
          </div>
        </section>

        {tipoSolicitud && (<>
        {/* SECCION 1: CONFIGURACION */}
        <section className={`rounded-2xl bg-[var(--d-card)] p-5 shadow-lg backdrop-blur ${vis(2)}`}>
          <h2 className="mb-4 text-lg font-semibold"><span className="md:hidden">1. ¿Para qué obra y para cuándo?</span><span className="hidden md:inline">1. CONFIGURACIÓN</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--d-text-2)]"><span className="md:hidden">Obra</span><span className="hidden md:inline">Obra / Centro</span></label>
              <select className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" value={selectedCostCenterId??""} onChange={e => setSelectedCostCenterId(e.target.value||null)}>
                <option value="">Seleccione...</option>
                {costCenters.map((c,i) => <option key={c.id} value={c.id}>{i+1}. {c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--d-text-2)]"><span className="md:hidden">¿Para cuándo lo necesitas?</span><span className="hidden md:inline">Fecha Requerida *</span></label>
              <input type="date" required className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            {tipoSolicitud !== "DESTAJO" && <div className={`space-y-1 ${avz}`}>
              <label className="text-xs font-medium text-[var(--d-text-2)]">Tipo / Subcategoría</label>
              <select className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" value={subcategoria} onChange={e => setSubcategoria(e.target.value)}>
                <option value="">MATERIALES (por defecto)</option>
                {subcategorias.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>}
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--d-text-2)]">Prioridad</label>
              <select
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-aria-accent ${
                  prioridad === "CRITICO" ? "border-red-500/60 bg-red-500/10 text-red-300" :
                  prioridad === "URGENTE" ? "border-orange-500/60 bg-orange-500/10 text-orange-300" :
                  prioridad === "PLANIFICADO" ? "border-emerald-500/40 bg-emerald-500/5 text-aria-accent" :
                  "border-[var(--d-border)] bg-[var(--d-input)] text-[var(--d-text)]"
                }`}
                value={prioridad}
                onChange={e => setPrioridad(e.target.value as "CRITICO"|"URGENTE"|"NORMAL"|"PLANIFICADO")}
              >
                <option value="CRITICO">Crítico: hoy o emergencia</option>
                <option value="URGENTE">Urgente: mañana o esta semana</option>
                <option value="NORMAL">Normal</option>
                <option value="PLANIFICADO">Planificado: en más de 7 días</option>
              </select>
            </div>
            <div className={`space-y-1 ${avz}`}>
              <label className="text-xs font-medium text-[var(--d-text-2)]">Presupuesto estimado (opcional)</label>
              <div className="flex items-center gap-1 rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2">
                <span className="text-sm text-[var(--d-faint)]">$</span>
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
          <div className={`mt-3 grid-cols-1 md:grid-cols-3 gap-3 ${masDetalles ? "grid" : "hidden md:grid"}`}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--d-text-2)]">Forma de pago</label>
              <select className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--d-text-2)]">Fecha de pago</label>
              <input type="date" className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--d-text-2)]">IVA</label>
              <select className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" value={ivaPorcentaje} onChange={e => setIvaPorcentaje(Number(e.target.value))}>
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
          <div className={`mt-3 space-y-1 ${avz}`}>
            <label className="text-xs font-medium text-[var(--d-text-2)]">Proveedor (opcional — auto-llena datos de pago)</label>
            <div className="relative">
              <input
                type="text"
                className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent"
                placeholder="Buscar proveedor..."
                value={selectedProveedor ? selectedProveedor.name : proveedorSearch}
                onChange={e => { setProveedorSearch(e.target.value); setSelectedProveedor(null); }}
                onFocus={() => {
                  // 03-Jun-2026 Daisy bug3: refresh on focus para detectar proveedores recien dados de alta
                  supabase.from("Proveedores").select("id, name, bank_name, bank_clabe, bank_account_number, payment_method, razon_social").eq("status", "ACTIVO").order("name").range(0, 1999).then(({data}) => { if(data) setProveedores(data as ProveedorOption[]); });
                }}
              />
              {selectedProveedor && (
                <button onClick={() => { setSelectedProveedor(null); setProveedorSearch(""); }} className="absolute right-2 top-2 text-[var(--d-faint)] hover:text-[var(--d-text-2)]">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {!selectedProveedor && proveedorSearch.length >= 2 && (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-[var(--d-border)] bg-[var(--d-surface)]">
                {proveedoresResults.slice(0, 20).map(p => (
                  <div key={p.id} onClick={() => {
                    setSelectedProveedor(p);
                    setProveedorSearch("");
                    if (p.payment_method) setFormaPago(p.payment_method);
                    // FIX 544: si es TRANSFERENCIA/CHEQUE sin CLABE → abrir modal captura
                    const m = (p.payment_method || "").toUpperCase();
                    const necesitaClabe = (m.includes("TRANSFER") || m.includes("CHEQUE")) && !p.bank_clabe;
                    if (necesitaClabe) {
                      setClabeForm({ bank_name: p.bank_name || "", bank_clabe: "", bank_account_number: p.bank_account_number || "", nombre_cuenta: p.razon_social || "" });
                      setClabeError(null);
                      setShowClabeModal(true);
                    }
                  }} className="cursor-pointer px-3 py-2 text-sm hover:bg-[var(--d-hover)] transition-colors">
                    <div className="text-[var(--d-text)]">{p.name}</div>
                    {(p.bank_name || p.bank_clabe) && <div className="text-xs text-[var(--d-faint)]">{p.bank_name}{p.bank_clabe ? ` · CLABE: ${p.bank_clabe.slice(0,6)}…` : ""}</div>}
                  </div>
                ))}
                {proveedoresResults.length === 0 && (
                  <div className="px-3 py-2 text-xs text-[var(--d-faint)]">Sin resultados</div>
                )}
              </div>
            )}
            {selectedProveedor && (
              <div className="mt-2 rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[var(--d-text)]">{selectedProveedor.name}</span>
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
                        className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide text-[var(--d-text)] shadow-[inset_0_1px_0_rgba(220,235,255,0.15),0_2px_4px_rgba(0,0,0,0.30)] border border-[rgba(140,178,228,0.25)]"
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
            <div className={`space-y-1 ${avz}`}>
              <label className="text-xs font-medium text-[var(--d-text-2)]">Tipo de compra *</label>
              <select required className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" value={descripcionCompra} onChange={e => setDescripcionCompra(e.target.value)}>
                <option value="">Selecciona tipo...</option>
                {tiposCompra.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--d-text-2)]"><span className="md:hidden">¿Para qué es?</span><span className="hidden md:inline">Motivo de la solicitud *</span></label>
              <textarea required className="h-[42px] w-full resize-none rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" placeholder="Razon o motivo..." value={motivoSolicitud} onChange={e => setMotivoSolicitud(e.target.value)} />
            </div>
          </div>

          {/* PR 30-Abr: campos extra cuando es GASTO POR PAGAR */}
          {esGastoTipo && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-3 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Datos para pago en efectivo / gasto por pagar</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--d-text-2)]">Solicitante (nombre completo) *</label>
                  <input type="text" required className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" placeholder="Ej: Juan Carlos Mendez Lopez" value={solicitanteCompleto} onChange={e => setSolicitanteCompleto(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--d-text-2)]">Foto del ticket / comprobante</label>
                  <input type="file" accept="image/*,application/pdf" className="w-full text-xs text-[var(--d-text-2)] file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-aria-primary-light file:text-aria-accent file:cursor-pointer" onChange={e => setFotoTicket(e.target.files?.[0] || null)} />
                  {fotoTicket && <div className="text-[10px] text-emerald-300 mt-1">{fotoTicket.name} ({(fotoTicket.size/1024).toFixed(0)}KB)</div>}
                </div>
              </div>
              <div className="text-[10px] text-amber-200/70">Esta requisicion se enviara al area de PAGOS POR PAGAR (no a Compras para cotizar).</div>
            </div>
          )}

          <button type="button" onClick={() => setMasDetalles(v => !v)} className="md:hidden mt-3 w-full rounded-xl border border-dashed border-[var(--d-border)] px-3 py-2.5 text-left text-[13px] text-[var(--d-link)] font-semibold">
            {masDetalles ? "▲ Ocultar detalles" : "▼ Más detalles (opcional): proveedor, pago, IVA, presupuesto"}<span className="block text-[11px] font-normal text-[var(--d-muted)]">Si no los sabes, déjalos: Compras los completa.</span>
          </button>
          <div className={`mt-3 space-y-1 ${avz}`}>
            <label className="text-xs font-medium text-[var(--d-text-2)]">Instrucciones generales</label>
            <textarea className="h-16 w-full resize-none rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" placeholder="Instrucciones de entrega, horarios, etc." value={generalComments} onChange={e => setGeneralComments(e.target.value)} />
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
          <div className="md:hidden mt-5 grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={() => setPasoM(1)} className="rounded-2xl bg-[var(--d-card-2)] px-5 py-3.5 text-sm font-semibold text-[var(--d-text-2)]">Atrás</button>
            <button type="button" onClick={() => { if (!selectedCostCenterId) { setErrorMsg("Elige la obra."); return; } if (!requiredDate) { setErrorMsg("Elige para cuándo."); return; } setErrorMsg(null); setPasoM(3); try { window.scrollTo({ top: 0 }); } catch { /* */ } }} className="rounded-2xl bg-gradient-to-r from-[#0073ea] to-[#579bfc] py-3.5 text-[15px] font-bold text-white">Siguiente →</button>
          </div>
        </section>

        {/* ARIA27 Campo F1: DESTAJO — un solo pago por requi, con saldo del destajista */}
        {tipoSolicitud === "DESTAJO" && (
          <section className={`rounded-2xl bg-[var(--d-card)] p-5 shadow-lg backdrop-blur ${vis(3)}`}>
            <h2 className="mb-1 text-lg font-semibold flex items-center gap-2"><Hammer className="w-5 h-5 text-aria-accent" /> 2. DESTAJO</h2>
            <p className="text-xs text-[var(--d-muted)] mb-4">Elige al destajista arriba en “Proveedor”. Aquí capturas qué se paga y cuánto.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-3">
                <label className="text-xs font-medium text-[var(--d-text-2)]">Concepto del destajo *</label>
                <input type="text" value={destajoConcepto} onChange={e => setDestajoConcepto(e.target.value)} placeholder="Ej. Muros planta baja, Redes hidráulica y sanitaria" className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--d-text-2)]">Tipo de pago *</label>
                <div className="grid grid-cols-3 gap-1">
                  {([["ANTICIPO","Anticipo"],["SEMANA","Semana"],["FINIQUITO","Finiquito"]] as const).map(([k,l]) => (
                    <button key={k} type="button" onClick={() => setDestajoTipoPago(k)} aria-pressed={destajoTipoPago===k}
                      className={`btn-flat rounded-xl border px-2 py-2 text-xs font-semibold ${destajoTipoPago===k ? "border-aria-accent bg-aria-accent/20 text-[var(--d-text)]" : "border-[var(--d-border)] bg-[var(--d-input)] text-[var(--d-text-2)]"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--d-text-2)]">Monto *</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--d-muted)]">$</span>
                  <input type="number" inputMode="decimal" min="0" step="0.01" value={destajoMonto} onChange={e => setDestajoMonto(e.target.value)} placeholder="0.00" className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] pl-7 pr-3 py-2 text-sm outline-none focus:border-aria-accent" /></div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--d-text-2)]">Saldo con este destajista en esta obra</label>
                <div className="rounded-xl border border-[var(--d-border)] bg-[var(--d-card)] px-3 py-2 text-sm">
                  {!selectedProveedor ? <span className="text-[var(--d-faint)]">Elige destajista</span>
                   : saldoDestajista === null ? <span className="text-[var(--d-faint)]">Calculando…</span>
                   : <><span className="text-amber-300 font-semibold">${saldoDestajista.total.toLocaleString("es-MX",{minimumFractionDigits:2})}</span><span className="text-[var(--d-muted)] text-xs"> en {saldoDestajista.n} pago{saldoDestajista.n===1?"":"s"} previo{saldoDestajista.n===1?"":"s"}</span></>}
                </div>
              </div>
            </div>
            {Number(destajoMonto) > 0 && destajoConcepto.trim() && (
              <div className="mt-3 text-xs text-[var(--d-muted)]">Se registrará: <span className="text-[var(--d-text)]">{destajoTipoPago === "ANTICIPO" ? "Anticipo" : destajoTipoPago === "FINIQUITO" ? "Finiquito" : "Pago semanal"} · {destajoConcepto.trim()} · ${Number(destajoMonto).toLocaleString("es-MX",{minimumFractionDigits:2})}</span>. Va a Dirección para autorizar y a Caja para pagar.</div>
            )}
          </section>
        )}

        {/* SECCION 2: BUSQUEDA O CAPTURA */}
        <section className={`rounded-2xl bg-[var(--d-card)] p-5 shadow-lg backdrop-blur ${tipoSolicitud === "DESTAJO" ? "hidden" : vis(3)}`}>
          {formMode === "catalogo" && (
            <>
              <h2 className="mb-4 text-lg font-semibold"><span className="md:hidden">2. ¿Qué necesitas? Búscalo o escríbelo</span><span className="hidden md:inline">2. BUSCAR EN CATÁLOGO</span></h2>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 mb-3">
                <Search className="h-4 w-4 opacity-70" />
                <input className="w-full bg-transparent text-sm outline-none" placeholder="Ej. cemento, varilla, cable…" value={searchTerm} onChange={e => handleSearch(e.target.value)} />
                {searching && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <div className="max-h-48 overflow-auto rounded-xl border border-[var(--d-border)] bg-[var(--d-sunken)]">
                <div className="hidden md:grid grid-cols-[70px_1fr_80px] gap-2 border-b border-[var(--d-border)] bg-[var(--d-bg)] px-3 py-2 text-[11px] font-medium uppercase text-[var(--d-text-2)] sticky top-0 z-10">
                  <div>Cat</div><div>Descripción</div><div className="text-right">Unidad</div>
                </div>
                {searchResults.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-[var(--d-faint)]">{searchTerm.length < 2 ? "Busca un producto del catálogo" : "Sin resultados"}</div>
                ) : searchResults.map(p => {
                  const isSel = materials.some(m => m.id === p.id);
                  return (
                    <div key={p.id} onClick={() => isSel ? setMaterials(prev=>prev.filter(m=>m.id!==p.id)) : addMaterial(p)}
                      className={`grid grid-cols-[70px_1fr_80px] gap-2 items-center px-3 py-2.5 text-xs cursor-pointer transition-all ${isSel ? "bg-emerald-500/20 border-l-2 border-emerald-400" : "hover:bg-white/[0.04] border-l-2 border-transparent"}`}>
                      <div className="hidden md:block text-aria-accent/80 text-[10px] truncate">{shortCat(p.category)}</div>
                      <div className={`col-span-3 md:col-span-1 ${isSel ? "text-aria-accent font-medium" : ""}`}><span className="block md:truncate text-[13px] md:text-xs">{isSel ? "✓ " : ""}{p.name}</span><span className="md:hidden text-[11px] text-[var(--d-muted)]">{shortCat(p.category)} · {p.unit}</span></div>
                      <div className="hidden md:block text-[var(--d-muted)] truncate text-right">{p.unit}</div>
                    </div>
                  );
                })}
              </div>
              {/* AGREGAR PRODUCTO MANUAL */}
              {!showManual ? (
                <button onClick={() => setShowManual(true)} className="mt-3 flex items-center gap-2 text-xs text-aria-accent hover:text-aria-accent transition">
                  <Plus className="w-3 h-3" /> ¿No encontraste el producto? Agregar al catálogo
                </button>
              ) : (
                <div className="mt-3 rounded-xl border border-aria-primary/30 bg-aria-primary/5 p-3 space-y-2">
                  <p className="text-xs text-aria-accent font-medium">Nuevo producto — se guardará en el catálogo</p>
                  <div className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--d-muted)]">Nombre del producto</label>
                      <input className="w-full rounded-lg border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-1.5 text-sm outline-none focus:border-aria-accent" placeholder="Ej: Tornillo galvanizado 3/8..." value={manualName} onChange={e => setManualName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--d-muted)]">Unidad</label>
                      <select className="w-full rounded-lg border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-1.5 text-sm outline-none focus:border-aria-accent" value={manualUnit} onChange={e => setManualUnit(e.target.value)}>
                        {["PZA","METRO","M2","M3","ML","CUBETA","SERVICIO","HORA","DIA","SEMANA","MES","GALON","LITRO","TRAMO","PRUEBA","EQUIPO","KG","TON","CAMION","LOTE","CAJA","ROLLO","SACO","BOLSA","JGO"].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        const nm = manualName.trim();
                        if (!nm) return;
                        const un = manualUnit || "PZA";
                        // FIX P0 19-Jun: ANTES solo agregaba en memoria a esta requi.
                        // Jessica reportaba "ya van 8 concretos que capturo lo mismo".
                        // Ahora persiste en catalogo permanente Y agrega a esta requi.
                        try {
                          const r = await fetch("/api/productos/upsert-manual", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: nm, unit: un, category: subcategoria || "OTROS" }),
                          });
                          const d = await r.json();
                          if (d?.ok && d?.product?.id) {
                            // Usar el ID real del producto persistido (para que aparezca en futuras busquedas)
                            setMaterials(prev => [...prev, { id: d.product.id as number, name: d.product.name || nm, unit: d.product.unit || un, qty: 1, observations: "" }]);
                          } else {
                            // Fallback: agregar solo en memoria con ID temporal
                            setMaterials(prev => [...prev, { id: manualTempId, name: nm, unit: un, qty: 1, observations: "" }]);
                            setManualTempId(prev => prev - 1);
                          }
                        } catch {
                          // Sin red: agregar solo en memoria como antes
                          setMaterials(prev => [...prev, { id: manualTempId, name: nm, unit: un, qty: 1, observations: "" }]);
                          setManualTempId(prev => prev - 1);
                        }
                        setManualName(""); setManualUnit("PZA");
                      }} disabled={!manualName.trim()} className="rounded-lg bg-aria-primary/30 px-3 py-1.5 text-xs text-aria-accent hover:bg-aria-primary-hover/40 disabled:opacity-40 transition">
                        <Plus className="w-3 h-3 inline mr-1" />Agregar
                      </button>
                      <button onClick={() => { setShowManual(false); setManualName(""); setManualUnit("PZA"); }} className="rounded-lg bg-[var(--d-card)] px-2 py-1.5 text-xs text-[var(--d-muted)] hover:bg-[var(--d-hover)] transition">✕</button>
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
                  <div key={r.tempId} className="grid grid-cols-[1fr_80px_80px_80px_30px] gap-2 items-center bg-[var(--d-sunken)] rounded-xl px-3 py-2">
                    <input required className="bg-transparent text-sm outline-none border-b border-[var(--d-border)] pb-1" placeholder="Descripción..." value={r.descripcion} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, descripcion: e.target.value} : x))} />
                    <input type="number" required step="0.01" className="bg-[var(--d-input)] rounded-lg px-2 py-1 text-center text-sm" placeholder="Cant" value={r.cantidad||""} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, cantidad: Number(e.target.value)} : x))} title="Acepta negativos para anticipos descontados" />
                    <select className="bg-[var(--d-input)] rounded-lg px-2 py-1 text-center text-sm" value={r.unidad || "PZA"} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, unidad: e.target.value} : x))}>
                      {["PZA","METRO","M2","M3","ML","CUBETA","SERVICIO","HORA","DIA","SEMANA","MES","GALON","LITRO","TRAMO","PRUEBA","EQUIPO","KG","TON","CAMION","LOTE","CAJA","ROLLO","SACO","BOLSA","JGO"].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" required step="0.01" className="bg-[var(--d-input)] rounded-lg px-2 py-1 text-center text-sm" placeholder="$" value={r.monto||""} onChange={e => setFreeRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, monto: Number(e.target.value)} : x))} />
                    <button onClick={() => setFreeRows(prev => prev.filter(x => x.tempId !== r.tempId))} className="rounded-full bg-red-500/70 p-1 hover:bg-red-500"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                {freeRows.length === 0 && <div className="text-center text-xs text-[var(--d-faint)] py-4">Sin partidas. Click "Agregar partida".</div>}
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
                  <div key={r.tempId} className="grid grid-cols-[90px_70px_90px_90px_1fr_110px_30px] gap-2 items-center bg-[var(--d-sunken)] rounded-xl px-3 py-2">
                    <select required className="bg-[var(--d-input)] rounded-lg px-2 py-1 text-sm" value={r.tipo} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, tipo: e.target.value} : x))}>
                      <option>DIESEL</option><option>MAGNA</option><option>PREMIUM</option><option>GAS LP</option>
                    </select>
                    <input type="number" required min="0.01" step="0.01" className="bg-[var(--d-input)] rounded-lg px-2 py-1 text-center text-sm" placeholder="Litros" value={r.litros||""} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, litros: Number(e.target.value)} : x))} />
                    <input type="number" required min="0.01" step="0.01" className="bg-[var(--d-input)] rounded-lg px-2 py-1 text-center text-sm" placeholder="$ / Litro" value={r.precio_unitario||""} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, precio_unitario: Number(e.target.value)} : x))} />
                    <div className="text-right text-xs text-amber-300 font-medium pr-1">${((r.litros||0) * (r.precio_unitario||0)).toLocaleString("es-MX", {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                    <input required className="bg-transparent text-sm outline-none border-b border-[var(--d-border)] pb-1" placeholder="Unidad destino (ej: Retroexcavadora CAT 420F)" value={r.unidad_destino} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, unidad_destino: e.target.value} : x))} />
                    <select className="bg-[var(--d-input)] rounded-lg px-2 py-1 text-sm" value={r.tipo_unidad} onChange={e => setCombRows(prev => prev.map(x => x.tempId===r.tempId ? {...x, tipo_unidad: e.target.value} : x))}>
                      <option>CAMION</option><option>RETROEXCAVADORA</option><option>CARGADOR</option><option>COMPACTADOR</option><option>CAMIONETA</option><option>PIPA</option><option>OTRO</option>
                    </select>
                    <button onClick={() => setCombRows(prev => prev.filter(x => x.tempId !== r.tempId))} className="rounded-full bg-red-500/70 p-1 hover:bg-red-500"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
                {combRows.length === 0 && <div className="text-center text-xs text-[var(--d-faint)] py-4">Sin combustible. Click "Agregar línea".</div>}
              </div>
            </>
          )}
        </section>
        </>)}
      </div>

      {/* SECCION 3: RESUMEN */}
      {tipoSolicitud && (<section className={`flex-1 rounded-2xl bg-[var(--d-card)] p-5 shadow-lg backdrop-blur flex-col ${pasoM === 3 ? "flex" : "hidden md:flex"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-aria-accent" />
            <h2 className="text-lg font-semibold"><span className="md:hidden">3. Tu lista ({getTotalPartidas()})</span><span className="hidden md:inline">3. PARTIDAS ({getTotalPartidas()})</span></h2>
          </div>
          {(() => {
            const subtotalLibre = freeRows.reduce((s,r) => s + (r.monto * r.cantidad), 0);
            const subtotalCat = materials.reduce((s,m) => s + ((m.price ?? 0) * m.qty), 0);
            // 24-Jun-2026 P0 fix: subtotal combustible = litros * precio_unitario
            const subtotalComb = combRows.reduce((s,c) => s + (c.litros * c.precio_unitario), 0);
            const subtotal = formMode === "libre" ? subtotalLibre : formMode === "combustible" ? subtotalComb : subtotalCat;
            const tieneFilas = (formMode === "libre" && freeRows.length > 0) || (formMode === "catalogo" && materials.length > 0) || (formMode === "combustible" && combRows.length > 0);
            if (!tieneFilas) return null;
            const ivaMonto = subtotal * (ivaPorcentaje / 100);
            const totalConIva = subtotal + ivaMonto;
            const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return (
              <div className={`${subtotal > 0 ? "flex" : "hidden md:flex"} items-center gap-4 text-xs`}>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase text-[var(--d-muted)]">Subtotal</span>
                  <span className="text-[var(--d-text)] font-medium">${fmt(subtotal)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase text-[var(--d-muted)]">IVA {ivaPorcentaje}%</span>
                  <span className="text-[var(--d-text)] font-medium">${fmt(ivaMonto)}</span>
                </div>
                <div className="flex flex-col items-end rounded-lg bg-aria-accent/15 border border-aria-accent/40 px-3 py-1">
                  <span className="text-[10px] uppercase text-aria-accent">Total</span>
                  <span className="text-aria-accent font-bold text-base">${fmt(totalConIva)}</span>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-[var(--d-border)] bg-[var(--d-sunken)] max-h-[60vh] md:max-h-60">
          {formMode === "catalogo" && (
            <>
              <div className="hidden md:grid grid-cols-[1.4fr_70px_70px_90px_100px_1.4fr_36px] gap-2 border-b border-[var(--d-border)] bg-[var(--d-card)] px-3 py-2 text-[11px] font-medium uppercase text-[var(--d-text-2)] sticky top-0">
                <div>Descripcion</div><div>Unidad</div><div>Cantidad</div><div className="text-right">P.U.</div><div className="text-right">Subtotal</div><div>Observaciones</div><div></div>
              </div>
              {materials.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-[var(--d-faint)]"><ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />Busca y agrega materiales arriba.</div>
              ) : materials.map(m => (
                <div key={m.id}>
                {/* Celular: tarjeta simple (qué, cuánto y nota) */}
                <div className="md:hidden border-b border-[var(--d-border)] px-3 py-3">
                  <div className="flex items-start gap-2"><div className="flex-1 text-[14px] font-semibold text-[var(--d-text)]">{m.name}</div>
                    <button onClick={() => setMaterials(prev => prev.filter(x => x.id !== m.id))} className="shrink-0 rounded-lg p-2 text-[var(--d-danger)]" aria-label="Quitar"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" onClick={() => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, qty: Math.max(1, (Number(x.qty) || 0) - 1)} : x))} className="w-10 h-10 rounded-xl bg-[var(--d-card-2)] text-lg font-bold text-[var(--d-text)]" aria-label="Menos">−</button>
                    <input type="number" inputMode="decimal" className="w-20 h-10 rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] text-center text-base font-bold text-[var(--d-text)] outline-none" value={m.qty} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, qty: Number(e.target.value)} : x))} aria-label="Cantidad" />
                    <button type="button" onClick={() => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, qty: (Number(x.qty) || 0) + 1} : x))} className="w-10 h-10 rounded-xl bg-[var(--d-card-2)] text-lg font-bold text-[var(--d-text)]" aria-label="Más">+</button>
                    <span className="text-[13px] text-[var(--d-muted)]">{m.unit}</span>
                  </div>
                  <input type="text" className="mt-2 w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm text-[var(--d-text)] outline-none" placeholder="Nota (medida, marca, color…) opcional" value={m.observations} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, observations: e.target.value} : x))} />
                </div>
                <div className="hidden md:grid grid-cols-[1.4fr_70px_70px_90px_100px_1.4fr_36px] gap-2 items-center px-3 py-2 text-xs">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="text-[var(--d-muted)]">{m.unit}</div>
                  <input ref={el => { if(el) qtyInputRefs.current.set(m.id, el); }} type="number" className="w-full rounded-lg bg-[var(--d-input)] px-2 py-1 text-center outline-none" value={m.qty} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, qty: Number(e.target.value)} : x))} title="Acepta negativos para anticipos descontados" />
                  <input type="number" min={0} step="0.01" placeholder="$" className="w-full rounded-lg bg-[var(--d-input)] px-2 py-1 text-right outline-none" value={m.price ?? ""} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, price: Number(e.target.value)} : x))} />
                  <div className="text-right text-aria-accent font-medium">${(((m.price ?? 0) * m.qty) || 0).toLocaleString("es-MX", {minimumFractionDigits: 2})}</div>
                  <input type="text" className="w-full rounded-lg bg-[var(--d-input)] px-2 py-1 outline-none" placeholder="Opcional..." value={m.observations} onChange={e => setMaterials(prev => prev.map(x => x.id===m.id ? {...x, observations: e.target.value} : x))} />
                  <button onClick={() => setMaterials(prev => prev.filter(x => x.id !== m.id))} className="rounded-full bg-red-500/70 p-1.5 hover:bg-red-500"><Trash2 className="h-3 w-3" /></button>
                </div>
                </div>
              ))}
            </>
          )}

          {formMode === "libre" && (
            <>
              <div className="grid grid-cols-[1fr_80px_80px_90px] gap-2 border-b border-[var(--d-border)] bg-[var(--d-card)] px-3 py-2 text-[11px] font-medium uppercase text-[var(--d-text-2)] sticky top-0">
                <div>Descripción</div><div>Cant</div><div>Unidad</div><div className="text-right">Monto</div>
              </div>
              {tipoSolicitud === "DESTAJO" ? (
                Number(destajoMonto) > 0 && destajoConcepto.trim() ? (
                  <div className="grid grid-cols-[1fr_80px_80px_90px] gap-2 items-center px-3 py-2 text-xs">
                    <div className="truncate text-[var(--d-text)]">{destajoTipoPago === "ANTICIPO" ? "Anticipo" : destajoTipoPago === "FINIQUITO" ? "Finiquito" : "Pago semanal"} destajo: {destajoConcepto.trim()}{selectedProveedor ? ` · ${selectedProveedor.name}` : ""}</div>
                    <div className="text-center">1</div><div className="text-center">PAGO</div>
                    <div className="text-right text-emerald-400">${Number(destajoMonto).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                  </div>
                ) : <div className="px-3 py-8 text-center text-sm text-[var(--d-faint)]">Captura concepto y monto del destajo en la sección 2.</div>
              ) : freeRows.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-[var(--d-faint)]">Agrega partidas en la sección 2.</div>
              ) : freeRows.map(r => (
                <div key={r.tempId} className="grid grid-cols-[1fr_80px_80px_90px] gap-2 items-center px-3 py-2 text-xs">
                  <div className="truncate font-medium">{r.descripcion || "(sin descripción)"}</div>
                  <div className="text-center">{r.cantidad}</div>
                  <div className="text-[var(--d-muted)]">{r.unidad}</div>
                  <div className="text-right text-aria-accent font-medium">${(r.monto * r.cantidad).toLocaleString()}</div>
                </div>
              ))}
            </>
          )}

          {formMode === "combustible" && (
            <>
              <div className="grid grid-cols-[100px_80px_1fr_100px] gap-2 border-b border-[var(--d-border)] bg-[var(--d-card)] px-3 py-2 text-[11px] font-medium uppercase text-[var(--d-text-2)] sticky top-0">
                <div>Tipo</div><div>Litros</div><div>Destino</div><div>Unidad</div>
              </div>
              {combRows.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-[var(--d-faint)]">Agrega líneas de combustible en la sección 2.</div>
              ) : combRows.map(r => (
                <div key={r.tempId} className="grid grid-cols-[100px_80px_1fr_100px] gap-2 items-center px-3 py-2 text-xs">
                  <div className="font-medium text-amber-300">{r.tipo}</div>
                  <div className="text-center">{r.litros}L</div>
                  <div className="truncate">{r.unidad_destino}</div>
                  <div className="text-[var(--d-muted)]">{r.tipo_unidad}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setPasoM(2)} className="md:hidden rounded-full bg-[var(--d-card-2)] px-5 py-2.5 text-sm font-semibold text-[var(--d-text-2)]">Atrás</button>
          <button onClick={handleSubmit} disabled={sending || isEmpty}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg transition ${isEmpty ? "bg-[var(--d-card-2)] text-[var(--d-muted)] shadow-none cursor-not-allowed" : "bg-emerald-500 text-slate-900 hover:bg-emerald-400"}`}>
            {sending ? <><Loader2 className="h-4 w-4 animate-spin" />Generando...</> : <><Check className="h-4 w-4" /><span className="md:hidden">Enviar solicitud</span><span className="hidden md:inline">Generar Requisición</span></>}
          </button>
        </div>
      </section>)}

      {/* FIX 544 · Modal captura CLABE al vuelo */}
      {showClabeModal && selectedProveedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--d-border)] bg-[var(--d-surface)] p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[var(--d-text)]">Datos bancarios pendientes</h3>
              <p className="mt-1 text-xs text-[var(--d-muted)]">
                <span className="font-semibold text-amber-300">{selectedProveedor.name}</span> aún no tiene CLABE registrada. Captúrala una sola vez: quedará guardada para las siguientes requisiciones.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--d-text-2)]">Banco</label>
                <input
                  type="text"
                  value={clabeForm.bank_name}
                  onChange={e => setClabeForm(f => ({ ...f, bank_name: e.target.value.toUpperCase() }))}
                  placeholder="BBVA / BANORTE / BANAMEX ..."
                  className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--d-text-2)]">CLABE (18 dígitos) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={18}
                  value={clabeForm.bank_clabe}
                  onChange={e => setClabeForm(f => ({ ...f, bank_clabe: e.target.value.replace(/\D/g, "").slice(0, 18) }))}
                  placeholder="012914001234567890"
                  className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm font-mono outline-none focus:border-aria-accent"
                />
                <p className="mt-1 text-[10px] text-[var(--d-faint)]">{clabeForm.bank_clabe.length}/18</p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--d-text-2)]">Número de cuenta (opcional)</label>
                <input
                  type="text"
                  value={clabeForm.bank_account_number}
                  onChange={e => setClabeForm(f => ({ ...f, bank_account_number: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--d-text-2)]">Titular / Razón social (opcional)</label>
                <input
                  type="text"
                  value={clabeForm.nombre_cuenta}
                  onChange={e => setClabeForm(f => ({ ...f, nombre_cuenta: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-aria-accent"
                />
              </div>
              {clabeError && (
                <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                  {clabeError}
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowClabeModal(false); setSelectedProveedor(null); setProveedorSearch(""); }}
                disabled={clabeSaving}
                className="rounded-full border border-[var(--d-border)] bg-transparent px-4 py-2 text-sm text-[var(--d-text-2)] hover:bg-[var(--d-hover)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarClabeSupplier}
                disabled={clabeSaving || clabeForm.bank_clabe.length !== 18}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clabeSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : "Guardar y continuar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
