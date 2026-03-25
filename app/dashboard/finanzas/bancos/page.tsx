"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Building2, Plus, DollarSign, CreditCard, TrendingUp, Pencil, Trash2 } from "lucide-react";

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
}

export default function BancosPage() {
  const router = useRouter();
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ banco: "", cuenta: "", clabe: "", titular: "", tipo: "Cheques", saldo: 0, moneda: "MXN", empresa: "AVANTE" });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data, error } = await supabase.from("cuentas_bancarias").select("*").order("banco");
      if (!error) setCuentas(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function guardar() {
    if (!form.banco || !form.cuenta) { alert("Banco y cuenta son requeridos"); return; }
    const { error } = await supabase.from("cuentas_bancarias").insert({ ...form, activa: true });
    if (error) alert("Error: " + error.message);
    else { setShowForm(false); setForm({ banco: "", cuenta: "", clabe: "", titular: "", tipo: "Cheques", saldo: 0, moneda: "MXN", empresa: "AVANTE" }); loadData(); }
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    await supabase.from("cuentas_bancarias").delete().eq("id", id);
    loadData();
  }

  const totalSaldo = cuentas.reduce((s, c) => s + (c.saldo || 0), 0);

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bancos</h1>
          <p className="text-slate-400 text-sm">Cuentas bancarias y saldos de las empresas del grupo</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Cuenta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Cuentas Activas", value: cuentas.filter(c => c.activa !== false).length, icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Saldo Total", value: `$${totalSaldo.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Bancos", value: new Set(cuentas.map(c => c.banco)).size, icon: Building2, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Nueva Cuenta Bancaria</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "banco", label: "Banco", placeholder: "Ej: BBVA, Banorte, HSBC" },
              { key: "cuenta", label: "No. Cuenta", placeholder: "Número de cuenta" },
              { key: "clabe", label: "CLABE", placeholder: "18 dígitos" },
              { key: "titular", label: "Titular", placeholder: "Nombre del titular" },
              { key: "empresa", label: "Empresa", placeholder: "AVANTE, DENIVEL, TERRACRET" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                <option>Cheques</option><option>Inversión</option><option>Crédito</option><option>Nómina</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Saldo Inicial</label>
              <input type="number" value={form.saldo} onChange={e => setForm({...form, saldo: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Banco</th>
                <th className="text-left p-3">Cuenta</th>
                <th className="text-left p-3">CLABE</th>
                <th className="text-left p-3">Empresa</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-right p-3">Saldo</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Cargando...</td></tr>
              ) : cuentas.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No hay cuentas registradas. Agrega la primera.</td></tr>
              ) : cuentas.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-white font-medium">{c.banco}</td>
                  <td className="p-3 text-slate-300 font-mono text-xs">{c.cuenta}</td>
                  <td className="p-3 text-slate-400 font-mono text-xs">{c.clabe}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full">{c.empresa}</span></td>
                  <td className="p-3 text-slate-300">{c.tipo}</td>
                  <td className="p-3 text-right text-emerald-400 font-medium">${(c.saldo || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => eliminar(c.id)} className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
