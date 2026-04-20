"use client";
import { useEffect, useState, useMemo } from "react";
import AriaBackButton from "@/components/AriaBackButton";
import { supabase } from "@/lib/supabase";
import { Loader2, Shield, RefreshCw, RotateCcw, Search, Plus, Edit3, Trash2, Database, Undo2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

type Tab = "audit" | "deleted";

interface AuditRow {
  id: number;
  table_name: string;
  op: "INSERT" | "UPDATE" | "DELETE";
  row_pk: string | null;
  actor: string | null;
  changed_at: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

interface DeletedRow {
  id: string;
  source_table: string;
  source_id: string;
  data: Record<string, unknown>;
  deleted_by: string | null;
  deleted_at: string;
  restore_notes: string | null;
}

const ADMIN_EMAILS = ["juanviverosv@gmail.com"];

export default function AuditoriaPage() {
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
  const [tab, setTab] = useState<Tab>("audit");
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [deleted, setDeleted] = useState<DeletedRow[]>([]);
  const [busca, setBusca] = useState("");
  const [tabla, setTabla] = useState("");
  const [op, setOp] = useState("");
  const [selRow, setSelRow] = useState<AuditRow | DeletedRow | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [restoring, setRestoring] = useState<string | null>(null);
  // EX-3 18-Abr-2026: flash canónico via useFlashMessage
  const { msg, flash, clear } = useFlashMessage();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || "");
      cargar();
    })();
  }, []);

  async function cargar() {
    setLoading(true);
    const [a, d] = await Promise.all([
      supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(500),
      supabase.from("deleted_records").select("*").order("deleted_at", { ascending: false }).limit(500),
    ]);
    if (a.data) setAudit(a.data as AuditRow[]);
    if (d.data) setDeleted(d.data as DeletedRow[]);
    setLoading(false);
  }

  const esAdmin = ADMIN_EMAILS.includes(userEmail);

  const auditFiltrado = useMemo(() => {
    return audit.filter((r) => {
      if (tabla && r.table_name !== tabla) return false;
      if (op && r.op !== op) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const blob = `${r.table_name} ${r.actor || ""} ${r.row_pk || ""} ${JSON.stringify(r.before || {})} ${JSON.stringify(r.after || {})}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [audit, busca, tabla, op]);

  const deletedFiltrado = useMemo(() => {
    return deleted.filter((r) => {
      if (tabla && r.source_table !== tabla) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const blob = `${r.source_table} ${r.deleted_by || ""} ${r.source_id} ${JSON.stringify(r.data || {})}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [deleted, busca, tabla]);

  const tablas = useMemo(() => {
    const set = new Set<string>();
    audit.forEach((r) => set.add(r.table_name));
    deleted.forEach((r) => set.add(r.source_table));
    return Array.from(set).sort();
  }, [audit, deleted]);

  async function restaurarDeleted(row: DeletedRow) {
    setConfirmState({
      open: true,
      msg: `Restaurar ${row.source_table} · ${row.source_id}?`,
      onOk: async () => {
        setRestoring(row.id);
        clear();
        try {
          const resp = await fetch("/api/admin/auditoria/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-email": userEmail },
            body: JSON.stringify({ deleted_id: row.id }),
          });
          const j = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(j.error || "Error al restaurar");
          flash("ok", `Restaurado en ${row.source_table}`);
          cargar();
        } catch (e: unknown) {
          flash("err", (e as Error).message);
        } finally {
          setRestoring(null);
        }
      }
    });
  }

  async function revertirAudit(row: AuditRow) {
    if (row.op !== "UPDATE" || !row.before) {
      flash("err", "Solo se puede revertir un UPDATE con snapshot previo");
      return;
    }
    setConfirmState({
      open: true,
      msg: `Revertir ${row.table_name} al estado antes del cambio?`,
      onOk: async () => {
        setRestoring(String(row.id));
        clear();
        try {
          const resp = await fetch("/api/admin/auditoria/revert", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-email": userEmail },
            body: JSON.stringify({ audit_id: row.id }),
          });
          const j = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(j.error || "Error al revertir");
          flash("ok", `Revertido en ${row.table_name}`);
          cargar();
        } catch (e: unknown) {
          flash("err", (e as Error).message);
        } finally {
          setRestoring(null);
        }
      }
    });
  }

  if (!esAdmin && !loading && userEmail) {
    return (
      <div className="p-8 text-white">
        <AriaBackButton href="/dashboard/admin" />
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-6">
          <Shield className="w-8 h-8 text-red-400 mb-2" />
          <h2 className="text-lg font-bold">Acceso restringido</h2>
          <p className="text-sm text-white/60">Esta sección es exclusiva para el administrador del sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="sticky top-0 z-10 bg-[#040810]/80 backdrop-blur border-b border-white/[0.08] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AriaBackButton href="/dashboard/admin" />
            <Database className="w-6 h-6 text-aria-accent" />
            <div>
              <h1 className="text-2xl font-bold">Auditoría y Respaldos</h1>
              <p className="text-xs text-white/50">Historial perpetuo de cambios · {audit.length} eventos · {deleted.length} registros borrados</p>
            </div>
          </div>
          <button onClick={cargar} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover text-sm">
            <RefreshCw className="w-4 h-4" /> Refrescar
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setTab("audit")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "audit" ? "bg-aria-primary text-white" : "bg-white/[0.04] text-white/60 hover:bg-white/[0.06]"}`}
          >
            Cambios (audit_log)
          </button>
          <button
            onClick={() => setTab("deleted")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "deleted" ? "bg-aria-primary text-white" : "bg-white/[0.04] text-white/60 hover:bg-white/[0.06]"}`}
          >
            Registros borrados (deleted_records)
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por tabla, usuario, ID, contenido..."
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-aria-primary"
            />
          </div>
          <select value={tabla} onChange={(e) => setTabla(e.target.value)} className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none">
            <option value="">Todas las tablas</option>
            {tablas.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {tab === "audit" && (
            <select value={op} onChange={(e) => setOp(e.target.value)} className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none">
              <option value="">Todas las operaciones</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          )}
        </div>

        {/* EX-3 18-Abr-2026: FlashBanner canónico */}
        <FlashBanner msg={msg} className="mt-3" />
      </header>

      <main className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/50">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : tab === "audit" ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0a1628]/90 text-xs uppercase text-white/50">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tabla</th>
                <th className="px-3 py-2 text-left">Op</th>
                <th className="px-3 py-2 text-left">Usuario</th>
                <th className="px-3 py-2 text-left">Row ID</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {auditFiltrado.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.05] hover:bg-white/[0.04] cursor-pointer" onClick={() => setSelRow(r)}>
                  <td className="px-3 py-2 text-white/70 text-xs">{new Date(r.changed_at).toLocaleString("es-MX")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.table_name}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                      r.op === "INSERT" ? "bg-emerald-500/20 text-aria-accent" :
                      r.op === "UPDATE" ? "bg-amber-500/20 text-amber-300" :
                      "bg-red-500/20 text-red-300"
                    }`}>
                      {r.op === "INSERT" ? <Plus className="w-3 h-3" /> : r.op === "UPDATE" ? <Edit3 className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                      {r.op}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/60 text-xs">{r.actor || "system"}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-white/40">{r.row_pk?.slice(0, 8) || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {r.op === "UPDATE" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); revertirAudit(r); }}
                        disabled={restoring === String(r.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-[10px] hover:bg-amber-500/30"
                      >
                        {restoring === String(r.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                        Revertir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {auditFiltrado.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-white/40 text-xs">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0a1628]/90 text-xs uppercase text-white/50">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tabla</th>
                <th className="px-3 py-2 text-left">Usuario</th>
                <th className="px-3 py-2 text-left">Row ID</th>
                <th className="px-3 py-2 text-left">Notas</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {deletedFiltrado.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.05] hover:bg-white/[0.04] cursor-pointer" onClick={() => setSelRow(r)}>
                  <td className="px-3 py-2 text-white/70 text-xs">{new Date(r.deleted_at).toLocaleString("es-MX")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.source_table}</td>
                  <td className="px-3 py-2 text-white/60 text-xs">{r.deleted_by || "—"}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-white/40">{r.source_id.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-white/50 text-xs">{r.restore_notes || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); restaurarDeleted(r); }}
                      disabled={restoring === r.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 text-aria-accent text-[10px] hover:bg-aria-primary/30"
                    >
                      {restoring === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Restaurar
                    </button>
                  </td>
                </tr>
              ))}
              {deletedFiltrado.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-white/40 text-xs">Sin registros borrados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </main>

      {selRow && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setSelRow(null)}>
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl max-w-4xl w-full max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Detalle del cambio</h3>
            <pre className="text-xs bg-black/40 p-4 rounded-lg overflow-auto max-h-[60vh]">{JSON.stringify(selRow, null, 2)}</pre>
            <button onClick={() => setSelRow(null)} className="mt-3 px-4 py-2 rounded-lg bg-white/[0.06] text-sm hover:bg-white/[0.1]">Cerrar</button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => {
          confirmState.onOk();
          setConfirmState(p => ({...p, open: false}));
        }}
        onCancel={() => setConfirmState(p => ({...p, open: false}))}
      />
    </div>
  );
}
