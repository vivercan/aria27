"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  FolderOpen,
  Plus,
  FileText,
  Upload,
  Trash2,
  ChevronRight,
  Building2,
  ClipboardList,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  FolderPlus,
} from "lucide-react";

interface Obra {
  id: number;
  name: string;
}

interface Carpeta {
  id: string;
  obra_id: number;
  obra_nombre: string;
  nombre: string;
  descripcion: string;
  created_at: string;
}

interface Archivo {
  id: string;
  carpeta_id: string;
  nombre: string;
  tipo: string;
  url: string;
  created_at: string;
}

interface Tarea {
  id: string;
  obra_nombre: string;
  titulo: string;
  responsable: string;
  fecha_limite: string;
  prioridad: string;
  status: string;
}

export default function ExpedientesPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionada, setObraSeleccionada] = useState<Obra | null>(null);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<Carpeta | null>(null);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"carpetas" | "tareas">("carpetas");

  // Modales
  const [showNuevaCarpeta, setShowNuevaCarpeta] = useState(false);
  const [showNuevaTarea, setShowNuevaTarea] = useState(false);
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState("");
  const [nuevaTarea, setNuevaTarea] = useState({ titulo: "", responsable: "", fecha_limite: "", prioridad: "normal" });

  useEffect(() => {
    loadObras();
  }, []);

  useEffect(() => {
    if (obraSeleccionada) {
      loadCarpetas(obraSeleccionada.id);
      loadTareas(obraSeleccionada.id);
    }
  }, [obraSeleccionada]);

  useEffect(() => {
    if (carpetaSeleccionada) {
      loadArchivos(carpetaSeleccionada.id);
    }
  }, [carpetaSeleccionada]);

  const loadObras = async () => {
    const { data, error } = await supabase.from("centros_trabajo").select("id, name:nombre").order("nombre");
    if (error) {
      console.error("Error loading obras:", error.message);
      setLoading(false);
      return;
    }
    setObras(data || []);
    setLoading(false);
  };

  const loadCarpetas = async (obraId: number) => {
    const { data, error } = await supabase
      .from("expedientes_carpetas")
      .select("*")
      .eq("obra_id", obraId)
      .order("orden");
    if (error) {
      console.error("Error loading carpetas:", error.message);
      return;
    }
    setCarpetas(data || []);
  };

  const loadArchivos = async (carpetaId: string) => {
    const { data, error } = await supabase
      .from("expedientes_archivos")
      .select("*")
      .eq("carpeta_id", carpetaId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading archivos:", error.message);
      return;
    }
    setArchivos(data || []);
  };

  const loadTareas = async (obraId: number) => {
    const { data, error } = await supabase
      .from("tareas_obra")
      .select("*")
      .eq("obra_id", obraId)
      .order("fecha_limite");
    if (error) {
      console.error("Error loading tareas:", error.message);
      return;
    }
    setTareas(data || []);
  };

  const crearCarpeta = async () => {
    if (!nuevaCarpetaNombre.trim() || !obraSeleccionada) return;

    const { error } = await supabase.from("expedientes_carpetas").insert({
      obra_id: obraSeleccionada.id,
      obra_nombre: obraSeleccionada.name,
      nombre: nuevaCarpetaNombre,
      orden: carpetas.length,
    });

    if (error) {
      console.error("Error creating carpeta:", error.message);
      return;
    }

    setNuevaCarpetaNombre("");
    setShowNuevaCarpeta(false);
    loadCarpetas(obraSeleccionada.id);
  };

  const crearTarea = async () => {
    if (!nuevaTarea.titulo.trim() || !obraSeleccionada) return;

    const { error } = await supabase.from("tareas_obra").insert({
      obra_id: obraSeleccionada.id,
      obra_nombre: obraSeleccionada.name,
      ...nuevaTarea,
    });

    if (error) {
      console.error("Error creating tarea:", error.message);
      return;
    }

    setNuevaTarea({ titulo: "", responsable: "", fecha_limite: "", prioridad: "normal" });
    setShowNuevaTarea(false);
    loadTareas(obraSeleccionada.id);
  };

  const toggleTareaStatus = async (tarea: Tarea) => {
    const newStatus = tarea.status === "completada" ? "pendiente" : "completada";
    const { error } = await supabase.from("tareas_obra").update({
      status: newStatus,
      completed_at: newStatus === "completada" ? new Date().toISOString() : null
    }).eq("id", tarea.id);

    if (error) {
      console.error("Error updating tarea status:", error.message);
      return;
    }

    if (obraSeleccionada) loadTareas(obraSeleccionada.id);
  };

  const eliminarCarpeta = async (id: string) => {
    if (!confirm("¿Eliminar esta carpeta y todos sus archivos?")) return;
    const { error } = await supabase.from("expedientes_carpetas").delete().eq("id", id);

    if (error) {
      console.error("Error deleting carpeta:", error.message);
      return;
    }

    setCarpetaSeleccionada(null);
    if (obraSeleccionada) loadCarpetas(obraSeleccionada.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !carpetaSeleccionada) return;
    const file = e.target.files[0];

    // Subir a Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error } = await supabase.storage
      .from("expedientes")
      .upload(fileName, file);

    if (error) {
      alert("Error al subir archivo: " + error.message);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("expedientes").getPublicUrl(fileName);

    const { error: insertError } = await supabase.from("expedientes_archivos").insert({
      carpeta_id: carpetaSeleccionada.id,
      nombre: file.name,
      tipo: file.type,
      url: publicUrl,
      tamano_bytes: file.size,
    });

    if (insertError) {
      console.error("Error inserting archivo record:", insertError.message);
      return;
    }

    loadArchivos(carpetaSeleccionada.id);
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "text-red-400 bg-red-500/20";
      case "media": return "text-amber-400 bg-amber-500/20";
      default: return "text-emerald-400 bg-emerald-500/20";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // Vista: Lista de Obras
  if (!obraSeleccionada) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/obras" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Expedientes de Obra</h1>
            <p className="text-slate-400 text-sm">Selecciona una obra para ver sus documentos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map((obra) => (
            <button
              key={obra.id}
              onClick={() => setObraSeleccionada(obra)}
              className="p-6 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {obra.name}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Ver expediente</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Vista: Expediente de Obra
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setObraSeleccionada(null); setCarpetaSeleccionada(null); }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{obraSeleccionada.name}</h1>
            <p className="text-slate-400 text-sm">Expediente de obra</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("carpetas")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "carpetas" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <FolderOpen className="w-4 h-4 inline mr-2" />
          Carpetas
        </button>
        <button
          onClick={() => setActiveTab("tareas")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "tareas" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <ClipboardList className="w-4 h-4 inline mr-2" />
          Tareas ({tareas.filter(t => t.status !== "completada").length})
        </button>
      </div>

      {/* Tab: Carpetas */}
      {activeTab === "carpetas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Carpetas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Carpetas</h2>
              <button
                onClick={() => setShowNuevaCarpeta(true)}
                className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="space-y-2">
              {carpetas.map((carpeta) => (
                <button
                  key={carpeta.id}
                  onClick={() => setCarpetaSeleccionada(carpeta)}
                  className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                    carpetaSeleccionada?.id === carpeta.id
                      ? "bg-blue-500/20 border-blue-500"
                      : "bg-white/5 hover:bg-white/10 border-transparent"
                  } border`}
                >
                  <FolderOpen className={`w-5 h-5 ${carpetaSeleccionada?.id === carpeta.id ? "text-blue-400" : "text-amber-400"}`} />
                  <span className="text-white font-medium">{carpeta.nombre}</span>
                </button>
              ))}

              {carpetas.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <FolderPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay carpetas</p>
                  <p className="text-sm">Crea una para organizar documentos</p>
                </div>
              )}
            </div>
          </div>

          {/* Archivos de la Carpeta */}
          <div className="lg:col-span-2 bg-white/5 rounded-xl p-6 border border-white/10">
            {carpetaSeleccionada ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-amber-400" />
                    {carpetaSeleccionada.nombre}
                  </h2>
                  <div className="flex gap-2">
                    <label className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-medium">Subir archivo</span>
                      <input type="file" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button
                      onClick={() => eliminarCarpeta(carpetaSeleccionada.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {archivos.map((archivo) => (
                    <a
                      key={archivo.id}
                      href={archivo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <FileText className="w-5 h-5 text-blue-400" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{archivo.nombre}</p>
                        <p className="text-slate-400 text-xs">{new Date(archivo.created_at).toLocaleDateString()}</p>
                      </div>
                    </a>
                  ))}

                  {archivos.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay archivos en esta carpeta</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Selecciona una carpeta para ver sus archivos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Tareas */}
      {activeTab === "tareas" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowNuevaTarea(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Tarea
            </button>
          </div>

          <div className="space-y-3">
            {tareas.map((tarea) => (
              <div
                key={tarea.id}
                className={`p-4 rounded-xl border transition-all ${
                  tarea.status === "completada"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTareaStatus(tarea)}
                    className={`mt-1 p-1 rounded-full transition-colors ${
                      tarea.status === "completada"
                                 ? "bg-emerald-500 text-white"
                        : "bg-white/10 text-slate-400 hover:bg-white/20"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-medium ${tarea.status === "completada" ? "text-emerald-300 line-through" : "text-white"}`}>
                      {tarea.titulo}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      {tarea.responsable && (
                        <span className="text-slate-400">👤 {tarea.responsable}</span>
                      )}
                      {tarea.fecha_limite && (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(tarea.fecha_limite).toLocaleDateString()}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPrioridadColor(tarea.prioridad)}`}>
                        {tarea.prioridad}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {tareas.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No hay tareas para esta obra</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nueva Carpeta */}
      {showNuevaCarpeta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nueva Carpeta</h3>
              <button onClick={() => setShowNuevaCarpeta(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nombre de la carpeta"
              value={nuevaCarpetaNombre}
              onChange={(e) => setNuevaCarpetaNombre(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNuevaCarpeta(false)} className="px-4 py-2 text-slate-400 hover:text-white">
                Cancelar
              </button>
              <button onClick={crearCarpeta} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium">
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Tarea */}
      {showNuevaTarea && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nueva Tarea</h3>
              <button onClick={() => setShowNuevaTarea(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Título de la tarea"
                value={nuevaTarea.titulo}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Responsable"
                value={nuevaTarea.responsable}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, responsable: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <input
                type="date"
                value={nuevaTarea.fecha_limite}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, fecha_limite: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <select
                value={nuevaTarea.prioridad}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, prioridad: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="normal">Prioridad Normal</option>
                <option value="media">Prioridad Media</option>
                <option value="alta">Prioridad Alta</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNuevaTarea(false)} className="px-4 py-2 text-slate-400 hover:text-white">
                Cancelar
              </button>
              <button onClick={crearTarea} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium">
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

