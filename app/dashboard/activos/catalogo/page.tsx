"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Search, Truck, Wrench, Package, Filter, Edit2, Trash2, Eye } from "lucide-react";

interface Activo {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  marca: string;
  modelo: string;
  anio: number;
  placas: string;
  estado: string;
  ubicacion_actual: string;
  kilometraje: number;
  combustible: string;
}

const TIPOS = ["TODOS", "VEHICULO", "MAQUINARIA", "HERRAMIENTA", "EQUIPO"];
const ESTADOS = { DISPONIBLE: "bg-emerald-500", EN_USO: "bg-blue-500", MANTENIMIENTO: "bg-amber-500", BAJA: "bg-red-500" };

export default function ActivosCatalogoPage() {
  const [activos, setActivos] = useState<Activo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("TODOS");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Activo | null>(null);
  const [form, setForm] = useState({
    codigo: "", nombre: "", tipo: "VEHICULO", marca: "", modelo: "", anio: new Date().getFullYear(),
    placas: "", estado: "DISPONIBLE", ubicacion_actual: "", kilometraje: 0, combustible: "GASOLINA"
  });

  useEffect(() => { cargarActivos(); }, []);

  const cargarActivos = async () => {
    const { data } = await supabase.from("activos").select("*").eq("activo", true).order("codigo");
    if (data) setActivos(data);
    setLoading(false);
  };

  const guardarActivo = async () => {
    if (!form.codigo || !form.nombre) return alert("Código y nombre son requeridos");
    
    if (editando) {
      await supabase.from("activos").update(form).eq("id", editando.id);
    } else {
      await supabase.from("activos").insert(form);
    }
    setShowModal(false);
    setEditando(null);
    setForm({ codigo: "", nombre: "", tipo: "VEHICULO", marca: "", modelo: "", anio: new Date().getFullYear(), placas: "", estado: "DISPONIBLE", ubicacion_actual: "", kilometraje: 0, combustible: "GASOLINA" });
    cargarActivos();
  };

  const eliminarActivo = async (id: string) => {
    if (!confirm("¿Eliminar este activo?")) return;
    await supabase.from("activos").update({ activo: false }).eq("id", id);
    cargarActivos();
  };

  const abrirEditar = (activo: Activo) => {
    setEditando(activo);
    setForm({
      codigo: activo.codigo, nombre: activo.nombre, tipo: activo.tipo, marca: activo.marca || "",
      modelo: activo.modelo || "", anio: activo.anio || new Date().getFullYear(), placas: activo.placas || "",
      estado: activo.estado, ubicacion_actual: activo.ubicacion_actual || "", kilometraje: activo.kilometraje || 0,
      combustible: activo.combustible || "GASOLINA"
    });
    setShowModal(true);
  };

  const activosFiltrados = activos.filter(a => {
    const matchBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                          a.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          (a.placas && a.placas.toLowerCase().includes(busqueda.toLowerCase()));
    const matchTipo = tipoFiltro === "TODOS" || a.tipo === tipoFiltro;
    return matchBusqueda && matchTipo;
  });

  const getIcono = (tipo: string) => {
    if (tipo === "VEHICULO") return <Truck className="w-5 h-5" />;
    if (tipo === "MAQUINARIA") return <Wrench className="w-5 h-5" />;
    return <Package className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/activos" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Catálogo de Activos</h1>
            <p className="text-slate-400 text-sm">{activos.length} activos registrados</p>
          </div>
        </div>
        <button onClick={() => { setEditando(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium">
          <Plus className="w-4 h-4" /> Nuevo Activo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre, código o placas..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          {TIPOS.map(tipo => (
            <button key={tipo} onClick={() => setTipoFiltro(tipo)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tipoFiltro === tipo ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
              {tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 sticky top-0">
              <tr className="text-left text-xs text-slate-400 uppercase">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Activo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Marca/Modelo</th>
                <th className="px-4 py-3">Placas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Km</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : activosFiltrados.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No hay activos</td></tr>
              ) : activosFiltrados.map(activo => (
                <tr key={activo.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-emerald-400 font-mono text-sm">{activo.codigo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">{getIcono(activo.tipo)}</div>
                      <span className="text-white font-medium">{activo.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{activo.tipo}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{activo.marca} {activo.modelo}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{activo.placas || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${ESTADOS[activo.estado as keyof typeof ESTADOS] || "bg-gray-500"}`}>
                      {activo.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{activo.kilometraje ? activo.kilometraje.toLocaleString() : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => abrirEditar(activo)} className="p-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => eliminarActivo(activo.id)} className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">{editando ? "Editar Activo" : "Nuevo Activo"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Código *</label>
                <input type="text" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="VEH-001" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="VEHICULO">Vehículo</option>
                  <option value="MAQUINARIA">Maquinaria</option>
                  <option value="HERRAMIENTA">Herramienta</option>
                  <option value="EQUIPO">Equipo</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Camioneta Nissan NP300" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Marca</label>
                <input type="text" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Nissan" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Modelo</label>
                <input type="text" value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="NP300" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Año</label>
                <input type="number" value={form.anio} onChange={e => setForm({...form, anio: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Placas</label>
                <input type="text" value={form.placas} onChange={e => setForm({...form, placas: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="AGS-123-A" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="EN_USO">En Uso</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="BAJA">Baja</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Combustible</label>
                <select value={form.combustible} onChange={e => setForm({...form, combustible: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  <option value="GASOLINA">Gasolina</option>
                  <option value="DIESEL">Diésel</option>
                  <option value="ELECTRICO">Eléctrico</option>
                  <option value="NA">N/A</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Kilometraje</label>
                <input type="number" value={form.kilometraje} onChange={e => setForm({...form, kilometraje: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Ubicación</label>
                <input type="text" value={form.ubicacion_actual} onChange={e => setForm({...form, ubicacion_actual: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Obra Miravalle" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setEditando(null); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">Cancelar</button>
              <button onClick={guardarActivo} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium">
                {editando ? "Guardar Cambios" : "Crear Activo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
