"use client";
import AriaBackButton from "@/components/AriaBackButton";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";
import { Truck, Plus, Search, Check, Package, Eye, Calendar, Image, FileText, ExternalLink } from "lucide-react";

interface Entrega {
  id: string;
  folio: string;
  fecha_entrega: string;
  hora_entrega: string;
  proveedor_nombre: string;
  obra_nombre: string;
  recibido_por_nombre: string;
  status: string;
  observaciones: string;
  materiales_recibidos: any[];
  purchase_order_id: number | null;
  purchase_order_folio: string | null;
  foto_url: string | null;
  solicitante_email: string | null;
  created_at: string;
}

interface Obra { id: string; name: string; }
interface Empleado { id: string; full_name: string; }

export default function EntregasPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetalle, setShowDetalle] = useState<Entrega | null>(null);
  const [obras, setObras] = useState<Obra[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [folio, setFolio] = useState("");
  const [form, setForm] = useState({
    fecha_entrega: new Date().toISOString().split("T")[0],
    hora_entrega: new Date().toTimeString().slice(0, 5),
    proveedor_nombre: "",
    obra_nombre: "",
    recibido_por_nombre: "",
    status: "COMPLETA",
    observaciones: "",
    materiales: [{ producto: "", cantidad_pedida: 0, cantidad_recibida: 0, observacion: "" }]
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const { data } = await supabase.from("entregas").select("*").order("created_at", { ascending: false });
    if (data) setEntregas(data);

    const { data: obrasData } = await supabase.from("centros_trabajo").select("id, name:nombre").eq("activo", true);
    if (obrasData) setObras(obrasData);

    const { data: empsData } = await supabase.from("Personal").select("id, full_name").eq("status", "ACTIVO");
    if (empsData) setEmpleados(empsData);

    const num = (data?.length || 0) + 1;
    setFolio(`ENT-${String(num).padStart(5, "0")}`);
    setLoading(false);
  };

  const agregarMaterial = () => {
    setForm({...form, materiales: [...form.materiales, { producto: "", cantidad_pedida: 0, cantidad_recibida: 0, observacion: "" }]});
  };

  const actualizarMaterial = (idx: number, campo: string, valor: any) => {
    const materiales = [...form.materiales];
    materiales[idx] = {...materiales[idx], [campo]: valor};
    setForm({...form, materiales});
  };

  const eliminarMaterial = (idx: number) => {
    if (form.materiales.length === 1) return;
    setForm({...form, materiales: form.materiales.filter((_, i) => i !== idx)});
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.proveedor_nombre?.trim()) errors.proveedor_nombre = "El proveedor es obligatorio";
    if (!form.obra_nombre?.trim()) errors.obra_nombre = "La obra es obligatoria";
    if (!form.recibido_por_nombre?.trim()) errors.recibido_por_nombre = "Quien recibe es obligatorio";
    if (!form.fecha_entrega?.trim()) errors.fecha_entrega = "La fecha de entrega es obligatoria";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardarEntrega = async () => {
    if (!validar()) return;
    const { error } = await supabase.from("entregas").insert({
      folio,
      fecha_entrega: form.fecha_entrega,
      hora_entrega: form.hora_entrega,
      proveedor_nombre: form.proveedor_nombre,
      obra_nombre: form.obra_nombre,
      recibido_por_nombre: form.recibido_por_nombre,
      status: form.status,
      observaciones: form.observaciones,
      materiales_recibidos: form.materiales.filter(m => m.producto)
    });
    if (error) {  flash("err", "Error al guardar"); return; }
    setShowModal(false);
    setForm({ fecha_entrega: new Date().toISOString().split("T")[0], hora_entrega: new Date().toTimeString().slice(0, 5), proveedor_nombre: "", obra_nombre: "", recibido_por_nombre: "", status: "COMPLETA", observaciones: "", materiales: [{ producto: "", cantidad_pedida: 0, cantidad_recibida: 0, observacion: "" }] });
    cargarDatos();
  };

  const entregasFiltradas = entregas.filter(e =>
    e.folio?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.proveedor_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.obra_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.purchase_order_folio?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    if (status === "COMPLETA") return "bg-emerald-500";
    if (status === "PARCIAL") return "bg-amber-500";
    return "bg-red-500";
  };

  const stats = {
    total: entregas.length,
    conOC: entregas.filter(e => e.purchase_order_folio).length,
    conFoto: entregas.filter(e => e.foto_url).length,
    hoy: entregas.filter(e => e.fecha_entrega === new Date().toISOString().split("T")[0]).length,
  };

  return (
    <div className="h-full flex flex-col">
      <FlashBanner msg={msg} />
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <AriaBackButton href="/dashboard/requisiciones" />
          <div className="p-3 rounded-xl bg-blue-500/20">
            <Truck className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Entregas de Material</h1>
            <p className="text-slate-400 text-sm">{entregas.length} entregas registradas</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium">
          <Plus className="w-4 h-4" /> Nueva Entrega
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4 shrink-0">
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
          <p className="text-blue-400 font-bold text-lg">{stats.total}</p>
          <p className="text-slate-500 text-[9px]">Total</p>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-emerald-400 font-bold text-lg">{stats.conOC}</p>
          <p className="text-slate-500 text-[9px]">Con OC</p>
        </div>
        <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
          <p className="text-violet-400 font-bold text-lg">{stats.conFoto}</p>
          <p className="text-slate-500 text-[9px]">Con Foto</p>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-amber-400 font-bold text-lg">{stats.hoy}</p>
          <p className="text-slate-500 text-[9px]">Hoy</p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Buscar por folio, proveedor, obra o OC..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none" />
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 py-8">Cargando...</div>
        ) : entregasFiltradas.length === 0 ? (
          <div className="text-center text-slate-400 py-8 bg-white/5 rounded-xl">No hay entregas registradas</div>
        ) : entregasFiltradas.map(e => (
          <div key={e.id} className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.06] transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-blue-400 font-mono font-bold">{e.folio}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${getStatusColor(e.status)}`}>{e.status}</span>
                    {e.purchase_order_folio && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" />{e.purchase_order_folio}
                      </span>
                    )}
                    {e.foto_url && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-400 flex items-center gap-1">
                        <Image className="w-3 h-3" />Foto
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium">{e.proveedor_nombre}</p>
                  <p className="text-slate-400 text-sm">{e.obra_nombre} • Recibió: {e.recibido_por_nombre || "Pendiente"}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Calendar className="w-4 h-4" />
                  {e.fecha_entrega} {e.hora_entrega}
                </div>
                <button onClick={() => setShowDetalle(e)} className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-slate-300 text-sm">
                  <Eye className="w-4 h-4" /> Ver
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nueva Entrega */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Entrega de Material</h2>
            <div className="text-blue-400 font-mono mb-4">Folio: {folio}</div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Fecha</label>
                <input type="date" value={form.fecha_entrega} onChange={e => setForm({...form, fecha_entrega: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Hora</label>
                <input type="time" value={form.hora_entrega} onChange={e => setForm({...form, hora_entrega: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Proveedor *</label>
                <input type="text" value={form.proveedor_nombre} onChange={e => setForm({...form, proveedor_nombre: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Nombre del proveedor" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Obra *</label>
                <select value={form.obra_nombre} onChange={e => setForm({...form, obra_nombre: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="">Seleccionar...</option>
                  {obras.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Recibido por *</label>
                <select value={form.recibido_por_nombre} onChange={e => setForm({...form, recibido_por_nombre: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="">Seleccionar...</option>
                  {empleados.map(e => <option key={e.id} value={e.full_name}>{e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Estado</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="COMPLETA">Completa</option>
                  <option value="PARCIAL">Parcial</option>
                  <option value="RECHAZADA">Rechazada</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-400 font-medium">Materiales</label>
                <button onClick={agregarMaterial} className="text-xs text-blue-400 hover:text-blue-300">+ Agregar</button>
              </div>
              <div className="space-y-2">
                {form.materiales.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input type="text" placeholder="Producto" value={m.producto} onChange={e => actualizarMaterial(idx, "producto", e.target.value)} className="col-span-5 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm" />
                    <input type="number" placeholder="Pedido" value={m.cantidad_pedida || ""} onChange={e => actualizarMaterial(idx, "cantidad_pedida", parseInt(e.target.value) || 0)} className="col-span-2 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm text-center" />
                    <input type="number" placeholder="Recibido" value={m.cantidad_recibida || ""} onChange={e => actualizarMaterial(idx, "cantidad_recibida", parseInt(e.target.value) || 0)} className="col-span-2 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm text-center" />
                    <input type="text" placeholder="Nota" value={m.observacion} onChange={e => actualizarMaterial(idx, "observacion", e.target.value)} className="col-span-2 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm" />
                    <button onClick={() => eliminarMaterial(idx)} className="col-span-1 text-red-400 hover:text-red-300 text-center">×</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">Observaciones</label>
              <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Notas adicionales..." />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">Cancelar</button>
              <button onClick={guardarEntrega} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"><Check className="w-4 h-4 inline mr-2" />Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {showDetalle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Detalle de Entrega</h2>
              <span className="text-blue-400 font-mono">{showDetalle.folio}</span>
            </div>
            
            {/* Vínculo a OC */}
            {showDetalle.purchase_order_folio && (
              <div className="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <span className="text-cyan-400 font-medium">Orden de Compra: {showDetalle.purchase_order_folio}</span>
                  </div>
                  <Link href="/dashboard/requisiciones/requisiciones/ordenes" className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm">
                    Ver OC <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* Foto */}
            {showDetalle.foto_url && (
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-2 flex items-center gap-2"><Image className="w-4 h-4" />Evidencia fotográfica:</p>
                <a href={showDetalle.foto_url} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-colors">
                  📷 Ver foto de evidencia
                </a>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><span className="text-slate-400 text-sm">Fecha:</span><p className="text-white">{showDetalle.fecha_entrega} {showDetalle.hora_entrega}</p></div>
              <div><span className="text-slate-400 text-sm">Estado:</span><p><span className={`px-2 py-0.5 rounded text-xs text-white ${getStatusColor(showDetalle.status)}`}>{showDetalle.status}</span></p></div>
              <div><span className="text-slate-400 text-sm">Proveedor:</span><p className="text-white">{showDetalle.proveedor_nombre}</p></div>
              <div><span className="text-slate-400 text-sm">Obra:</span><p className="text-white">{showDetalle.obra_nombre}</p></div>
              <div className="col-span-2"><span className="text-slate-400 text-sm">Recibió:</span><p className="text-white">{showDetalle.recibido_por_nombre || "Pendiente confirmar"}</p></div>
              {showDetalle.solicitante_email && (
                <div className="col-span-2"><span className="text-slate-400 text-sm">Solicitante:</span><p className="text-white">{showDetalle.solicitante_email}</p></div>
              )}
            </div>

            {showDetalle.materiales_recibidos && showDetalle.materiales_recibidos.length > 0 && (
              <div className="mb-4">
                <span className="text-slate-400 text-sm">Materiales:</span>
                <div className="mt-2 space-y-1">
                  {showDetalle.materiales_recibidos.map((m: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm bg-white/5 px-3 py-2 rounded">
                      <span className="text-white">{m.producto || m.product_name}</span>
                      <span className="text-slate-400">{m.quantity || m.cantidad_recibida} {m.unit || ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showDetalle.observaciones && (
              <div className="mb-4"><span className="text-slate-400 text-sm">Observaciones:</span><p className="text-white">{showDetalle.observaciones}</p></div>
            )}

            <div className="flex justify-end">
              <button onClick={() => setShowDetalle(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
