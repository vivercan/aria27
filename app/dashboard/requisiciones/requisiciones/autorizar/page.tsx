"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";

type Requisition = {
  id: number;
  folio: string;
  cost_center_name: string;
  instructions: string;
  required_date: string;
  created_at: string;
  created_by: string;
  status: string;
  authorization_comments: string;
  monto: number;
};

type Item = {
  id: number;
  product_name: string;
  unit: string;
  quantity: number;
  observations: string;
};

export default function AuthorizeRequisicionesPage() {
  const { msg, flash, clear } = useFlashMessage();
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
      .in("status", ["PENDIENTE", "EN_AUTORIZACION"])
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

    try {
      if (action === "REVISION") {
        // Devolver: solo PATCH directo con OPTIMISTIC LOCK sobre status
        const { data: rows, error: updErr } = await supabase.from("requisitions").update({
          status: action,
          authorized_by: "autorizador@gcuavante.com",
          authorized_at: new Date().toISOString(),
          authorization_comments: comments
        }).eq("id", selectedReq.id).in("status", ["PENDIENTE", "EN_AUTORIZACION"]).select("id");
        if (updErr) { flash("err", "Error al devolver requisición: " + updErr.message); setProcessing(false); return; }
        if (!rows || rows.length === 0) { flash("err", "Esta requisición ya fue procesada por otro autorizador. Recarga."); setProcessing(false); await loadPending(); return; }
      } else if (selectedReq.authorization_comments && selectedReq.status === "EN_AUTORIZACION") {
        // APROBADA o RECHAZADA con token valido: usar endpoint approve-purchase
        const apiAction = action === "APROBADA" ? "AUTORIZADA" : "RECHAZADA";
        const url = `/api/requisicion/approve-purchase?token=${selectedReq.authorization_comments}&action=${apiAction}`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          console.error("Error en approve-purchase:", text);
          flash("err", "Error al procesar: " + res.status);
        }
      } else {
        // Fallback: PATCH directo con OPTIMISTIC LOCK sobre status
        const { data: rows, error: updErr } = await supabase.from("requisitions").update({
          status: action,
          authorized_by: "autorizador@gcuavante.com",
          authorized_at: new Date().toISOString(),
          authorization_comments: comments
        }).eq("id", selectedReq.id).in("status", ["PENDIENTE", "EN_AUTORIZACION"]).select("id");
        if (updErr) { flash("err", "Error al procesar autorización: " + updErr.message); setProcessing(false); return; }
        if (!rows || rows.length === 0) { flash("err", "Esta requisición ya fue procesada por otro autorizador. Recarga."); setProcessing(false); await loadPending(); return; }
      }
    } catch (err: unknown) {
      console.error("Error en handleAction:", err);
      flash("err", "Error: " + ((err as {message?: string})?.message));
    }

    setSelectedReq(null);
    setItems([]);
    setComments("");
    await loadPending();
    setProcessing(false);
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      <FlashBanner msg={msg} className="mx-0 mb-4" />
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/requisiciones/requisiciones" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Autorizar Requisiciones</h1>
          <p className="text-white/60 text-sm">Revisar y aprobar solicitudes pendientes.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Lista de pendientes */}
        <div className="lg:col-span-1 rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur flex flex-col min-h-0 overflow-hidden">
          <h2 className="text-lg font-semibold mb-4">Pendientes ({Requisiciones.length})</h2>
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="text-center py-4 text-white/50"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></div>
            ) : Requisiciones.length === 0 ? (
              <div className="text-center py-4 text-white/50">No hay requisiciones pendientes</div>
            ) : (
              <div className="space-y-2 pr-2">
                {Requisiciones.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectReq(r)}
                    className={`w-full text-left rounded-xl p-3 transition ${selectedReq?.id === r.id ? "bg-aria-accent-bg border border-aria-accent/50" : "bg-white/5 hover:bg-white/10"}`}
                  >
                    <div className="font-mono text-xs text-aria-accent">{r.folio}</div>
                    <div className="text-sm font-medium">{r.cost_center_name}</div>
                    <div className="text-xs text-white/50">Para: {new Date(r.required_date).toLocaleDateString("es-MX")}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalle */}
        <div className="lg:col-span-2 rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur flex flex-col min-h-0 overflow-hidden">
          {!selectedReq ? (
            <div className="text-center py-12 text-white/50 flex-1 flex items-center justify-center">Selecciona una requisicion para revisar</div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-start mb-4">
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
                <div className="rounded-xl bg-black/20 p-3 text-sm mb-4">
                  <span className="text-white/50">Instrucciones:</span> {selectedReq.instructions}
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden flex-1 min-h-0 flex flex-col mb-4">
                <div className="grid grid-cols-[2fr_80px_60px_1fr] gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-xs uppercase text-white/50 sticky top-0">
                  <div>Material</div><div>Unidad</div><div>Cant.</div><div>Obs.</div>
                </div>
                <div className="overflow-y-auto flex-1">
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[2fr_80px_60px_1fr] gap-2 px-3 py-2 text-sm border-b border-white/5">
                      <div>{item.product_name}</div>
                      <div className="text-white/60">{item.unit}</div>
                      <div className="font-medium">{item.quantity}</div>
                      <div className="text-white/50 text-xs">{item.observations || "-"}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mb-4 shrink-0">
                <label className="text-xs text-white/70">Comentarios de autorizacion</label>
                <textarea
                  className="w-full h-20 rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-sm outline-none focus:border-aria-accent"
                  placeholder="Opcional: agregar comentarios..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end shrink-0">
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

