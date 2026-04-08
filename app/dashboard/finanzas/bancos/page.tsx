"use client";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Building2, Plus, DollarSign, CreditCard, Pencil, Trash2, Loader2, Power, X, ListChecks } from "lucide-react";

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
  const router = useRouter();
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showInactivas, setShowInactivas] = useState(false);
  const [form, setForm] = useState({ ...FORM_INIT });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase.from("cuentas_bancarias").select("*").order("activa", { ascending: false }).order("banco");
    if (!error) setCuentas((data as any) || []);
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
    if (!form.banco || !form.cuenta) { alert("Banco y cuenta son requeridos"); return; }
    const payload = { ...form, updated_at: new Date().toISOString() } as any;
    if (editId) {
      const { error } = await supabase.from("cuentas_bancarias").update(payload).eq("id", editId);
      if (error) { alert("Error al actualizar: " + error.message); return; }
    } else {
      const { error } = await supabase.from("cuentas_bancarias").insert({ ...payload, activa: true });
      if (error) { alert("Error al crear: " + error.message); return; }
    }
    resetForm();
    loadData();
  }

  async function toggleActiva(c: CuentaBancaria) {
    const nueva = !c.activa;
    const accion = nueva ? "reactivar" : "desactivar";
    if (!confirm(`¿${accion} la cuenta ${c.banco} - ${c.cuenta}?`)) return;
    const { error } = await supabase.from("cuentas_bancarias").update({ activa: nueva, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) { alert("Error: " + error.message); return; }
    loadData();
  }

  async function eliminar(c: CuentaBancaria) {
    setDeleteModal({ open: true, id: c.id, name: `${c.banco} - ${c.cuenta}` });
  }

  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "cuentas_bancarias", id: deleteModal.id, userEmail });
    } catch (e) { console.error(e); }
    setDeleteModal({ open: false, id: "", name: "" });
    loadData();
  };

  const cuentasMostradas = showInactivas ? cuentas : cuentas.filter(c => c.activa !== false);
  const totalSaldo = cuentasMostradas.reduce((s, c) => s + (c.saldo || 0), 0);

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Bancos</h1>
          <p className="text-slate-400 text-sm">Cuentas bancarias del grupo · CRUD completo · baja lógica reversible</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/finanzas/bancos/movimientos" className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-sm font-medium hover:bg-purple-500/30 transition-colors flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Movimientos / Conciliación
          </Link>
          <label className="flex items-center gap-2 text-xs text-slate-400 px-3 py-2 bg-white/5 rounded-lg cursor-pointer">
            <input type="checkbox" checked={showInactivas} onChange={e => setShowInactivas(e.target.checked)} /> Mostrar inactivas
          </label>
          <button
            onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancelar" : "Nueva Cuenta"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Activas", value: cuentas.filter(c => c.activa !== false).length, icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Inactivas", value: cuentas.filter(c => c.activa === false).length, icon: Power, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Saldo total (vista)", value: `$${totalSaldo.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Bancos", value: new Set(cuentas.map(c => c.banco)).size, icon: Building2, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">{editId ? "Editar cuenta bancaria" : "Nueva cuenta bancaria"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "banco", label: "Banco", placeholder: "Ej: BBVA, Banorte, HSBC" },
              { key: "cuenta", label: "No. Cuenta", placeholder: "Número de cuenta" },
              { key: "clabe", label: "CLABE", placeholder: "18 dígitos" },
              { key: "titular", label: "Titular", placeholder: "Nombre del titular" },
              { key: "empresa", label: "Empresa / Centro", placeholder: "AVANTE, DENIVEL, TENDEVEL" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
              >
                <option>Cheques</option><option>Inversión</option><option>Crédito</option><option>Nómina</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Saldo {editId ? "actual" : "inicial"}</label>
              <input
                type="number"
                value={form.saldo}
                onChange={e => setForm({ ...form, saldo: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">{editId ? "Guardar cambios" : "Crear cuenta"}</button>
            <button onClick={resetForm} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
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
                <tr><td colSpan={9} className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
              ) : cuentasMostradas.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Sin cuentas. Agrega la primera con "Nueva Cuenta".</td></tr>
              ) : cuentasMostradas.map(c => (
                <tr key={c.id} className={`border-t border-white/5 hover:bg-white/[0.02] ${c.activa === false ? "opacity-50" : ""}`}>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${c.activa === false ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                      {c.activa === false ? "Inactiva" : "Activa"}
                    </span>
                  </td>
                  <td className="p-3 text-white font-medium">{c.banco}</td>
                  <td className="p-3 text-slate-300 font-mono text-xs">{c.cuenta}</td>
                  <td className="p-3 text-slate-400 font-mono text-xs">{c.clabe}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full">{c.empresa}</span></td>
                  <td className="p-3 text-slate-300">{c.tipo}</td>
                  <td className="p-3 text-right text-emerald-400 font-medium">${(c.saldo || 0).toLocaleString()}</td>
                  <td className="p-3 text-slate-500 text-xs">{c.updated_at ? new Date(c.updated_at).toLocaleDateString("es-MX") : (c.created_at ? new Date(c.created_at).toLocaleDateString("es-MX") : "—")}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => abrirEdicion(c)} title="Editar" className="p-1.5 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg">
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
    </div>
  );
}
