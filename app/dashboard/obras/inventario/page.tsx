"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect, useRef, type ElementType, type CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import {
  ArrowLeft,
  Package,
  ChevronRight,
  Search,
  TrendingUp,
  AlertTriangle,
  Truck,
  Plus,
  Minus,
  History,
  Loader2,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Eye,
  Download,
  FileSpreadsheet,
  FileText,
  Edit2,
  Trash2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

// ====== TYPES ======
interface Obra {
  id: string;
  name: string;
}

interface ItemInventario {
  id: string;
  obra_id: string;
  obra_nombre: string;
  producto_nombre: string;
  unidad: string;
  cantidad_disponible: number;
  cantidad_usada: number;
  ultimo_movimiento: string;
  foto_url?: string | null;
  ultimo_usuario?: string | null;
  tipo?: string | null; // 22-Abr-2026: MATERIAL | HERRAMIENTA
  folio_inventario?: string | null; // TKT-002 22-Abr-2026
}

interface MaterialRecibido {
  product_name?: string;
  unit?: string;
  quantity?: number;
  nombre?: string;
  unidad?: string;
  cantidad?: number;
}

interface Entrega {
  id: string;
  folio: string;
  fecha_entrega: string;
  proveedor_nombre: string;
  materiales_recibidos: MaterialRecibido[];
  status: string;
  foto_url?: string | null;
}

interface ProductoCatalogo {
  id: string;
  name: string;
  unit: string;
  category: string;
}

const UNIDADES = [
  "PZA","LITRO","METRO","METRO_CUBICO","METRO_CUADRADO","KILO","TONELADA",
  "SACO","CUBETA_19L","ROLLO","TRAMO","JUEGO","PAR","CAJA","PAQUETE",
  "VIAJE","SERVICIO","GLOBAL","LOTE","GALON","BOLSA","BOTE"
];

const getUserEmail = () =>
  typeof window !== "undefined" ? localStorage.getItem("userEmail") || "sistema" : "sistema";

export default function InventarioObraPage() {
  const log = clientLogger("INVENTARIO");
  const { msg, flash, clear } = useFlashMessage();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraSeleccionada, setObraSeleccionada] = useState<Obra | null>(null);
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  // Modal Ajuste
  const [showAjuste, setShowAjuste] = useState<ItemInventario | null>(null);
  const [ajusteCantidad, setAjusteCantidad] = useState(0);
  const [ajusteMotivo, setAjusteMotivo] = useState("");
  const [ajusteFoto, setAjusteFoto] = useState<File | null>(null);
  const [ajusteFotoPreview, setAjusteFotoPreview] = useState<string | null>(null);

  // Modal Nuevo Material
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoUnidad, setNuevoUnidad] = useState("PZA");
  const [nuevoCantidad, setNuevoCantidad] = useState(1);
  // 22-Abr-2026: tipo MATERIAL | HERRAMIENTA (default MATERIAL)
  const [nuevoTipo, setNuevoTipo] = useState<"MATERIAL" | "HERRAMIENTA">("MATERIAL");

  // 22-Abr-2026: filtro visual tipo (TODOS | MATERIAL | HERRAMIENTA)
  const [filterTipo, setFilterTipo] = useState<"TODOS" | "MATERIAL" | "HERRAMIENTA">("TODOS");
  const [nuevoFoto, setNuevoFoto] = useState<File | null>(null);
  const [nuevoFotoPreview, setNuevoFotoPreview] = useState<string | null>(null);
  const [catalogoProductos, setCatalogoProductos] = useState<ProductoCatalogo[]>([]);
  const [sugerencias, setSugerencias] = useState<ProductoCatalogo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [nuevoProductoId, setNuevoProductoId] = useState<number | null>(null);
  const [validando, setValidando] = useState(false);
  const [validacionResult, setValidacionResult] = useState<any>(null);

  // Modal Registrar Entrada
  const [showEntrada, setShowEntrada] = useState(false);
  const [entradaItem, setEntradaItem] = useState<ItemInventario | null>(null);
  const [entradaCantidad, setEntradaCantidad] = useState(1);
  const [entradaMotivo, setEntradaMotivo] = useState("");
  const [entradaFoto, setEntradaFoto] = useState<File | null>(null);
  const [entradaFotoPreview, setEntradaFotoPreview] = useState<string | null>(null);

  // Modal Registrar Salida
  const [showSalida, setShowSalida] = useState(false);
  const [salidaItem, setSalidaItem] = useState<ItemInventario | null>(null);
  const [salidaCantidad, setSalidaCantidad] = useState(1);
  const [salidaMotivo, setSalidaMotivo] = useState("");
  // 03-Jun-2026 (Daisy bug2): destino opcional para mover material entre obras
  const [salidaDestinoObraId, setSalidaDestinoObraId] = useState<string>("");

  // Modal Editar Material (03-Jun-2026 Daisy bug1)
  const [showEditar, setShowEditar] = useState<ItemInventario | null>(null);
  const [editarNombre, setEditarNombre] = useState("");

  // Modal Ver Foto
  const [fotoAmpliadaUrl, setFotoAmpliadaUrl] = useState<string | null>(null);
  const [fotoAmpliadaItem, setFotoAmpliadaItem] = useState<ItemInventario | null>(null);
  const [fotoReemplazando, setFotoReemplazando] = useState(false);
  const fotoReplaceInputRef = useRef<HTMLInputElement>(null);

  // Validación de formularios
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fileInputNuevoRef = useRef<HTMLInputElement>(null);
  const fileInputAjusteRef = useRef<HTMLInputElement>(null);
  const fileInputEntradaRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadObras(); }, []);

  useEffect(() => {
    if (obraSeleccionada) {
      loadInventario(obraSeleccionada.id);
      loadEntregas(obraSeleccionada.name);
    }
  }, [obraSeleccionada]);

  // ====== LOADERS ======
  const loadObras = async () => {
    const { data, error } = await supabase.from("centros_trabajo").select("id, name:nombre").order("nombre");
    if (error) { log.error("Error loading obras:", (error as {message?: string})?.message || "Error desconocido"); }
    setObras(data || []);
    setLoading(false);
  };

  const loadInventario = async (obraId: string) => {
    const { data, error } = await supabase
      .from("inventario_obra").select("*").eq("obra_id", obraId).order("producto_nombre");
    if (error) { log.error("Error loading inventario:", (error as {message?: string})?.message || "Error desconocido"); return; }
    // Enriquecer con último usuario de movimientos
    const items: ItemInventario[] = data || [];
    if (items.length > 0) {
      const nombres = items.map(i => i.producto_nombre);
      const { data: movs } = await supabase
        .from("inventario_movimientos")
        .select("producto_nombre, usuario, created_at")
        .eq("obra_id", obraId)
        .in("producto_nombre", nombres)
        .order("created_at", { ascending: false });
      if (movs) {
        const ultimoMap = new Map<string, string>();
        for (const m of movs) {
          if (!ultimoMap.has(m.producto_nombre)) ultimoMap.set(m.producto_nombre, m.usuario);
        }
        items.forEach(i => { i.ultimo_usuario = ultimoMap.get(i.producto_nombre) || null; });
      }
    }
    setInventario(items);
  };

  const loadEntregas = async (obraNombre: string) => {
    const { data, error } = await supabase
      .from("entregas").select("*").eq("obra_nombre", obraNombre)
      .eq("status", "RECIBIDO").order("fecha_entrega", { ascending: false }).limit(10);
    if (error) { log.error("Error loading entregas:", (error as {message?: string})?.message || "Error desconocido"); return; }
    setEntregas(data || []);
  };

  const loadCatalogo = async () => {
    if (catalogoProductos.length > 0) return;
    const { data } = await supabase.from("products").select("id, name, unit, category").order("name").limit(500);
    setCatalogoProductos(data || []);
  };

  // ====== UPLOAD FOTO A STORAGE (con watermark fecha/hora) ======
  const subirFoto = async (file: File, prefix: string): Promise<string | null> => {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${prefix}/${Date.now()}_${safeName}`;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "inventario");
      formData.append("path", path);
      const res = await fetch("/api/inventario/watermark", { credentials: "include", method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        flash("err", "Error al subir foto: " + (data.error || "desconocido"));
        return null;
      }
      return data.url;
    } catch (e: unknown) {
      flash("err", "Error al subir foto: " + ((e as {message?: string})?.message || "error"));
      return null;
    }
  };

  // 22-Abr-2026 TKT-002: editar/reemplazar/eliminar foto del item desde modal
  const reemplazarFoto = async (item: ItemInventario, file: File) => {
    if (!obraSeleccionada) return;
    setFotoReemplazando(true);
    try {
      const url = await subirFoto(file, `${obraSeleccionada.id}/productos`);
      if (!url) { setFotoReemplazando(false); return; }
      const { error } = await supabase
        .from("inventario_obra")
        .update({ foto_url: url })
        .eq("id", item.id);
      if (error) {
        flash("err", "No se pudo actualizar foto: " + error.message);
      } else {
        flash("ok", "Foto reemplazada");
        setFotoAmpliadaUrl(url);
        await loadInventario(obraSeleccionada.id);
      }
    } finally {
      setFotoReemplazando(false);
    }
  };

  const eliminarFoto = async (item: ItemInventario) => {
    if (!obraSeleccionada) return;
    if (!confirm(`Eliminar la foto de "${item.producto_nombre}"?`)) return;
    const { error } = await supabase
      .from("inventario_obra")
      .update({ foto_url: null })
      .eq("id", item.id);
    if (error) {
      flash("err", "No se pudo eliminar foto: " + error.message);
      return;
    }
    flash("ok", "Foto eliminada");
    setFotoAmpliadaUrl(null);
    setFotoAmpliadaItem(null);
    await loadInventario(obraSeleccionada.id);
  };

  // ====== HELPERS PARA FILE PREVIEW ======
  const handleFileSelect = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) => {
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // 23-Abr-2026 PR toggle tipo: click en cuadrito cambia MATERIAL <-> HERRAMIENTA.
  // Solo actualiza tipo en BD + auditoria. Folio se conserva (reasignar manual bulk).
  const cambiarTipo = async (item: ItemInventario) => {
    const tipoActual = String(item.tipo || "MATERIAL").toUpperCase() === "HERRAMIENTA" ? "HERRAMIENTA" : "MATERIAL";
    const tipoNuevo: "MATERIAL" | "HERRAMIENTA" = tipoActual === "MATERIAL" ? "HERRAMIENTA" : "MATERIAL";
    // Optimistic UI
    setInventario(prev => prev.map(i => i.id === item.id ? { ...i, tipo: tipoNuevo } : i));
    try {
      const email = typeof window !== "undefined" ? (localStorage.getItem("userEmail") || "") : "";
      const res = await fetch("/api/inventario/tipo", {
        credentials: "include", method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, tipo: tipoNuevo, user_email: email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      flash("ok", `${item.producto_nombre}: ${tipoActual} -> ${tipoNuevo}`);
    } catch (e: unknown) {
      // Rollback
      setInventario(prev => prev.map(i => i.id === item.id ? { ...i, tipo: tipoActual } : i));
      flash("err", `Error cambiando tipo: ${(e as Error).message}`);
    }
  };

  // ====== NUEVO MATERIAL ======
  const validarNuevoMaterial = (): boolean => {
    const errors: Record<string, string> = {};
    if (!nuevoNombre?.trim()) errors.nuevoNombre = "Nombre del material es obligatorio";
    if (nuevoCantidad <= 0) errors.nuevoCantidad = "Cantidad debe ser mayor a 0";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const abrirNuevoMaterial = () => {
    setShowNuevo(true);
    setNuevoNombre("");
    setNuevoUnidad("PZA");
    setNuevoCantidad(1);
    setNuevoTipo("MATERIAL"); // 22-Abr-2026
    setNuevoFoto(null);
    setNuevoFotoPreview(null);
    setNuevoProductoId(null);
    setValidacionResult(null);
    setSugerencias([]);
    setFormErrors({});
    loadCatalogo();
  };

  const validarMaterial = async () => {
    if (!nuevoNombre.trim() || !obraSeleccionada) return;
    setValidando(true);
    setValidacionResult(null);
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const res = await fetch("/api/inventario/validar", {
        credentials: "include", method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ nombre: nuevoNombre.trim(), obraId: obraSeleccionada.id }),
      });
      const data = await res.json().catch(() => ({}));
      setValidacionResult(data);
      if (data.nombreCorregido && data.esValido) {
        setNuevoNombre(data.nombreCorregido);
      }
    } catch {
      // Si falla validación, permitir continuar
    }
    setValidando(false);
  };

  const buscarEnCatalogo = (texto: string) => {
    setNuevoNombre(texto);
    if (texto.length < 2) { setSugerencias([]); return; }
    const lower = texto.toLowerCase();
    setSugerencias(catalogoProductos.filter(p => p.name.toLowerCase().includes(lower)).slice(0, 8));
  };

  const seleccionarDeCatalogo = (prod: ProductoCatalogo) => {
    setNuevoNombre(prod.name);
    setNuevoUnidad(prod.unit || "PZA");
    setNuevoProductoId(parseInt(prod.id, 10) || null);
    setSugerencias([]);
  };

  const guardarNuevoMaterial = async () => {
    if (!obraSeleccionada) { flash("err", "Selecciona una obra"); return; }
    if (!validarNuevoMaterial()) return;
    setGuardando(true);

    try {
      // Verificar duplicado
      const { data: existe } = await supabase
        .from("inventario_obra").select("id")
        .eq("obra_id", obraSeleccionada.id)
        .eq("producto_nombre", nuevoNombre.trim()).single();
      if (existe) {
        flash("err", "Este material ya existe en el inventario de esta obra. Usa 'Registrar Entrada' para agregar cantidad.");
        setGuardando(false);
        return;
      }

      // Subir foto si hay
      let fotoUrl: string | null = null;
      if (nuevoFoto) {
        fotoUrl = await subirFoto(nuevoFoto, `${obraSeleccionada.id}/productos`);
      }

      // TKT-002: Calcular siguiente folio (MAT-NNN o HER-NNN) por obra+tipo
      const prefijo = nuevoTipo === "HERRAMIENTA" ? "HER" : "MAT";
      const { data: existentes } = await supabase
        .from("inventario_obra")
        .select("folio_inventario")
        .eq("obra_id", obraSeleccionada.id)
        .eq("tipo", nuevoTipo)
        .like("folio_inventario", `${prefijo}-%`);
      let maxNum = 0;
      (existentes || []).forEach((r: { folio_inventario?: string | null }) => {
        const m = (r.folio_inventario || "").match(/-(\d+)$/);
        if (m) { const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
      });
      const folioNuevo = `${prefijo}-${String(maxNum + 1).padStart(3, "0")}`;

      // Insert en inventario_obra
      const { error: insertError } = await supabase.from("inventario_obra").insert({
        obra_id: obraSeleccionada.id,
        obra_nombre: obraSeleccionada.name,
        producto_nombre: nuevoNombre.trim(),
        unidad: nuevoUnidad,
        cantidad_disponible: nuevoCantidad,
        cantidad_usada: 0,
        ultimo_movimiento: new Date().toISOString(),
        foto_url: fotoUrl,
        tipo: nuevoTipo, // 22-Abr-2026
        folio_inventario: folioNuevo, // TKT-002
        ...(nuevoProductoId ? { producto_id: nuevoProductoId } : {}),
      });
      if (insertError) { flash("err", "Error: " + insertError.message); setGuardando(false); return; }

      // Movimiento de entrada
      await supabase.from("inventario_movimientos").insert({
        obra_id: obraSeleccionada.id,
        obra_nombre: obraSeleccionada.name,
        producto_nombre: nuevoNombre.trim(),
        unidad: nuevoUnidad,
        tipo: "ENTRADA",
        cantidad: nuevoCantidad,
        saldo_post: nuevoCantidad,
        motivo: "Alta inicial de material",
        referencia_tipo: "ALTA",
        referencia_id: null,
        usuario: getUserEmail(),
        foto_url: fotoUrl,
      });

      setShowNuevo(false);
      loadInventario(obraSeleccionada.id);
    } catch (err: unknown) {
      flash("err", "Error inesperado: " + (err as Error).message);
    }
    setGuardando(false);
  };

  // ====== REGISTRAR ENTRADA (con foto evidencia) ======
  const abrirRegistrarEntrada = (item: ItemInventario) => {
    setShowEntrada(true);
    setEntradaItem(item);
    setEntradaCantidad(1);
    setEntradaMotivo("");
    setEntradaFoto(null);
    setEntradaFotoPreview(null);
  };

  const guardarEntrada = async () => {
    if (!obraSeleccionada || !entradaItem || entradaCantidad <= 0) return;
    setGuardando(true);

    try {
      let fotoUrl: string | null = null;
      if (entradaFoto) {
        fotoUrl = await subirFoto(entradaFoto, `${obraSeleccionada.id}/entradas`);
      }

      const nuevoDisp = entradaItem.cantidad_disponible + entradaCantidad;

      // Optimistic lock
      const { data: rows, error } = await supabase
        .from("inventario_obra")
        .update({
          cantidad_disponible: nuevoDisp,
          ultimo_movimiento: new Date().toISOString(),
          ...(fotoUrl ? { foto_url: fotoUrl } : {}),
        })
        .eq("id", entradaItem.id)
        .eq("cantidad_disponible", entradaItem.cantidad_disponible)
        .select("id");

      if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); setGuardando(false); return; }
      if (!rows || rows.length === 0) {
        flash("err", "Otro usuario modificó este ítem. Recarga y verifica.");
        loadInventario(obraSeleccionada.id);
        setGuardando(false);
        return;
      }

      await supabase.from("inventario_movimientos").insert({
        obra_id: obraSeleccionada.id,
        obra_nombre: obraSeleccionada.name,
        producto_nombre: entradaItem.producto_nombre,
        unidad: entradaItem.unidad,
        tipo: "ENTRADA",
        cantidad: entradaCantidad,
        saldo_post: nuevoDisp,
        motivo: entradaMotivo || "Entrada manual con evidencia",
        referencia_tipo: "ENTRADA_MANUAL",
        referencia_id: entradaItem.id,
        usuario: getUserEmail(),
        foto_url: fotoUrl,
      });

      setShowEntrada(false);
      loadInventario(obraSeleccionada.id);
    } catch (err: unknown) {
      flash("err", "Error: " + (err as Error).message);
    }
    setGuardando(false);
  };

  // ====== REGISTRAR SALIDA ======
  const abrirSalida = (item: ItemInventario) => {
    setShowSalida(true);
    setSalidaItem(item);
    setSalidaCantidad(1);
    setSalidaMotivo("");
  };

  const guardarSalida = async () => {
    if (!salidaItem || !obraSeleccionada || salidaCantidad <= 0) return;
    if (salidaCantidad > salidaItem.cantidad_disponible) {
      flash("err", "No hay suficiente material disponible. Disponible: " + salidaItem.cantidad_disponible);
      return;
    }
    setGuardando(true);
    try {
      const nuevoDisp = salidaItem.cantidad_disponible - salidaCantidad;
      const nuevaUsada = salidaItem.cantidad_usada + salidaCantidad;

      const { data: rows, error } = await supabase
        .from("inventario_obra")
        .update({
          cantidad_disponible: nuevoDisp,
          cantidad_usada: nuevaUsada,
          ultimo_movimiento: new Date().toISOString(),
        })
        .eq("id", salidaItem.id)
        .eq("cantidad_disponible", salidaItem.cantidad_disponible)
        .eq("cantidad_usada", salidaItem.cantidad_usada)
        .select("id");

      if (error) { flash("err", "Error: " + (error as {message?: string})?.message || "Error desconocido"); setGuardando(false); return; }
      if (!rows || rows.length === 0) {
        flash("err", "Otro usuario modificó este ítem. Recarga y verifica.");
        loadInventario(obraSeleccionada.id);
        setGuardando(false);
        return;
      }

      const esTraslado = !!salidaDestinoObraId && salidaDestinoObraId !== String(obraSeleccionada.id);
      const obraDestino = esTraslado ? obras.find((c: Obra) => String(c.id) === salidaDestinoObraId) : null;

      await supabase.from("inventario_movimientos").insert({
        obra_id: obraSeleccionada.id,
        obra_nombre: obraSeleccionada.name,
        producto_nombre: salidaItem.producto_nombre,
        unidad: salidaItem.unidad,
        tipo: esTraslado ? "TRASLADO_SALIDA" : "SALIDA",
        cantidad: salidaCantidad,
        saldo_post: nuevoDisp,
        motivo: esTraslado
          ? `Traslado a ${obraDestino?.name || "obra destino"}` + (salidaMotivo ? ` | ${salidaMotivo}` : "")
          : (salidaMotivo || "Salida manual"),
        referencia_tipo: esTraslado ? "TRASLADO" : "SALIDA_MANUAL",
        referencia_id: salidaItem.id,
        usuario: getUserEmail(),
      });

      if (esTraslado && obraDestino) {
        // Buscar si ya existe el item en la obra destino
        const { data: existeDestino } = await supabase
          .from("inventario_obra")
          .select("id, cantidad_disponible, cantidad_usada")
          .eq("obra_id", obraDestino.id)
          .eq("producto_nombre", salidaItem.producto_nombre)
          .maybeSingle();

        if (existeDestino) {
          await supabase.from("inventario_obra").update({
            cantidad_disponible: existeDestino.cantidad_disponible + salidaCantidad,
            ultimo_movimiento: new Date().toISOString(),
          }).eq("id", existeDestino.id);
        } else {
          await supabase.from("inventario_obra").insert({
            obra_id: obraDestino.id,
            obra_nombre: obraDestino.name,
            producto_nombre: salidaItem.producto_nombre,
            unidad: salidaItem.unidad,
            cantidad_disponible: salidaCantidad,
            cantidad_usada: 0,
            tipo: salidaItem.tipo || "MATERIAL",
            ultimo_movimiento: new Date().toISOString(),
          });
        }

        await supabase.from("inventario_movimientos").insert({
          obra_id: obraDestino.id,
          obra_nombre: obraDestino.name,
          producto_nombre: salidaItem.producto_nombre,
          unidad: salidaItem.unidad,
          tipo: "TRASLADO_ENTRADA",
          cantidad: salidaCantidad,
          saldo_post: (existeDestino?.cantidad_disponible || 0) + salidaCantidad,
          motivo: `Traslado desde ${obraSeleccionada.name}`,
          referencia_tipo: "TRASLADO",
          referencia_id: salidaItem.id,
          usuario: getUserEmail(),
        });

        flash("ok", `Traslado registrado: ${salidaCantidad} ${salidaItem.unidad} a ${obraDestino.name}`);
      } else {
        flash("ok", `Salida registrada: ${salidaCantidad} ${salidaItem.unidad}`);
      }

      setShowSalida(false);
      setSalidaDestinoObraId("");
      loadInventario(obraSeleccionada.id);
    } catch (err: unknown) {
      flash("err", "Error: " + (err as Error).message);
    }
    setGuardando(false);
  };

  // ====== EDITAR NOMBRE MATERIAL (03-Jun-2026 Daisy bug1) ======
  const abrirEditar = (item: ItemInventario) => {
    setShowEditar(item);
    setEditarNombre(item.producto_nombre);
  };

  const guardarEditar = async () => {
    if (!showEditar || !editarNombre.trim()) { flash("err","Escribe el nuevo nombre del producto"); return; }
    setGuardando(true);
    try {
      const { error } = await supabase
        .from("inventario_obra")
        .update({ producto_nombre: editarNombre.trim() })
        .eq("id", showEditar.id);
      if (error) { flash("err", "Error: " + error.message); setGuardando(false); return; }
      flash("ok", "Nombre actualizado");
      setShowEditar(null);
      setEditarNombre("");
      if (obraSeleccionada) loadInventario(obraSeleccionada.id);
    } catch (err: unknown) {
      flash("err", "Error: " + (err as Error).message);
    }
    setGuardando(false);
  };

  // ====== ELIMINAR MATERIAL (03-Jun-2026 Daisy bug1) ======
  const eliminarMaterial = async (item: ItemInventario) => {
    if (!confirm(`Eliminar definitivamente "${item.producto_nombre}" del inventario?\n\nDisponible: ${item.cantidad_disponible} ${item.unidad}\n\nEsta accion no se puede deshacer.`)) return;
    setGuardando(true);
    try {
      const { error } = await supabase.from("inventario_obra").delete().eq("id", item.id);
      if (error) { flash("err", "Error: " + error.message); setGuardando(false); return; }
      flash("ok", "Material eliminado");
      if (obraSeleccionada) loadInventario(obraSeleccionada.id);
    } catch (err: unknown) {
      flash("err", "Error: " + (err as Error).message);
    }
    setGuardando(false);
  };

  // ====== IMPORTAR DE ENTREGA ======
  const importarDeEntrega = async (entrega: Entrega) => {
    if (!obraSeleccionada || !entrega.materiales_recibidos) return;

    for (const mat of entrega.materiales_recibidos) {
      const { data: existe } = await supabase
        .from("inventario_obra").select("*")
        .eq("obra_id", obraSeleccionada.id)
        .eq("producto_nombre", mat.nombre || mat.product_name).maybeSingle();

      const cantMov = Number(mat.cantidad || mat.quantity || 0);
      const nombreMat = mat.nombre || mat.product_name;
      const unidadMat = mat.unidad || mat.unit || "PZA";
      let saldoPost = 0;

      if (existe) {
        saldoPost = Number(existe.cantidad_disponible) + cantMov;
        await supabase.from("inventario_obra").update({
          cantidad_disponible: saldoPost,
          ultimo_movimiento: new Date().toISOString(),
        }).eq("id", existe.id);
      } else {
        saldoPost = cantMov;
        await supabase.from("inventario_obra").insert({
          obra_id: obraSeleccionada.id,
          obra_nombre: obraSeleccionada.name,
          producto_nombre: nombreMat,
          unidad: unidadMat,
          cantidad_disponible: cantMov,
          cantidad_usada: 0,
          entrega_id: entrega.id,
        });
      }

      await supabase.from("inventario_movimientos").insert({
        obra_id: obraSeleccionada.id,
        obra_nombre: obraSeleccionada.name,
        producto_nombre: nombreMat,
        unidad: unidadMat,
        tipo: "ENTRADA",
        cantidad: cantMov,
        saldo_post: saldoPost,
        motivo: `Importado de entrega ${entrega.folio}`,
        referencia_tipo: "ENTREGA",
        referencia_id: entrega.id,
        usuario: getUserEmail(),
        foto_url: entrega.foto_url || null,
      });
    }
    loadInventario(obraSeleccionada.id);
    flash("ok", "Materiales importados al inventario");
  };

  // ====== AJUSTAR INVENTARIO (con foto opcional) ======
  const abrirAjuste = (item: ItemInventario) => {
    setShowAjuste(item);
    setAjusteCantidad(0);
    setAjusteMotivo("");
    setAjusteFoto(null);
    setAjusteFotoPreview(null);
  };

  const ajustarInventario = async () => {
    if (!showAjuste || !obraSeleccionada || ajusteCantidad === 0) return;
    setGuardando(true);

    try {
      const expectedDisp = showAjuste.cantidad_disponible;
      const expectedUsada = showAjuste.cantidad_usada;
      const nuevaCantidad = expectedDisp + ajusteCantidad;
      if (nuevaCantidad < 0) { flash("err", "La cantidad resultante no puede ser negativa"); setGuardando(false); return; }
      const nuevaUsada = ajusteCantidad < 0 ? expectedUsada + Math.abs(ajusteCantidad) : expectedUsada;

      let fotoUrl: string | null = null;
      if (ajusteFoto) {
        fotoUrl = await subirFoto(ajusteFoto, `${obraSeleccionada.id}/ajustes`);
      }

      const { data: rows, error } = await supabase
        .from("inventario_obra")
        .update({
          cantidad_disponible: nuevaCantidad,
          cantidad_usada: nuevaUsada,
          ultimo_movimiento: new Date().toISOString(),
        })
        .eq("id", showAjuste.id)
        .eq("cantidad_disponible", expectedDisp)
        .eq("cantidad_usada", expectedUsada)
        .select("id");

      if (error) { flash("err", "Error en ajuste: " + (error as {message?: string})?.message || "Error desconocido"); setGuardando(false); return; }
      if (!rows || rows.length === 0) {
        flash("err", "Otro usuario modificó este ítem. Recarga y verifica.");
        loadInventario(obraSeleccionada.id);
        setGuardando(false);
        return;
      }

      await supabase.from("inventario_movimientos").insert({
        obra_id: showAjuste.obra_id,
        obra_nombre: showAjuste.obra_nombre,
        producto_nombre: showAjuste.producto_nombre,
        unidad: showAjuste.unidad,
        tipo: ajusteCantidad >= 0 ? "ENTRADA" : "SALIDA",
        cantidad: Math.abs(ajusteCantidad),
        saldo_post: nuevaCantidad,
        motivo: ajusteMotivo || "Ajuste manual",
        referencia_tipo: "AJUSTE",
        referencia_id: showAjuste.id,
        usuario: getUserEmail(),
        foto_url: fotoUrl,
      });

      setShowAjuste(null);
      loadInventario(obraSeleccionada.id);
    } catch (err: unknown) {
      flash("err", "Error: " + (err as Error).message);
    }
    setGuardando(false);
  };

  // ====== ACTUALIZAR FOTO DE PRODUCTO ======
  const actualizarFotoProducto = async (item: ItemInventario, file: File) => {
    if (!obraSeleccionada) return;
    const fotoUrl = await subirFoto(file, `${obraSeleccionada.id}/productos`);
    if (!fotoUrl) return;
    await supabase.from("inventario_obra").update({ foto_url: fotoUrl }).eq("id", item.id);
    loadInventario(obraSeleccionada.id);
  };

  // ====== EXPORTAR ======
  const exportarExcel = async () => {
    if (!obraSeleccionada) return;
    setExportandoExcel(true);
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const url = `/api/inventario/export?obra_id=${encodeURIComponent(obraSeleccionada.id)}&obra_nombre=${encodeURIComponent(obraSeleccionada.name)}&format=excel`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) { flash("err", "Error al generar Excel"); return; }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Inventario_${obraSeleccionada.name.replace(/ /g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e: unknown) {
      flash("err", "Error al exportar: " + ((e as { message?: string })?.message || "desconocido"));
    }
    setExportandoExcel(false);
  };

  const exportarPDF = async () => {
    if (!obraSeleccionada) return;
    setExportandoPDF(true);
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const url = `/api/inventario/export?obra_id=${encodeURIComponent(obraSeleccionada.id)}&obra_nombre=${encodeURIComponent(obraSeleccionada.name)}&format=pdf`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) { flash("err", "Error al generar PDF"); return; }
      const html = await res.text();
      // Descarga directa como archivo HTML — cero diálogos, cero ventanas emergentes.
      // El usuario abre el archivo y usa Ctrl+P → "Guardar como PDF" si lo necesita.
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const now = new Date();
      const fecha = now.toISOString().slice(0, 10);
      const hora = now.toTimeString().slice(0, 8).replace(/:/g, "-");
      const obraNombre = obraSeleccionada.name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const filename = `ARIA27_Inventario_${obraNombre}_${fecha}_${hora}.html`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e: unknown) {
      flash("err", "Error al exportar: " + ((e as { message?: string })?.message || "desconocido"));
    }
    setExportandoPDF(false);
  };

  // ====== COMPUTED ======
  const inventarioFiltrado = inventario.filter(item => {
    if (!item.producto_nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    // 22-Abr-2026: filtro por tipo. Items sin tipo (legacy) cuentan como MATERIAL.
    if (filterTipo !== "TODOS") {
      const t = (item.tipo || "MATERIAL").toUpperCase();
      if (t !== filterTipo) return false;
    }
    return true;
  });
  const totalItems = inventario.length;
  const totalDisponible = inventario.reduce((sum, i) => sum + i.cantidad_disponible, 0);
  const itemsBajos = inventario.filter(i => i.cantidad_disponible <= 5).length;

  // ====== RENDER ======
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-aria-accent" />
      </div>
    );
  }

  // Vista: Seleccionar Obra
  if (!obraSeleccionada) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <AriaBackButton href="/dashboard/obras" />
          <div>
            <h1 className="text-2xl font-bold text-white">Inventario por Obra</h1>
            <p className="text-[#7f93b0] text-sm">Selecciona una obra para ver su inventario</p>
          </div>
        </div>

        {/* 21-Abr-2026: banner educativo — las herramientas van en Activos, no en Inventario */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#1E3E7A]/20 to-[#0A2450]/30 border border-[#3A5E9A]/50">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-aria-primary/20 shrink-0">
              <Package className="w-5 h-5 text-aria-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white mb-1">Inventario = materiales consumibles</p>
              <p className="text-xs text-[#c9d8ed] leading-relaxed">
                Cemento, varilla, tubería, pintura y demás materiales que se agotan van aquí.
                Las <strong>herramientas</strong> (taladros, martillos, andamios, cinceles) y <strong>maquinaria</strong> se registran en{" "}
                <Link href="/dashboard/activos/catalogo?tipo=HERRAMIENTA" className="text-aria-accent underline hover:text-white">
                  Activos → Catálogo
                </Link>{" "}
                para llevar control de asignación y mantenimiento.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map((obra) => (
            <button
              key={obra.id}
              onClick={() => setObraSeleccionada(obra)}
              className="p-6 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/50 rounded-xl text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl group-hover:bg-aria-primary/30 transition-colors">
                  <Package className="w-6 h-6 text-aria-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-aria-accent transition-colors">
                    {obra.name}
                  </h3>
                  <p className="text-sm text-[#7f93b0] mt-1">Ver inventario</p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#4a6080] group-hover:text-aria-accent transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Vista: Inventario de Obra
  return (
    <div
      className="px-5 pt-4 pb-4 h-full flex flex-col overflow-hidden"
      style={{
        background: [
          "radial-gradient(circle at 50% 28%, rgba(72,128,230,0.07) 0%, rgba(72,128,230,0.03) 20%, rgba(72,128,230,0.00) 44%)",
          "linear-gradient(180deg, #06152F 0%, #081E46 44%, #0A2450 100%)",
        ].join(", "),
      }}
    >
      <FlashBanner msg={msg} />
      {/* Header canon: bloque azul rey solido con titulo + botones de accion */}
      <div
        className="flex-shrink-0 rounded-xl px-5 py-3 flex items-center justify-between gap-4"
        style={{
          marginBottom: "20px",
          background: "linear-gradient(180deg, #123E92 0%, #103A86 100%)",
          borderBottom: "1px solid rgba(150,180,230,0.10)",
          boxShadow: "inset 0 1px 0 rgba(220,235,255,0.06), 0 4px 14px rgba(0,0,0,0.30)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <AriaBackButton onClick={() => setObraSeleccionada(null)} />
          <div className="min-w-0">
            <h1 style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.03em", color: "#F4F8FF", lineHeight: 1.1 }}>
              {obraSeleccionada.name}
            </h1>
            <p style={{ fontSize: "12px", fontWeight: 500, color: "rgba(214,228,255,0.72)", marginTop: 2 }}>
              Inventario de materiales y herramientas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ActionBtn onClick={exportarExcel} disabled={exportandoExcel || inventario.length === 0} loading={exportandoExcel} icon={FileSpreadsheet} label="Excel" variant="emerald" />
          <ActionBtn onClick={exportarPDF}   disabled={exportandoPDF   || inventario.length === 0} loading={exportandoPDF}   icon={FileText}        label="PDF"   variant="rose" />
          <ActionBtn onClick={abrirNuevoMaterial} icon={Plus} label="Nuevo Material" variant="primary" />
        </div>
      </div>

      {/* Stats canon: 3 cards steel solidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0" style={{ marginBottom: "16px" }}>
        <KpiCard icon={Package}        accent="#7BB6FF" label="Productos"             value={totalItems} />
        <KpiCard icon={TrendingUp}     accent="#46D4FF" label="Unidades disponibles"  value={totalDisponible.toLocaleString()} />
        <KpiCard icon={AlertTriangle}  accent="#F59E0B" label="Stock bajo"            value={itemsBajos} sub="<= 5 unidades" />
      </div>

      {/* Toolbar: tabs + buscador en una sola fila compacta */}
      <div className="flex items-center gap-3 flex-shrink-0" style={{ marginBottom: "12px" }}>
        <div className="inline-flex items-center gap-1 p-1 rounded-lg" style={{ background: "linear-gradient(180deg, #1A2A44 0%, #14223A 100%)", border: "1px solid rgba(140,178,228,0.14)", boxShadow: "inset 0 1px 0 rgba(220,235,255,0.04)" }}>
          {(["TODOS","MATERIAL","HERRAMIENTA"] as const).map(t => {
            const active = filterTipo === t;
            return (
              <button key={t} onClick={() => setFilterTipo(t)} type="button"
                style={{
                  padding: "7px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  color: active ? "#FFFFFF" : "rgba(180,200,228,0.72)",
                  background: active ? "linear-gradient(180deg, #1E3E7A 0%, #163068 100%)" : "transparent",
                  border: active ? "1px solid rgba(160,200,240,0.30)" : "1px solid transparent",
                  boxShadow: active ? "inset 0 1px 0 rgba(220,235,255,0.10), 0 2px 6px rgba(0,0,0,0.30)" : "none",
                  transition: "all 120ms ease",
                  cursor: "pointer",
                }}>
                {t === "TODOS" ? "Todos" : t === "MATERIAL" ? "Materiales" : "Herramientas"}
              </button>
            );
          })}
        </div>
        <div className="relative" style={{ maxWidth: 360, flex: 1 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(180,200,228,0.55)" }} />
          <input
            type="text"
            placeholder="Buscar material..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              fontSize: "13px",
              borderRadius: "8px",
              color: "#EAF2FF",
              background: "linear-gradient(180deg, #1A2A44 0%, #14223A 100%)",
              border: "1px solid rgba(140,178,228,0.18)",
              boxShadow: "inset 0 1px 0 rgba(220,235,255,0.04)",
              outline: "none",
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl overflow-hidden" style={{ background: "linear-gradient(180deg, #1A2A44 0%, #14223A 100%)", border: "1px solid rgba(140,178,228,0.18)", boxShadow: "inset 0 1px 0 rgba(220,235,255,0.04), 0 4px 14px rgba(0,0,0,0.30)" }}>
        <div className="h-full overflow-y-auto">
        <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead className="sticky top-0 z-10" style={{ background: "linear-gradient(180deg, #243A58 0%, #1A2A44 100%)", boxShadow: "0 2px 6px rgba(0,0,0,0.30)" }}>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#C9D8ED", letterSpacing: "0.06em" }}>Folio</th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#C9D8ED", letterSpacing: "0.06em" }}>Tipo</th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#C9D8ED", letterSpacing: "0.06em" }}>Material</th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#C9D8ED", letterSpacing: "0.06em" }}>Disponible</th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#C9D8ED", letterSpacing: "0.06em" }}>Usado</th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#C9D8ED", letterSpacing: "0.06em" }}>Unidad</th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#C9D8ED", letterSpacing: "0.06em" }}>Usuario</th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#C9D8ED", letterSpacing: "0.06em" }}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {inventarioFiltrado.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.04]">
                    <td className="px-3 py-3 text-xs font-mono font-bold text-aria-accent whitespace-nowrap">
                      {item.folio_inventario || "-"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {(() => {
                        const esHerramienta = String(item.tipo || "MATERIAL").toUpperCase() === "HERRAMIENTA";
                        const bg = esHerramienta
                          ? "linear-gradient(180deg, #D97706 0%, #B45309 100%)"
                          : "linear-gradient(180deg, #1E3E7A 0%, #163068 100%)";
                        const label = esHerramienta ? "HER" : "MAT";
                        return (
                          <button
                            type="button"
                            onClick={() => cambiarTipo(item)}
                            title={`Cambiar a ${esHerramienta ? "MATERIAL" : "HERRAMIENTA"}`}
                            className="inline-flex items-center justify-center w-10 h-7 rounded-md text-[10px] font-bold tracking-wide transition-transform hover:scale-105 active:scale-95"
                            style={{
                              background: bg,
                              color: "#FFFFFF",
                              border: "1px solid rgba(140,178,228,0.25)",
                              boxShadow: "inset 0 1px 0 rgba(220,235,255,0.15), 0 2px 4px rgba(0,0,0,0.30)",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {item.foto_url ? (
                          <button
                            type="button"
                            onClick={() => { setFotoAmpliadaUrl(item.foto_url!); setFotoAmpliadaItem(item); }}
                            className="w-9 h-9 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.08] flex-shrink-0 transition-all hover:border-aria-accent hover:scale-110"
                            title="Ver/editar foto"
                          >
                            <img
                              src={item.foto_url}
                              alt={item.producto_nombre}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setFotoAmpliadaItem(item); fotoReplaceInputRef.current?.click(); }}
                            className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0 hover:border-aria-accent hover:bg-white/[0.08] transition-all"
                            title="Subir foto"
                          >
                            <ImageIcon className="w-4 h-4 text-[#4a6080]" />
                          </button>
                        )}
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{item.producto_nombre}</p>
                          <p className="text-xs text-[#7f93b0]">
                            Último mov: {new Date(item.ultimo_movimiento).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold ${item.cantidad_disponible <= 5 ? 'text-amber-400' : 'text-aria-accent'}`}>
                        {item.cantidad_disponible}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-[#7f93b0]">{item.cantidad_usada}</td>
                    <td className="px-3 py-3 text-center text-[#7f93b0]">{item.unidad}</td>
                    <td className="px-3 py-3">
                      {item.ultimo_usuario ? (
                        <p className="text-xs text-[#7f93b0] truncate max-w-[120px]" title={item.ultimo_usuario}>
                          {item.ultimo_usuario.split("@")[0]}
                        </p>
                      ) : (
                        <p className="text-xs text-[#4a6080]">—</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex items-center rounded-lg overflow-hidden" style={{ background: "linear-gradient(180deg, #1A2A44 0%, #14223A 100%)", border: "1px solid rgba(140,178,228,0.18)", boxShadow: "inset 0 1px 0 rgba(220,235,255,0.05), 0 2px 6px rgba(0,0,0,0.30)" }}>
                        <IconBtn href={`/dashboard/obras/inventario/kardex?obra=${encodeURIComponent(item.obra_nombre)}&producto=${encodeURIComponent(item.producto_nombre)}`} icon={History} title="Ver kardex" variant="primary" />
                        <IconBtn onClick={() => abrirRegistrarEntrada(item)} icon={Truck} title="Registrar entrada" variant="emerald" />
                        <IconBtn onClick={() => abrirSalida(item)} icon={Minus} title="Registrar salida o traslado" variant="rose" />
                        <IconBtn onClick={() => abrirAjuste(item)} icon={Plus} title="Ajustar inventario" variant="amber" />
                        <IconBtn onClick={() => abrirEditar(item)} icon={Edit2} title="Editar nombre" variant="primary" />
                        <IconBtn onClick={() => eliminarMaterial(item)} icon={Trash2} title="Eliminar material" variant="rose" />
                      </div>
                    </td>
                  </tr>
                ))}
                {inventarioFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#7f93b0]">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>No hay materiales en inventario</p>
                      <p className="text-sm mt-1">Agrega materiales con el botón &quot;Nuevo Material&quot;</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* ====== MODAL: Nuevo Material ====== */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1d38] rounded-xl p-6 w-full max-w-lg border border-white/[0.08] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Nuevo Material</h3>
              <button onClick={() => setShowNuevo(false)} className="p-1 hover:bg-white/[0.06] rounded-lg"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>

            {/* Nombre con autocompletado */}
            <label className="block text-sm text-[#c9d8ed] mb-1">Nombre del material *</label>
            <div className="relative mb-3">
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => buscarEnCatalogo(e.target.value)}
                placeholder="Ej: Arena sílica saco 25kg"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:outline-none focus:border-aria-primary"
              />
              {formErrors.nuevoNombre && <p className="text-red-400 text-xs mt-1">{formErrors.nuevoNombre}</p>}
              {sugerencias.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#0f2448] border border-white/[0.08] rounded-lg max-h-48 overflow-y-auto">
                  {sugerencias.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => seleccionarDeCatalogo(s)}
                      className="w-full px-4 py-2 text-left text-white hover:bg-white/[0.06] text-sm"
                    >
                      {s.name} <span className="text-[#7f93b0]">({s.unit})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Validar con IA */}
            {nuevoNombre.trim().length >= 2 && !nuevoProductoId && (
              <div className="mb-3">
                <button
                  onClick={validarMaterial}
                  disabled={validando}
                  className="px-3 py-1.5 bg-aria-primary-light hover:bg-aria-primary-hover/40 text-aria-accent rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {validando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  {validando ? "Validando..." : "Validar nombre con IA"}
                </button>
                {validacionResult && (
                  <div className={`mt-2 p-2 rounded-lg text-sm ${validacionResult.esValido ? 'bg-emerald-500/10 border border-white/[0.08]' : 'bg-red-500/10 border border-red-500/20'}`}>
                    {validacionResult.esValido ? (
                      <p className="text-aria-accent">✓ Material válido: <span className="font-medium text-white">{validacionResult.nombreCorregido}</span></p>
                    ) : (
                      <p className="text-red-300">✗ {validacionResult.razon || "No parece ser un material de construcción"}</p>
                    )}
                    {validacionResult.existeEnObra && (
                      <p className="text-amber-300 mt-1">⚠ Ya existe en el inventario de esta obra</p>
                    )}
                    {validacionResult.matchExacto && (
                      <p className="text-aria-accent mt-1">→ Coincide con: <span className="font-medium">{validacionResult.matchExacto.name}</span> ({validacionResult.matchExacto.unit})</p>
                    )}
                    {!validacionResult.matchExacto && validacionResult.sugerencias?.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[#7f93b0] text-xs">Productos similares:</p>
                        {validacionResult.sugerencias.slice(0, 3).map((s: { id: string; name: string; unit: string; similarity: number }) => (
                          <button key={s.id} onClick={() => { setNuevoNombre(s.name); setNuevoUnidad(s.unit || "PZA"); setNuevoProductoId(parseInt(s.id, 10) || null); setValidacionResult(null); }}
                            className="block text-left text-aria-accent hover:text-aria-accent text-xs mt-0.5">
                            → {s.name} ({s.unit}) — {s.similarity}% similar
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Unidad + Cantidad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm text-[#c9d8ed] mb-1">Unidad</label>
                <select
                  value={nuevoUnidad}
                  onChange={(e) => setNuevoUnidad(e.target.value)}
                  className="w-full px-3 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary"
                >
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#c9d8ed] mb-1">Cantidad inicial *</label>
                <input
                  type="number" min={1}
                  value={nuevoCantidad}
                  onChange={(e) => setNuevoCantidad(Number(e.target.value))}
                  className="w-full px-3 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary"
                />
                {formErrors.nuevoCantidad && <p className="text-red-400 text-xs mt-1">{formErrors.nuevoCantidad}</p>}
              </div>
            </div>

            {/* 22-Abr-2026: selector Tipo MATERIAL | HERRAMIENTA */}
            <div className="mb-4">
              <label className="block text-sm text-[#c9d8ed] mb-2">Tipo</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setNuevoTipo("MATERIAL")}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${nuevoTipo === "MATERIAL" ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-white/[0.04] border-white/[0.08] text-[#7f93b0] hover:border-white/[0.15]"}`}>
                  Material
                </button>
                <button type="button" onClick={() => setNuevoTipo("HERRAMIENTA")}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${nuevoTipo === "HERRAMIENTA" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-white/[0.04] border-white/[0.08] text-[#7f93b0] hover:border-white/[0.15]"}`}>
                  Herramienta
                </button>
              </div>
              <p className="text-xs text-[#4a6080] mt-1">Las herramientas tambien pueden vivir en Activos para mantenimiento y asignacion.</p>
            </div>

            {/* Foto del material */}
            <label className="block text-sm text-[#c9d8ed] mb-1">Foto del material (opcional)</label>
            <div className="mb-4">
              {nuevoFotoPreview ? (
                <div className="relative inline-block">
                  <img src={nuevoFotoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-white/[0.08]" />
                  <button
                    onClick={() => { setNuevoFoto(null); setNuevoFotoPreview(null); }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputNuevoRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-dashed border-white/[0.12] rounded-lg text-[#7f93b0] hover:border-aria-accent/50 hover:text-aria-accent transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Subir foto
                </button>
              )}
              <input
                ref={fileInputNuevoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setNuevoFoto, setNuevoFotoPreview)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowNuevo(false)} className="px-4 py-2 text-[#7f93b0] hover:text-white">Cancelar</button>
              <button
                onClick={guardarNuevoMaterial}
                disabled={!nuevoNombre.trim() || nuevoCantidad <= 0 || guardando}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Registrar Entrada ====== */}
      {showEntrada && entradaItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1d38] rounded-xl p-6 w-full max-w-lg border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Registrar Entrada</h3>
              <button onClick={() => setShowEntrada(false)} className="p-1 hover:bg-white/[0.06] rounded-lg"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>

            <div className="p-3 bg-white/[0.04] rounded-lg mb-4">
              <div className="flex items-center gap-3">
                {entradaItem.foto_url && <img src={entradaItem.foto_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                <div>
                  <p className="text-white font-medium">{entradaItem.producto_nombre}</p>
                  <p className="text-sm text-[#7f93b0]">Disponible actual: {entradaItem.cantidad_disponible} {entradaItem.unidad}</p>
                </div>
              </div>
            </div>

            <label className="block text-sm text-[#c9d8ed] mb-1">Cantidad recibida *</label>
            <input
              type="number" min={1}
              value={entradaCantidad}
              onChange={(e) => setEntradaCantidad(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-aria-primary mb-3"
            />
            <p className="text-center text-sm text-[#7f93b0] mb-3">
              Nuevo total: <span className="text-aria-accent font-bold">{entradaItem.cantidad_disponible + entradaCantidad}</span> {entradaItem.unidad}
            </p>

            <label className="block text-sm text-[#c9d8ed] mb-1">Motivo / OC relacionada</label>
            <input
              type="text"
              value={entradaMotivo}
              onChange={(e) => setEntradaMotivo(e.target.value)}
              placeholder="Ej: Entrega OC-2026-00015, Proveedor Cemex"
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:outline-none focus:border-aria-primary mb-3"
            />

            {/* Foto evidencia */}
            <label className="block text-sm text-[#c9d8ed] mb-1">Foto de evidencia (recomendado)</label>
            <div className="mb-4">
              {entradaFotoPreview ? (
                <div className="relative inline-block">
                  <img src={entradaFotoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-white/[0.08]" />
                  <button
                    onClick={() => { setEntradaFoto(null); setEntradaFotoPreview(null); }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputEntradaRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-dashed border-white/[0.12] rounded-lg text-[#7f93b0] hover:border-emerald-400/50 hover:text-aria-accent transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Subir foto de evidencia
                </button>
              )}
              <input
                ref={fileInputEntradaRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setEntradaFoto, setEntradaFotoPreview)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEntrada(false)} className="px-4 py-2 text-[#7f93b0] hover:text-white">Cancelar</button>
              <button
                onClick={guardarEntrada}
                disabled={entradaCantidad <= 0 || guardando}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Registrar Entrada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Ajustar Inventario ====== */}
      {showAjuste && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1d38] rounded-xl p-6 w-full max-w-md border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Ajustar Inventario</h3>
              <button onClick={() => setShowAjuste(null)} className="p-1 hover:bg-white/[0.06] rounded-lg"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>

            <p className="text-[#c9d8ed] mb-2">{showAjuste.producto_nombre}</p>
            <p className="text-sm text-[#7f93b0] mb-4">
              Disponible actual: <span className="text-white font-bold">{showAjuste.cantidad_disponible}</span> {showAjuste.unidad}
            </p>

            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => setAjusteCantidad(ajusteCantidad - 1)} className="p-3 bg-red-500/20 hover:bg-red-500/40 rounded-lg">
                <Minus className="w-5 h-5 text-red-400" />
              </button>
              <input
                type="number" min="0"
                value={ajusteCantidad}
                onChange={(e) => setAjusteCantidad(Number(e.target.value))}
                className="flex-1 px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-aria-primary"
              />
              <button onClick={() => setAjusteCantidad(ajusteCantidad + 1)} className="p-3 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-lg">
                <Plus className="w-5 h-5 text-aria-accent" />
              </button>
            </div>

            <p className="text-center text-sm mb-4">
              Nuevo total: <span className={`font-bold ${showAjuste.cantidad_disponible + ajusteCantidad < 0 ? 'text-red-400' : 'text-aria-accent'}`}>
                {Math.max(0, showAjuste.cantidad_disponible + ajusteCantidad)}
              </span> {showAjuste.unidad}
            </p>

            <input
              type="text"
              placeholder="Motivo del ajuste (opcional)"
              value={ajusteMotivo}
              onChange={(e) => setAjusteMotivo(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:outline-none focus:border-aria-primary mb-3"
            />

            {/* Foto opcional para ajuste */}
            <label className="block text-sm text-[#c9d8ed] mb-1">Foto de evidencia (opcional)</label>
            <div className="mb-4">
              {ajusteFotoPreview ? (
                <div className="relative inline-block">
                  <img src={ajusteFotoPreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border border-white/[0.08]" />
                  <button onClick={() => { setAjusteFoto(null); setAjusteFotoPreview(null); }} className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputAjusteRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-dashed border-white/[0.12] rounded-lg text-[#7f93b0] hover:border-aria-accent/50 text-sm"
                >
                  <Camera className="w-4 h-4" />
                  Subir foto
                </button>
              )}
              <input
                ref={fileInputAjusteRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setAjusteFoto, setAjusteFotoPreview)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowAjuste(null); setAjusteCantidad(0); }} className="px-4 py-2 text-[#7f93b0] hover:text-white">Cancelar</button>
              <button
                onClick={ajustarInventario}
                disabled={ajusteCantidad === 0 || guardando}
                className="px-4 py-2 bg-aria-primary hover:bg-aria-primary disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Registrar Salida ====== */}
      {showSalida && salidaItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1d38] rounded-xl p-6 w-full max-w-lg border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-400">Registrar Salida</h3>
              <button onClick={() => setShowSalida(false)} className="p-1 hover:bg-white/[0.06] rounded-lg"><X className="w-5 h-5 text-[#7f93b0]" /></button>
            </div>

            <div className="p-3 bg-white/[0.04] rounded-lg mb-4">
              <p className="text-white font-medium">{salidaItem.producto_nombre}</p>
              <p className="text-sm text-[#7f93b0]">Disponible: <span className="text-aria-accent font-bold">{salidaItem.cantidad_disponible}</span> {salidaItem.unidad}</p>
            </div>

            <label className="block text-sm text-[#c9d8ed] mb-1">Cantidad a retirar *</label>
            <input
              type="number" min={1}
              max={salidaItem.cantidad_disponible}
              value={salidaCantidad}
              onChange={(e) => setSalidaCantidad(Number(e.target.value))}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:border-red-500 mb-3"
            />
            <p className="text-center text-sm text-[#7f93b0] mb-3">
              Quedarán: <span className={`font-bold ${salidaItem.cantidad_disponible - salidaCantidad <= 5 ? 'text-amber-400' : 'text-aria-accent'}`}>
                {Math.max(0, salidaItem.cantidad_disponible - salidaCantidad)}
              </span> {salidaItem.unidad}
            </p>

            <label className="block text-sm text-[#c9d8ed] mb-1">Destino (opcional)</label>
            <select
              value={salidaDestinoObraId}
              onChange={(e) => setSalidaDestinoObraId(e.target.value)}
              className="w-full px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary mb-3"
            >
              <option value="">(Salida sin destino - consumido en obra)</option>
              {obras.filter((c: Obra) => obraSeleccionada && String(c.id) !== String(obraSeleccionada.id)).map((c: Obra) => (
                <option key={c.id} value={c.id}>Trasladar a {c.name}</option>
              ))}
            </select>
            <p className="text-xs text-[#7f93b0] mb-3">
              {salidaDestinoObraId
                ? "Se restara aqui y se agregara al inventario de la obra destino."
                : "Si no eliges destino, se marca como salida consumida (no entra a otra obra)."}
            </p>

            <label className="block text-sm text-[#c9d8ed] mb-1">Motivo / Requisición *</label>
            <input
              type="text"
              placeholder="Ej: REQ-2026-00005, Usado en obra, etc."
              value={salidaMotivo}
              onChange={(e) => setSalidaMotivo(e.target.value)}
              className="w-full px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-red-500 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSalida(false)} className="px-4 py-2 text-[#7f93b0] hover:text-white transition-colors">Cancelar</button>
              <button
                onClick={guardarSalida}
                disabled={salidaCantidad <= 0 || salidaCantidad > salidaItem.cantidad_disponible || !salidaMotivo.trim() || guardando}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Registrar Salida
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ====== MODAL: Editar Nombre Material (03-Jun-2026 Daisy bug1) ====== */}
      {showEditar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1d38] rounded-xl p-6 w-full max-w-md border border-white/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Editar nombre del material</h3>
              <button onClick={() => { setShowEditar(null); setEditarNombre(""); }} className="p-1 hover:bg-white/[0.06] rounded-lg">
                <X className="w-5 h-5 text-[#7f93b0]" />
              </button>
            </div>
            <p className="text-sm text-[#7f93b0] mb-3">Folio: {showEditar.folio_inventario}</p>
            <label className="block text-sm text-[#c9d8ed] mb-1">Nuevo nombre *</label>
            <input
              type="text"
              value={editarNombre}
              onChange={(e) => setEditarNombre(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-aria-primary mb-4"
              placeholder="Nombre del material"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowEditar(null); setEditarNombre(""); }} className="px-4 py-2 text-[#7f93b0] hover:text-white">Cancelar</button>
              <button
                onClick={guardarEditar}
                disabled={!editarNombre.trim() || editarNombre.trim() === showEditar.producto_nombre || guardando}
                className="px-4 py-2 bg-aria-primary hover:bg-aria-primary disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Ver/Editar Foto Ampliada ====== */}
      {fotoAmpliadaUrl && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4" onClick={() => { setFotoAmpliadaUrl(null); setFotoAmpliadaItem(null); }}>
          <div className="relative" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "92vh", display: "flex", flexDirection: "column", gap: 12 }}>
            <img src={fotoAmpliadaUrl} alt={fotoAmpliadaItem?.producto_nombre || "Foto ampliada"} className="rounded-xl" style={{ maxWidth: "90vw", maxHeight: "78vh", objectFit: "contain", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }} />
            <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "linear-gradient(180deg, #1A2A44 0%, #14223A 100%)", border: "1px solid rgba(140,178,228,0.18)", boxShadow: "inset 0 1px 0 rgba(220,235,255,0.06)" }}>
              <div className="min-w-0">
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#F4F8FF", letterSpacing: "-0.01em" }}>{fotoAmpliadaItem?.producto_nombre || "Foto"}</p>
                {fotoAmpliadaItem?.folio_inventario && (
                  <p style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(180,200,228,0.72)", marginTop: 2 }}>{fotoAmpliadaItem.folio_inventario}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={fotoAmpliadaUrl} download target="_blank" rel="noopener noreferrer"
                  style={{ padding: "8px 14px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF", background: "linear-gradient(180deg, #1E3E7A 0%, #163068 100%)", border: "1px solid rgba(160,200,240,0.30)", borderRadius: 8, boxShadow: "inset 0 1px 0 rgba(220,235,255,0.10), 0 2px 6px rgba(0,0,0,0.30)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                  onClick={(e) => e.stopPropagation()} title="Descargar">
                  <Download style={{ width: 14, height: 14 }} strokeWidth={2.2} /> Descargar
                </a>
                {fotoAmpliadaItem && (
                  <>
                    <button type="button" disabled={fotoReemplazando}
                      onClick={() => fotoReplaceInputRef.current?.click()}
                      style={{ padding: "8px 14px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF", background: "linear-gradient(180deg, #1F8A60 0%, #16704D 100%)", border: "1px solid rgba(160,230,200,0.30)", borderRadius: 8, boxShadow: "inset 0 1px 0 rgba(220,235,255,0.10), 0 2px 6px rgba(0,0,0,0.30)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: fotoReemplazando ? 0.5 : 1 }}
                      title="Reemplazar foto">
                      {fotoReemplazando ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Upload style={{ width: 14, height: 14 }} strokeWidth={2.2} />} Reemplazar
                    </button>
                    <button type="button"
                      onClick={() => fotoAmpliadaItem && eliminarFoto(fotoAmpliadaItem)}
                      style={{ padding: "8px 14px", fontSize: "13px", fontWeight: 600, color: "#FFFFFF", background: "linear-gradient(180deg, #C8444A 0%, #A53039 100%)", border: "1px solid rgba(255,180,180,0.30)", borderRadius: 8, boxShadow: "inset 0 1px 0 rgba(220,235,255,0.10), 0 2px 6px rgba(0,0,0,0.30)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                      title="Eliminar foto">
                      <X style={{ width: 14, height: 14 }} strokeWidth={2.2} /> Eliminar
                    </button>
                  </>
                )}
                <button type="button" onClick={() => { setFotoAmpliadaUrl(null); setFotoAmpliadaItem(null); }}
                  style={{ padding: "8px 14px", fontSize: "13px", fontWeight: 600, color: "rgba(214,228,255,0.85)", background: "linear-gradient(180deg, #2C3D52 0%, #21303E 100%)", border: "1px solid rgba(140,178,228,0.18)", borderRadius: 8, boxShadow: "inset 0 1px 0 rgba(220,235,255,0.06), 0 2px 6px rgba(0,0,0,0.30)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                  title="Cerrar">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input siempre montado: para reemplazar foto desde modal o desde placeholder vacio */}
      <input ref={fotoReplaceInputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && fotoAmpliadaItem) reemplazarFoto(fotoAmpliadaItem, f);
          if (e.target) e.target.value = "";
        }} />
    </div>
  );
}


// =============== Helpers visuales canon (TKT-002 22-Abr-2026) ===============

function ActionBtn({
  onClick, disabled, loading, icon: Icon, label, variant
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: ElementType;
  label: string;
  variant: "emerald" | "rose" | "primary";
}) {
  const variants: Record<string, { bg: string; bgHover: string; border: string; text: string }> = {
    emerald: {
      bg: "linear-gradient(180deg, #1F8A60 0%, #16704D 100%)",
      bgHover: "linear-gradient(180deg, #259E70 0%, #1A805A 100%)",
      border: "rgba(160,230,200,0.30)",
      text: "#FFFFFF",
    },
    rose: {
      bg: "linear-gradient(180deg, #C8444A 0%, #A53039 100%)",
      bgHover: "linear-gradient(180deg, #D9555B 0%, #B73A44 100%)",
      border: "rgba(255,180,180,0.30)",
      text: "#FFFFFF",
    },
    primary: {
      bg: "linear-gradient(180deg, #1E3E7A 0%, #163068 100%)",
      bgHover: "linear-gradient(180deg, #294F92 0%, #1B3D7A 100%)",
      border: "rgba(160,200,240,0.30)",
      text: "#FFFFFF",
    },
  };
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg transition-all duration-150"
      style={{
        padding: "8px 14px",
        fontSize: "13px",
        fontWeight: 600,
        color: v.text,
        background: v.bg,
        border: `1px solid ${v.border}`,
        boxShadow: "inset 0 1px 0 rgba(220,235,255,0.10), 0 2px 6px rgba(0,0,0,0.30)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => { if (disabled) return; (e.currentTarget as HTMLButtonElement).style.background = v.bgHover; }}
      onMouseLeave={(e) => { if (disabled) return; (e.currentTarget as HTMLButtonElement).style.background = v.bg; }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" strokeWidth={2.2} />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function KpiCard({ icon: Icon, accent, label, value, sub }: {
  icon: ElementType;
  accent: string;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl"
      style={{
        padding: "14px 16px",
        background: "linear-gradient(180deg, #2C3D52 0%, #263647 54%, #21303E 100%)",
        border: "1px solid rgba(120,158,204,0.18)",
        boxShadow: "inset 0 1px 0 rgba(210,228,252,0.05), 0 4px 14px rgba(0,0,0,0.20)",
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg flex-shrink-0"
        style={{
          width: 40,
          height: 40,
          background: `${accent}22`,
          border: `1px solid ${accent}44`,
        }}
      >
        <Icon style={{ width: 20, height: 20, color: accent }} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p style={{ fontSize: "22px", fontWeight: 800, color: "#F4F8FF", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{value}</p>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "rgba(180,200,228,0.78)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{label}{sub ? ` (${sub})` : ""}</p>
      </div>
    </div>
  );
}


function IconBtn({
  onClick, href, icon: Icon, title, variant
}: {
  onClick?: () => void;
  href?: string;
  icon: ElementType;
  title: string;
  variant: "primary" | "emerald" | "rose" | "amber";
}) {
  const variants: Record<string, { bg: string; bgHover: string; iconColor: string }> = {
    primary: {
      bg: "transparent",
      bgHover: "linear-gradient(180deg, #1E3E7A 0%, #163068 100%)",
      iconColor: "#7BB6FF",
    },
    emerald: {
      bg: "transparent",
      bgHover: "linear-gradient(180deg, #1F8A60 0%, #16704D 100%)",
      iconColor: "#22D88A",
    },
    rose: {
      bg: "transparent",
      bgHover: "linear-gradient(180deg, #C8444A 0%, #A53039 100%)",
      iconColor: "#FF6470",
    },
    amber: {
      bg: "transparent",
      bgHover: "linear-gradient(180deg, #B5811C 0%, #8E631A 100%)",
      iconColor: "#F59E0B",
    },
  };
  const v = variants[variant];
  const baseStyle: CSSProperties = {
    width: 34,
    height: 34,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: v.bg,
    color: v.iconColor,
    transition: "all 120ms ease",
    cursor: "pointer",
    borderLeft: "1px solid rgba(140,178,228,0.10)",
  };
  const handleEnter = (el: HTMLElement) => {
    el.style.background = v.bgHover;
    el.style.color = "#FFFFFF";
    el.style.boxShadow = "inset 0 1px 0 rgba(220,235,255,0.10)";
  };
  const handleLeave = (el: HTMLElement) => {
    el.style.background = v.bg;
    el.style.color = v.iconColor;
    el.style.boxShadow = "none";
  };
  if (href) {
    return (
      <Link
        href={href}
        title={title}
        style={baseStyle}
        onMouseEnter={(e) => handleEnter(e.currentTarget)}
        onMouseLeave={(e) => handleLeave(e.currentTarget)}
      >
        <Icon style={{ width: 16, height: 16 }} strokeWidth={2.2} />
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={baseStyle}
      onMouseEnter={(e) => handleEnter(e.currentTarget)}
      onMouseLeave={(e) => handleLeave(e.currentTarget)}
    >
      <Icon style={{ width: 16, height: 16 }} strokeWidth={2.2} />
    </button>
  );
}
