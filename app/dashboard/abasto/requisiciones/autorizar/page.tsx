"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, MessageSquare, Loader2 } from "lucide-react";

type Requisition = {
  id: number;
  folio: string;
  cost_center_name: string;
  instructions: string;
  required_date: string;
  created_at: string;
  created_by: string;
};

type Item = {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  observations: string;
};

export default function AuthorizeRequisicionesPage() {
  const [Requisiciones, setRequisiciones] = useState<Requisition[]>([]);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [comments, setComments] = useState("");

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    const { data } = await supabase
      .from("Requisiciones")
      .select("*")
      .eq("status", "PENDIENTE")
      .order("created_at", { ascending: true });
    setRequisiciones((data || []) as Requisition[]);
    setLoading(false);
  };

  const selectReq = async (req: Requisition) => {
    setSelectedReq(req);
    const { data } = await supabase
      .from("requisition_items")
      .select("*")
      .eq("requisition_id", req.id);
    setItems((data || []) as Item[]);
  };

  const handleAction = async (action: "APROBADA" | "RECHAZADA" | "REVISION") => {
    if (!selectedReq) return;
    setProcessing(true);
    await supabase.from("Requisiciones").update({
      status: action,
      authorized_by: "autorizador@gcuavante.com",
      authorized_at: new Date().toISOString(),
      authorization_comments: comments
    }).eq("id", selectedReq.id);
    
    setSelectedReq(null);
    setItems([]);
    setComments("");
    await loadPending();
    setProcessing(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Autorizar Requisiciones</h1>
        <p className="text-white/60 text-sm">Revisar y aprobar solicitudes pendientes.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de pendientes */}
        <div className="lg:col-span-1 rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          <h2 className="text-lg font-semibold mb-4">Pendientes ({Requisiciones.length})</h2>
          {loading ? (
            <div className="text-center py-4 text-white/50">Cargando...</div>
          ) : Requisiciones.length === 0 ? (
            <div className="text-center py-4 text-white/50">No hay requisiciones pendientes 🎉</div>
          ) : (
            <div className="space-y-2">
              {Requisiciones.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectReq(r)}
                  className={`w-full text-left rounded-xl p-3 transition ${selectedReq?.id === r.id ? "bg-sky-500/20 border border-sky-500/50" : "bg-white/5 hover:bg-white/10"}`}
                >
                  <div className="font-mono text-xs text-sky-400">{r.folio}</div>
                  <div className="text-sm font-medium">{r.cost_center_name}</div>
                  <div className="text-xs text-white/50">Para: {new Date(r.required_date).toLocaleDateString("es-MX")}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalle */}
        <div className="lg:col-span-2 rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
          {!selectedReq ? (
            <div className="text-center py-12 text-white/50">Selecciona una requisición para revisar</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selectedReq.folio}</h2>
                  <p className="text-white/60">{selectedReq.cost_center_name}</p>
                </div>
                <div className="text-right text-sm text-white/50">
                  <div>Creada: {new Date(selectedReq.created_at).toLocaleDateString("es-MX")}</div>
                  <div>Requerida: {new Date(selectedReq.required_date).toLocaleDateString("es-MX")}</div>
                </div>
              </div>

              {selectedReq.instructions && (
                <div className="rounded-xl bg-black/20 p-3 text-sm">
                  <span className="text-white/50">Instrucciones:</span> {selectedReq.instructions}
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                <div className="grid grid-cols-[2fr_80px_60px_1fr] gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-xs uppercase text-white/50">
                  <div>Material</div><div>Unidad</div><div>Cant.</div><div>Obs.</div>
                </div>
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[2fr_80px_60px_1fr] gap-2 px-3 py-2 text-sm border-b border-white/5">
                    <div>{item.product_name}</div>
                    <div className="text-white/60">{item.unit}</div>
                    <div className="font-medium">{item.quantity}</div>
                    <div className="text-white/50 text-xs">{item.observations || "-"}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/70">Comentarios de autorización</label>
                <textarea
                  className="w-full h-20 rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm outline-none focus:border-sky-400"
                  placeholder="Opcional: agregar comentarios..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => handleAction("RECHAZADA")} disabled={processing} className="inline-flex items-center gap-2 rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium hover:bg-red-500">
                  <XCircle className="h-4 w-4" /> Rechazar
                </button>
                <button onClick={() => handleAction("REVISION")} disabled={processing} className="inline-flex items-center gap-2 rounded-full bg-amber-500/80 px-4 py-2 text-sm font-medium hover:bg-amber-500">
                  <MessageSquare className="h-4 w-4" /> Devolver
                </button>
                <button onClick={() => handleAction("APROBADA")} disabled={processing} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-emerald-400">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Aprobar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
