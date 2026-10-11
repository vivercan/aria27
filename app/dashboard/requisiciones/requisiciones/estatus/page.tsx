"use client";
import { IcoCamion } from "@/components/domenica/IconosObra";
import Link from "next/link";
import { Printer, FileDown, Send, Loader2, Trash2, Pencil, Copy } from "lucide-react";
import RequisicionEditModal from "@/components/RequisicionEditModal";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ListToolbar from "@/components/ListToolbar";
import { useListFilter } from "@/hooks/useListFilter";
import RequiStepper from "@/components/RequiStepper";
import { statusLabel, accionPara, queSigue, ACCION_TXT, meToca } from "@/lib/requi-stepper";
import { supabase } from "@/lib/supabase";
import { handlePrint, handleDownloadPDF } from "@/components/RequisicionPrint";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";
import CotizacionesProveedor from "@/components/CotizacionesProveedor";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { fmtMoney, fmtDate } from "@/lib/formatters";

interface Requisition {
  id: string;
  folio: string;
  cost_center_name: string;
  status: string;
  created_by: string;
  user_email: string;
  solicitante_nombre_completo?: string;
  required_date: string;
  created_at: string;
  instructions?: string;
  categoria?: string;
  subcategoria?: string;
  proveedor?: string;
  nombre_cuenta?: string;
  banco?: string;
  numero_cuenta?: string;
  clabe_interbancaria?: string;
  forma_pago?: string;
  tipo_pago?: string;
  fecha_pago?: string;
  forma_entrega?: string;
  fecha_entrega?: string;
  uso?: string;
  notas?: string;
  subtotal?: number;
  iva_porcentaje?: number;
  iva_monto?: number;
  total?: number;
  monto?: number;
  motivo_solicitud?: string;
  descripcion_compra?: string;
  purchase_status?: string;
  tipo_solicitud?: string;
  responsable_email?: string;
  responsable_autorizo_at?: string;
  responsable_autorizo_by?: string;
  authorized_at?: string;
  authorized_by?: string;
  comprobante_pago_url?: string;
  recibio?: string;
}

interface ReqItem {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  comments?: string;
  selected_price?: number;
  precio_unitario?: number;
  precio_total?: number;
}

/** 11-Oct-2026: color del punto de estado en la lista del celular */
const COLOR_ESTADO: Record<string, string> = { PENDIENTE_RESPONSABLE: "#7e3bdd", PENDIENTE: "#b85507", EN_COTIZACION: "#b85507", EN_AUTORIZACION: "#7e3bdd", APROBADA: "#0073ea", OC_GENERADA: "#0073ea", PAGADA: "#0077ad", ENTREGA_PARCIAL: "#0077ad", ENTREGADA: "#3cde01", RECHAZADA_RESPONSABLE: "#d0304a", RECHAZADA_DIRECCION: "#d0304a", CANCELADA: "#64748b" };

export default function RequisicionesStatusPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [duplicando, setDuplicando] = useState(false);
  const [dupModal, setDupModal] = useState<Requisition | null>(null);
  async function handleDuplicar(req: Requisition, notify: boolean) {
    if (duplicando) return;
    setDuplicando(true);
    try {
      const actor = (typeof window !== "undefined" && (localStorage.getItem("userDisplayName") || localStorage.getItem("userEmail"))) || "sistema";
      const res = await fetch(`/api/requisicion/${req.id}/duplicar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notify, actor }) });
      const data = await res.json();
      if (!res.ok || !data.success) { flash("err", "No se pudo duplicar: " + (data.error || "")); return; }
      flash("ok", `Duplicada como ${data.folio}` + (notify ? " - avisada a Direccion y Compras" : ""));
      setDupModal(null);
      if (userEmail) loadData(userEmail);
    } catch {
      flash("err", "Error al duplicar");
    } finally {
      setDuplicando(false);
    }
  }
  const [requisiciones, setRequisiciones] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [nMovil, setNMovil] = useState(40); // celular: tarjetas por tandas
  const [tabMovil, setTabMovil] = useState<"" | "toca" | "mias" | "todas">("");
  const [qMovil, setQMovil] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "selected" | "all">("single");
  const [singleDeleteId, setSingleDeleteId] = useState<string>("");
  const [itemsCache, setItemsCache] = useState<Record<string, ReqItem[]>>({});
  const [loadingPrint, setLoadingPrint] = useState<string | null>(null);
  const [nombresPorEmail, setNombresPorEmail] = useState<Record<string, string>>({});
  // PR 30-Abr: modal avisar pago
  const [avisarPago, setAvisarPago] = useState<Requisition | null>(null);
  const [pagoPhone, setPagoPhone] = useState<string>("");
  const [pagoEmail, setPagoEmail] = useState<string>("");
  const [enviandoPago, setEnviandoPago] = useState(false);
  const [detailReq, setDetailReq] = useState<Requisition | null>(null);
  const [editReq, setEditReq] = useState<Requisition | null>(null);
  // F2: autorizar/rechazar como responsable desde el detalle
  const [respAccion, setRespAccion] = useState<"" | "RECHAZAR">("");
  const [respComentario, setRespComentario] = useState("");
  const [respSaving, setRespSaving] = useState(false);
  const STATUS_BLOQUEADOS_EDIT = ["AUTORIZADA", "OC_GENERADA", "CANCELADA"];
  const [detailItems, setDetailItems] = useState<ReqItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Solo RH puede eliminar
  const canDelete = userRole === "rh" || userRole === "admin";
  const isAdmin = userRole === "admin" || userRole === "rh";
  const isCompras = userRole === "compras";

  // ── FASE 0 ARIA27 Campo: busqueda + chips + obra + "Mis pendientes" (10-Oct-2026) ──
  const STATUS_LABEL: Record<string, string> = {
    PENDIENTE: "Pendiente", EN_AUTORIZACION: "En autorización", APROBADA: "Aprobada",
    OC_GENERADA: "OC generada", RECHAZADA_DIRECCION: "Rechazada", CANCELADA: "Cancelada",
  };
  const esMiPendiente = useCallback((r: Requisition): boolean => {
    const st = r.status, ps = r.purchase_status || "";
    const abierta = st === "PENDIENTE" || st === "EN_AUTORIZACION" || st === "EN_COTIZACION" || st === "PENDIENTE_RESPONSABLE";
    if (st === "PENDIENTE_RESPONSABLE" && (r.responsable_email || "").toLowerCase() === userEmail.toLowerCase()) return true;
    switch (userRole) {
      case "compras":   return st === "PENDIENTE" && ps !== "GASTO_EFECTIVO_PENDIENTE";
      case "direccion": return st === "EN_AUTORIZACION";
      case "usuario":   return ps === "GASTO_EFECTIVO_PENDIENTE" && abierta;   // caja / administración paga
      case "admin":
      case "rh":        return abierta;
      default:          return abierta && (r.user_email || "").toLowerCase() === userEmail.toLowerCase(); // creador esperando respuesta
    }
  }, [userRole, userEmail]);
  const chipsDef = useMemo(() => [
    { key: "", label: "Todas" },
    { key: "mis_pendientes", label: "Mis pendientes" },
    { key: "PENDIENTE", label: "Pendiente" },
    { key: "EN_AUTORIZACION", label: "En autorización" },
    { key: "PENDIENTE_RESPONSABLE", label: "Esperando responsable" },
    { key: "APROBADA", label: "Aprobada" },
  ], []);
  const chipPredicates = useMemo(() => ({ mis_pendientes: esMiPendiente }), [esMiPendiente]);
  const searchFields = useCallback((r: Requisition) => [
    r.folio, r.cost_center_name, r.created_by, r.solicitante_nombre_completo, nombresPorEmail[(r.user_email || "").toLowerCase()],
    r.proveedor, r.motivo_solicitud, r.descripcion_compra, r.subcategoria, r.categoria, STATUS_LABEL[r.status] || r.status,
  ], [nombresPorEmail]); // eslint-disable-line react-hooks/exhaustive-deps
  const chipOf = useCallback((r: Requisition) => r.status || null, []);
  const selectsDef = useMemo(() => ({ obra: { label: "Obra", pick: (r: Requisition) => r.cost_center_name || null } }), []);
  const lf = useListFilter<Requisition>({
    items: requisiciones, storageKey: "aria:filtro:requis-estatus",
    searchFields, chips: chipsDef, chipOf, chipPredicates, selects: selectsDef,
  });
  const visibles = lf.filtered;
  // Celular: Me toca / Las mías / Todas (sin chips ni filtros técnicos)
  const puedeVerTodas = ["admin", "rh", "direccion", "validador", "compras"].includes(userRole);
  const cuentaMovil = useMemo(() => ({
    toca: requisiciones.filter(r => meToca(r, userRole, userEmail)).length,
    mias: requisiciones.filter(r => (r.user_email || "").toLowerCase() === userEmail.toLowerCase()).length,
    todas: requisiciones.length,
  }), [requisiciones, userRole, userEmail]);
  const tabActiva = tabMovil || (cuentaMovil.toca > 0 ? "toca" : cuentaMovil.mias > 0 || !puedeVerTodas ? "mias" : "todas");
  const listaMovil = useMemo(() => {
    const n = qMovil.trim().toLowerCase();
    return requisiciones.filter(r => {
      if (tabActiva === "toca" && !meToca(r, userRole, userEmail)) return false;
      if (tabActiva === "mias" && (r.user_email || "").toLowerCase() !== userEmail.toLowerCase()) return false;
      if (tabActiva === "todas" && !puedeVerTodas) return false;
      return !n || `${r.folio} ${r.cost_center_name || ""} ${r.proveedor || ""} ${nombresPorEmail[(r.user_email || "").toLowerCase()] || ""}`.toLowerCase().includes(n);
    });
  }, [requisiciones, tabActiva, qMovil, userRole, userEmail, puedeVerTodas, nombresPorEmail]);
  // F4: llegar desde Campo con ?chip=mis_pendientes o ?open=<id>
  const sp = useSearchParams();
  useEffect(() => {
    const chip = sp.get("chip"); if (chip) lf.setChip(chip);
    const tab = sp.get("tab"); if (tab === "toca" || tab === "mias" || tab === "todas") setTabMovil(tab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);
  useEffect(() => {
    const open = sp.get("open"); if (!open || loading) return;
    const r = requisiciones.find(x => x.id === open); if (r) openDetail(r);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, loading, requisiciones]);

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "";
    setUserEmail(email);
    loadUserRole(email);
    loadData(email);
  }, []);

  async function loadUserRole(email: string) {
    const { data } = await supabase.from("Users").select("role").eq("email", email).single();
    if (data) setUserRole(data.role || "user");
  }

  async function loadData(email: string) {
    setLoading(true);

    let query = supabase
      .from("Requisiciones")
      .select("*")
      .order("created_at", { ascending: false });
    // Admin, compras, RH, Dirección y Superintendencia ven todas; los demás las suyas y las de las obras donde son responsables
    // (11-Oct-2026: antes Dirección/Superintendencia/responsables no veían lo que les toca autorizar)
    const { data: uData } = await supabase.from("Users").select("role").eq("email", email).single();
    const uRole = uData?.role || "user";
    if (!["admin", "compras", "rh", "direccion", "validador"].includes(uRole)) {
      query = query.or(`user_email.eq.${email},responsable_email.eq.${email}`);
    }

    const { data } = await query;
    setRequisiciones((data || []) as Requisition[]);

    // 04-Jun-2026 — batch lookup nombres completos por email
    const emailsUnicos = Array.from(
      new Set(((data || []) as Requisition[]).map((r) => r.user_email).filter(Boolean))
    );
    if (emailsUnicos.length > 0) {
      try {
        const rNombres = await fetch("/api/employees/by-emails", {
          credentials: "include", method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: emailsUnicos }),
          cache: "no-store",
        });
        const dNombres = await rNombres.json();
        if (dNombres?.map) setNombresPorEmail(dNombres.map as Record<string, string>);
      } catch {}
    }
    setLoading(false);
  }

  async function loadItemsForPrint(reqId: string): Promise<ReqItem[]> {
    // 04-Jun-2026 — NO cachear: si la req se edito en otra pestaña/modal,
    // el cache devuelve items viejos sin precios nuevos. Siempre fresh desde BD.
    const { data } = await supabase
      .from("requisition_items")
      .select("id, product_name, unit, quantity, comments, selected_price")
      .eq("requisition_id", reqId);
    const items = (data || []).map((i: ReqItem) => ({
      ...i,
      precio_unitario: i.selected_price ?? undefined,
      precio_total: i.selected_price != null ? i.selected_price * i.quantity : undefined,
    })) as ReqItem[];
    return items;
  }

  async function openDetail(req: Requisition) {
    setDetailReq(req);
    setLoadingDetail(true);
    const items = await loadItemsForPrint(req.id);
    setDetailItems(items);
    setLoadingDetail(false);
  }

  // 04-Jun-2026 — nombre legal completo en imprimibles
  async function resolverSolicitanteCompleto(req: Requisition): Promise<string> {
    if (req.solicitante_nombre_completo && req.solicitante_nombre_completo.trim()) {
      return req.solicitante_nombre_completo;
    }
    if (req.user_email) {
      try {
        const r = await fetch(`/api/employees/by-email?email=${encodeURIComponent(req.user_email)}`, { credentials: "include", cache: "no-store" });
        const d = await r.json();
        if (d?.full_name) return d.full_name as string;
      } catch {}
    }
    return req.created_by || "";
  }

  async function handlePrintClick(req: Requisition) {
    setLoadingPrint(req.id);
    const items = await loadItemsForPrint(req.id);
    const solicitanteResuelto = await resolverSolicitanteCompleto(req);
    handlePrint({
      folio: req.folio,
      fechaCreacion: req.created_at,
      fechaRequerida: req.required_date,
      solicitante: solicitanteResuelto,
      obra: req.cost_center_name,
      materiales: items.map((i) => ({
        name: i.product_name,
        unit: i.unit,
        quantity: i.quantity,
        precio_unitario: i.precio_unitario,
        precio_total: i.precio_total,
        comments: i.comments,
      })),
      comentarios: req.instructions,
      status: req.status,
      categoria: req.categoria,
      subcategoria: req.subcategoria,
      proveedor: { nombre: req.proveedor, banco: req.banco, numero_cuenta: req.numero_cuenta, clabe: req.clabe_interbancaria, nombre_cuenta: req.nombre_cuenta },
      forma_pago: req.forma_pago,
      tipo_pago: req.tipo_pago,
      fecha_pago: req.fecha_pago,
      forma_entrega: req.forma_entrega,
      fecha_entrega: req.fecha_entrega,
      uso: req.uso,
      notas: req.notas,
      subtotal: req.subtotal,
      iva_porcentaje: req.iva_porcentaje,
      iva_monto: req.iva_monto,
      total: req.monto || req.total,
    });
    setLoadingPrint(null);
  }

  async function handlePDFClick(req: Requisition) {
    setLoadingPrint(req.id);
    const items = await loadItemsForPrint(req.id);
    const solicitanteResuelto = await resolverSolicitanteCompleto(req);
    handleDownloadPDF({
      folio: req.folio,
      fechaCreacion: req.created_at,
      fechaRequerida: req.required_date,
      solicitante: solicitanteResuelto,
      obra: req.cost_center_name,
      materiales: items.map((i) => ({
        name: i.product_name,
        unit: i.unit,
        quantity: i.quantity,
        precio_unitario: i.precio_unitario,
        precio_total: i.precio_total,
        comments: i.comments,
      })),
      comentarios: req.instructions,
      status: req.status,
      categoria: req.categoria,
      subcategoria: req.subcategoria,
      proveedor: { nombre: req.proveedor, banco: req.banco, numero_cuenta: req.numero_cuenta, clabe: req.clabe_interbancaria, nombre_cuenta: req.nombre_cuenta },
      forma_pago: req.forma_pago,
      tipo_pago: req.tipo_pago,
      fecha_pago: req.fecha_pago,
      forma_entrega: req.forma_entrega,
      fecha_entrega: req.fecha_entrega,
      uso: req.uso,
      notas: req.notas,
      subtotal: req.subtotal,
      iva_porcentaje: req.iva_porcentaje,
      iva_monto: req.iva_monto,
      total: req.monto || req.total,
    });
    setLoadingPrint(null);
  }

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? visibles.map((r) => r.id) : []);
  }

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds(checked ? [...selectedIds, id] : selectedIds.filter((i) => i !== id));
  }

  function openDeleteModal(type: "single" | "selected" | "all", singleId?: string) {
    setDeleteType(type);
    setSingleDeleteId(singleId || "");
    setDeleteConfirmation("");
    setShowDeleteModal(true);
  }

  function getDeleteCount(): number {
    if (deleteType === "single") return 1;
    if (deleteType === "selected") return selectedIds.length;
    return requisiciones.length;
  }

  async function handleDelete() {
    if (deleteConfirmation !== "Borrar") return;
    setDeleting(true);
    let idsToDelete: string[] = [];
    if (deleteType === "single") idsToDelete = [singleDeleteId];
    else if (deleteType === "selected") idsToDelete = selectedIds;
    else if (deleteType === "all") idsToDelete = requisiciones.map((r) => r.id);

    try {
      const res = await fetch("/api/requisicion/delete", {
        credentials: "include", method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisitionIds: idsToDelete, userEmail, confirmation: "Borrar" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowDeleteModal(false);
        setSelectedIds([]);
        loadData(userEmail);
      } else {
        flash("err", "Error: " + data.error);
      }
    } catch {
      flash("err", "Error al eliminar");
    }
    setDeleting(false);
  }

  const getStatusColor = (status: string) => {
    if (status?.includes("FINALIZADA")) return "aria-badge aria-badge-oc";
    if (status?.includes("APROBADA") || status?.includes("AUTORIZADA")) return "aria-badge aria-badge-autorizada";
    if (status === "PENDIENTE_RESPONSABLE") return "aria-badge aria-badge-en-autorizacion";
    if (status === "ENTREGADA" || status === "PAGADA") return "aria-badge aria-badge-oc";
    if (status?.includes("PENDIENTE")) return "aria-badge aria-badge-pendiente";
    if (status?.includes("RECHAZADA") || status?.includes("CANCELADA")) return "aria-badge aria-badge-rechazada";
    if (status?.includes("COTIZA")) return "aria-badge aria-badge-en-autorizacion";
    return "bg-slate-500/20 text-[var(--d-muted)]";
  };

  async function resolverResponsable(action: "AUTORIZAR" | "RECHAZAR") {
    if (!detailReq) return;
    setRespSaving(true);
    try {
      const res = await fetch("/api/requisicion/autorizar-responsable", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: detailReq.id, action, comentario: respComentario }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { flash("err", j.error || `Error ${res.status}`); return; }
      flash("ok", action === "AUTORIZAR" ? `${detailReq.folio} autorizada. Sigue a ${j.flujo === "direccion" ? "Dirección" : "Compras"}.` : `${detailReq.folio} rechazada.`);
      setDetailReq(null); setRespAccion(""); setRespComentario("");
      if (userEmail) loadData(userEmail);
    } catch (e) { flash("err", (e as Error).message); }
    finally { setRespSaving(false); }
  }

  // CV 18-Abr: formatDate/formatCurrency migrados a fmtDate/fmtMoney canon
  const formatDate = (date: string) => fmtDate(date);

  const formatCurrency = (value?: number) => (value ? fmtMoney(value) : "-");

  return (
    <div className="aria-page-canon">
      <FlashBanner msg={msg} className="mx-0 mb-2" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AriaBackButton href="/dashboard/requisiciones/requisiciones" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--d-text)]"><span className="md:hidden">Solicitudes</span><span className="hidden md:inline">Estatus de Requisiciones</span></h1>
            <p className="hidden md:block text-[var(--d-faint)] text-sm">{lf.isActive ? `${visibles.length} de ${requisiciones.length}` : requisiciones.length} requisiciones</p>
          </div>
        </div>

        {/* Botón eliminar todas — solo RH */}
        {canDelete && requisiciones.length > 0 && selectedIds.length === 0 && !lf.isActive && (
          <div className="hidden md:block">
          <button
            onClick={() => openDeleteModal("all")}
            className="aria-btn aria-btn-danger"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar todas
          </button>
          </div>
        )}
      </div>

      {/* Barra de selección — solo RH */}
      {canDelete && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--d-card)] border border-[var(--d-border)]">
          <span className="text-sm text-red-300">{selectedIds.length} seleccionada{selectedIds.length > 1 ? "s" : ""}</span>
          <button
            onClick={() => openDeleteModal("selected")}
            className="px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar seleccionadas
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="px-4 py-1.5 rounded-lg bg-[var(--d-sunken)] text-[var(--d-text-2)] text-sm hover:bg-[var(--d-hover)] transition"
          >
            Cancelar selección
          </button>
        </div>
      )}

      {!loading && (
        <div className="hidden md:block"><ListToolbar
          search={lf.search} onSearch={lf.setSearch}
          placeholder="Buscar folio, obra, proveedor, concepto…"
          chips={chipsDef} chip={lf.chip} onChip={lf.setChip} counts={lf.counts}
          selects={[{ key: "obra", label: "Obra", options: lf.selectOptions.obra || [], value: lf.selects.obra || "" }]}
          onSelect={lf.setSelect}
          shown={visibles.length} total={requisiciones.length}
          isActive={lf.isActive} onClear={lf.clear}
        /></div>
      )}

      {loading ? (
        <><div className="md:hidden"><Esqueleto filas={5} alto={92} /></div><div className="hidden md:block text-center py-10">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-aria-accent" />
        </div></>
      ) : (
        <>
        {/* Celular: 3 pestañas claras (Doménica 27) */}
        <div className="md:hidden pb-28">
          <div className="grid gap-1 rounded-2xl bg-[var(--d-card-2)] p-1" style={{ gridTemplateColumns: `repeat(${puedeVerTodas ? 3 : 2}, minmax(0, 1fr))` }}>
            {([["toca", "Me toca", cuentaMovil.toca], ["mias", "Las mías", cuentaMovil.mias], ...(puedeVerTodas ? [["todas", "Todas", cuentaMovil.todas]] : [])] as [string, string, number][]).map(([k, l, n]) => (
              <button key={k} type="button" onClick={() => { setTabMovil(k as "toca"); setNMovil(40); }} className={`rounded-xl py-2.5 text-[13px] font-bold transition ${tabActiva === k ? "bg-[var(--d-surface)] text-[var(--d-text)] shadow-[var(--d-shadow)]" : "text-[var(--d-muted)]"}`}>
                {l} <span className={`ml-0.5 rounded-full px-1.5 text-[11px] ${tabActiva === k && k === "toca" && n > 0 ? "bg-[#b85507] text-white" : "bg-[var(--d-card)] text-[var(--d-muted)]"}`}>{n}</span>
              </button>))}
          </div>
          <input value={qMovil} onChange={e => setQMovil(e.target.value)} placeholder="Buscar folio, obra o proveedor…" className="mt-3 w-full rounded-xl border border-[var(--d-border)] bg-[var(--d-input)] px-3.5 py-2.5 text-sm text-[var(--d-text)]" />
          <div className="mt-3 space-y-2">
            {listaMovil.slice(0, nMovil).map(req => { const acc = accionPara(req, userRole, userEmail); const toca = meToca(req, userRole, userEmail); return (
              <button key={req.id} type="button" onClick={() => openDetail(req)} className={`dom-card w-full text-left rounded-2xl p-3.5 active:scale-[0.99] transition ${toca ? "ring-2 ring-[#b85507]" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="text-[15px] font-bold text-[var(--d-text)] truncate">{req.cost_center_name || "Sin obra"}</div>
                    <div className="text-[12px] text-[var(--d-muted)] truncate">{req.proveedor || (nombresPorEmail[(req.user_email || "").toLowerCase()] || req.created_by || "")}</div></div>
                  <div className="shrink-0 text-right"><div className="text-[15px] font-bold text-[var(--d-text)]">{formatCurrency(req.monto || req.total)}</div><div className="text-[11px] font-semibold text-[var(--d-faint)]">{String(req.folio || "").replace(/^REQ-\d{4}-/, "#")}</div></div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {toca && acc ? <span className="shrink-0 rounded-full bg-[#b85507] px-2.5 py-1 text-[11px] font-bold text-white">Te toca: {ACCION_TXT[acc]}</span>
                    : <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--d-text-2)] truncate"><i className="shrink-0 inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLOR_ESTADO[req.status] || "#64748b" }} />{queSigue(req.status)}</span>}
                </div>
              </button>); })}
            {listaMovil.length > nMovil && <button type="button" onClick={() => setNMovil(n => n + 40)} className="w-full rounded-2xl py-3 text-sm font-semibold text-aria-accent dom-card">Ver más ({listaMovil.length - nMovil})</button>}
            {listaMovil.length === 0 && (qMovil ? <Vacio dibujo="buscar" titulo="No encontramos nada" texto={`Nada coincide con “${qMovil}”.`} accion={{ label: "Borrar búsqueda", onClick: () => setQMovil("") }} />
              : tabActiva === "toca" ? <Vacio dibujo="listo" titulo="Nada te toca" texto="Cuando algo necesite tu autorización o pago, aparece aquí." />
              : <Vacio dibujo="caja" titulo="Aún no pides nada" texto="Usa el botón + de abajo para pedir material." />)}
          </div>
        </div>
        <div className="hidden md:flex rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] overflow-hidden flex-col" style={{maxHeight:"calc(100vh - 220px)"}}>
          <div className="overflow-auto flex-1">
            <table className="w-full">
              <thead className="bg-[var(--d-card)] sticky top-0">
                <tr className="text-left text-[var(--d-muted)] text-xs">
                  {canDelete && (
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        checked={selectedIds.length === visibles.length && visibles.length > 0}
                        className="rounded"
                      />
                    </th>
                  )}
                  <th className="p-3">Folio</th>
                  <th className="p-3">Obra</th>
                  <th className="p-3">Solicitante</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">F. Requerida</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 w-32 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((req) => (
                  <tr key={req.id} className="border-t border-[var(--d-border)] hover:bg-[var(--d-hover)]">
                    {canDelete && (
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(req.id)}
                          onChange={(e) => handleSelect(req.id, e.target.checked)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="p-3">
                      <button onClick={() => openDetail(req)} className="font-mono text-aria-accent text-sm hover:text-aria-accent hover:underline transition">{req.folio}</button>
                    </td>
                    <td className="p-3 text-[var(--d-text)] text-sm">{req.cost_center_name}</td>
                    <td className="p-3 text-[var(--d-text-2)] text-sm">{nombresPorEmail[(req.user_email || "").toLowerCase()] || req.created_by}</td>
                    <td className="p-3 text-[var(--d-text-2)] text-sm" title={req.proveedor || ""}>{req.proveedor ? <span className="block max-w-[220px] truncate">{req.proveedor}</span> : <span className="text-[var(--d-faint)]">—</span>}</td>
                    <td className="p-3 text-[var(--d-text-2)] text-sm">{formatDate(req.required_date)}</td>
                    <td className="p-3 text-aria-accent text-sm font-medium">{formatCurrency(req.monto || req.total)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Editar — solo si NO está bloqueada (AUTORIZADA / OC_GENERADA / CANCELADA) */}
                        {!["AUTORIZADA","OC_GENERADA","CANCELADA"].includes(req.status) && (
                          <button
                            onClick={() => setEditReq(req)}
                            className="p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 transition-all"
                            title="Editar requisición"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {/* Imprimir */}
                        <button
                          onClick={() => handlePrintClick(req)}
                          disabled={loadingPrint === req.id}
                          className="p-2 rounded-lg bg-[var(--d-card)] hover:bg-aria-accent-bg text-[var(--d-muted)] hover:text-aria-accent transition-all disabled:opacity-50"
                          title="Imprimir"
                        >
                          {loadingPrint === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Printer className="w-4 h-4" />
                          )}
                        </button>
                        {/* PDF */}
                        <button
                          onClick={() => handlePDFClick(req)}
                          disabled={loadingPrint === req.id}
                          className="aria-btn aria-btn-pdf"
                          title="Descargar PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        {/* PR 30-Abr: Avisar pago a tesoreria — visible solo si autorizada */}
                        {(req.status === "APROBADA" || req.status === "OC_GENERADA" || req.status === "AUTORIZADA") && (
                          <button
                            onClick={() => setAvisarPago(req)}
                            className="p-2 rounded-lg bg-[var(--d-card)] hover:bg-amber-500/20 text-[var(--d-muted)] hover:text-amber-300 transition-all"
                            title="Avisar pago"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {/* Eliminar individual — solo RH */}
                        {canDelete && (
                          <button
                            onClick={() => openDeleteModal("single", req.id)}
                            className="aria-btn aria-btn-danger"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibles.length === 0 && (
              <div className="py-12 text-center text-sm text-[var(--d-muted)]">
                {requisiciones.length === 0 ? "No hay requisiciones." : (
                  <>Nada coincide{lf.search ? <> con <span className="text-[var(--d-text)]">“{lf.search}”</span></> : ""}. <button type="button" onClick={lf.clear} className="btn-flat aria-no-min-tap underline text-aria-accent hover:text-[var(--d-text)]">Limpiar filtros</button></>
                )}
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Modal Detalle */}
      {detailReq && (
        <div className="aria-sheet fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4" onClick={() => setDetailReq(null)}>
          <div className="bg-[var(--d-surface)] md:bg-[var(--d-bg)] rounded-t-[28px] md:rounded-2xl border border-[var(--d-border)] w-full max-w-2xl max-h-[92vh] md:max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--d-border)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--d-text)]">{detailReq.folio}</h3>
                <p className="text-[var(--d-muted)] text-sm">{detailReq.cost_center_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold text-white ${detailReq.status === "ENTREGADA" ? "sobre-verde" : ""}`} style={{ background: COLOR_ESTADO[detailReq.status] || "#64748b" }}>{statusLabel(detailReq.status).toUpperCase()}</span>
                <button onClick={() => setDetailReq(null)} aria-label="Cerrar" className="w-10 h-10 -mr-1 inline-flex items-center justify-center rounded-xl hover:bg-[var(--d-hover)] text-[var(--d-muted)] hover:text-[var(--d-text)] transition"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
              </div>
            </div>
            <div className="p-4 md:p-5 overflow-y-auto flex-1 md:max-h-[calc(85vh-140px)] space-y-3 md:space-y-4">
              <div className="rounded-xl bg-[var(--d-card)] border border-[var(--d-border)] px-2 py-2"><RequiStepper req={detailReq} /></div>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div className="p-3 rounded-xl bg-[var(--d-card)]"><p className="text-[11px] uppercase text-[var(--d-faint)] mb-1">Solicitante</p><p className="text-sm text-[var(--d-text)]">{nombresPorEmail[(detailReq.user_email || "").toLowerCase()] || detailReq.created_by}</p></div>
                <div className="p-3 rounded-xl bg-[var(--d-card)]"><p className="text-[11px] uppercase text-[var(--d-faint)] mb-1">Fecha Requerida</p><p className="text-sm text-[var(--d-text)]">{formatDate(detailReq.required_date)}</p></div>
                <div className="p-3 rounded-xl bg-[var(--d-card)]"><p className="text-[11px] uppercase text-[var(--d-faint)] mb-1">Fecha Creación</p><p className="text-sm text-[var(--d-text)]">{formatDate(detailReq.created_at)}</p></div>
                <div className="p-3 rounded-xl bg-[var(--d-card)]"><p className="text-[11px] uppercase text-[var(--d-faint)] mb-1">Total</p><p className="text-[17px] font-bold text-[var(--d-text)]">{formatCurrency(detailReq.monto || detailReq.total)}</p></div>
              </div>
              {detailReq.instructions && (
                <div className="p-3 rounded-xl bg-[var(--d-card)]"><p className="text-[11px] uppercase text-[var(--d-faint)] mb-1">Instrucciones</p><p className="text-sm text-[var(--d-text-2)]">{detailReq.instructions}</p></div>
              )}
              <div>
                <p className="text-xs font-medium text-[var(--d-muted)] mb-2">MATERIALES</p>
                {loadingDetail ? (
                  <div className="text-center py-4"><Loader2 className="w-5 h-5 mx-auto animate-spin text-aria-accent" /></div>
                ) : (
                  <>
                  {/* Celular: lista en lugar de tabla */}
                  <ul className="md:hidden rounded-xl border border-[var(--d-border)] divide-y divide-[var(--d-border)] bg-[var(--d-card)]">
                    {detailItems.map(item => (
                      <li key={item.id} className="px-3 py-2.5 flex items-start gap-3">
                        <span className="shrink-0 rounded-lg bg-[var(--d-card-2)] px-2 py-1 text-[12px] font-bold text-[var(--d-text)]">{item.quantity} {String(item.unit || "").toLowerCase()}</span>
                        <span className="flex-1 min-w-0 text-[14px] text-[var(--d-text)]">{item.product_name}</span>
                        {Number(item.precio_total) > 0 && <span className="shrink-0 text-[13px] font-semibold text-[var(--d-text)]">{formatCurrency(item.precio_total)}</span>}
                      </li>))}
                  </ul>
                  <div className="hidden md:block rounded-xl border border-[var(--d-border)] overflow-x-auto">
                    <table className="w-full min-w-[460px]">
                      <thead className="bg-[var(--d-card)]"><tr className="text-left text-[11px] text-[var(--d-faint)]"><th className="p-2.5">Material</th><th className="p-2.5 w-20">Unidad</th><th className="p-2.5 w-16 text-center">Cant.</th><th className="p-2.5 w-24 text-right">P. Unit.</th><th className="p-2.5 w-24 text-right">Total</th></tr></thead>
                      <tbody>
                        {detailItems.map((item) => (
                          <tr key={item.id} className="border-t border-[var(--d-border)] text-sm">
                            <td className="p-2.5 text-[var(--d-text)]">{item.product_name}</td>
                            <td className="p-2.5 text-[var(--d-muted)]">{item.unit}</td>
                            <td className="p-2.5 text-center text-[var(--d-text)]">{item.quantity}</td>
                            <td className="p-2.5 text-right text-[var(--d-muted)]">{formatCurrency(item.precio_unitario)}</td>
                            <td className="p-2.5 text-right text-aria-accent font-medium">{formatCurrency(item.precio_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
                <CotizacionesProveedor reqId={detailReq.id} puedePedir={["admin", "compras", "rh", "direccion", "validador"].includes(userRole)} />
              </div>
            </div>
            {accionPara(detailReq, userRole, userEmail) === "AUTORIZAR_RESPONSABLE" && (
              <div className="px-4 pt-3 border-t border-amber-500/30 bg-amber-500/[0.06]">
                <p className="text-xs text-amber-200 mb-2">Esta requisición espera tu autorización como responsable de la obra.</p>
                {respAccion === "RECHAZAR" ? (
                  <div className="space-y-2 pb-3">
                    <textarea value={respComentario} onChange={e => setRespComentario(e.target.value)} placeholder="Motivo del rechazo (obligatorio)" rows={2} className="w-full rounded-lg border border-[var(--d-border)] bg-[var(--d-input)] px-3 py-2 text-sm outline-none focus:border-red-400" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setRespAccion("")} className="btn-flat px-3 py-2 rounded-lg bg-[var(--d-sunken)] text-sm text-[var(--d-text-2)]">Cancelar</button>
                      <button disabled={respSaving || !respComentario.trim()} onClick={() => resolverResponsable("RECHAZAR")} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50">{respSaving ? "Enviando…" : "Confirmar rechazo"}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end pb-3">
                    <button onClick={() => setRespAccion("RECHAZAR")} className="btn-flat px-4 py-2 rounded-lg border border-red-500/40 text-red-300 text-sm hover:bg-red-500/10">Rechazar</button>
                    <button disabled={respSaving} onClick={() => resolverResponsable("AUTORIZAR")} className="px-5 py-2 rounded-lg bg-[#3cde01] text-white sobre-verde text-sm font-bold disabled:opacity-50">{respSaving ? "Autorizando…" : "Autorizar"}</button>
                  </div>
                )}
              </div>
            )}
            <div className="p-3 md:p-4 border-t border-[var(--d-border)] flex justify-end gap-2 flex-wrap" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
              {accionPara(detailReq, userRole, userEmail) === "REGISTRAR_ENTREGA" && (
                <Link href={`/dashboard/requisiciones/requisiciones/entrega/${detailReq.id}`} className="w-full md:w-auto justify-center px-4 py-3 md:py-2 rounded-xl md:rounded-lg bg-[#3cde01] text-white sobre-verde text-[15px] md:text-sm font-bold transition flex items-center gap-2"><IcoCamion className="w-5 h-5" color="#fff" fondo="#3cde01" />Registrar entrega</Link>
              )}
              {!STATUS_BLOQUEADOS_EDIT.includes(detailReq.status) && (
                <button onClick={() => { setEditReq(detailReq); setDetailReq(null); }} className="flex-1 md:flex-none justify-center px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg bg-[#b85507] text-white text-sm font-semibold transition flex items-center gap-2"><Pencil className="w-4 h-4" />Editar</button>
              )}
              <button onClick={() => { setDupModal(detailReq); setDetailReq(null); }} disabled={duplicando} className="flex-1 md:flex-none justify-center px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg bg-[#7e3bdd] text-white text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50">{duplicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}Duplicar</button>
              <button onClick={() => { handlePrintClick(detailReq); }} className="hidden md:flex px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium transition items-center gap-2"><Printer className="w-4 h-4" />Imprimir</button>
              <button onClick={() => { handlePDFClick(detailReq); }} className="flex-1 md:flex-none justify-center px-4 py-2.5 md:py-2 rounded-xl md:rounded-lg bg-[#0073ea] text-white text-sm font-semibold transition flex items-center gap-2"><FileDown className="w-4 h-4" />PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Duplicar — pregunta si avisar o no (23-Jul-2026) */}
      {dupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { if (!duplicando) setDupModal(null); }}>
          <div className="bg-[var(--d-bg)] rounded-2xl border border-[var(--d-border)] w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-indigo-500/20"><Copy className="w-5 h-5 text-indigo-300" /></div>
              <div>
                <h3 className="text-lg font-bold text-[var(--d-text)]">Duplicar {dupModal.folio}</h3>
                <p className="text-[var(--d-muted)] text-xs mt-0.5">Se crea una requisicion nueva con folio nuevo, en PENDIENTE, copiando obra, proveedor e items.</p>
              </div>
            </div>
            <p className="text-sm text-[var(--d-text-2)] mb-4">Al crearla, ¿quieres avisar a Direccion y Compras (WhatsApp + correo)?</p>
            <div className="flex flex-col gap-2">
              <button disabled={duplicando} onClick={() => handleDuplicar(dupModal, true)} className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">{duplicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Duplicar y avisar</button>
              <button disabled={duplicando} onClick={() => handleDuplicar(dupModal, false)} className="w-full py-2.5 rounded-lg bg-[var(--d-sunken)] hover:bg-[var(--d-hover)] text-[var(--d-text)] text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">{duplicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}Solo duplicar (sin avisar)</button>
              <button disabled={duplicando} onClick={() => setDupModal(null)} className="w-full py-2 rounded-lg text-[var(--d-muted)] text-sm hover:text-[var(--d-text)] disabled:opacity-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar requisicion (PR 7-may-2026) */}
      {editReq && (
        <RequisicionEditModal
          req={editReq as unknown as { id: string; folio: string; status: string }}
          onClose={() => setEditReq(null)}
          onSaved={() => { setEditReq(null); if (userEmail) loadData(userEmail); }}
        />
      )}

      {/* Modal Eliminar — confirmación con "Borrar" */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 ">
          <div className="bg-[var(--d-bg)] p-6 rounded-xl border border-red-500/30 w-[420px] shadow-2xl shadow-red-500/10">
            {/* Icono de advertencia */}
            <div className="flex items-center gap-3 mb-4">
              <div className="aria-btn aria-btn-danger">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--d-text)]">Eliminar Requisiciones</h3>
                <p className="text-red-400 text-xs font-medium">Acción irreversible</p>
              </div>
            </div>

            {/* Advertencia */}
            <div className="p-3 rounded-lg bg-[var(--d-card)] border border-[var(--d-border)] mb-4">
              <p className="text-sm text-red-300 font-medium mb-1">
                {deleteType === "single"
                  ? "Se eliminará 1 requisición"
                  : deleteType === "selected"
                  ? `Se eliminarán ${selectedIds.length} requisiciones seleccionadas`
                  : `Se eliminarán TODAS las ${requisiciones.length} requisiciones`}
              </p>
              <p className="text-xs text-red-400/80">
                Se eliminarán también todos los materiales, cotizaciones y órdenes de compra asociadas. Este proceso no tiene vuelta atrás.
              </p>
            </div>

            {/* Input de confirmación */}
            <p className="text-[var(--d-muted)] text-sm mb-2">
              Para confirmar, escribe <span className="text-[var(--d-text)] font-bold">Borrar</span> exactamente:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Borrar"
              className={`w-full px-4 py-2.5 rounded-lg border text-[var(--d-text)] text-center text-lg font-medium tracking-wider mb-4 focus:outline-none transition ${
                deleteConfirmation === "Borrar"
                  ? "bg-red-500/10 border-red-500/50 focus:border-red-500"
                  : "bg-[var(--d-card)] border-[var(--d-border)] focus:border-[var(--d-muted)]"
              }`}
              autoFocus
            />

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmation(""); }}
                className="flex-1 py-2.5 rounded-lg bg-[var(--d-sunken)] text-[var(--d-text)] text-sm font-medium hover:bg-[var(--d-hover)] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmation !== "Borrar" || deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar {getDeleteCount()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Avisar Pago */}
      {avisarPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setAvisarPago(null)}>
          <div className="bg-[var(--d-surface)] border border-amber-400/40 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-amber-300 text-xs font-bold tracking-wider uppercase">Avisar pago a tesoreria</p>
                <h3 className="text-[var(--d-text)] text-lg font-bold mt-1">{avisarPago.folio}</h3>
              </div>
              <button onClick={() => setAvisarPago(null)} aria-label="Cerrar" className="w-10 h-10 inline-flex items-center justify-center rounded-xl hover:bg-[var(--d-hover)] text-[var(--d-muted)]"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            </div>
            <div className="bg-[var(--d-input)] border border-[var(--d-border)] rounded-lg p-3 mb-4">
              <pre className="text-[var(--d-ok)] text-xs font-mono whitespace-pre-wrap leading-relaxed">{`REQ ${avisarPago.folio} ${(avisarPago.motivo_solicitud || avisarPago.descripcion_compra || "").toUpperCase()} ${avisarPago.cost_center_name || ""}
${avisarPago.proveedor || ""}
$${(Number(avisarPago.monto || avisarPago.total || 0)).toLocaleString("es-MX", {minimumFractionDigits: 2})}
${avisarPago.banco || ""}
${avisarPago.clabe_interbancaria || avisarPago.numero_cuenta || ""}`}</pre>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-[var(--d-muted)] uppercase tracking-wide font-semibold">WhatsApp destinatario (10 digitos)</label>
                <input type="tel" placeholder="4951234567" value={pagoPhone} onChange={e => setPagoPhone(e.target.value)} className="w-full px-3 py-2 bg-[var(--d-input)] border border-[var(--d-border)] rounded-lg text-[var(--d-text)] text-sm focus:border-amber-400 outline-none mt-1" />
              </div>
              <div>
                <label className="text-[11px] text-[var(--d-muted)] uppercase tracking-wide font-semibold">Email destinatario (opcional)</label>
                <input type="email" placeholder="nandito@gcuavante.com" value={pagoEmail} onChange={e => setPagoEmail(e.target.value)} className="w-full px-3 py-2 bg-[var(--d-input)] border border-[var(--d-border)] rounded-lg text-[var(--d-text)] text-sm focus:border-amber-400 outline-none mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                disabled={enviandoPago || (!pagoPhone && !pagoEmail)}
                onClick={async () => {
                  setEnviandoPago(true);
                  try {
                    const r = await fetch("/api/requisicion/avisar-pago", {
                      credentials: "include", method: "POST",
                      headers: { "Content-Type": "application/json"},
                      body: JSON.stringify({ folio: avisarPago.folio, phone: pagoPhone, email: pagoEmail }),
                    });
                    const j = await r.json();
                    if (r.ok) {
                      alert("✅ Aviso enviado: " + (j.result?.wa?.ok ? "WA OK " : "") + (j.result?.email?.ok ? "Email OK" : ""));
                      setAvisarPago(null); setPagoPhone(""); setPagoEmail("");
                    } else {
                      alert("Error: " + (j.error || r.status));
                    }
                  } catch (e) { alert("Error de red: " + (e as Error).message); }
                  finally { setEnviandoPago(false); }
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${(!pagoPhone && !pagoEmail) ? "bg-[var(--d-card)] text-[var(--d-faint)] cursor-not-allowed" : "bg-gradient-to-br from-amber-400 to-amber-600 text-black"}`}
              >
                {enviandoPago ? "Enviando..." : "Enviar aviso"}
              </button>
              <button onClick={() => setAvisarPago(null)} className="px-4 py-2.5 rounded-lg bg-[var(--d-card)] text-[var(--d-muted)] text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
