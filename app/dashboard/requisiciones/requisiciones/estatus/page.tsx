"use client";
import Link from "next/link";
import { ArrowLeft, Trash2, Loader2, XCircle, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import RequisicionPrintButtons from "@/components/RequisicionPrint";

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
}

interface ReqItem {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  comments?: string;
}

export default function RequisicionesStatusPage() {
  const [requisiciones, setRequisiciones] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelId, setCancelId] = useState("");
  const [cancelFolio, setCancelFolio] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "selected" | "all">("single");
  const [singleDeleteId, setSingleDeleteId] = useState<string>("");
  const [itemsCache, setItemsCache] = useState<Record<string, ReqItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);

  const isAdmin = userRole === "admin" || userEmail === "recursos.humanos@gcuavante.com";
  const canDelete = isAdmin;

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "";
    setUserEmail(email);
    loadUserRole(email);
    loadData(email);
  }, []);

  async function loadUserRole(email: string) {
    const { data } = await supabase.from("users").select("role").eq("email", email).single();
    if (data) setUserRole(data.role || "");
  }

  async function loadData(email?: string) {
    setLoading(true);
    const currentEmail = email || userEmail;
    
    let query = supabase.from("Requisiciones").select("*").order("created_at", { ascending: false });
    
    const { data: userData } = await supabase.from("users").select("role").eq("email", currentEmail).single();
    const isAdminUser = userData?.role === "admin" || currentEmail === "recursos.humanos@gcuavante.com";
    
    if (!isAdminUser && currentEmail) {
      query = query.eq("user_email", currentEmail);
    }
    
    const { data } = await query;
    setRequisiciones((data || []) as Requisition[]);
    setLoading(false);
  }

  async function loadItemsForReq(reqId: string): Promise<ReqItem[]> {
    if (itemsCache[reqId]) return itemsCache[reqId];
    setLoadingItems(reqId);
    const { data } = await supabase.from("requisition_items").select("id, product_name, unit, quantity, comments").eq("requisition_id", reqId);
    const items = (data || []) as ReqItem[];
    setItemsCache(prev => ({ ...prev, [reqId]: items }));
    setLoadingItems(null);
    return items;
  }

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? requisiciones.map(r => r.id) : []);
  }

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds(checked ? [...selectedIds, id] : selectedIds.filter(i => i !== id));
  }

  function openDeleteModal(type: "single" | "selected" | "all", singleId?: string) {
    setDeleteType(type);
    setSingleDeleteId(singleId || "");
    setDeleteConfirmation("");
    setShowDeleteModal(true);
  }

  function openCancelModal(id: string, folio: string) {
    setCancelId(id);
    setCancelFolio(folio);
    setShowCancelModal(true);
  }

  async function handleCancel() {
    setCanceling(true);
    try {
      await supabase.from("Requisiciones").update({ status: "CANCELADA" }).eq("id", cancelId);
      setShowCancelModal(false);
      loadData();
    } catch {
      alert("Error al cancelar");
    }
    setCanceling(false);
  }

  async function handleDelete() {
    if (deleteConfirmation !== "DELETE") return;
    setDeleting(true);
    let idsToDelete: string[] = [];
    if (deleteType === "single") idsToDelete = [singleDeleteId];
    else if (deleteType === "selected") idsToDelete = selectedIds;
    else if (deleteType === "all") idsToDelete = requisiciones.map(r => r.id);

    try {
      const res = await fetch("/api/requisicion/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisitionIds: idsToDelete, userEmail, confirmation: deleteConfirmation })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setShowDeleteModal(false);
        setSelectedIds([]);
        loadData();
      } else {
        alert("Error: " + data.error);
      }
    } catch {
      alert("Error al eliminar");
    }
    setDeleting(false);
  }

  const getStatusColor = (status: string) => {
    if (status?.includes("FINALIZADA")) return "bg-emerald-500/20 text-emerald-400";
    if (status?.includes("APROBADA") || status?.includes("AUTORIZADA")) return "bg-blue-500/20 text-blue-400";
    if (status?.includes("PENDIENTE")) return "bg-amber-500/20 text-amber-400";
    if (status?.includes("CANCELADA") || status?.includes("RECHAZADA")) return "bg-red-500/20 text-red-400";
    if (status?.includes("COTIZA")) return "bg-purple-500/20 text-purple-400";
    return "bg-slate-500/20 text-slate-400";
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  const canCancel = (req: Requisition) => {
    const isCreator = req.user_email === userEmail;
    const isBeforeCompras = ["PENDIENTE", "APROBADA"].includes(req.status);
    return isCreator && isBeforeCompras;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/requisiciones/requisiciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Estatus de Requisiciones</h1>
            <p className="text-slate-500 text-sm">
              {isAdmin ? `Todas las requisiciones (${requisiciones.length})` : `Mis requisiciones (${requisiciones.length})`}
            </p>
          </div>
        </div>
        {canDelete && selectedIds.length > 0 && (
          <button onClick={() => openDeleteModal("selected")} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Eliminar ({selectedIds.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-8 h-8 mx-auto animate-spin text-cyan-400" /></div>
      ) : requisiciones.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay requisiciones</p>
          <Link href="/dashboard/requisiciones/requisiciones/nuevo" className="text-cyan-400 hover:underline mt-2 inline-block">Crear una nueva</Link>
        </div>
      ) : (
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-left text-slate-400 text-xs">
                {canDelete && <th className="p-3 w-10"><input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedIds.length === requisiciones.length && requisiciones.length > 0} className="rounded" /></th>}
                <th className="p-3">Folio</th>
                <th className="p-3">Obra</th>
                <th className="p-3">Solicitante</th>
                <th className="p-3">F. Requerida</th>
                <th className="p-3">Estado</th>
                <th className="p-3 w-40 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requisiciones.map((req) => (
                <RequisicionRow 
                  key={req.id} 
                  req={req} 
                  canDelete={canDelete}
                  canCancel={canCancel(req)}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onDelete={() => openDeleteModal("single", req.id)}
                  onCancel={() => openCancelModal(req.id, req.folio)}
                  loadItems={() => loadItemsForReq(req.id)}
                  itemsCache={itemsCache}
                  loadingItems={loadingItems}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Cancelar */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#0a1628] p-6 rounded-xl border border-white/10 w-96">
            <h3 className="text-lg font-bold text-white mb-4">⚠️ Cancelar Requisición</h3>
            <p className="text-slate-400 text-sm mb-4">¿Estás seguro de cancelar <strong className="text-amber-400">{cancelFolio}</strong>?</p>
            <p className="text-slate-500 text-xs mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-2 rounded bg-white/10 text-white hover:bg-white/20">No, volver</button>
              <button onClick={handleCancel} disabled={canceling} className="flex-1 py-2 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">{canceling ? "Cancelando..." : "Sí, cancelar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#0a1628] p-6 rounded-xl border border-white/10 w-96">
            <h3 className="text-lg font-bold text-white mb-4">🗑️ Confirmar Eliminación</h3>
            <p className="text-slate-400 text-sm mb-4">{deleteType === "single" ? "¿Eliminar esta requisición?" : `¿Eliminar ${deleteType === "all" ? "TODAS" : selectedIds.length} requisiciones?`}</p>
            <p className="text-slate-500 text-xs mb-2">Escribe DELETE para confirmar:</p>
            <input type="text" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="DELETE" className="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 rounded bg-white/10 text-white hover:bg-white/20">Cancelar</button>
              <button onClick={handleDelete} disabled={deleteConfirmation !== "DELETE" || deleting} className="flex-1 py-2 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">{deleting ? "Eliminando..." : "Eliminar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de fila con carga de items para impresión
function RequisicionRow({ 
  req, canDelete, canCancel, selectedIds, onSelect, onDelete, onCancel, loadItems, itemsCache, loadingItems, formatDate, getStatusColor 
}: { 
  req: Requisition; 
  canDelete: boolean;
  canCancel: boolean;
  selectedIds: string[];
  onSelect: (id: string, checked: boolean) => void;
  onDelete: () => void;
  onCancel: () => void;
  loadItems: () => Promise<ReqItem[]>;
  itemsCache: Record<string, ReqItem[]>;
  loadingItems: string | null;
  formatDate: (d: string) => string;
  getStatusColor: (s: string) => string;
}) {
  const [items, setItems] = useState<ReqItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Cargar items cuando el componente se monta
  useEffect(() => {
    if (itemsCache[req.id]) {
      setItems(itemsCache[req.id]);
      setLoaded(true);
    } else {
      loadItems().then(data => {
        setItems(data);
        setLoaded(true);
      });
    }
  }, [req.id, itemsCache, loadItems]);

  return (
    <tr className="border-t border-white/5 hover:bg-white/5">
      {canDelete && (
        <td className="p-3">
          <input type="checkbox" checked={selectedIds.includes(req.id)} onChange={(e) => onSelect(req.id, e.target.checked)} className="rounded" />
        </td>
      )}
      <td className="p-3"><span className="font-mono text-cyan-400 text-sm">{req.folio}</span></td>
      <td className="p-3 text-white text-sm">{req.cost_center_name}</td>
      <td className="p-3 text-slate-300 text-sm">{req.created_by}</td>
      <td className="p-3 text-slate-300 text-sm">{formatDate(req.required_date)}</td>
      <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(req.status)}`}>{req.status}</span></td>
      <td className="p-3">
        <div className="flex items-center justify-center gap-1">
          {/* Botones Imprimir y PDF */}
          {loaded && items.length > 0 ? (
            <RequisicionPrintButtons
              folio={req.folio}
              fechaCreacion={req.created_at}
              fechaRequerida={req.required_date}
              solicitante={req.created_by}
              obra={req.cost_center_name}
              materiales={items.map(i => ({ name: i.product_name, unit: i.unit, quantity: i.quantity, comments: i.comments }))}
              comentarios={req.instructions}
              status={req.status}
            />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          )}
          
          {/* Botón Cancelar */}
          {canCancel && (
            <button onClick={onCancel} className="p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400" title="Cancelar">
              <XCircle className="w-4 h-4" />
            </button>
          )}
          
          {/* Botón Eliminar */}
          {canDelete && (
            <button onClick={onDelete} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400" title="Eliminar">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
