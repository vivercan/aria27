"use client";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Search, Truck, Wrench, Package, Edit2, Trash2, Users, Settings, Calendar, AlertTriangle, Check, Loader2, FolderOpen } from "lucide-react";
import { EntityFolderDrawer } from "@/components/EntityFolder";
import { useFlashMessage } from "@/hooks/useFlashMessage";

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

interface Asignacion {
  id: string;
  activo_id: string;
  empleado_id: string;
  obra_nombre: string;
  fecha_asignacion: string;
  fecha_devolucion: string | null;
  observaciones: string;
  activa: boolean;
  activo?: Activo;
  empleado?: { full_name: string };
}

interface Mantenimiento {
  id: string;
  activo_id: string;
  tipo: string;
  fecha: string;
  kilometraje: number;
  horas_uso: number;
  descripcion: string;
  costo: number;
  proveedor: string;
  proximo_servicio: string;
  proximo_km: number;
  activo?: Activo;
}

const TIPOS = ["TODOS", "VEHICULO", "MAQUINARIA", "HERRAMIENTA", "EQUIPO"];
const ESTADOS = { DISPONIBLE: "bg-emerald-500", EN_USO: "bg-blue-500", MANTENIMIENTO: "bg-amber-500", BAJA: "bg-red-500" };

export default function ActivosCatalogoPage() {
  const [tab, setTab] = useState<"inventario" | "asignaciones" | "mantenimiento">("inventario");
  const { userEmail, canDelete } = useDeletePermission();
  const { mensaje, msg } = useFlashMessage();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [activos, setActivos] = useState<Activo[]>([]);
  const [expedienteActivo, setExpedienteActivo] = useState<Activo|null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [empleados, setEmpleados] = useState<{id: string; full_name: string}[]>([]);
  const [obras, setObras] = useState<{id: number; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("TODOS");

  // Modales
  const [showModalActivo, setShowModalActivo] = useState(false);
  const [showModalAsignacion, setShowModalAsignacion] = useState(false);
  const [showModalMantenimiento, setShowModalMantenimiento] = useState(false);
  const [editando, setEditando] = useState<Activo | null>(null);

  // Forms
  const [formActivo, setFormActivo] = useState({
    codigo: "", nombre: "", tipo: "VEHICULO", marca: "", modelo: "", anio: new Date().getFullYear(),
    placas: "", estado: "DISPONIBLE", ubicacion_actual: "", kilometraje: 0, combustible: "GASOLINA"
  });
  const [formAsignacion, setFormAsignacion] = useState({
    activo_id: "", empleado_id: "", obra_nombre: "", fecha_asignacion: new Date().toISOString().split("T")[0], observaciones: ""
  });
  const [formMantenimiento, setFormMantenimiento] = useState({
    activo_id: "", tipo: "PREVENTIVO", fecha: new Date().toISOString().split("T")[0], kilometraje: 0,
    descripcion: "", costo: 0, proveedor: "", proximo_servicio: "", proximo_km: 0
  });

  // Form Errors
  const [erroresActivo, setErroresActivo] = useState<Record<string, string>>({});
  const [erroresAsignacion, setErroresAsignacion] = useState<Record<string, string>>({});
  const [erroresMantenimiento, setErroresMantenimiento] = useState<Record<string, string>>({});

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const { data: act, error: actError } = await supabase.from("activos").select("*").eq("activo", true).order("codigo");
    if (actError) {
    } else if (act) {
      setActivos(act);
    }

    const { data: asig, error: asigError } = await supabase.from("activos_asignaciones").select("*, activo:activos(*), empleado:Personal(full_name)").eq("activa", true).order("fecha_asignacion", { ascending: false });
    if (asigError) {
    } else if (asig) {
      setAsignaciones(asig);
    }

    const { data: mant, error: mantError } = await supabase.from("activos_mantenimiento").select("*, activo:activos(*)").order("fecha", { ascending: false });
    if (mantError) {
    } else if (mant) {
      setMantenimientos(mant);
    }

    const { data: emps, error: empsError } = await supabase.from("Personal").select("id, full_name").eq("status", "ACTIVO").order("full_name");
    if (empsError) {
    } else if (emps) {
      setEmpleados(emps);
    }

    const { data: obr, error: obrError } = await supabase.from("centros_trabajo").select("id, name:nombre").eq("activo", true);
    if (obrError) {
    } else if (obr) {
      setObras(obr);
    }

    setLoading(false);
  };

  // === CRUD ACTIVOS ===
  const validarActivo = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formActivo.codigo?.toString().trim()) errors.codigo = "Código es requerido";
    if (!formActivo.nombre?.toString().trim()) errors.nombre = "Nombre es requerido";
    if (formActivo.kilometraje && (isNaN(parseFloat(formActivo.kilometraje as any)) || parseFloat(formActivo.kilometraje as any) < 0)) {
      errors.kilometraje = "Kilometraje debe ser >= 0";
    }
    setErroresActivo(errors);
    return Object.keys(errors).length === 0;
  };

  const guardarActivo = async () => {
    if (!validarActivo()) return;
    if (editando) {
      const { error } = await supabase.from("activos").update(formActivo).eq("id", editando.id);
      if (error) { 
        return;
      }
    } else {
      const { error } = await supabase.from("activos").insert(formActivo);
      if (error) { 
        return;
      }
    }
    setShowModalActivo(false);
    setEditando(null);
    resetFormActivo();
    cargarDatos();
  };

  const eliminarActivo = async (id: string) => {
    setDeleteModal({open:true,id,name:""}); return; // Protected by DeleteModal
    const { error } = await supabase.from("activos").update({ activo: false }).eq("id", id);
    if (error) { 
      return;
    }
    cargarDatos();
  };

  const abrirEditarActivo = (activo: Activo) => {
    setEditando(activo);
    setFormActivo({
      codigo: activo.codigo, nombre: activo.nombre, tipo: activo.tipo, marca: activo.marca || "",
      modelo: activo.modelo || "", anio: activo.anio || new Date().getFullYear(), placas: activo.placas || "",
      estado: activo.estado, ubicacion_actual: activo.ubicacion_actual || "", kilometraje: activo.kilometraje || 0,
      combustible: activo.combustible || "GASOLINA"
    });
    setShowModalActivo(true);
  };

  const resetFormActivo = () => {
    setFormActivo({ codigo: "", nombre: "", tipo: "VEHICULO", marca: "", modelo: "", anio: new Date().getFullYear(), placas: "", estado: "DISPONIBLE", ubicacion_actual: "", kilometraje: 0, combustible: "GASOLINA" });
  };

  // === CRUD ASIGNACIONES ===
  const validarAsignacion = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formAsignacion.activo_id?.toString().trim()) errors.activo_id = "Selecciona un activo";
    if (!formAsignacion.empleado_id?.toString().trim()) errors.empleado_id = "Selecciona un empleado";
    setErroresAsignacion(errors);
    return Object.keys(errors).length === 0;
  };

  const guardarAsignacion = async () => {
    if (!validarAsignacion()) return;

    // OPTIMISTIC LOCK: solo asigna si el activo sigue DISPONIBLE
    const { data: lockRows, error: lockErr } = await supabase
      .from("activos")
      .update({ estado: "EN_USO" })
      .eq("id", formAsignacion.activo_id)
      .eq("estado", "DISPONIBLE")
      .select("id");
    if (lockErr) { msg("error", "Error al reservar activo: " + lockErr.message); return; }
    if (!lockRows || lockRows.length === 0) {
      msg("error", "Este activo ya no está DISPONIBLE. Recarga.");
      cargarDatos();
      return;
    }

    const { error: insertError } = await supabase.from("activos_asignaciones").insert(formAsignacion);
    if (insertError) {
      // Rollback: liberar activo
      await supabase.from("activos").update({ estado: "DISPONIBLE" }).eq("id", formAsignacion.activo_id).eq("estado", "EN_USO");
      msg("error", "Error al crear asignación: " + insertError.message);
      return;
    }

    setShowModalAsignacion(false);
    setFormAsignacion({ activo_id: "", empleado_id: "", obra_nombre: "", fecha_asignacion: new Date().toISOString().split("T")[0], observaciones: "" });
    cargarDatos();
  };

  const devolverActivo = async (asig: Asignacion) => {
    setDeleteModal({open:true,id:asig.id,name:""}); // Protected by DeleteModal
  };

  // === CRUD MANTENIMIENTO ===
  const validarMantenimiento = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formMantenimiento.activo_id?.toString().trim()) errors.activo_id = "Selecciona un activo";
    if (!formMantenimiento.descripcion?.toString().trim()) errors.descripcion = "Descripción es requerida";
    if (formMantenimiento.costo && (isNaN(parseFloat(formMantenimiento.costo as any)) || parseFloat(formMantenimiento.costo as any) < 0)) {
      errors.costo = "Costo debe ser >= 0";
    }
    if (formMantenimiento.proximo_km && (isNaN(parseFloat(formMantenimiento.proximo_km as any)) || parseFloat(formMantenimiento.proximo_km as any) < 0)) {
      errors.proximo_km = "Próximo km debe ser >= 0";
    }
    setErroresMantenimiento(errors);
    return Object.keys(errors).length === 0;
  };

  const guardarMantenimiento = async () => {
    if (!validarMantenimiento()) return;

    const { error: insertError } = await supabase.from("activos_mantenimiento").insert(formMantenimiento);
    if (insertError) {
      return;
    }

    if (formMantenimiento.tipo === "CORRECTIVO") {
      const { error: updateError } = await supabase.from("activos").update({ estado: "MANTENIMIENTO" }).eq("id", formMantenimiento.activo_id);
      if (updateError) {
        return;
      }
    }

    setShowModalMantenimiento(false);
    setFormMantenimiento({ activo_id: "", tipo: "PREVENTIVO", fecha: new Date().toISOString().split("T")[0], kilometraje: 0, descripcion: "", costo: 0, proveedor: "", proximo_servicio: "", proximo_km: 0 });
    cargarDatos();
  };

  // Filtros
  const activosFiltrados = activos.filter(a => {
    const matchBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || a.codigo.toLowerCase().includes(busqueda.toLowerCase()) || (a.placas && a.placas.toLowerCase().includes(busqueda.toLowerCase()));
    const matchTipo = tipoFiltro === "TODOS" || a.tipo === tipoFiltro;
    return matchBusqueda && matchTipo;
  });

  const activosDisponibles = activos.filter(a => a.estado === "DISPONIBLE");

  const getIcono = (tipo: string) => {
    if (tipo === "VEHICULO") return <Truck className="w-5 h-5" />;
    if (tipo === "MAQUINARIA") return <Wrench className="w-5 h-5" />;
    return <Package className="w-5 h-5" />;
  };

  const proximosMantenimientos = mantenimientos.filter(m => {
    if (!m.proximo_servicio) return false;
    const prox = new Date(m.proximo_servicio);
    const hoy = new Date();
    const diff = (prox.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  });
  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "activos_empresa", id: deleteModal.id, userEmail });
      setDeleteModal({open:false,id:"",name:""});
      cargarDatos();
    } catch (e) { /* handled by backupAndDelete */ }
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
            <h1 className="text-2xl font-bold text-white">Gestión de Activos</h1>
            <p className="text-slate-400 text-sm">{activos.length} activos • {asignaciones.length} asignados • {proximosMantenimientos.length} mantenimientos próximos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {[
          { id: "inventario", label: "Inventario", icon: Package, count: activos.length },
          { id: "asignaciones", label: "Asignaciones", icon: Users, count: asignaciones.length },
          { id: "mantenimiento", label: "Mantenimiento", icon: Settings, count: mantenimientos.length }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${tab === t.id ? "bg-emerald-600 text-white" : "text-slate-400 hover:bg-white/5"}`}>
            <t.icon className="w-4 h-4" /> {t.label} <span className="text-xs opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {mensaje && (
        <div className={`px-4 py-2 rounded-lg text-sm ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {mensaje.texto}
        </div>
      )}

      {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div> : (
        <>
          {/* ==================== TAB INVENTARIO ==================== */}
          {tab === "inventario" && (
            <>
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500" />
                </div>
                <div className="flex gap-2">
                  {TIPOS.map(tipo => (
                    <button key={tipo} onClick={() => setTipoFiltro(tipo)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${tipoFiltro === tipo ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
                      {tipo}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setEditando(null); resetFormActivo(); setShowModalActivo(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium">
                  <Plus className="w-4 h-4" /> Nuevo
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[60vh]">
                  <table className="w-full">
                    <thead className="bg-white/5 sticky top-0">
                      <tr className="text-left text-xs text-slate-400 uppercase">
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Activo</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Marca/Modelo</th>
                        <th className="px-4 py-3">Placas</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Obra</th>
                        <th className="px-4 py-3">Km/Hrs</th>
                        <th className="px-4 py-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {activosFiltrados.map(activo => (
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
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${ESTADOS[activo.estado as keyof typeof ESTADOS] || "bg-slate-500"}`}>{activo.estado}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-sm">{asignaciones.find(a => a.activo_id === activo.id && a.activa)?.obra_nombre || "-"}</td>
                          <td className="px-4 py-3 text-slate-400 text-sm">{activo.kilometraje ? activo.kilometraje.toLocaleString() : "-"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => setExpedienteActivo(activo)} title="Expediente" className="p-1.5 rounded bg-violet-500/20 text-violet-400 hover:bg-violet-500/30"><FolderOpen className="w-4 h-4" /></button>
                              <button onClick={() => abrirEditarActivo(activo)} className="p-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"><Edit2 className="w-4 h-4" /></button>
                              {canDelete && (<button onClick={() => eliminarActivo(activo.id)} className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-4 h-4" /></button>)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ==================== TAB ASIGNACIONES ==================== */}
          {tab === "asignaciones" && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-slate-400">{activosDisponibles.length} activos disponibles para asignar</p>
                <button onClick={() => setShowModalAsignacion(true)} disabled={activosDisponibles.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded-lg text-white font-medium">
                  <Plus className="w-4 h-4" /> Nueva Asignación
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr className="text-left text-xs text-slate-400 uppercase">
                      <th className="px-4 py-3">Activo</th>
                      <th className="px-4 py-3">Asignado a</th>
                      <th className="px-4 py-3">Obra</th>
                      <th className="px-4 py-3">Desde</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {asignaciones.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No hay asignaciones activas</td></tr>
                    ) : asignaciones.map(asig => (
                      <tr key={asig.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{asig.activo?.codigo}</div>
                          <div className="text-slate-400 text-sm">{asig.activo?.nombre}</div>
                        </td>
                        <td className="px-4 py-3 text-white">{asig.empleado?.full_name}</td>
                        <td className="px-4 py-3 text-slate-400">{asig.obra_nombre || "-"}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{asig.fecha_asignacion}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => devolverActivo(asig)} className="px-3 py-1.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-sm">
                            Devolver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ==================== TAB MANTENIMIENTO ==================== */}
          {tab === "mantenimiento" && (
            <>
              {proximosMantenimientos.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-400 font-medium mb-2">
                    <AlertTriangle className="w-5 h-5" /> Mantenimientos próximos (30 días)
                  </div>
                  <div className="space-y-1">
                    {proximosMantenimientos.map(m => (
                      <div key={m.id} className="text-sm text-slate-300">
                        {m.activo?.codigo} - {m.activo?.nombre}: <span className="text-amber-400">{m.proximo_servicio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={() => setShowModalMantenimiento(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-medium">
                  <Plus className="w-4 h-4" /> Registrar Servicio
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr className="text-left text-xs text-slate-400 uppercase">
                      <th className="px-4 py-3">Activo</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Costo</th>
                      <th className="px-4 py-3">Próximo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mantenimientos.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No hay registros de mantenimiento</td></tr>
                    ) : mantenimientos.map(mant => (
                      <tr key={mant.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{mant.activo?.codigo}</div>
                          <div className="text-slate-400 text-sm">{mant.activo?.nombre}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mant.tipo === "PREVENTIVO" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                            {mant.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{mant.fecha}</td>
                        <td className="px-4 py-3 text-slate-300 text-sm">{mant.descripcion}</td>
                        <td className="px-4 py-3 text-emerald-400">${mant.costo?.toLocaleString() || 0}</td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{mant.proximo_servicio || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ==================== MODAL ACTIVO ==================== */}
      {showModalActivo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">{editando ? "Editar Activo" : "Nuevo Activo"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-slate-400 mb-1">Código *</label><input type="text" value={formActivo.codigo} onChange={e => setFormActivo({...formActivo, codigo: e.target.value.toUpperCase()})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Tipo</label><select value={formActivo.tipo} onChange={e => setFormActivo({...formActivo, tipo: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"><option value="VEHICULO">Vehículo</option><option value="MAQUINARIA">Maquinaria</option><option value="HERRAMIENTA">Herramienta</option><option value="EQUIPO">Equipo</option></select></div>
              <div className="col-span-2"><label className="block text-sm text-slate-400 mb-1">Nombre *</label><input type="text" value={formActivo.nombre} onChange={e => setFormActivo({...formActivo, nombre: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Marca</label><input type="text" value={formActivo.marca} onChange={e => setFormActivo({...formActivo, marca: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Modelo</label><input type="text" value={formActivo.modelo} onChange={e => setFormActivo({...formActivo, modelo: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Año</label><input type="number" value={formActivo.anio} onChange={e => setFormActivo({...formActivo, anio: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Placas</label><input type="text" value={formActivo.placas} onChange={e => setFormActivo({...formActivo, placas: e.target.value.toUpperCase()})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Estado</label><select value={formActivo.estado} onChange={e => setFormActivo({...formActivo, estado: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"><option value="DISPONIBLE">Disponible</option><option value="EN_USO">En Uso</option><option value="MANTENIMIENTO">Mantenimiento</option><option value="BAJA">Baja</option></select></div>
              <div><label className="block text-sm text-slate-400 mb-1">Combustible</label><select value={formActivo.combustible} onChange={e => setFormActivo({...formActivo, combustible: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"><option value="GASOLINA">Gasolina</option><option value="DIESEL">Diésel</option><option value="ELECTRICO">Eléctrico</option><option value="NA">N/A</option></select></div>
              <div><label className="block text-sm text-slate-400 mb-1">Kilometraje</label><input type="number" value={formActivo.kilometraje} onChange={e => setFormActivo({...formActivo, kilometraje: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Ubicación</label><input type="text" value={formActivo.ubicacion_actual} onChange={e => setFormActivo({...formActivo, ubicacion_actual: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModalActivo(false); setEditando(null); }} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">Cancelar</button>
              <button onClick={guardarActivo} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium">{editando ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL ASIGNACION ==================== */}
      {showModalAsignacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Asignación</h2>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-400 mb-1">Activo *</label><select value={formAsignacion.activo_id} onChange={e => setFormAsignacion({...formAsignacion, activo_id: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"><option value="">Seleccionar...</option>{activosDisponibles.map(a => <option key={a.id} value={a.id}>{a.codigo} - {a.nombre}</option>)}</select></div>
              <div><label className="block text-sm text-slate-400 mb-1">Empleado *</label><select value={formAsignacion.empleado_id} onChange={e => setFormAsignacion({...formAsignacion, empleado_id: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"><option value="">Seleccionar...</option>{empleados.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
              <div><label className="block text-sm text-slate-400 mb-1">Obra</label><select value={formAsignacion.obra_nombre} onChange={e => setFormAsignacion({...formAsignacion, obra_nombre: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"><option value="">Seleccionar...</option>{obras.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}</select></div>
              <div><label className="block text-sm text-slate-400 mb-1">Fecha</label><input type="date" value={formAsignacion.fecha_asignacion} onChange={e => setFormAsignacion({...formAsignacion, fecha_asignacion: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Observaciones</label><input type="text" value={formAsignacion.observaciones} onChange={e => setFormAsignacion({...formAsignacion, observaciones: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModalAsignacion(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">Cancelar</button>
              <button onClick={guardarAsignacion} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium">Asignar</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL MANTENIMIENTO ==================== */}
      {showModalMantenimiento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Registrar Mantenimiento</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-sm text-slate-400 mb-1">Activo *</label><select value={formMantenimiento.activo_id} onChange={e => setFormMantenimiento({...formMantenimiento, activo_id: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"><option value="">Seleccionar...</option>{activos.map(a => <option key={a.id} value={a.id}>{a.codigo} - {a.nombre}</option>)}</select></div>
              <div><label className="block text-sm text-slate-400 mb-1">Tipo</label><select value={formMantenimiento.tipo} onChange={e => setFormMantenimiento({...formMantenimiento, tipo: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"><option value="PREVENTIVO">Preventivo</option><option value="CORRECTIVO">Correctivo</option><option value="REVISION">Revisión</option></select></div>
              <div><label className="block text-sm text-slate-400 mb-1">Fecha</label><input type="date" value={formMantenimiento.fecha} onChange={e => setFormMantenimiento({...formMantenimiento, fecha: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div className="col-span-2"><label className="block text-sm text-slate-400 mb-1">Descripción *</label><input type="text" value={formMantenimiento.descripcion} onChange={e => setFormMantenimiento({...formMantenimiento, descripcion: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="Cambio de aceite, afinación..." /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Kilometraje</label><input type="number" value={formMantenimiento.kilometraje} onChange={e => setFormMantenimiento({...formMantenimiento, kilometraje: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Costo $</label><input type="number" value={formMantenimiento.costo} onChange={e => setFormMantenimiento({...formMantenimiento, costo: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Proveedor/Taller</label><input type="text" value={formMantenimiento.proveedor} onChange={e => setFormMantenimiento({...formMantenimiento, proveedor: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Próximo Servicio</label><input type="date" value={formMantenimiento.proximo_servicio} onChange={e => setFormMantenimiento({...formMantenimiento, proximo_servicio: e.target.value})} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModalMantenimiento(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">Cancelar</button>
              <button onClick={guardarMantenimiento} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-medium">Registrar</button>
            </div>
          </div>
        </div>
      )}

      <EntityFolderDrawer
        open={!!expedienteActivo}
        onClose={() => setExpedienteActivo(null)}
        entityType="activo"
        entityId={expedienteActivo?.id || ""}
        entityName={expedienteActivo?.nombre}
      />

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({open:false,id:"",name:""})}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Activo"
      />
    </div>
  );
}
