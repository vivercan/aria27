"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Receipt, Building, DollarSign, FileText, X } from "lucide-react";

interface Gasto {
  id: string;
  folio: string;
  tipo_pago: string;
  concepto: string;
  monto: number;
  tiene_factura: boolean;
  status: string;
  fecha_gasto: string;
  centro_trabajo?: { nombre: string };
}

export default function GastosObraPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [centros, setCentros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ centro_id: "", tipo_pago: "EFECTIVO", concepto: "", monto: "", tiene_factura: false });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: g } = await supabase
      .from("gastos_obra")
      .select("*, centro_trabajo:centros_trabajo(nombre)")
      .order("created_at", { ascending: false });
    if (g) setGastos(g);

    const { data: c } = await supabase.from("centros_trabajo").select("id, nombre").order("nombre");
    if (c) setCentros(c);
    setLoading(false);
  };

  const crearGasto = async () => {
    const folio = `GASTO-${Date.now().toString().slice(-6)}`;
    await supabase.from("gastos_obra").insert({
      folio,
      centro_trabajo_id: form.centro_id || null,
      tipo_pago: form.tipo_pago,
      concepto: form.concepto,
      monto: parseFloat(form.monto),
      tiene_factura: form.tiene_factura,
      fecha_gasto: new Date().toISOString().split("T")[0],
      status: "PENDIENTE",
    });
    setShowModal(false);
    setForm({ centro_id: "", tipo_pago: "EFECTIVO", concepto: "", monto: "", tiene_factura: false });
    cargarDatos();
  };

  const formatMoney = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const totalPendiente = gastos.filter(g => g.status === "PENDIENTE").reduce((s, g) => s + g.monto, 0);
  const totalEfectivo = gastos.filter(g => g.tipo_pago === "EFECTIVO" && g.status === "PENDIENTE").reduce((s, g) => s + g.monto, 0);
  const totalTransferencia = gastos.filter(g => g.tipo_pago === "TRANSFERENCIA" && g.status === "PENDIENTE").reduce((s, g) => s + g.monto, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gastos de Obra</h1>
          <p className="text-slate-400">Control de gastos por obra y tipo de pago</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Gasto
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl">
          <p className="text-amber-400 text-sm">Total Pendiente</p>
          <p className="text-2xl font-bold text-white">{formatMoney(totalPendiente)}</p>
        </div>
        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
          <p className="text-green-400 text-sm">Efectivo (Viernes)</p>
          <p className="text-2xl font-bold text-white">{formatMoney(totalEfectivo)}</p>
        </div>
        <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
          <p className="text-blue-400 text-sm">Transferencia</p>
          <p className="text-2xl font-bold text-white">{formatMoney(totalTransferencia)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr className="text-left text-slate-400 text-sm">
              <th className="p-3">Folio</th>
              <th className="p-3">Obra</th>
              <th className="p-3">Concepto</th>
              <th className="p-3 text-right">Monto</th>
              <th className="p-3 text-center">Tipo</th>
              <th className="p-3 text-center">Factura</th>
              <th className="p-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">Cargando...</td></tr>
            ) : gastos.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">No hay gastos registrados</td></tr>
            ) : (
              gastos.map((g) => (
                <tr key={g.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 text-cyan-400 font-mono text-sm">{g.folio}</td>
                  <td className="p-3 text-white">{g.centro_trabajo?.nombre || "Sin asignar"}</td>
                  <td className="p-3 text-slate-300">{g.concepto}</td>
                  <td className="p-3 text-right text-white font-medium">{formatMoney(g.monto)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${g.tipo_pago === "EFECTIVO" ? "bg-green-500/20 text-green-400" : g.tipo_pago === "TRANSFERENCIA" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}>
                      {g.tipo_pago}
                    </span>
                  </td>
                  <td className="p-3 text-center">{g.tiene_factura ? "✓" : "—"}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${g.status === "PENDIENTE" ? "bg-amber-500/20 text-amber-400" : g.status === "PAGADO" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/10 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Nuevo Gasto</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            <div className="space-y-4">
              <select value={form.centro_id} onChange={(e) => setForm({ ...form, centro_id: e.target.value })} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white">
                <option value="">Seleccionar obra</option>
                {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select value={form.tipo_pago} onChange={(e) => setForm({ ...form, tipo_pago: e.target.value })} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="URGENTE">Urgente</option>
              </select>
              <input type="text" placeholder="Concepto" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white" />
              <input type="number" placeholder="Monto" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white" />
              <label className="flex items-center gap-2 text-white">
                <input type="checkbox" checked={form.tiene_factura} onChange={(e) => setForm({ ...form, tiene_factura: e.target.checked })} className="w-4 h-4" />
                Tiene factura
              </label>
              <button onClick={crearGasto} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Registrar Gasto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
