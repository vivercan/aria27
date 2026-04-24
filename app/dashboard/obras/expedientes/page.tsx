"use client";
import { clientLogger } from "@/lib/client-logger";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { uploadAndInsert, buildPath } from "@/lib/storage";
import { useState, useEffect, useCallback } from "react";
import { useDropZone } from "@/lib/use-drop-zone";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import FlashBanner from "@/components/FlashBanner";
import ConfirmModal from "@/components/ConfirmModal";
import { useFlashMessage } from "@/hooks/useFlashMessage";
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
  Loader2,
  Pencil,
  CheckSquare,
  Square,
  FolderUp,
  Inbox,
} from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import { PromptModal } from "@/components/ui";

interface Obra {
  id: string;
  name: string;
  fecha_inicio?: string | null;
  anio?: number | null;
}

interface Carpeta {
  id: string;
  obra_id: string | null;
  obra_nombre: string | null;
  nombre: string;
  descripcion: string;
  anio?: number | null;
  parent_carpeta_id?: string | null;
  created_at: string;
}

interface Archivo {
  id: string;
  carpeta_id: string;
  nombre: string;
  tipo: string;
  url: string;
  tamano_bytes?: number | null;
  resumen?: string | null;
  paginas?: number | null;
  analizado_at?: string | null;
  created_at: string;
}

function formatBytes(bytes?: number | null): string {
  const log = clientLogger("EXPEDIENTES");
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
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

const ANOS_FIJOS = [2026, 2025, 2024, 2023, 2022, 2021];

export default function ExpedientesPage() {
  const log = clientLogger("EXPEDIENTES");
  const [obras, setObras] = useState<Obra[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [anioSeleccionado, setAnioSeleccionado] = useState<number | "SIN_ANIO" | null>(null);
  const [obraSeleccionada, setObraSeleccionada] = useState<Obra | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [carpetasAnio, setCarpetasAnio] = useState<Carpeta[]>([]);
  const [showNuevaCarpetaAnio, setShowNuevaCarpetaAnio] = useState(false);
  const [nuevaCarpetaAnioNombre, setNuevaCarpetaAnioNombre] = useState("");
  const [carpetaAnioSeleccionada, setCarpetaAnioSeleccionada] = useState<Carpeta | null>(null);
  const [rutaCarpetas, setRutaCarpetas] = useState<Carpeta[]>([]);
  const [subcarpetas, setSubcarpetas] = useState<Carpeta[]>([]);
  const [showNuevaSubcarpeta, setShowNuevaSubcarpeta] = useState(false);
  const [nuevaSubcarpetaNombre, setNuevaSubcarpetaNombre] = useState("");
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<Set<string>>(new Set());
  const [deleteCarpetaModal, setDeleteCarpetaModal] = useState<{open:boolean;id:string;nombre:string;isSub:boolean}>({open:false,id:"",nombre:"",isSub:false});
  // CV-07 18-Abr-2026: reemplaza window.prompt para renombrar carpeta
  const [renameModal, setRenameModal] = useState<{open:boolean;id:string;nombreActual:string;isSub:boolean}>({open:false,id:"",nombreActual:"",isSub:false});
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<Carpeta | null>(null);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"carpetas" | "tareas">("carpetas");
  const [archivosAnio, setArchivosAnio] = useState<Archivo[]>([]);
  const [archivosAnioSeleccionados, setArchivosAnioSeleccionados] = useState<Set<string>>(new Set());
  const [deleteArchivoAnioModal, setDeleteArchivoAnioModal] = useState<{open:boolean;archivos:Archivo[]}>({open:false,archivos:[]});

  const [carpetasPorAnio, setCarpetasPorAnio] = useState<Record<number, number>>({});

  // EXP-006 FIX: bandera para prevenir doble-clic en creación de carpetas
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);

  // Modales
  const [showNuevaCarpeta, setShowNuevaCarpeta] = useState(false);
  const [showNuevaTarea, setShowNuevaTarea] = useState(false);
  const [nuevaCarpetaNombre, setNuevaCarpetaNombre] = useState("");
  const [nuevaTarea, setNuevaTarea] = useState({ titulo: "", responsable: "", fecha_limite: "", prioridad: "normal" });
  const { msg, flash, clear } = useFlashMessage();
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: "", onOk: () => {} });

  const loadCarpetasCounts = async () => {
    const { data } = await supabase
      .from("expedientes_carpetas")
      .select("anio")
      .is("obra_id", null)
      .is("parent_carpeta_id", null)
      .not("nombre", "like", "__root__%");
    if (!data) return;
    const counts: Record<number, number> = {};
    data.forEach(r => { if (r.anio) counts[r.anio] = (counts[r.anio] || 0) + 1; });
    setCarpetasPorAnio(counts);
  };

  useEffect(() => {
    loadObras();
    loadCarpetasCounts();
  }, []);

  useEffect(() => {
    if (obraSeleccionada) {
      loadCarpetas(obraSeleccionada!.id);
      loadTareas(obraSeleccionada.id);
    }
  }, [obraSeleccionada]);

  useEffect(() => {
    if (anioSeleccionado && anioSeleccionado !== "SIN_ANIO") {
      loadCarpetasAnio(anioSeleccionado as number);
    } else {
      setCarpetasAnio([]);
    }
  }, [anioSeleccionado]);

  useEffect(() => {
    if (carpetaAnioSeleccionada) {
      loadArchivos(carpetaAnioSeleccionada.id);
      loadSubcarpetas(carpetaAnioSeleccionada.id);
      setArchivosSeleccionados(new Set());
    } else {
      setSubcarpetas([]);
      setRutaCarpetas([]);
      setArchivosSeleccionados(new Set());
    }
  }, [carpetaAnioSeleccionada]);

  // Polling: mientras haya archivos en análisis, refrescar cada 5s
  useEffect(() => {
    if (!carpetaAnioSeleccionada) return;
    const enAnalisis = archivos.filter(a => !a.resumen && !a.analizado_at);
    if (enAnalisis.length === 0) return;
    const t = setInterval(() => {
      if (carpetaAnioSeleccionada) loadArchivos(carpetaAnioSeleccionada.id);
    }, 5000);
    return () => clearInterval(t);
  }, [archivos, carpetaAnioSeleccionada]);

  // Polling: archivos sueltos del año en análisis
  useEffect(() => {
    if (!anioSeleccionado || anioSeleccionado === "SIN_ANIO" || carpetaAnioSeleccionada) return;
    const enAnalisis = archivosAnio.filter(a => !a.resumen && !a.analizado_at);
    if (enAnalisis.length === 0) return;
    const anio = anioSeleccionado as number;
    const t = setInterval(() => { loadCarpetasAnio(anio); }, 5000);
    return () => clearInterval(t);
  }, [archivosAnio, anioSeleccionado, carpetaAnioSeleccionada]);

  const loadSubcarpetas = async (parentId: string) => {
    const { data, error } = await supabase
      .from("expedientes_carpetas")
      .select("*")
      .eq("parent_carpeta_id", parentId)
      .order("orden");
    if (error) {
      log.error("Error loading subcarpetas:", (error as {message?: string})?.message || "Error desconocido");
      setSubcarpetas([]);
      return;
    }
    setSubcarpetas(data || []);
  };

  const abrirSubcarpeta = (sub: Carpeta) => {
    if (!carpetaAnioSeleccionada) return;
    setRutaCarpetas([...rutaCarpetas, carpetaAnioSeleccionada]);
    setCarpetaAnioSeleccionada(sub);
  };

  const volverNivel = () => {
    if (rutaCarpetas.length === 0) {
      setCarpetaAnioSeleccionada(null);
      return;
    }
    const nueva = [...rutaCarpetas];
    const anterior = nueva.pop()!;
    setRutaCarpetas(nueva);
    setCarpetaAnioSeleccionada(anterior);
  };

  const irANivel = (idx: number) => {
    // idx = -1 â†Â" raíz (año); 0..n-1 → nodos en ruta
    if (idx < 0) {
      setCarpetaAnioSeleccionada(null);
      return;
    }
    const destino = rutaCarpetas[idx];
    const nuevaRuta = rutaCarpetas.slice(0, idx);
    setRutaCarpetas(nuevaRuta);
    setCarpetaAnioSeleccionada(destino);
  };

  const validarSubcarpeta = (): boolean => {
    const errors: Record<string, string> = {};
    if (!nuevaSubcarpetaNombre?.trim()) errors.nuevaSubcarpetaNombre = "Nombre de carpeta es obligatorio";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const crearSubcarpeta = async () => {
    if (!carpetaAnioSeleccionada) { flash("err", "Selecciona una carpeta padre"); return; }
    if (!validarSubcarpeta()) return;
    const { error } = await supabase.from("expedientes_carpetas").insert({
      obra_id: null,
      obra_nombre: null,
      nombre: nuevaSubcarpetaNombre,
      anio: carpetaAnioSeleccionada.anio || (anioSeleccionado !== "SIN_ANIO" ? (anioSeleccionado as number) : null),
      parent_carpeta_id: carpetaAnioSeleccionada.id,
      orden: subcarpetas.length,
    });
    if (error) {
      flash("err", "Error al crear subcarpeta: " + (error as {message?: string})?.message || "Error desconocido");
      return;
    }
    setNuevaSubcarpetaNombre("");
    setShowNuevaSubcarpeta(false);
    loadSubcarpetas(carpetaAnioSeleccionada.id);
  };

  const eliminarSubcarpeta = async (id: string, nombre: string) => {
    setDeleteCarpetaModal({ open: true, id, nombre, isSub: true });
  };

  const confirmarEliminarCarpetaAnio = async () => {
    const { id, isSub } = deleteCarpetaModal;
    if (!id) return;
    const { error } = await supabase.from("expedientes_carpetas").delete().eq("id", id);
    if (error) {
      flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido");
      return;
    }
    setDeleteCarpetaModal({ open: false, id: "", nombre: "", isSub: false });
    if (isSub && carpetaAnioSeleccionada) {
      loadSubcarpetas(carpetaAnioSeleccionada.id);
    } else if (anioSeleccionado && anioSeleccionado !== "SIN_ANIO") {
      loadCarpetasAnio(anioSeleccionado as number);
    }
  };

  // CV-07 18-Abr-2026: window.prompt reemplazado por <PromptModal> canónico.
  // Abre modal, no ejecuta inmediatamente. La acción real vive en renameFolderSubmit.
  const editarNombreCarpeta = (id: string, nombreActual: string, isSub: boolean) => {
    setRenameModal({ open: true, id, nombreActual, isSub });
  };

  const renameFolderSubmit = async (nuevoNombre: string) => {
    const nuevo = nuevoNombre.trim();
    if (!renameModal.id || !nuevo || nuevo === renameModal.nombreActual) {
      setRenameModal({ open: false, id: "", nombreActual: "", isSub: false });
      return;
    }
    const { error } = await supabase
      .from("expedientes_carpetas")
      .update({ nombre: nuevo })
      .eq("id", renameModal.id);
    const isSub = renameModal.isSub;
    const id = renameModal.id;
    if (error) {
      flash("err", "Error al renombrar: " + (error as {message?: string})?.message || "Error desconocido");
      return;
    }
    if (isSub && carpetaAnioSeleccionada) {
      loadSubcarpetas(carpetaAnioSeleccionada.id);
    } else if (anioSeleccionado && anioSeleccionado !== "SIN_ANIO") {
      loadCarpetasAnio(anioSeleccionado as number);
    }
  };

  const toggleArchivoSeleccionado = (id: string) => {
    setArchivosSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const seleccionarTodosArchivos = () => {
    if (archivosSeleccionados.size === archivos.length) {
      setArchivosSeleccionados(new Set());
    } else {
      setArchivosSeleccionados(new Set(archivos.map(a => a.id)));
    }
  };

  const descargarArchivoForzado = async (archivo: Archivo) => {
    try {
      const res = await fetch(archivo.url);
      if (!res.ok) return false;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = archivo.nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      return true;
    } catch (e: unknown) {
      log.error("Error al descargar:", { data: e });
      return false;
    }
  };

  const [deleteArchivoModal, setDeleteArchivoModal] = useState<{open:boolean;archivos:Archivo[]}>({open:false,archivos:[]});

  const iniciarEliminarUnArchivo = (a: Archivo) => {
    setDeleteArchivoModal({ open: true, archivos: [a] });
  };

  const iniciarEliminarArchivosSeleccionados = () => {
    if (archivosSeleccionados.size === 0) return;
    const seleccionados = archivos.filter(a => archivosSeleccionados.has(a.id));
    setDeleteArchivoModal({ open: true, archivos: seleccionados });
  };

  const confirmarEliminarArchivos = async () => {
    const targets = deleteArchivoModal.archivos;
    if (targets.length === 0) return;
    // 1. Descargar cada uno antes de borrar
    for (const a of targets) {
      await descargarArchivoForzado(a);
    }
    // 2. Borrar rows (el archivo físico permanece en Storage como respaldo + audit trigger captura JSON)
    const ids = targets.map(a => a.id);
    const { error } = await supabase.from("expedientes_archivos").delete().in("id", ids);
    if (error) {
      flash("err", "Error al eliminar: " + (error as {message?: string})?.message || "Error desconocido");
      return;
    }
    setDeleteArchivoModal({ open: false, archivos: [] });
    setArchivosSeleccionados(new Set());
    if (carpetaAnioSeleccionada) loadArchivos(carpetaAnioSeleccionada.id);
  };

  const eliminarArchivosSeleccionados = () => iniciarEliminarArchivosSeleccionados();
  const eliminarUnArchivo = (id: string, nombre: string) => {
    const a = archivos.find(x => x.id === id);
    if (a) iniciarEliminarUnArchivo(a);
  };

  const dispararAnalisis = async (archivoId: string) => {
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      await fetch("/api/expedientes/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": email },
        body: JSON.stringify({ archivoId }),
      }).catch((err) => log.error("Error fetch análisis:", { data: err }));
      if (carpetaAnioSeleccionada) loadArchivos(carpetaAnioSeleccionada.id);
    } catch (e: unknown) {
      log.error("Error al disparar análisis:", { data: e });
    }
  };

  const handleFileUploadCarpetaAnio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !carpetaAnioSeleccionada) return;
    const fileArr = Array.from(e.target.files);
    for (const file of fileArr) {
    const rutaIds = [...rutaCarpetas.map(c => c.id), carpetaAnioSeleccionada.id];
    const path = buildPath({
      module: "expedientes",
      scope: ["anio", String(carpetaAnioSeleccionada.anio || anioSeleccionado), ...rutaIds],
      file,
    });
    try {
      const result = await uploadAndInsert({
        bucket: "expedientes",
        path,
        file,
        table: "expedientes_archivos",
        payload: {
          carpeta_id: carpetaAnioSeleccionada.id,
          nombre: file.name,
          tipo: file.type,
          tamano_bytes: file.size,
        },
        urlField: "url",
      });
      await loadArchivos(carpetaAnioSeleccionada.id);
      // Disparar análisis IA (fire-and-forget)
      const { data: nuevoRow } = await supabase
        .from("expedientes_archivos")
        .select("id")
        .eq("carpeta_id", carpetaAnioSeleccionada.id)
        .eq("url", result.publicUrl)
        .maybeSingle();
      if (nuevoRow?.id) {
        dispararAnalisis(nuevoRow.id);
      }
    } catch (err: unknown) {
      flash("err", ((err as {message?: string})?.message) || "Error al subir archivo");
    }
    }
    e.target.value = "";
  };

  const loadCarpetasAnio = async (anio: number) => {
    const { data, error } = await supabase
      .from("expedientes_carpetas")
      .select("*")
      .eq("anio", anio)
      .is("obra_id", null)
      .is("parent_carpeta_id", null)
      .order("orden");
    if (error) {
      log.error("Error loading carpetas año:", (error as {message?: string})?.message || "Error desconocido");
      return;
    }
    setCarpetasAnio((data || []).filter(c => !c.nombre.startsWith("__root__")));
    // Cargar archivos sueltos del año
    const rootCarpeta = (data || []).find(c => c.nombre.startsWith("__root__"));
    if (rootCarpeta) {
      const { data: arcs } = await supabase.from("expedientes_archivos").select("*").eq("carpeta_id", rootCarpeta.id).order("created_at", { ascending: false });
      setArchivosAnio(arcs || []);
    } else {
      setArchivosAnio([]);
    }
  };

  const getOrCreateRootCarpeta = async (anio: number): Promise<string | null> => {
    const rootName = `__root__${anio}`;
    const { data: existing } = await supabase
      .from("expedientes_carpetas")
      .select("id")
      .eq("anio", anio)
      .is("obra_id", null)
      .eq("nombre", rootName)
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created, error } = await supabase
      .from("expedientes_carpetas")
      .insert({ obra_id: null, obra_nombre: null, nombre: rootName, anio, orden: -1 })
      .select("id")
      .single();
    if (error) { log.error("Error creating root carpeta:", (error as {message?: string})?.message || "Error desconocido"); return null; }
    return created.id;
  };

  const handleFileUploadAnio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !anioSeleccionado || anioSeleccionado === "SIN_ANIO") return;
    const fileArr = Array.from(e.target.files);
    const anio = anioSeleccionado as number;
    const rootId = await getOrCreateRootCarpeta(anio);
    if (!rootId) { flash("err", "Error al preparar carpeta raíz"); return; }
    for (const file of fileArr) {
    const path = buildPath({ module: "expedientes", scope: ["anio", String(anio), "sueltos"], file });
    try {
      const result = await uploadAndInsert({
        bucket: "expedientes", path, file,
        table: "expedientes_archivos",
        payload: { carpeta_id: rootId, nombre: file.name, tipo: file.type, tamano_bytes: file.size },
        urlField: "url",
      });
      await loadCarpetasAnio(anio);
      const { data: nuevoRow } = await supabase
        .from("expedientes_archivos").select("id")
        .eq("carpeta_id", rootId).eq("url", result.publicUrl).maybeSingle();
      if (nuevoRow?.id) dispararAnalisis(nuevoRow.id);
    } catch (err: unknown) {
      flash("err", ((err as {message?: string})?.message) || "Error al subir archivo");
    }
    }
    e.target.value = "";
  };

  const confirmarEliminarArchivosAnio = async () => {
    const targets = deleteArchivoAnioModal.archivos;
    if (targets.length === 0) return;
    for (const a of targets) { await descargarArchivoForzado(a); }
    const ids = targets.map(a => a.id);
    await supabase.from("expedientes_archivos").delete().in("id", ids);
    setDeleteArchivoAnioModal({ open: false, archivos: [] });
    setArchivosAnioSeleccionados(new Set());
    if (anioSeleccionado && anioSeleccionado !== "SIN_ANIO") loadCarpetasAnio(anioSeleccionado as number);
  };

  const crearCarpetaAnio = async () => {
    if (!nuevaCarpetaAnioNombre.trim() || !anioSeleccionado || anioSeleccionado === "SIN_ANIO" || creandoCarpeta) return;
    setCreandoCarpeta(true);
    try {
      const { error } = await supabase.from("expedientes_carpetas").insert({
        obra_id: null,
        obra_nombre: null,
        nombre: nuevaCarpetaAnioNombre,
        anio: anioSeleccionado as number,
        orden: carpetasAnio.length,
      });
      if (error) {
        flash("err", "Error al crear carpeta del año: " + (error as {message?: string})?.message || "Error desconocido");
        return;
      }
      setNuevaCarpetaAnioNombre("");
      setShowNuevaCarpetaAnio(false);
      loadCarpetasAnio(anioSeleccionado as number);
    } finally {
      setCreandoCarpeta(false);
    }
  };

  const eliminarCarpetaAnio = async (id: string, nombre: string) => {
    setDeleteCarpetaModal({ open: true, id, nombre, isSub: false });
  };

  useEffect(() => {
    if (carpetaSeleccionada) {
      loadArchivos(carpetaSeleccionada.id);
    }
  }, [carpetaSeleccionada]);

  const loadObras = async () => {
    const { data, error } = await supabase.from("centros_trabajo").select("id, name:nombre, fecha_inicio").order("nombre");
    if (error) {
      log.error("Error loading obras:", (error as {message?: string})?.message || "Error desconocido");
      setLoading(false);
      return;
    }
    const conAnio = (data || []).map((o: Record<string, unknown>) => ({
      ...o,
      anio: (o.fecha_inicio as string) ? new Date(o.fecha_inicio as string).getFullYear() : null,
    })) as (Record<string, unknown> & { anio: number | null })[];
    setObras(conAnio as any);
    setLoading(false);
  };

  const loadCarpetas = async (obraId: string) => {
    const { data, error } = await supabase
      .from("expedientes_carpetas")
      .select("*")
      .eq("obra_id", obraId)
      .order("orden");
    if (error) {
      log.error("Error loading carpetas:", (error as {message?: string})?.message || "Error desconocido");
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
      log.error("Error loading archivos:", (error as {message?: string})?.message || "Error desconocido");
      return;
    }
    setArchivos(data || []);
  };

  const loadTareas = async (obraId: string) => {
    const { data, error } = await supabase
      .from("tareas_obra")
      .select("*")
      .eq("obra_id", obraId)
      .order("fecha_limite");
    if (error) {
      log.error("Error loading tareas:", (error as {message?: string})?.message || "Error desconocido");
      return;
    }
    setTareas(data || []);
  };

  const crearCarpeta = async () => {
    if (!nuevaCarpetaNombre.trim() || !obraSeleccionada || creandoCarpeta) return;
    setCreandoCarpeta(true);
    try {
      const { error } = await supabase.from("expedientes_carpetas").insert({
        obra_id: obraSeleccionada.id,
        obra_nombre: obraSeleccionada.name,
        nombre: nuevaCarpetaNombre,
        orden: carpetas.length,
      });

      if (error) {
        log.error("Error creating carpeta:", (error as {message?: string})?.message || "Error desconocido");
        flash("err", "Error al crear carpeta: " + (error as {message?: string})?.message || "Error desconocido");
        return;
      }

      setNuevaCarpetaNombre("");
    setShowNuevaCarpeta(false);
    loadCarpetas(obraSeleccionada!.id);
    } finally {
      setCreandoCarpeta(false);
    }
  };

  const crearTarea = async () => {
    if (!nuevaTarea.titulo.trim() || !obraSeleccionada) return;

    const { error } = await supabase.from("tareas_obra").insert({
      obra_id: obraSeleccionada.id,
      obra_nombre: obraSeleccionada.name,
      ...nuevaTarea,
    });

    if (error) {
      log.error("Error creating tarea:", (error as {message?: string})?.message || "Error desconocido");
      flash("err", "Error al crear tarea: " + (error as {message?: string})?.message || "Error desconocido");
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
      log.error("Error updating tarea status:", (error as {message?: string})?.message || "Error desconocido");
      flash("err", "Error al cambiar estado de tarea: " + (error as {message?: string})?.message || "Error desconocido");
      return;
    }

    if (obraSeleccionada) loadTareas(obraSeleccionada.id);
  };

  const eliminarCarpeta = async (id: string) => {
    setDeleteModal({ open: true, id, name: "" }); return; // Protected by DeleteModal
    const { error } = await supabase.from("expedientes_carpetas").delete().eq("id", id);

    if (error) {
      log.error("Error deleting carpeta:", (error as {message?: string})?.message || "Error desconocido");
      return;
    }

    setCarpetaSeleccionada(null);
    if (obraSeleccionada) loadCarpetas(obraSeleccionada!.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !carpetaSeleccionada || !obraSeleccionada) return;
    const fileArr = Array.from(e.target.files);
    for (const file of fileArr) {

    // Path con namespace estructurado: expedientes/<obra>/<carpeta>/<ts_filename>
    const path = buildPath({
      module: "expedientes",
      scope: [obraSeleccionada.id, carpetaSeleccionada.id],
      file,
    });

    try {
      await uploadAndInsert({
        bucket: "expedientes",
        path,
        file,
        table: "expedientes_archivos",
        payload: {
          carpeta_id: carpetaSeleccionada.id,
          nombre: file.name,
          tipo: file.type,
          tamano_bytes: file.size,
        },
        urlField: "url",
      });
      loadArchivos(carpetaSeleccionada.id);
    } catch (err: unknown) {
      flash("err", ((err as {message?: string})?.message) || "Error al subir archivo");
    }
    }
    e.target.value = "";
  };

  /** Drag & drop: delegates to the right handler based on current view state */
  const handleDroppedFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const fakeEvent = (fileList: File[]) => {
      const dt = new DataTransfer();
      fileList.forEach(f => dt.items.add(f));
      return { target: { files: dt.files, value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>;
    };
    if (carpetaAnioSeleccionada) {
      await handleFileUploadCarpetaAnio(fakeEvent(files));
    } else if (anioSeleccionado && anioSeleccionado !== "SIN_ANIO" && !obraSeleccionada) {
      await handleFileUploadAnio(fakeEvent(files));
    } else if (carpetaSeleccionada && obraSeleccionada) {
      await handleFileUpload(fakeEvent(files));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carpetaAnioSeleccionada, anioSeleccionado, obraSeleccionada, carpetaSeleccionada]);

  const { dragging: dropActive, progress: dropProgress, dropHandlers } = useDropZone(handleDroppedFiles);

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "alta": return "text-red-400 bg-red-500/20";
      case "media": return "text-amber-400 bg-amber-500/20";
      default: return "text-aria-accent bg-emerald-500/20";
    }
  };

  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "expedientes_carpetas", id: deleteModal.id, userEmail });
    } catch (e: unknown) { log.error(String(e)); }
    setDeleteModal({open:false,id:"",name:""});
    setCarpetaSeleccionada(null);
    if (obraSeleccionada) loadCarpetas(obraSeleccionada.id);
  };

  /** Drop zone wrapper — wraps any view return to enable drag & drop */
  const canDrop = !!(carpetaAnioSeleccionada || (anioSeleccionado && anioSeleccionado !== "SIN_ANIO") || (carpetaSeleccionada && obraSeleccionada));
  const DropWrap = ({ children }: { children: React.ReactNode }) => (
    <div className={`relative ${canDrop && dropActive ? "ring-2 ring-emerald-400/60 rounded-xl" : ""}`} {...(canDrop ? dropHandlers : {})}>
      {canDrop && dropActive && (
        <div className="absolute inset-0 z-30 bg-emerald-500/10  rounded-xl flex flex-col items-center justify-center pointer-events-none">
          <Inbox className="w-12 h-12 text-aria-accent mb-2" />
          <p className="text-aria-accent text-sm font-medium">Suelta archivos o carpetas aqu\u00ed</p>
          <p className="text-aria-accent/60 text-xs mt-1">Se suben autom\u00e1ticamente</p>
        </div>
      )}
      {canDrop && dropProgress && (
        <div className="absolute inset-0 z-30 bg-[#0a1628]/80  rounded-xl flex flex-col items-center justify-center pointer-events-none">
          <Loader2 className="w-10 h-10 text-aria-accent animate-spin mb-2" />
          <p className="text-aria-accent text-sm font-medium">
            {dropProgress.phase === "scanning" ? "Escaneando carpetas\u2026" : "Subiendo archivos\u2026"}
          </p>
          {dropProgress.total > 0 && (
            <p className="text-aria-accent/60 text-xs mt-1">
              {dropProgress.current} / {dropProgress.total} archivos
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-aria-accent" />
      </div>
    );
  }

  // Vista 0: Carpetas de Año (nivel superior)
  if (!anioSeleccionado) {
    const countPorAnio = (anio: number | "SIN_ANIO") => {
      if (anio === "SIN_ANIO") return obras.filter(o => !o.anio).length;
      return obras.filter(o => o.anio === anio).length;
    };
    return (
    <div className="aria-page-canon">
        <div className="flex items-center gap-4">
          <AriaBackButton href="/dashboard/obras" />
          <div>
            <h1 className="text-2xl font-bold text-white">Expedientes de Obra</h1>
            <p className="text-[#7f93b0] text-sm">Selecciona un año para ver las obras de ese periodo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ANOS_FIJOS.map((anio) => {
            const count = countPorAnio(anio);
            const carpCount = carpetasPorAnio[anio] || 0;
            return (
              <button
                key={anio}
                onClick={() => setAnioSeleccionado(anio)}
                className="p-6 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] hover:border-amber-500/50 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 rounded-xl group-hover:bg-amber-500/30 transition-colors">
                    <FolderOpen className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-xl group-hover:text-amber-300 transition-colors">
                      {anio}
                    </h3>
                    <p className="text-xs text-[#7f93b0] mt-0.5">
                      {carpCount > 0 && <span className="text-amber-400/80">{carpCount} carpeta{carpCount !== 1 ? "s" : ""} · </span>}
                      {count} {count === 1 ? "obra" : "obras"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          {countPorAnio("SIN_ANIO") > 0 && (
            <button
              onClick={() => setAnioSeleccionado("SIN_ANIO")}
              className="p-6 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] hover:border-slate-400/50 rounded-xl text-left transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-500/20 rounded-xl group-hover:bg-slate-500/30 transition-colors">
                  <FolderOpen className="w-8 h-8 text-[#7f93b0]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-xl">Sin año</h3>
                  <p className="text-xs text-[#7f93b0] mt-0.5">{countPorAnio("SIN_ANIO")} obras</p>
                </div>
              </div>
            </button>
          )}
        </div>
        <p className="text-xs text-[#4a6080] italic">Tip: Para que una obra aparezca en su año, asigna su fecha de inicio desde Obras → Pipeline.</p>
      </div>
    );
  }

  // Vista 1.5: Carpeta libre del año abierta (subcarpetas + archivos)
  if (!obraSeleccionada && carpetaAnioSeleccionada) {
    const todosSeleccionados = archivos.length > 0 && archivosSeleccionados.size === archivos.length;
    return (
      <DropWrap><div className="space-y-6 max-w-5xl mx-auto">
        {deleteCarpetaModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-[#0a1628] border border-red-500/40 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Eliminar carpeta</h3>
              <p className="text-[#c9d8ed] text-sm mb-4">
                ¿Eliminar <span className="text-amber-300 font-semibold">"{deleteCarpetaModal.nombre}"</span> y todo su contenido?
                Los registros quedarán respaldados en auditoría.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteCarpetaModal({open:false,id:"",nombre:"",isSub:false})}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] text-white text-sm"
                >Cancelar</button>
                <button
                  onClick={confirmarEliminarCarpetaAnio}
                  className="px-4 py-2 rounded-lg aria-btn-rose-solid text-white text-sm font-medium"
                >Delete</button>
              </div>
            </div>
          </div>
        )}

        {deleteArchivoModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-[#0a1628] border border-red-500/40 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">
                Eliminar {deleteArchivoModal.archivos.length === 1 ? "archivo" : `${deleteArchivoModal.archivos.length} archivos`}
              </h3>
              <p className="text-[#c9d8ed] text-sm mb-3">
                Esta acción <span className="text-red-400 font-semibold">no se puede deshacer</span>.
                Se descargará una copia a tu equipo antes de eliminar.
              </p>
              <div className="max-h-40 overflow-y-auto bg-white/[0.04] rounded-lg p-2 mb-4 border border-white/[0.08]">
                {deleteArchivoModal.archivos.map(a => (
                  <div key={a.id} className="text-xs text-[#c9d8ed] py-0.5 truncate">• {a.nombre}</div>
                ))}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteArchivoModal({open:false, archivos:[]})}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] text-white text-sm"
                >Cancelar</button>
                <button
                  onClick={confirmarEliminarArchivos}
                  className="px-4 py-2 rounded-lg aria-btn-rose-solid text-white text-sm font-medium"
                >Delete</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <AriaBackButton onClick={volverNivel} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate max-w-full">{carpetaAnioSeleccionada.nombre}</h1>
            <div className="text-[#7f93b0] text-xs flex flex-wrap items-center gap-1 mt-0.5">
              <button onClick={() => irANivel(-1)} className="hover:text-amber-300 transition">Año {anioSeleccionado}</button>
              {rutaCarpetas.map((n, i) => (
                <span key={n.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 opacity-60" />
                  <button onClick={() => irANivel(i)} className="hover:text-amber-300 transition truncate max-w-[120px]">{n.nombre}</button>
                </span>
              ))}
              <ChevronRight className="w-3 h-3 opacity-60" />
              <span className="text-white/80 truncate max-w-[140px]">{carpetaAnioSeleccionada.nombre}</span>
              <span className="ml-2 opacity-70">· {subcarpetas.length} subcarpeta{subcarpetas.length === 1 ? "" : "s"} · {archivos.length} archivo{archivos.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <button
            onClick={() => setShowNuevaSubcarpeta(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] border border-amber-500/30 text-amber-300 text-sm font-medium transition shrink-0"
          >
            <FolderPlus className="w-4 h-4" /> Nueva subcarpeta
          </button>
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium cursor-pointer transition shrink-0">
            <Upload className="w-4 h-4" /> Archivos
            <input type="file" className="hidden" multiple onChange={handleFileUploadCarpetaAnio} />
          </label>
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium cursor-pointer transition shrink-0">
            <FolderUp className="w-4 h-4" /> Carpeta
            <input type="file" className="hidden" webkitdirectory="" directory="" multiple onChange={handleFileUploadCarpetaAnio} />
          </label>
        </div>

        {showNuevaSubcarpeta && (
          <div className="p-4 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)] flex items-center gap-3 max-w-2xl">
            <div className="flex-1">
              <input
                autoFocus
                value={nuevaSubcarpetaNombre}
                onChange={(e) => setNuevaSubcarpetaNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") crearSubcarpeta(); }}
                placeholder="Nombre de la subcarpeta"
                maxLength={80}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-amber-500"
              />
              {formErrors.nuevaSubcarpetaNombre && <p className="text-red-400 text-xs mt-1">{formErrors.nuevaSubcarpetaNombre}</p>}
            </div>
            <button onClick={crearSubcarpeta} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm shrink-0">Crear</button>
            <button onClick={() => { setShowNuevaSubcarpeta(false); setNuevaSubcarpetaNombre(""); setFormErrors({}); }} className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] text-white/70 text-sm shrink-0">Cancelar</button>
          </div>
        )}

        {subcarpetas.length > 0 && (
          <div>
            <h2 className="text-xs uppercase text-amber-400 font-semibold mb-3 tracking-wider">Subcarpetas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {subcarpetas.map((sub) => (
                <div key={sub.id} className="p-4 bg-white/[0.02] border border-white/[0.08] hover:border-amber-500/50 rounded-xl transition-all group relative">
                  <button onClick={() => abrirSubcarpeta(sub)} className="w-full text-left pr-16">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30 transition-colors shrink-0">
                        <FolderOpen className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-amber-300 transition-colors truncate">{sub.nombre}</h3>
                        <p className="text-xs text-[#7f93b0] mt-1">Subcarpeta</p>
                      </div>
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => { e.stopPropagation(); editarNombreCarpeta(sub.id, sub.nombre, true); }}
                      className="p-1.5 rounded-lg bg-aria-primary/10 hover:bg-aria-primary-hover/30 text-aria-accent"
                      title="Renombrar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); eliminarSubcarpeta(sub.id, sub.nombre); }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {archivos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xs uppercase text-amber-400 font-semibold tracking-wider">Archivos ({archivos.length})</h2>
                <button
                  onClick={seleccionarTodosArchivos}
                  className="flex items-center gap-1.5 text-xs text-[#7f93b0] hover:text-white transition"
                >
                  {todosSeleccionados ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                 {todosSeleccionados ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>
              </div>
              {archivosSeleccionados.size > 0 && (
                <button
                  onClick={eliminarArchivosSeleccionados}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg aria-btn-rose-solid text-white text-xs font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete ({archivosSeleccionados.size})
                </button>
              )}
            </div>
            <div className="space-y-2">
              {archivos.map((archivo) => {
                const selected = archivosSeleccionados.has(archivo.id);
                const analizando = !archivo.resumen && !archivo.analizado_at;
                return (
                  <div
                    key={archivo.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${selected ? "bg-amber-500/10 border-amber-500/50" : "bg-white/[0.04] border-white/[0.08] hover:border-amber-500/40"}`}
                  >
                    <button
                      onClick={() => toggleArchivoSeleccionado(archivo.id)}
                      className="shrink-0 mt-1 text-amber-400 hover:text-amber-300 transition"
                      title={selected ? "Deseleccionar" : "Seleccionar"}
                    >
                      {selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>
                    <div className="p-2 bg-amber-500/20 rounded-lg shrink-0 mt-0.5">
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={archivo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:text-amber-300 transition"
                      >
                        <p className="font-medium text-white truncate">{archivo.nombre}</p>
                      </a>
                      <p className="text-xs text-[#7f93b0] mt-0.5">
                        {formatBytes(archivo.tamano_bytes)}
                        {typeof archivo.paginas === "number" && archivo.paginas > 0 && ` · ${archivo.paginas} ${archivo.paginas === 1 ? "página" : "páginas"}`}
                        {`  · ${archivo.tipo || "archivo"} · ${new Date(archivo.created_at).toLocaleDateString("es-MX")}`}
                      </p>
                      {analizando ? (
                        <p className="text-xs text-aria-accent/80 mt-1.5 italic flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" /> Analizando con IA...
                        </p>
                      ) : archivo.resumen ? (
                        <p className="text-xs text-[#c9d8ed] mt-1.5 leading-snug line-clamp-3 bg-white/[0.04] rounded px-2 py-1 border border-white/[0.08]">
                          {archivo.resumen}
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => eliminarUnArchivo(archivo.id, archivo.nombre)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition shrink-0 mt-0.5"
                      title="Eliminar (descargará antes)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {subcarpetas.length === 0 && archivos.length === 0 && (
          <div className="text-center py-16 text-[#7f93b0] aria-card-steel">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>Carpeta vacía</p>
            <p className="text-sm mt-2">Crea subcarpetas o sube archivos con los botones de arriba, o arrastra aquí.</p>
          </div>
        )}
      </div></DropWrap>
    );
  }

  // Vista 1: Carpetas libres + Obras del año seleccionado
  if (!obraSeleccionada) {
    const obrasFiltradas = obras.filter(o => anioSeleccionado === "SIN_ANIO" ? !o.anio : o.anio === anioSeleccionado);
    const puedeCrearCarpetas = anioSeleccionado !== "SIN_ANIO";
    return (
      <DropWrap><div className="space-y-6">
        {deleteCarpetaModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-[#0a1628] border border-red-500/40 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Eliminar carpeta</h3>
              <p className="text-[#c9d8ed] text-sm mb-4">
                ¿Eliminar <span className="text-amber-300 font-semibold">&quot;{deleteCarpetaModal.nombre}&quot;</span> y todo su contenido?
                Los registros quedarán respaldados en auditoría.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteCarpetaModal({open:false,id:"",nombre:"",isSub:false})}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] text-white text-sm"
                >Cancelar</button>
                <button
                  onClick={confirmarEliminarCarpetaAnio}
                  className="px-4 py-2 rounded-lg aria-btn-rose-solid text-white text-sm font-medium"
                >Delete</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AriaBackButton onClick={() => { setAnioSeleccionado(null); loadCarpetasCounts(); }} />
            <div>
              <h1 className="text-2xl font-bold text-white">Año {anioSeleccionado === "SIN_ANIO" ? "— Sin fecha" : anioSeleccionado}</h1>
              <p className="text-[#7f93b0] text-sm">{carpetasAnio.length} {carpetasAnio.length === 1 ? "carpeta libre" : "carpetas libres"} · {obrasFiltradas.length} {obrasFiltradas.length === 1 ? "obra" : "obras"}</p>
            </div>
          </div>
          {puedeCrearCarpetas && (
            <button
              onClick={() => setShowNuevaCarpetaAnio(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" /> Nueva carpeta del año
            </button>
          )}
        </div>

        {showNuevaCarpetaAnio && (
          <div className="p-4 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)] flex items-center gap-3 max-w-2xl">
            <input
              autoFocus
              value={nuevaCarpetaAnioNombre}
              onChange={(e) => setNuevaCarpetaAnioNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") crearCarpetaAnio(); }}
              placeholder="Nombre de la carpeta (ej: Contratos, Permisos...)"
              maxLength={80}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm outline-none focus:border-amber-500"
            />
            <button onClick={crearCarpetaAnio} disabled={creandoCarpeta} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm shrink-0">{creandoCarpeta ? "Creando..." : "Crear"}</button>
            <button onClick={() => { setShowNuevaCarpetaAnio(false); setNuevaCarpetaAnioNombre(""); }} className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] text-white/70 text-sm shrink-0">Cancelar</button>
          </div>
        )}

        {carpetasAnio.length > 0 && (
          <div>
            <h2 className="text-sm uppercase text-amber-400 font-semibold mb-3">Carpetas del año</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {carpetasAnio.map((carpeta) => (
                <div
                  key={carpeta.id}
                  className="p-5 bg-white/[0.02] border border-white/[0.08] hover:border-amber-500/50 rounded-xl transition-all group relative"
                >
                  <button
                    onClick={() => setCarpetaAnioSeleccionada(carpeta)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-amber-500/20 rounded-xl group-hover:bg-amber-500/30 transition-colors">
                        <FolderOpen className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                          {carpeta.nombre}
                        </h3>
                        <p className="text-xs text-[#7f93b0] mt-1">Carpeta libre · {anioSeleccionado}</p>
                      </div>
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => { e.stopPropagation(); editarNombreCarpeta(carpeta.id, carpeta.nombre, false); }}
                      className="p-1.5 rounded-lg bg-aria-primary/10 hover:bg-aria-primary-hover/30 text-aria-accent"
                      title="Renombrar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteCarpetaModal({open:true,id:carpeta.id,nombre:carpeta.nombre,isSub:false}); }}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {obrasFiltradas.length > 0 && (
          <div>
            <h2 className="text-sm uppercase text-aria-accent font-semibold mb-3">Obras del año</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {obrasFiltradas.map((obra) => (
                <button
                  key={obra.id}
                  onClick={() => setObraSeleccionada(obra)}
                  className="p-6 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] hover:border-aria-primary/50 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-aria-primary-light rounded-xl group-hover:bg-aria-primary-hover/30 transition-colors">
                      <Building2 className="w-6 h-6 text-aria-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white group-hover:text-aria-accent transition-colors">
                        {obra.name}
                      </h3>
                      <p className="text-sm text-[#7f93b0] mt-1">Ver carpetas y tareas</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#4a6080] group-hover:text-aria-accent transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Archivos sueltos del año */}
        {puedeCrearCarpetas && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase text-green-400 font-semibold">Archivos del año</h2>
              <div className="flex items-center gap-2">
                {archivosAnioSeleccionados.size > 0 && (
                  <button
                    onClick={() => {
                      const targets = archivosAnio.filter(a => archivosAnioSeleccionados.has(a.id));
                      setDeleteArchivoAnioModal({ open: true, archivos: targets });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar {archivosAnioSeleccionados.size}
                  </button>
                )}
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 text-xs font-medium cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" /> Archivos
                    <input type="file" className="hidden" multiple onChange={handleFileUploadAnio} />
                  </label>
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-700/20 hover:bg-emerald-700/30 border border-emerald-500/30 text-aria-accent text-xs font-medium cursor-pointer transition">
                    <FolderUp className="w-3.5 h-3.5" /> Carpeta
                    <input type="file" className="hidden" webkitdirectory="" directory="" multiple onChange={handleFileUploadAnio} />
                  </label>
              </div>
            </div>
            {archivosAnio.length > 0 ? (
              <div className="space-y-2">
                {archivosAnio.map(archivo => {
                  const sel = archivosAnioSeleccionados.has(archivo.id);
                  const analizando = !archivo.resumen && !archivo.analizado_at;
                  return (
                    <div key={archivo.id} className="flex items-start gap-3 p-3 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/8 group">
                      <button onClick={() => {
                        const ns = new Set(archivosAnioSeleccionados);
                        sel ? ns.delete(archivo.id) : ns.add(archivo.id);
                        setArchivosAnioSeleccionados(ns);
                      }} className="mt-0.5 shrink-0">
                        {sel ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4 text-[#4a6080]" />}
                      </button>
                      <FileText className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <a href={archivo.url} target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-green-300 font-medium truncate block">
                          {archivo.nombre}
                        </a>
                        <div className="flex flex-wrap gap-3 text-xs text-[#7f93b0] mt-0.5">
                          {archivo.tamano_bytes != null && <span>{formatBytes(archivo.tamano_bytes)}</span>}
                          {(archivo.paginas ?? 0) > 0 && <span>{archivo.paginas} pág.</span>}
                          <span>{archivo.tipo?.split("/").pop()}</span>
                          <span>{new Date(archivo.created_at).toLocaleDateString("es-MX")}</span>
                        </div>
                        {analizando ? (
                          <p className="text-xs text-aria-accent/80 mt-1 italic flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" /> Analizando con IA...
                          </p>
                        ) : archivo.resumen ? (
                          <p className="text-xs text-[#c9d8ed] mt-1 leading-snug line-clamp-3 bg-white/[0.04] rounded px-2 py-1 border border-white/[0.08]">
                            {archivo.resumen}
                          </p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => setDeleteArchivoAnioModal({ open: true, archivos: [archivo] })}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#4a6080] text-sm py-4 text-center">Sin archivos sueltos. Sube un archivo con el botón de arriba.</p>
            )}
          </div>
        )}

        {/* Modal eliminar archivos del año */}
        {deleteArchivoAnioModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-[#0a1628] border border-red-500/40 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">
                Eliminar {deleteArchivoAnioModal.archivos.length === 1 ? "archivo" : `${deleteArchivoAnioModal.archivos.length} archivos`}
              </h3>
              <p className="text-[#c9d8ed] text-sm mb-3">
                Esta acción <span className="text-red-400 font-semibold">no se puede deshacer</span>.
                Se descargará una copia a tu equipo antes de eliminar.
              </p>
              <div className="max-h-40 overflow-y-auto bg-white/[0.04] rounded-lg p-2 mb-4 border border-white/[0.08]">
                {deleteArchivoAnioModal.archivos.map(a => (
                  <div key={a.id} className="text-xs text-[#c9d8ed] py-0.5 truncate">• {a.nombre}</div>
                ))}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteArchivoAnioModal({open:false, archivos:[]})}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] text-white text-sm"
                >Cancelar</button>
                <button
                  onClick={confirmarEliminarArchivosAnio}
                  className="px-4 py-2 rounded-lg aria-btn-rose-solid text-white text-sm font-medium"
                >Delete</button>
              </div>
            </div>
          </div>
        )}

        {carpetasAnio.length === 0 && obrasFiltradas.length === 0 && archivosAnio.length === 0 && (
          <div className="text-center py-16 text-[#7f93b0]">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>Este año está vacío</p>
            {puedeCrearCarpetas && <p className="text-sm mt-2">Crea una carpeta libre con el botón de arriba, sube archivos, o asigna obras desde Pipeline.</p>}
          </div>
        )}
      </div></DropWrap>
    );
  }

  // Vista: Expediente de Obra
  return (
    <DropWrap><div className="space-y-6">
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      <ConfirmModal open={confirmState.open} message={confirmState.msg} onConfirm={() => { confirmState.onOk(); setConfirmState(p => ({...p, open: false})); }} onCancel={() => setConfirmState(p => ({...p, open: false}))} />
      <PromptModal
        open={renameModal.open}
        title="Renombrar carpeta"
        label="Nuevo nombre"
        initialValue={renameModal.nombreActual}
        placeholder="Ej. Contratos 2026"
        submitLabel="Renombrar"
        onClose={() => setRenameModal({ open: false, id: "", nombreActual: "", isSub: false })}
        onSubmit={renameFolderSubmit}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AriaBackButton onClick={() => { setObraSeleccionada(null); setCarpetaSeleccionada(null); }} />
          <div>
            <h1 className="text-2xl font-bold text-white">{obraSeleccionada.name}</h1>
            <p className="text-[#7f93b0] text-sm">Expediente de obra</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-2">
        <button
          onClick={() => setActiveTab("carpetas")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "carpetas" ? "bg-aria-primary text-white" : "text-[#7f93b0] hover:text-white hover:bg-white/[0.06]"
          }`}
        >
          <FolderOpen className="w-4 h-4 inline mr-2" />
          Carpetas
        </button>
        <button
          onClick={() => setActiveTab("tareas")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "tareas" ? "bg-aria-primary text-white" : "text-[#7f93b0] hover:text-white hover:bg-white/[0.06]"
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
                className="p-2 bg-aria-primary hover:bg-aria-primary rounded-lg transition-colors"
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
                      ? "bg-aria-primary-light border-aria-primary"
                      : "bg-white/[0.04] hover:bg-white/[0.06] border-transparent"
                  } border`}
                >
                  <FolderOpen className={`w-5 h-5 ${carpetaSeleccionada?.id === carpeta.id ? "text-aria-accent" : "text-amber-400"}`} />
                  <span className="text-white font-medium">{carpeta.nombre}</span>
                </button>
              ))}

              {carpetas.length === 0 && (
                <div className="text-center py-8 text-[#7f93b0]">
                  <FolderPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay carpetas</p>
                  <p className="text-sm">Crea una para organizar documentos</p>
                </div>
              )}
            </div>
          </div>

          {/* Archivos de la Carpeta */}
          <div className="lg:col-span-2 bg-white/[0.04] rounded-xl p-6 border border-white/[0.08]">
            {carpetaSeleccionada ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-amber-400" />
                    {carpetaSeleccionada.nombre}
                  </h2>
                  <div className="flex gap-2">
                    <label className="px-4 py-2 bg-aria-primary hover:bg-aria-primary rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Archivos</span>
                    <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                  </label>
                  <label className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                    <FolderUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Carpeta</span>
                    <input type="file" className="hidden" webkitdirectory="" directory="" multiple onChange={handleFileUpload} />
                  </label>
                    {canDelete && (<button
                      onClick={() => eliminarCarpeta(carpetaSeleccionada.id)}
                      className="p-2 aria-icon-btn aria-icon-rose text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>)}
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {archivos.map((archivo) => (
                    <a
                      key={archivo.id}
                      href={archivo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/[0.04] hover:bg-white/[0.06] rounded-lg transition-colors"
                    >
                      <FileText className="w-5 h-5 text-aria-accent" />
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{archivo.nombre}</p>
                        <p className="text-[#7f93b0] text-xs">{new Date(archivo.created_at).toLocaleDateString()}</p>
                      </div>
                    </a>
                  ))}

                  {archivos.length === 0 && (
                    <div className="text-center py-12 text-[#7f93b0]">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay archivos en esta carpeta</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-[#7f93b0]">
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
              className="px-4 py-2 bg-aria-primary hover:bg-aria-primary rounded-lg transition-colors flex items-center gap-2"
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
                    : "bg-white/[0.04] border-white/[0.08] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTareaStatus(tarea)}
                    className={`mt-1 p-1 rounded-full transition-colors ${
                      tarea.status === "completada"
                                 ? "bg-emerald-500 text-white"
                        : "bg-white/[0.06] text-[#7f93b0] hover:bg-white/[0.1]"
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-medium ${tarea.status === "completada" ? "text-aria-accent line-through" : "text-white"}`}>
                      {tarea.titulo}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      {tarea.responsable && (
                        <span className="text-[#7f93b0]">👤 {tarea.responsable}</span>
                      )}
                      {tarea.fecha_limite && (
                        <span className="text-[#7f93b0] flex items-center gap-1">
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
              <div className="text-center py-12 text-[#7f93b0]">
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
          <div className="bg-[#0c1d38] rounded-xl p-6 w-full max-w-md border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nueva Carpeta</h3>
              <button onClick={() => setShowNuevaCarpeta(false)} className="text-[#7f93b0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nombre de la carpeta"
              value={nuevaCarpetaNombre}
              onChange={(e) => setNuevaCarpetaNombre(e.target.value)}
              className="w-full px-4 py-3 aria-input-canon"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNuevaCarpeta(false)} className="px-4 py-2 text-[#7f93b0] hover:text-white">
                Cancelar
              </button>
              <button onClick={crearCarpeta} className="px-4 py-2 bg-aria-primary hover:bg-aria-primary rounded-lg text-white font-medium">
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Tarea */}
      {showNuevaTarea && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0c1d38] rounded-xl p-6 w-full max-w-md border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nueva Tarea</h3>
              <button onClick={() => setShowNuevaTarea(false)} className="text-[#7f93b0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Título de la tarea"
                value={nuevaTarea.titulo}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                className="w-full px-4 py-3 aria-input-canon"
              />
              <input
                type="text"
                placeholder="Responsable"
                value={nuevaTarea.responsable}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, responsable: e.target.value })}
                className="w-full px-4 py-3 aria-input-canon"
              />
              <input
                type="date"
                value={nuevaTarea.fecha_limite}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, fecha_limite: e.target.value })}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary"
              />
              <select
                value={nuevaTarea.prioridad}
                onChange={(e) => setNuevaTarea({ ...nuevaTarea, prioridad: e.target.value })}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary"
              >
                <option value="normal">Prioridad Normal</option>
                <option value="media">Prioridad Media</option>
                <option value="alta">Prioridad Alta</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNuevaTarea(false)} className="px-4 py-2 text-[#7f93b0] hover:text-white">
                Cancelar
              </button>
              <button onClick={crearTarea} className="px-4 py-2 bg-aria-primary hover:bg-aria-primary rounded-lg text-white font-medium">
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({open:false,id:"",name:""})}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Carpeta"
      />
    </div></DropWrap>
  );
}

