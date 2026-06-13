"use client";
import Link from "next/link";
import { Printer, FileDown, Send, Loader2, Trash2, Pencil } from "lucide-react";
import RequisicionEditModal from "@/components/RequisicionEditModal";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { handlePrint, handleDownloadPDF } from "@/components/RequisicionPrint";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";
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

export default function RequisicionesStatusPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [requisiciones, setRequisiciones] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
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
  const STATUS_BLOQUEADOS_EDIT = ["AUTORIZADA", "OC_GENERADA", "CANCELADA"];
  const [detailItems, setDetailItems] = useState<ReqItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Solo RH puede eliminar
  const canDelete = userRole === "rh" || userRole === "admin";
  const isAdmin = userRole === "admin" || userRole === "rh";
  const isCompras = userRole === "compras";

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
    // Admin y compras ven todas, los demas solo las suyas
    const { data: uData } = await supabase.from("Users").select("role").eq("email", email).single();
    const uRole = uData?.role || "user";
    if (uRole !== "admin" && uRole !== "compras" && uRole !== "rh") {
      query = query.eq("user_email", email);
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
          method: "POST",
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
        const r = await fetch(`/api/employees/by-email?email=${encodeURIComponent(req.user_email)}`, { cache: "no-store" });
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
    setSelectedIds(checked ? requisiciones.map((r) => r.id) : []);
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
        method: "POST",
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
    if (status?.includes("PENDIENTE")) return "aria-badge aria-badge-pendiente";
    if (status?.includes("RECHAZADA") || status?.includes("CANCELADA")) return "aria-badge aria-badge-rechazada";
    if (status?.includes("COTIZA")) return "aria-badge aria-badge-en-autorizacion";
    return "bg-slate-500/20 text-[#7f93b0]";
  };

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
            <h1 className="text-2xl font-bold text-white">Estatus de Requisiciones</h1>
            <p className="text-[#4a6080] text-sm">{requisiciones.length} requisiciones</p>
          </div>
        </div>

        {/* Botón eliminar todas — solo RH */}
        {canDelete && requisiciones.length > 0 && selectedIds.length === 0 && (
          <button
            onClick={() => openDeleteModal("all")}
            className="aria-btn aria-btn-danger"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar todas
          </button>
        )}
      </div>

      {/* Barra de selección — solo RH */}
      {canDelete && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.08]">
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
            className="px-4 py-1.5 rounded-lg bg-white/[0.06] text-[#c9d8ed] text-sm hover:bg-white/[0.1] transition"
          >
            Cancelar selección
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-aria-accent" />
        </div>
      ) : (
        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] overflow-hidden flex flex-col" style={{maxHeight:"calc(100vh - 220px)"}}>
          <div className="overflow-auto flex-1">
            <table className="w-full">
              <thead className="bg-white/[0.04] sticky top-0">
                <tr className="text-left text-[#7f93b0] text-xs">
                  {canDelete && (
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        checked={selectedIds.length === requisiciones.length && requisiciones.length > 0}
                        className="rounded"
                      />
                    </th>
                  )}
                  <th className="p-3">Folio</th>
                  <th className="p-3">Obra</th>
                  <th className="p-3">Solicitante</th>
                  <th className="p-3">F. Requerida</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 w-32 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requisiciones.map((req) => (
                  <tr key={req.id} className="border-t border-white/[0.05] hover:bg-white/[0.04]">
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
                    <td className="p-3 text-white text-sm">{req.cost_center_name}</td>
                    <td className="p-3 text-[#c9d8ed] text-sm">{nombresPorEmail[(req.user_email || "").toLowerCase()] || req.created_by}</td>
                    <td className="p-3 text-[#c9d8ed] text-sm">{formatDate(req.required_date)}</td>
                    <td className="p-3 text-aria-accent text-sm font-medium">{formatCurrency(req.monto || req.total)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(req.status)}`}>
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
                          className="p-2 rounded-lg bg-white/[0.04] hover:bg-aria-accent-bg text-[#7f93b0] hover:text-aria-accent transition-all disabled:opacity-50"
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
                            className="p-2 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-[#7f93b0] hover:text-amber-300 transition-all"
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
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {detailReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetailReq(null)}>
          <div className="bg-aria-bg rounded-2xl border border-white/[0.08] w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold text-white">{detailReq.folio}</h3>
                <p className="text-[#7f93b0] text-sm">{detailReq.cost_center_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusColor(detailReq.status)}`}>{detailReq.status}</span>
                <button onClick={() => setDetailReq(null)} className="p-2 rounded-lg hover:bg-white/[0.06] text-[#7f93b0] hover:text-white transition">✕</button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-140px)] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-white/[0.04]"><p className="text-[10px] uppercase text-[#4a6080] mb-1">Solicitante</p><p className="text-sm text-white">{nombresPorEmail[(detailReq.user_email || "").toLowerCase()] || detailReq.created_by}</p></div>
                <div className="p-3 rounded-xl bg-white/[0.04]"><p className="text-[10px] uppercase text-[#4a6080] mb-1">Fecha Requerida</p><p className="text-sm text-white">{formatDate(detailReq.required_date)}</p></div>
                <div className="p-3 rounded-xl bg-white/[0.04]"><p className="text-[10px] uppercase text-[#4a6080] mb-1">Fecha Creación</p><p className="text-sm text-white">{formatDate(detailReq.created_at)}</p></div>
                <div className="p-3 rounded-xl bg-white/[0.04]"><p className="text-[10px] uppercase text-[#4a6080] mb-1">Total</p><p className="text-sm text-aria-accent font-medium">{formatCurrency(detailReq.monto || detailReq.total)}</p></div>
              </div>
              {detailReq.instructions && (
                <div className="p-3 rounded-xl bg-white/[0.04]"><p className="text-[10px] uppercase text-[#4a6080] mb-1">Instrucciones</p><p className="text-sm text-[#c9d8ed]">{detailReq.instructions}</p></div>
              )}
              <div>
                <p className="text-xs font-medium text-[#7f93b0] mb-2">MATERIALES</p>
                {loadingDetail ? (
                  <div className="text-center py-4"><Loader2 className="w-5 h-5 mx-auto animate-spin text-aria-accent" /></div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-white/[0.04]"><tr className="text-left text-[11px] text-[#4a6080]"><th className="p-2.5">Material</th><th className="p-2.5 w-20">Unidad</th><th className="p-2.5 w-16 text-center">Cant.</th><th className="p-2.5 w-24 text-right">P. Unit.</th><th className="p-2.5 w-24 text-right">Total</th></tr></thead>
                      <tbody>
                        {detailItems.map((item) => (
                          <tr key={item.id} className="border-t border-white/[0.05] text-sm">
                            <td className="p-2.5 text-white">{item.product_name}</td>
                            <td className="p-2.5 text-[#7f93b0]">{item.unit}</td>
                            <td className="p-2.5 text-center text-white">{item.quantity}</td>
                            <td className="p-2.5 text-right text-[#7f93b0]">{formatCurrency(item.precio_unitario)}</td>
                            <td className="p-2.5 text-right text-aria-accent font-medium">{formatCurrency(item.precio_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-white/[0.08] flex justify-end gap-2">
              {!STATUS_BLOQUEADOS_EDIT.includes(detailReq.status) && (
                <button onClick={() => { setEditReq(detailReq); setDetailReq(null); }} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-medium transition flex items-center gap-2 shadow-md shadow-amber-500/30 ring-1 ring-amber-300/30"><Pencil className="w-4 h-4" />Editar</button>
              )}
              <button onClick={() => { handlePrintClick(detailReq); }} className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium transition flex items-center gap-2 shadow-md shadow-black/20 ring-1 ring-white/10"><Printer className="w-4 h-4" />Imprimir</button>
              <button onClick={() => { handlePDFClick(detailReq); }} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition flex items-center gap-2 shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300/30"><FileDown className="w-4 h-4" />PDF</button>
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
          <div className="bg-aria-bg p-6 rounded-xl border border-red-500/30 w-[420px] shadow-2xl shadow-red-500/10">
            {/* Icono de advertencia */}
            <div className="flex items-center gap-3 mb-4">
              <div className="aria-btn aria-btn-danger">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Eliminar Requisiciones</h3>
                <p className="text-red-400 text-xs font-medium">Acción irreversible</p>
              </div>
            </div>

            {/* Advertencia */}
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.08] mb-4">
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
            <p className="text-[#7f93b0] text-sm mb-2">
              Para confirmar, escribe <span className="text-white font-bold">Borrar</span> exactamente:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Borrar"
              className={`w-full px-4 py-2.5 rounded-lg border text-white text-center text-lg font-medium tracking-wider mb-4 focus:outline-none transition ${
                deleteConfirmation === "Borrar"
                  ? "bg-red-500/10 border-red-500/50 focus:border-red-500"
                  : "bg-white/[0.04] border-white/[0.08] focus:border-white/30"
              }`}
              autoFocus
            />

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmation(""); }}
                className="flex-1 py-2.5 rounded-lg bg-white/[0.06] text-white text-sm font-medium hover:bg-white/[0.1] transition"
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
          <div className="bg-[#0c1d38] border border-amber-400/40 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-amber-300 text-xs font-bold tracking-wider uppercase">📤 Avisar pago a tesoreria</p>
                <h3 className="text-white text-lg font-bold mt-1">{avisarPago.folio}</h3>
              </div>
              <button onClick={() => setAvisarPago(null)} className="p-2 rounded hover:bg-white/[0.06] text-[#7f93b0]">✕</button>
            </div>
            <div className="bg-black/30 border border-white/[0.08] rounded-lg p-3 mb-4">
              <pre className="text-[#bbf7d0] text-xs font-mono whitespace-pre-wrap leading-relaxed">{`REQ ${avisarPago.folio} ${(avisarPago.motivo_solicitud || avisarPago.descripcion_compra || "").toUpperCase()} ${avisarPago.cost_center_name || ""}
${avisarPago.proveedor || ""}
$${(Number(avisarPago.monto || avisarPago.total || 0)).toLocaleString("es-MX", {minimumFractionDigits: 2})}
${avisarPago.banco || ""}
${avisarPago.clabe_interbancaria || avisarPago.numero_cuenta || ""}`}</pre>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-[#7f93b0] uppercase tracking-wide font-semibold">WhatsApp destinatario (10 digitos)</label>
                <input type="tel" placeholder="4951234567" value={pagoPhone} onChange={e => setPagoPhone(e.target.value)} className="w-full px-3 py-2 bg-black/30 border border-white/[0.08] rounded-lg text-white text-sm focus:border-amber-400 outline-none mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-[#7f93b0] uppercase tracking-wide font-semibold">Email destinatario (opcional)</label>
                <input type="email" placeholder="nandito@gcuavante.com" value={pagoEmail} onChange={e => setPagoEmail(e.target.value)} className="w-full px-3 py-2 bg-black/30 border border-white/[0.08] rounded-lg text-white text-sm focus:border-amber-400 outline-none mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                disabled={enviandoPago || (!pagoPhone && !pagoEmail)}
                onClick={async () => {
                  setEnviandoPago(true);
                  try {
                    const r = await fetch("/api/requisicion/avisar-pago", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "x-user-email": (typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "") },
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
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${(!pagoPhone && !pagoEmail) ? "bg-white/[0.04] text-[#4a6080] cursor-not-allowed" : "bg-gradient-to-br from-amber-400 to-amber-600 text-black"}`}
              >
                {enviandoPago ? "Enviando..." : "Enviar aviso"}
              </button>
              <button onClick={() => setAvisarPago(null)} className="px-4 py-2.5 rounded-lg bg-white/[0.04] text-[#7f93b0] text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
