"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, Send, Package, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Producto { id: string; codigo: string; nombre: string; unidad: string; }
interface Material { producto_id: string; codigo: string; nombre: string; unidad: string; cantidad: number; notas: string; }
interface Centro { id: string; name: string; }

export default function NuevaRequisicionPage() {
  const router = useRouter();
  const [centros, setCentros] = useState<Centro[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [form, setForm] = useState({ cost_center_id: "", urgency: "normal", required_date: "", notes: "" });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const { data: c } = await supabase.from("cost_centers").select("id, name").eq("active", true);
      if (c) setCentros(c);
      const { data: p } = await supabase.from("products").select("id, codigo, nombre, unidad").eq("activo", true).limit(500);
      if (p) setProductos(p);
    };
    cargar();
  }, []);

  const filtrados = productos.filter(p => 
    p.nombre?.toLowerCase().includes(search.toLowerCase()) || 
    p.codigo?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10);

  const agregarMaterial = (p: Producto) => {
    if (materiales.find(m => m.producto_id === p.id)) return;
    setMateriales([...materiales, { producto_id: p.id, codigo: p.codigo, nombre: p.nombre, unidad: p.unidad, cantidad: 1, notas: "" }]);
    setSearch("");
    setShowSearch(false);
  };

  const actualizarCantidad = (idx: number, cant: number) => {
    const nuevo = [...materiales];
    nuevo[idx].cantidad = cant;
    setMateriales(nuevo);
  };

  const quitarMaterial = (idx: number) => {
    setMateriales(materiales.filter((_, i) => i !== idx));
  };

  const enviar = async () => {
    if (!form.cost_center_id) return alert("Selecciona una obra");
    if (materiales.length === 0) return alert("Agrega al menos un material");
    
    setEnviando(true);
    try {
      const userEmail = localStorage.getItem("userEmail");
      const centro = centros.find(c => c.id === form.cost_center_id);
      
      const res = await fetch("/api/requisicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          cost_center_id: form.cost_center_id,
          cost_center_name: centro?.name,
          urgency: form.urgency,
          required_date: form.required_date || null,
          notes: form.notes,
          materials: materiales.map(m => ({ product_id: m.producto_id, product_name: m.nombre, unit: m.unidad, quantity: m.cantidad, notes: m.notas }))
        })
      });
      
      if (res.ok) {
        alert("✅ Requisición creada exitosamente");
        router.push("/dashboard/requisiciones");
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || "No se pudo crear"));
      }
    } catch (e) {
      alert("Error de conexión");
    }
    setEnviando(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none p-6 border-b border-white/10">
        <Link href="/dashboard/requisiciones" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Requisiciones
        </Link>
        <h1 className="text-2xl font-bold text-white">Nueva Requisición</h1>
        <p className="text-slate-400">Solicitar materiales o servicios</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl space-y-6">
          {/* Datos generales */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h2 className="text-lg font-semibold text-white">Datos Generales</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-400">Obra / Centro de Costo *</label>
                <select value={form.cost_center_id} onChange={e => setForm({...form, cost_center_id: e.target.value})}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="">Seleccionar...</option>
                  {centros.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400">Urgencia</label>
                <select value={form.urgency} onChange={e => setForm({...form, urgency: e.target.value})}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="normal">Normal</option>
                  <option value="urgente">Urgente</option>
                  <option value="critico">Crítico</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-400">Fecha requerida</label>
                <input type="date" value={form.required_date} onChange={e => setForm({...form, required_date: e.target.value})}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400">Notas</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="" />
            </div>
          </div>

          {/* Materiales */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Materiales ({materiales.length})</h2>
              <div className="relative">
                <button onClick={() => setShowSearch(!showSearch)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  <Plus className="w-4 h-4" /> Agregar
                </button>
                {showSearch && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-10">
                    <div className="p-3 border-b border-white/10">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                          className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm" />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-auto">
                      {filtrados.map(p => (
                        <button key={p.id} onClick={() => agregarMaterial(p)}
                          className="w-full p-3 text-left hover:bg-white/5 border-b border-white/5">
                          <p className="text-white text-sm">{p.nombre}</p>
                          <p className="text-xs text-slate-400">{p.codigo} • {p.unidad}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {materiales.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                <p className="text-slate-400">Agrega materiales a la requisición</p>
              </div>
            ) : (
              <div className="space-y-2">
                {materiales.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white text-sm">{m.nombre}</p>
                      <p className="text-xs text-slate-400">{m.codigo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" value={m.cantidad} onChange={e => actualizarCantidad(idx, parseInt(e.target.value) || 1)}
                        className="w-20 p-2 bg-white/5 border border-white/10 rounded text-white text-center" />
                      <span className="text-slate-400 text-sm w-16">{m.unidad}</span>
                    </div>
                    <button onClick={() => quitarMaterial(idx)} className="p-2 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón enviar */}
          <button onClick={enviar} disabled={enviando || materiales.length === 0}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
            <Send className="w-5 h-5" />
            {enviando ? "Enviando..." : "Crear Requisición"}
          </button>
        </div>
      </div>
    </div>
  );
}
