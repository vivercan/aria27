"use client";
import { clientLogger } from "@/lib/client-logger";
import DeleteModal from "@/components/DeleteModal";
import ConfirmModal from "@/components/ConfirmModal";
import FlashBanner from "@/components/FlashBanner";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Building2, Plus, DollarSign, CreditCard, Pencil, Trash2, Loader2, Power, X, ListChecks } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface CuentaBancaria {
  id: string;
  banco: string;
  cuenta: string;
  clabe: string;
  titular: string;
  tipo: string;
  saldo: number;
  moneda: string;
  activa: boolean;
  empresa: string;
  created_at?: string;
  updated_at?: string;
}

const FORM_INIT = { banco: "", cuenta: "", clabe: "", titular: "", tipo: "Cheques", saldo: 0, moneda: "MXN", empresa: "AVANTE" };

export default function BancosPage() {
  const log = clientLogger("BANCOS");
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const { msg, flash, clear } = useFlashMessage();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showInactivas, setShowInactivas] = useState(false);
  const [form, setForm] = useState({ ...FORM_INIT });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase.from("cuentas_bancarias").select("*").order("activa", { ascending: false }).order("banco");
    if (!error) setCuentas((data as CuentaBancaria[]) || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ ...FORM_INIT });
    setEditId(null);
    setShowForm(false);
  }

  function abrirEdicion(c: CuentaBancaria) {
    setForm({
      banco: c.banco || "",
      cuenta: c.cuenta || "",
      clabe: c.clabe || "",
      titular: c.titular || "",
      tipo: c.tipo || "Cheques",
      saldo: c.saldo || 0,
      moneda: c.moneda || "MXN",
      empresa: c.empresa || "AVANTE",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  async function guardar() {
    if (!form.banco?.trim()) { flash("err", "Banco es requerido"); return; }
    if (!form.cuenta?.trim()) { flash("err", "Número de cuenta es requerido"); return; }
    if (!form.titular?.trim()) { flash("err", "Titular es requerido"); return; }
    if (isNaN(form.saldo) || form.saldo < 0) { flash("err", "Saldo debe ser >= 0"); return; }
    const payload = { ...form, updated_at: new Date().toISOString() } as Record<string, unknown>;
    if (editId) {
      const { error } = await supabase.from("cuentas_bancarias").update(payload).eq("id", editId);
      if (error) {
        log.error("UPDATE cuentas_bancarias fallo", { err: error.message, code: (error as {code?:string}).code, details: (error as {details?:string}).details, hint: (error as {hint?:string}).hint });
        const fullMsg = `Error al actualizar cuenta: ${error.message}${(error as {hint?:string}).hint ? " | hint: " + (error as {hint?:string}).hint : ""}`;
        flash("err", fullMsg);
        alert(fullMsg);
        return;
      }
    } else {
      const { error } = await supabase.from("cuentas_bancarias").insert({ ...payload, activa: true });
      if (error) {
        log.error("INSERT cuentas_bancarias fallo", { err: error.message, code: (error as {code?:string}).code, details: (error as {details?:string}).details, hint: (error as {hint?:string}).hint });
        const fullMsg = `Error al crear cuenta: ${error.message}${(error as {hint?:string}).hint ? " | hint: " + (error as {hint?:string}).hint : ""}`;
        flash("err", fullMsg);
        alert(fullMsg);
        return;
      }
    }
    resetForm();
    loadData();
  }

  async function toggleActiva(c: CuentaBancaria) {
    const nueva = !c.activa;
    const accion = nueva ? "reactivar" : "desactivar";
    setConfirmState({
      open: true,
      msg: `¿${accion} la cuenta ${c.banco} - ${c.cuenta}?`,
      onOk: async () => {
        const { error } = await supabase.from("cuentas_bancarias").update({ activa: nueva, updated_at: new Date().toISOString() }).eq("id", c.id);
        if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); return; }
        loadData();
      }
    });
  }

  async function eliminar(c: CuentaBancaria) {
    setDeleteModal({ open: true, id: c.id, name: `${c.banco} - ${c.cuenta}` });
  }

  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "cuentas_bancarias", id: deleteModal.id, userEmail });
    } catch (e: unknown) { log.error(String(e)); }
    setDeleteModal({ open: false, id: "", name: "" });
    loadData();
  };

  const cuentasMostradas = showInactivas ? cuentas : cuentas.filter(c => c.activa !== false);
  const totalSaldo = cuentasMostradas.reduce((s, c) => s + (c.saldo || 0), 0);

  return (
    <div className="aria-bg-canon space-y-6 max-w-7xl mx-auto">
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 via-slate-950/95 to-transparent pb-4">
        <AriaBackButton href="/dashboard/finanzas" />

        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Bancos</h1>
            <p className="text-[#7f93b0] text-sm">Cuentas bancarias del grupo · CRUD completo · baja lógica reversible</p>
          </div>
          <div className="flex items-center gap-2">
          <Link href="/dashboard/finanzas/bancos/movimientos" className="px-4 py-2 bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] text-white rounded-full text-sm font-medium hover:bg-[#2A4A8E] transition-colors flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Movimientos / Conciliación
          </Link>
          <label className="flex items-center gap-2 text-xs text-[#7f93b0] px-3 py-2 bg-white/[0.04] rounded-lg cursor-pointer">
            <input type="checkbox" checked={showInactivas} onChange={e => setShowInactivas(e.target.checked)} /> Mostrar inactivas
          </label>
          <button
            onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
            className="px-4 py-2 bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] text-white rounded-full text-sm font-medium hover:bg-[#2A4A8E] transition-colors flex items-center gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancelar" : "Nueva Cuenta"}
          </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Activas", value: cuentas.filter(c => c.activa !== false).length, icon: CreditCard, color: "text-aria-accent", bg: "bg-aria-primary/10" },
          { label: "Inactivas", value: cuentas.filter(c => c.activa === false).length, icon: Power, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Saldo total (vista)", value: `$${totalSaldo.toLocaleString()}`, icon: DollarSign, color: "text-aria-accent", bg: "bg-emerald-500/10" },
          { label: "Bancos", value: new Set(cuentas.map(c => c.banco)).size, icon: Building2, color: "text-aria-accent", bg: "bg-aria-primary-light" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-[#7f93b0]">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">{editId ? "Editar cuenta bancaria" : "Nueva cuenta bancaria"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "banco", label: "Banco *", placeholder: "Ej: BBVA, Banorte, HSBC" },
              { key: "cuenta", label: "No. Cuenta *", placeholder: "Número de cuenta" },
              { key: "clabe", label: "CLABE", placeholder: "18 dígitos" },
              { key: "titular", label: "Titular *", placeholder: "Nombre del titular" },
              { key: "empresa", label: "Empresa / Centro", placeholder: "AVANTE, DENIVEL, TENDEVEL" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-[#7f93b0] mb-1 block">{f.label}</label>
                <input
                  required={f.key === "banco" || f.key === "cuenta" || f.key === "titular"}
                  value={String((form as Record<string, unknown>)[f.key] || "")}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none"
              >
                <option>Cheques</option><option>Inversión</option><option>Crédito</option><option>Nómina</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#7f93b0] mb-1 block">Saldo {editId ? "actual" : "inicial"} *</label>
              <input
                type="number" min="0"
                required
                step="0.01"
                value={form.saldo}
                onChange={e => setForm({ ...form, saldo: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-sm font-medium">{editId ? "Guardar cambios" : "Crear cuenta"}</button>
            <button onClick={resetForm} className="px-6 py-2 bg-white/[0.04] hover:bg-white/[0.06] text-[#c9d8ed] rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Banco</th>
                <th className="text-left p-3">Cuenta</th>
                <th className="text-left p-3">CLABE</th>
                <th className="text-left p-3">Empresa</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-right p-3">Saldo</th>
                <th className="text-left p-3">Última modif.</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : cuentasMostradas.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]">Sin cuentas. Agrega la primera con "Nueva Cuenta".</td></tr>
              ) : cuentasMostradas.map(c => (
                <tr key={c.id} className={`border-t border-white/[0.05] hover:bg-white/[0.02] ${c.activa === false ? "opacity-50" : ""}`}>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${c.activa === false ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-aria-accent"}`}>
                      {c.activa === false ? "Inactiva" : "Activa"}
                    </span>
                  </td>
                  <td className="p-3 text-white font-medium">{c.banco}</td>
                  <td className="p-3 text-[#c9d8ed] font-mono text-xs">{c.cuenta}</td>
                  <td className="p-3 text-[#7f93b0] font-mono text-xs">{c.clabe}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-aria-primary/10 text-aria-accent text-xs rounded-full">{c.empresa}</span></td>
                  <td className="p-3 text-[#c9d8ed]">{c.tipo}</td>
                  <td className="p-3 text-right text-aria-accent font-medium">${(c.saldo || 0).toLocaleString()}</td>
                  <td className="p-3 text-[#4a6080] text-xs">{c.updated_at ? new Date(c.updated_at).toLocaleDateString("es-MX") : (c.created_at ? new Date(c.created_at).toLocaleDateString("es-MX") : "—")}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => abrirEdicion(c)} title="Editar" className="p-1.5 text-aria-accent/70 hover:text-aria-accent hover:bg-aria-primary-hover/10 rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActiva(c)} title={c.activa === false ? "Reactivar" : "Desactivar"} className="p-1.5 text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg">
                        <Power className="w-4 h-4" />
                      </button>
                      {/* Eliminación física deshabilitada por decisión funcional 7-Abr-2026.
                          Baja lógica vía Power (toggle activa) es el flujo principal.
                          Mantener handler `eliminar` para uso admin si se reactiva. */}
                      {false && canDelete && (
                        <button onClick={() => eliminar(c)} title="Eliminar (con respaldo)" className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
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

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: "", name: "" })}
        onConfirm={confirmDelete}
        count={1}
        itemLabel={`Cuenta Bancaria ${deleteModal.name}`}
      />

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
