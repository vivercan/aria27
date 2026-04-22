"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
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

  // Modal Ver Foto
  const [fotoAmpliadaUrl, setFotoAmpliadaUrl] = useState<string | null>(null);

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
      const res = await fetch("/api/inventario/watermark", { method: "POST", body: formData });
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
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": email },
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

      await supabase.from("inventario_movimientos").insert({
        obra_id: obraSeleccionada.id,
        obra_nombre: obraSeleccionada.name,
        producto_nombre: salidaItem.producto_nombre,
        unidad: salidaItem.unidad,
        tipo: "SALIDA",
        cantidad: salidaCantidad,
        saldo_post: nuevoDisp,
        motivo: salidaMotivo || "Salida manual",
        referencia_tipo: "SALIDA_MANUAL",
        referencia_id: salidaItem.id,
        usuario: getUserEmail(),
      });

      setShowSalida(false);
      loadInventario(obraSeleccionada.id);
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
        .eq("producto_nombre", mat.nombre || mat.product_name).single();

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
    flash("err", "Materiales importados al inventario");
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
      const res = await fetch(url, { headers: { "x-user-email": email } });
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

  const [showPDFMenu, setShowPDFMenu] = useState(false);
  const exportarPDF = async (mode: "full" | "nofotos" | "galeria" = "full") => {
    if (!obraSeleccionada) return;
    setShowPDFMenu(false);
    setExportandoPDF(true);
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const url = `/api/inventario/export?obra_id=${encodeURIComponent(obraSeleccionada.id)}&obra_nombre=${encodeURIComponent(obraSeleccionada.name)}&format=pdf&mode=${mode}`;
      const res = await fetch(url, { headers: { "x-user-email": email } });
      if (!res.ok) { flash("err", "Error al generar PDF"); return; }
      const html = await res.text();
      // Descarga directa como archivo HTML — cero diálogos, cero ventanas emergentes.
      // El usuario abre el archivo y usa Ctrl+P → "Guardar como PDF" si lo necesita.
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const now = new Date();
      const fecha = now.toISOString().slice(0, 10);
      const hora = now.toTimeString().slice(0, 8).replace(/:/g, "-");
      const obraNombre = obraSeleccionada.name.replace(/ /g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      const modeSuffix = mode === "galeria" ? "_galeria" : mode === "nofotos" ? "_sinfotos" : "";
      const filename = `ARIA27_Inventario_${obraNombre}${modeSuffix}_${fecha}_${hora}.html`;
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
    <div className="space-y-6">
      <FlashBanner msg={msg} className="mx-6 mt-3" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setObraSeleccionada(null)} className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#7f93b0]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{obraSeleccionada.name}</h1>
            <p className="text-[#7f93b0] text-sm">Inventario de materiales</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Exportar Excel */}
          <button
            onClick={exportarExcel}
            disabled={exportandoExcel || inventario.length === 0}
            title="Descargar Excel"
            className="flex items-center gap-2 px-3 py-2 bg-emerald-700/40 hover:bg-emerald-700/70 border border-emerald-600/50 rounded-lg text-aria-accent font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportandoExcel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Excel</span>
          </button>
          {/* Exportar PDF dropdown 3 modos (P-5 22-Abr-2026) */}
          <div className="relative">
            <button
              onClick={() => setShowPDFMenu(v => !v)}
              disabled={exportandoPDF || inventario.length === 0}
              title="Opciones de descarga PDF"
              className="flex items-center gap-2 px-3 py-2 bg-aria-primary-light hover:bg-aria-primary-hover/40 border border-aria-primary/40 rounded-lg text-aria-accent font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportandoPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">PDF</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${showPDFMenu ? "rotate-90" : ""}`} />
            </button>
            {showPDFMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPDFMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-56 bg-[#0c1d38] border border-white/[0.08] rounded-lg shadow-2xl z-50 overflow-hidden">
                  <button
                    onClick={() => exportarPDF("full")}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] border-b border-white/[0.04] text-xs"
                  >
                    <div className="text-white font-medium flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5 text-aria-accent" />PDF con fotos</div>
                    <div className="text-[10px] text-[#7f93b0] mt-0.5">Tabla completa con thumbnails (default)</div>
                  </button>
                  <button
                    onClick={() => exportarPDF("nofotos")}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] border-b border-white/[0.04] text-xs"
                  >
                    <div className="text-white font-medium flex items-center gap-2"><Download className="w-3.5 h-3.5 text-aria-accent" />PDF sin fotos</div>
                    <div className="text-[10px] text-[#7f93b0] mt-0.5">Tabla mas ligera, ideal para print BN</div>
                  </button>
                  <button
                    onClick={() => exportarPDF("galeria")}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] text-xs"
                  >
                    <div className="text-white font-medium flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-aria-accent" />Solo galeria</div>
                    <div className="text-[10px] text-[#7f93b0] mt-0.5">Solo fotos grandes en cuadricula 3x</div>
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Nuevo Material */}
          <button
            onClick={abrirNuevoMaterial}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Material
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-aria-accent" />
            <div>
              <p className="text-2xl font-bold text-white">{totalItems}</p>
              <p className="text-sm text-[#7f93b0]">Productos</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-aria-accent" />
            <div>
              <p className="text-2xl font-bold text-white">{totalDisponible.toLocaleString()}</p>
              <p className="text-sm text-[#7f93b0]">Unidades disponibles</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-white">{itemsBajos}</p>
              <p className="text-sm text-[#7f93b0]">Stock bajo (≤5)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventario */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7f93b0]" />
              <input
                type="text"
                placeholder="Buscar material..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:outline-none focus:border-aria-primary"
              />
            </div>
          </div>

          {/* 22-Abr-2026: tabs filtro tipo MATERIAL | HERRAMIENTA */}
          <div className="flex gap-2">
            {(["TODOS", "MATERIAL", "HERRAMIENTA"] as const).map(t => (
              <button key={t} onClick={() => setFilterTipo(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterTipo === t ? "bg-aria-primary-light text-aria-accent border border-aria-primary/30" : "bg-white/[0.04] text-[#7f93b0] border border-white/[0.08] hover:bg-white/[0.06]"}`}>
                {t === "TODOS" ? "Todos" : t === "MATERIAL" ? "Materiales" : "Herramientas"}
              </button>
            ))}
          </div>

          <div className="bg-white/[0.04] rounded-xl border border-white/[0.08] overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/[0.04] sticky top-0 bg-[rgba(4,8,16,0.98)]  z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-medium text-[#c9d8ed]">Material</th>
                  <th className="px-3 py-3 text-center text-sm font-medium text-[#c9d8ed]">Disponible</th>
                  <th className="px-3 py-3 text-center text-sm font-medium text-[#c9d8ed]">Usado</th>
                  <th className="px-3 py-3 text-center text-sm font-medium text-[#c9d8ed]">Unidad</th>
                  <th className="px-3 py-3 text-left text-sm font-medium text-[#c9d8ed]">Usuario</th>
                  <th className="px-3 py-3 text-center text-sm font-medium text-[#c9d8ed]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {inventarioFiltrado.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.04]">
                    {/* Foto eliminada de lista — solo visible en Kardex */}
                    <td className="px-3 py-3">
                      <p className="text-white font-medium">{item.producto_nombre}</p>
                      <p className="text-xs text-[#7f93b0]">
                        Último mov: {new Date(item.ultimo_movimiento).toLocaleDateString()}
                      </p>
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
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/dashboard/obras/inventario/kardex?obra=${encodeURIComponent(item.obra_nombre)}&producto=${encodeURIComponent(item.producto_nombre)}`}
                          className="p-2 bg-aria-primary-light hover:bg-aria-primary-hover/40 rounded-lg transition-colors"
                          title="Ver kardex"
                        >
                          <History className="w-4 h-4 text-aria-accent" />
                        </Link>
                        <button
                          onClick={() => abrirRegistrarEntrada(item)}
                          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-lg transition-colors"
                          title="Registrar entrada"
                        >
                          <Truck className="w-4 h-4 text-aria-accent" />
                        </button>
                        <button
                          onClick={() => abrirSalida(item)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                          title="Registrar salida"
                        >
                          <Minus className="w-4 h-4 text-red-400" />
                        </button>
                        <button
                          onClick={() => abrirAjuste(item)}
                          className="p-2 bg-aria-primary-light hover:bg-aria-primary-hover/40 rounded-lg transition-colors"
                          title="Ajustar"
                        >
                          <Plus className="w-4 h-4 text-aria-accent" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {inventarioFiltrado.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[#7f93b0]">
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

        {/* Entregas para importar */}
        <div className="space-y-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-aria-accent" />
            Entregas Recientes
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {entregas.map((entrega) => (
              <div key={entrega.id} className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">{entrega.folio}</p>
                    <p className="text-sm text-[#7f93b0]">{entrega.proveedor_nombre}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entrega.foto_url && (
                      <button onClick={() => setFotoAmpliadaUrl(entrega.foto_url!)} className="p-1">
                        <Camera className="w-4 h-4 text-aria-accent" />
                      </button>
                    )}
                    <span className="text-xs text-[#7f93b0]">
                      {new Date(entrega.fecha_entrega).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#c9d8ed] mb-3">
                  {entrega.materiales_recibidos?.length || 0} materiales
                </p>
                <button
                  onClick={() => importarDeEntrega(entrega)}
                  className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-aria-accent rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Importar a Inventario
                </button>
              </div>
            ))}

            {entregas.length === 0 && (
              <div className="text-center py-8 text-[#7f93b0]">
                <Truck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No hay entregas recientes</p>
              </div>
            )}
          </div>
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

      {/* ====== MODAL: Ver Foto Ampliada ====== */}
      {fotoAmpliadaUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setFotoAmpliadaUrl(null)}>
          <div className="relative max-w-3xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-3 right-8 flex items-center gap-2 z-10">
              <a
                href={fotoAmpliadaUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-aria-primary rounded-full border border-white/[0.08] hover:bg-aria-primary-hover transition-colors"
                title="Descargar foto"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-5 h-5 text-white" />
              </a>
              <button onClick={() => setFotoAmpliadaUrl(null)} className="p-2 bg-[#0c1d38] rounded-full border border-white/[0.08] hover:bg-[#0f2448]">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <img src={fotoAmpliadaUrl} alt="Foto ampliada" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
