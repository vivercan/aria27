"use client";
import Link from "next/link";
import { ArrowLeft, Printer, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import RequisicionPrint from "@/components/RequisicionPrint";

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "selected" | "all">("single");
  const [singleDeleteId, setSingleDeleteId] = useState<string>("");
  const [itemsCache, setItemsCache] = useState<Record<string, ReqItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<string | null>(null);

  const canDelete = userEmail === "recursos.humanos@gcuavante.com";

  useEffect(() => {
    loadData();
    const email = localStorage.getItem("userEmail") || "";
    setUserEmail(email);
  }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase.from("Requisiciones").select("*").order("created_at", { ascending: false });
    setRequisiciones((data || []) as Requisition[]);
    setLoading(false);
  }

  async function loadItemsForPrint(reqId: string): Promise<ReqItem[]> {
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
    if (status?.includes("APROBADA") || status?.includes("AUTORIZADA")) return "bg-emerald-500/20 text-emerald-400";
    if (status?.includes("PENDIENTE")) return "bg-amber-500/20 text-amber-400";
    if (status?.includes("RECHAZADA") || status?.includes("CANCELADA")) return "bg-red-500/20 text-red-400";
    return "bg-slate-500/20 text-slate-400";
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
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
        {canDelete && selectedIds.length > 0 && (
          <button onClick={() => openDeleteModal("selected")} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Eliminar ({selectedIds.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-8 h-8 mx-auto animate-spin text-cyan-400" /></div>
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
                <th className="p-3 w-24 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requisiciones.map((req) => (
                <tr key={req.id} className="border-t border-white/5 hover:bg-white/5">
                  {canDelete && <td className="p-3"><input type="checkbox" checked={selectedIds.includes(req.id)} onChange={(e) => handleSelect(req.id, e.target.checked)} className="rounded" /></td>}
                  <td className="p-3"><span className="font-mono text-cyan-400 text-sm">{req.folio}</span></td>
                  <td className="p-3 text-white text-sm">{req.cost_center_name}</td>
                  <td className="p-3 text-slate-300 text-sm">{req.created_by}</td>
                  <td className="p-3 text-slate-300 text-sm">{formatDate(req.required_date)}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(req.status)}`}>{req.status}</span></td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <PrintButton req={req} loadItems={() => loadItemsForPrint(req.id)} itemsCache={itemsCache} loadingItems={loadingItems} />
                      {canDelete && <button onClick={() => openDeleteModal("single", req.id)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#0a1628] p-6 rounded-xl border border-white/10 w-96">
            <h3 className="text-lg font-bold text-white mb-4">⚠️ Confirmar Eliminación</h3>
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

function PrintButton({ req, loadItems, itemsCache, loadingItems }: { req: Requisition; loadItems: () => Promise<ReqItem[]>; itemsCache: Record<string, ReqItem[]>; loadingItems: string | null }) {
  const [items, setItems] = useState<ReqItem[]>([]);
  const [ready, setReady] = useState(false);

  const handleClick = async () => {
    if (!itemsCache[req.id]) {
      const loadedItems = await loadItems();
      setItems(loadedItems);
    } else {
      setItems(itemsCache[req.id]);
    }
    setReady(true);
  };

  if (ready && items.length > 0) {
    return (
      <RequisicionPrint
        folio={req.folio}
        fechaCreacion={req.created_at}
        fechaRequerida={req.required_date}
        solicitante={req.created_by}
        obra={req.cost_center_name}
        materiales={items.map(i => ({ name: i.product_name, unit: i.unit, quantity: i.quantity, comments: i.comments }))}
        comentarios={req.instructions}
        status={req.status}
      />
    );
  }

  return (
    <button onClick={handleClick} disabled={loadingItems === req.id} className="p-2 rounded-lg bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-all disabled:opacity-50" title="Imprimir requisición">
      {loadingItems === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
    </button>
  );
}
