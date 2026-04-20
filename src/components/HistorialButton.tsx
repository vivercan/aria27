"use client";
import { useState } from "react";
import { History, User, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { fmtDateTime } from "@/lib/formatters";

interface AuditEntry {
  id: string;
  at: string;
  who: string | null;
  op: "INSERT" | "UPDATE" | "DELETE";
  tabla: string;
  row_pk: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

interface Props {
  /** Nombre de la tabla base (ej. "requisitions", "purchase_orders") */
  tabla: string;
  /** ID del registro */
  id: string;
  /** Label opcional del botón (default: "Historial") */
  label?: string;
  /** Tamaño del botón: "sm" (default) | "md" */
  size?: "sm" | "md";
}

/**
 * Botón reusable para mostrar el historial de cambios (audit_log) de un registro.
 * Al clic abre Modal con cronología de INSERT/UPDATE/DELETE.
 * Muestra quién hizo el cambio y qué campos cambiaron.
 *
 * Uso:
 *   <HistorialButton tabla="requisitions" id={req.id} />
 */
export default function HistorialButton({ tabla, id, label = "Historial", size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = async () => {
    setOpen(true);
    if (entries.length > 0) return; // ya cargado
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/audit/${tabla}/${id}`);
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Error al cargar historial"); return; }
      setEntries(j.entries || []);
    } catch (e: unknown) {
      setError((e as {message?: string})?.message || "Error de red");
    } finally {
      setLoading(false);
    }
  };

  const sizeClass = size === "md" ? "px-3 py-2 text-sm" : "px-2 py-1 text-xs";

  return (
    <>
      <button
        onClick={openModal}
        className={`${sizeClass} inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#c9d8ed] border border-white/[0.08] transition-colors`}
        title={`Ver historial de cambios de este registro`}
      >
        <History className="w-3.5 h-3.5" />
        {label}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Historial de cambios" maxWidth="2xl" sheetOnMobile>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-aria-accent" />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.08] text-rose-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-8 text-[#7f93b0] text-sm">
            No hay historial registrado para este elemento.
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {entries.map((e) => (
              <div key={e.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    e.op === "INSERT" ? "bg-emerald-500/10 text-emerald-300" :
                    e.op === "UPDATE" ? "bg-amber-500/10 text-amber-300" :
                    "bg-rose-500/10 text-rose-300"
                  }`}>
                    {e.op === "INSERT" ? "Creado" : e.op === "UPDATE" ? "Modificado" : "Eliminado"}
                  </span>
                  <span className="text-xs text-[#7f93b0]">{fmtDateTime(e.at)}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#c9d8ed] mb-2">
                  <User className="w-3 h-3" />
                  {e.who || "Sistema"}
                </div>

                {e.op === "UPDATE" && e.before && e.after && (
                  <div className="space-y-1 text-xs">
                    {Object.keys(e.after).map((key) => {
                      const oldVal = e.before?.[key];
                      const newVal = e.after?.[key];
                      if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;
                      return (
                        <div key={key} className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr] gap-2 py-1 border-t border-white/[0.04]">
                          <span className="font-mono text-[#7f93b0]">{key}</span>
                          <span className="text-rose-300/70 line-through">{String(oldVal ?? "—").substring(0, 60)}</span>
                          <span className="text-emerald-300">{String(newVal ?? "—").substring(0, 60)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {e.op === "INSERT" && e.after && (
                  <div className="text-xs text-[#7f93b0]">
                    Se creó con {Object.keys(e.after).length} campos iniciales.
                  </div>
                )}

                {e.op === "DELETE" && (
                  <div className="text-xs text-rose-300/80">
                    Este registro fue eliminado.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
