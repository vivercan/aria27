"use client";
import Link from "next/link";
import { ArrowLeft, Printer, FileDown, Loader2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { handlePrint, handleDownloadPDF } from "@/components/RequisicionPrint";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";

interface Requisition {
  id: string;
  folio: string;
  cost_center_name: string;
  status: string;
  created_by: string;
  user_email: string;
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
}

interface ReqItem {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  comments?: string;
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
  const [detailReq, setDetailReq] = useState<Requisition | null>(null);
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
    setLoading(false);
  }

  async function loadItemsForPrint(reqId: string): Promise<ReqItem[]> {
    if (itemsCache[reqId]) return itemsCache[reqId];
    const { data } = await supabase
      .from("requisition_items")
      .select("id, product_name, unit, quantity, comments, precio_unitario, precio_total")
      .eq("requisition_id", reqId);
    const items = (data || []) as ReqItem[];
    setItemsCache((prev) => ({ ...prev, [reqId]: items }));
    return items;
  }

  async function openDetail(req: Requisition) {
    setDetailReq(req);
    setLoadingDetail(true);
    const items = await loadItemsForPrint(req.id);
    setDetailItems(items);
    setLoadingDetail(false);
  }

  async function handlePrintClick(req: Requisition) {
    setLoadingPrint(req.id);
    const items = await loadItemsForPrint(req.id);
    handlePrint({
      folio: req.folio,
      fechaCreacion: req.created_at,
      fechaRequerida: req.required_date,
      solicitante: req.created_by,
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
    handleDownloadPDF({
      folio: req.folio,
      fechaCreacion: req.created_at,
      fechaRequerida: req.required_date,
      solicitante: req.created_by,
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
      const data = await res.json();
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
    if (status?.includes("FINALIZADA")) return "bg-emerald-500/20 text-emerald-400";
    if (status?.includes("APROBADA") || status?.includes("AUTORIZADA")) return "bg-aria-primary-light text-aria-accent";
    if (status?.includes("PENDIENTE")) return "bg-amber-500/20 text-amber-400";
    if (status?.includes("RECHAZADA") || status?.includes("CANCELADA")) return "bg-red-500/20 text-red-400";
    if (status?.includes("COTIZA")) return "bg-purple-500/20 text-purple-400";
    return "bg-slate-500/20 text-slate-400";
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return "$" + value.toLocaleString("es-MX", { minimumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4">
      <FlashBanner msg={msg} className="mx-0 mb-2" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/requisiciones/requisiciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Estatus de Requisiciones</h1>
            <p className="text-slate-500 text-sm">{requisiciones.length} requisiciones</p>
          </div>
        </div>

        {/* Botón eliminar todas — solo RH */}
        {canDelete && requisiciones.length > 0 && selectedIds.length === 0 && (
          <button
            onClick={() => openDeleteModal("all")}
            className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar todas
          </button>
        )}
      </div>

      {/* Barra de selección — solo RH */}
      {canDelete && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
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
            className="px-4 py-1.5 rounded-lg bg-white/10 text-slate-300 text-sm hover:bg-white/20 transition"
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
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 sticky top-0">
                <tr className="text-left text-slate-400 text-xs">
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
                  <tr key={req.id} className="border-t border-white/5 hover:bg-white/5">
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
                    <td className="p-3 text-slate-300 text-sm">{req.created_by}</td>
                    <td className="p-3 text-slate-300 text-sm">{formatDate(req.required_date)}</td>
                    <td className="p-3 text-emerald-400 text-sm font-medium">{formatCurrency(req.monto || req.total)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Imprimir */}
                        <button
                          onClick={() => handlePrintClick(req)}
                          disabled={loadingPrint === req.id}
                          className="p-2 rounded-lg bg-white/5 hover:bg-aria-accent-bg text-slate-400 hover:text-aria-accent transition-all disabled:opacity-50"
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
                          className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-all disabled:opacity-50"
                          title="Descargar PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        {/* Eliminar individual — solo RH */}
                        {canDelete && (
                          <button
                            onClick={() => openDeleteModal("single", req.id)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
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
          <div className="bg-aria-bg rounded-2xl border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">{detailReq.folio}</h3>
                <p className="text-slate-400 text-sm">{detailReq.cost_center_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${getStatusColor(detailReq.status)}`}>{detailReq.status}</span>
                <button onClick={() => setDetailReq(null)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition">✕</button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-140px)] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-white/5"><p className="text-[10px] uppercase text-slate-500 mb-1">Solicitante</p><p className="text-sm text-white">{detailReq.created_by}</p></div>
                <div className="p-3 rounded-xl bg-white/5"><p className="text-[10px] uppercase text-slate-500 mb-1">Fecha Requerida</p><p className="text-sm text-white">{formatDate(detailReq.required_date)}</p></div>
                <div className="p-3 rounded-xl bg-white/5"><p className="text-[10px] uppercase text-slate-500 mb-1">Fecha Creación</p><p className="text-sm text-white">{formatDate(detailReq.created_at)}</p></div>
                <div className="p-3 rounded-xl bg-white/5"><p className="text-[10px] uppercase text-slate-500 mb-1">Total</p><p className="text-sm text-emerald-400 font-medium">{formatCurrency(detailReq.monto || detailReq.total)}</p></div>
              </div>
              {detailReq.instructions && (
                <div className="p-3 rounded-xl bg-white/5"><p className="text-[10px] uppercase text-slate-500 mb-1">Instrucciones</p><p className="text-sm text-slate-300">{detailReq.instructions}</p></div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">MATERIALES</p>
                {loadingDetail ? (
                  <div className="text-center py-4"><Loader2 className="w-5 h-5 mx-auto animate-spin text-aria-accent" /></div>
                ) : (
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-white/5"><tr className="text-left text-[11px] text-slate-500"><th className="p-2.5">Material</th><th className="p-2.5 w-20">Unidad</th><th className="p-2.5 w-16 text-center">Cant.</th><th className="p-2.5 w-24 text-right">P. Unit.</th><th className="p-2.5 w-24 text-right">Total</th></tr></thead>
                      <tbody>
                        {detailItems.map((item) => (
                          <tr key={item.id} className="border-t border-white/5 text-sm">
                            <td className="p-2.5 text-white">{item.product_name}</td>
                            <td className="p-2.5 text-slate-400">{item.unit}</td>
                            <td className="p-2.5 text-center text-white">{item.quantity}</td>
                            <td className="p-2.5 text-right text-slate-400">{formatCurrency(item.precio_unitario)}</td>
                            <td className="p-2.5 text-right text-emerald-400 font-medium">{formatCurrency(item.precio_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
              <button onClick={() => { handlePrintClick(detailReq); }} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-aria-accent-bg text-sm text-slate-300 hover:text-aria-accent transition flex items-center gap-2"><Printer className="w-4 h-4" />Imprimir</button>
              <button onClick={() => { handlePDFClick(detailReq); }} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-sm text-slate-300 hover:text-emerald-400 transition flex items-center gap-2"><FileDown className="w-4 h-4" />PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar — confirmación con "Borrar" */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-aria-bg p-6 rounded-xl border border-red-500/30 w-[420px] shadow-2xl shadow-red-500/10">
            {/* Icono de advertencia */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Eliminar Requisiciones</h3>
                <p className="text-red-400 text-xs font-medium">Acción irreversible</p>
              </div>
            </div>

            {/* Advertencia */}
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
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
            <p className="text-slate-400 text-sm mb-2">
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
                  : "bg-white/5 border-white/10 focus:border-white/30"
              }`}
              autoFocus
            />

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmation(""); }}
                className="flex-1 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition"
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
    </div>
  );
}
