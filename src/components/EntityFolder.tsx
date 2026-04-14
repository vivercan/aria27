"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { uploadAndInsert, buildPath, deleteRowAndBlob, extractBlobPath } from "@/lib/storage";
import { useDropZone } from "@/lib/use-drop-zone";
import { FolderOpen, Upload, FolderUp, Loader2, File as FileIcon, Eye, Trash2, RefreshCw, X, Check, Inbox } from "lucide-react";

// React 19 does not include webkitdirectory in InputHTMLAttributes — augment globally
declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string | boolean;
    directory?: string | boolean;
  }
}


/**
 * <EntityFolder/>
 *
 * Componente reusable para administrar el expediente documental de cualquier entidad
 * (empleado, proveedor, activo, vehÃÂ­culo, obra, empresa, cliente, plantilla).
 *
 * Persiste en la tabla `entity_documents` (ver SQL en
 * D:\aria27\ARIA27v2\sql\entity_documents.sql) y guarda los blobs en el bucket
 * 'expedientes' bajo la convenciÃÂ³n `entity_documents/{entity_type}/{entity_id}/...`.
 *
 * Operaciones soportadas:
 *  - Listar archivos del expediente
 *  - Subir archivo(s) nuevo(s) (upload + insert atÃÂ³mico vÃÂ­a storage helper)
 *  - Subir carpeta completa con subcarpetas (webkitdirectory)
 *  - Reemplazar (sube uno nuevo y borra el viejo)
 *  - Eliminar (con respaldo en deleted_records y borrado del blob)
 */

export interface EntityFolderProps {
  entityType: string; // supports base types (empleado, proveedor, etc.) and scoped prefixes (admin:*, global:*)
  entityId: string;
  entityName?: string;
  /** email del usuario actual, para auditar uploads y eliminaciones */
  userEmail?: string;
  /** acepta filetypes opcional. Default: pdf, imagen, doc, xlsx */
  accept?: string;
  /** title visible. Default: "Expediente documental" */
  title?: string;
  /** className opcional para el contenedor raÃÂ­z */
  className?: string;
}

interface DocRow {
  id: string;
  nombre: string;
  tipo: string | null;
  url: string;
  size_bytes: number | null;
  uploaded_by: string | null;
  categoria: string | null;
  created_at: string;
}

interface CategoriaRecord {
  nombre: string;
}

interface UploadQueueItem {
  name: string;
  progress: number;
  done: boolean;
  error?: string;
}

const BUCKET = "expedientes";
const TABLE = "entity_documents";

export const ENTITY_DOC_CATEGORIES_FALLBACK = [
  "INE",
  "Comprobante domicilio",
  "Contrato",
  "OpiniÃÂ³n 32D",
  "Constancia fiscal",
  "Factura",
  "PÃÂ³liza",
  "Foto",
  "Otro",
] as const;
// Backward-compat export (legacy importers).
export const ENTITY_DOC_CATEGORIES = ENTITY_DOC_CATEGORIES_FALLBACK;
export type EntityDocCategory = string;

export default function EntityFolder({
  entityType,
  entityId,
  entityName,
  userEmail = "anon",
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx",
  title = "Expediente documental",
  className = "",
}: EntityFolderProps) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<DocRow | null>(null);
  const [pendingCat, setPendingCat] = useState<EntityDocCategory>("Otro");
  const [filterCat, setFilterCat] = useState<string>("");
  const [categorias, setCategorias] = useState<string[]>([...ENTITY_DOC_CATEGORIES_FALLBACK]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);

  /** Process files received from drag & drop */
  const processDroppedFiles = useCallback(async (allFiles: File[]) => {
    if (allFiles.length === 0) return;
    setBusy("upload");
    const queue: UploadQueueItem[] = allFiles.map((f) => ({
      name: f.webkitRelativePath || f.name,
      progress: 0,
      done: false,
    }));
    setUploadQueue([...queue]);

    let ok = 0;
    let fail = 0;
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const relPath = file.webkitRelativePath;
      let subfolderPrefix = "";
      if (relPath) {
        const parts = relPath.split("/");
        if (parts.length > 1) {
          subfolderPrefix = parts.slice(0, -1).join("/");
        }
      }
      queue[i].progress = 50;
      setUploadQueue([...queue]);

      const success = await subir(file, subfolderPrefix || undefined);
      if (success) {
        ok++;
        queue[i].progress = 100;
        queue[i].done = true;
      } else {
        fail++;
        queue[i].progress = 100;
        queue[i].error = "Error";
      }
      setUploadQueue([...queue]);
    }

    if (fail === 0) {
      flash("ok", `${ok} archivo${ok !== 1 ? "s" : ""} subido${ok !== 1 ? "s" : ""}`);
    } else {
      flash("err", `${ok} subido${ok !== 1 ? "s" : ""}, ${fail} con error`);
    }
    cargar();
    setBusy(null);
    setTimeout(() => setUploadQueue([]), 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId, pendingCat, userEmail]);

  const { dragging, progress: dropProgress, dropHandlers } = useDropZone(processDroppedFiles);

  useEffect(() => {
    supabase
      .from("expedientes_categorias")
      .select("nombre")
      .eq("activa", true)
      .order("orden", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setCategorias(data.map((r: CategoriaRecord) => r.nombre));
      });
  }, []);

  useEffect(() => {
    if (entityId) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType]);

  const flash = (tipo: "ok" | "err", texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 2500);
  };

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (error) {
      // Si la tabla no existe todavÃÂ­a, mostrar mensaje claro
      if ((error as {message?: string})?.message?.includes("relation") || (error as {code?: string})?.code === "42P01") {
        flash("err", "Falta crear tabla entity_documents. Ver sql/entity_documents.sql");
        setDocs([]);
        setLoading(false);
        return;
      }
      flash("err", (error as {message?: string})?.message || "Error");
    }
    setDocs((data as DocRow[]) || []);
    setLoading(false);
  };

  const subir = async (file: File, subfolderPrefix?: string) => {
    const scope = [entityType, entityId];
    if (subfolderPrefix) scope.push(subfolderPrefix);
    const path = buildPath({
      module: "entity_documents",
      scope,
      file,
    });
    try {
      await uploadAndInsert({
        bucket: BUCKET,
        path,
        file,
        table: TABLE,
        payload: {
          entity_type: entityType,
          entity_id: entityId,
          nombre: subfolderPrefix ? `${subfolderPrefix}/${file.name}` : file.name,
          tipo: file.type || file.name.split(".").pop() || null,
          size_bytes: file.size,
          uploaded_by: userEmail,
          categoria: pendingCat,
        },
        urlField: "url",
      });
      return true;
    } catch {
      return false;
    }
  };

  /** Handle multi-file or folder upload */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    setBusy("upload");

    // Initialize upload queue
    const queue: UploadQueueItem[] = fileArr.map(f => ({
      name: f.webkitRelativePath || f.name,
      progress: 0,
      done: false,
    }));
    setUploadQueue([...queue]);

    let ok = 0;
    let fail = 0;
    for (let i = 0; i < fileArr.length; i++) {
      const file = fileArr[i];
      // Extract subfolder from webkitRelativePath: "folder/sub/file.pdf" Ã¢ÂÂ "folder/sub"
      const relPath = file.webkitRelativePath;
      let subfolderPrefix = "";
      if (relPath) {
        const parts = relPath.split("/");
        if (parts.length > 1) {
          subfolderPrefix = parts.slice(0, -1).join("/");
        }
      }

      queue[i].progress = 50;
      setUploadQueue([...queue]);

      const success = await subir(file, subfolderPrefix || undefined);
      if (success) {
        ok++;
        queue[i].progress = 100;
        queue[i].done = true;
      } else {
        fail++;
        queue[i].progress = 100;
        queue[i].error = "Error";
      }
      setUploadQueue([...queue]);
    }

    if (fail === 0) {
      flash("ok", `${ok} archivo${ok !== 1 ? "s" : ""} subido${ok !== 1 ? "s" : ""}`);
    } else {
      flash("err", `${ok} subido${ok !== 1 ? "s" : ""}, ${fail} con error`);
    }
    cargar();
    setBusy(null);
    setTimeout(() => setUploadQueue([]), 3000);

    // Reset inputs
    if (fileRef.current) fileRef.current.value = "";
    if (folderRef.current) folderRef.current.value = "";
  };

  const eliminar = async (d: DocRow) => {
    if (!confirm(`ÃÂ¿Eliminar "${d.nombre}" del expediente? Esta acciÃÂ³n registra respaldo en deleted_records.`)) return;
    setBusy("delete-" + d.id);
    try {
      await deleteRowAndBlob({
        table: TABLE,
        id: d.id,
        userEmail,
        bucket: BUCKET,
        blobUrlField: "url",
      });
      flash("ok", "Documento eliminado");
      cargar();
    } catch (e: unknown) {
      flash("err", (e as Error)?.message || "Error al eliminar");
    }
    setBusy(null);
  };

  const reemplazar = async (d: DocRow, file: File) => {
    setBusy("replace-" + d.id);
    const newPath = buildPath({
      module: "entity_documents",
      scope: [entityType, entityId],
      file,
    });
    try {
      // 1. Subir el nuevo
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, file, { upsert: false });
      if (upErr) throw new Error(upErr.message);
      const newUrl = supabase.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl;

      // 2. Update fila
      const { error: updErr } = await supabase
        .from(TABLE)
        .update({
          nombre: file.name,
          tipo: file.type || file.name.split(".").pop() || null,
          url: newUrl,
          size_bytes: file.size,
          uploaded_by: userEmail,
        })
        .eq("id", d.id);
      if (updErr) {
        // Rollback: borrar nuevo blob
        await supabase.storage.from(BUCKET).remove([newPath]);
        throw new Error(updErr.message);
      }

      // 3. Borrar blob viejo (best-effort)
      const oldPath = extractBlobPath(d.url, BUCKET);
      if (oldPath && oldPath !== newPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
      flash("ok", "Documento reemplazado");
      cargar();
    } catch (e: unknown) {
      flash("err", (e as Error)?.message || "Error al reemplazar");
    }
    setBusy(null);
    setReplaceTarget(null);
  };

  const fmtSize = (b: number | null) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div
      className={`rounded-xl bg-white/[0.03] border border-white/[0.06] ${className} relative ${dragging ? "ring-2 ring-emerald-400/60 border-emerald-400/40" : ""}`}
      {...dropHandlers}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-30 bg-emerald-500/10 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center pointer-events-none">
          <Inbox className="w-12 h-12 text-emerald-400 mb-2" />
          <p className="text-emerald-300 text-sm font-medium">Suelta archivos o carpetas aqu\u00ed</p>
          <p className="text-emerald-400/60 text-xs mt-1">Se preservan subcarpetas autom\u00e1ticamente</p>
        </div>
      )}
      {/* Scanning/uploading progress overlay */}
      {dropProgress && (
        <div className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center pointer-events-none">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-2" />
          <p className="text-emerald-300 text-sm font-medium">
            {dropProgress.phase === "scanning" ? "Escaneando carpetas\u2026" : "Subiendo archivos\u2026"}
          </p>
          {dropProgress.total > 0 && (
            <p className="text-emerald-400/60 text-xs mt-1">
              {dropProgress.current} / {dropProgress.total} archivos
            </p>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple
        onChange={handleUpload}
      />
      <input
        ref={folderRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleUpload}
      />
      <input
        ref={replaceRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={async e => {
          const f = e.target.files?.[0];
          if (f && replaceTarget) await reemplazar(replaceTarget, f);
          if (replaceRef.current) replaceRef.current.value = "";
        }}
      />

      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-violet-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-500">
              {entityType}{entityName ? ` ÃÂ· ${entityName}` : ""} ÃÂ· {docs.length} archivo{docs.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pendingCat}
            onChange={e => setPendingCat(e.target.value as EntityDocCategory)}
            title="CategorÃÂ­a del prÃÂ³ximo archivo a subir"
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs"
          >
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={cargar} title="Recargar" className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy === "upload"}
            className="px-3 py-1.5 bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy === "upload" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Archivos
          </button>
          <button
            onClick={() => folderRef.current?.click()}
            disabled={busy === "upload"}
            className="px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy === "upload" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderUp className="w-3.5 h-3.5" />}
            Carpeta
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded text-xs ${msg.tipo === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {msg.texto}
        </div>
      )}

      {/* Upload queue progress */}
      {uploadQueue.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-slate-800/50 border border-white/5 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Subiendo {uploadQueue.filter(u => u.done).length}/{uploadQueue.length}
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {uploadQueue.map((uq, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  {uq.error ? (
                    <X className="w-3 h-3 text-red-400 flex-none" />
                  ) : uq.done ? (
                    <Check className="w-3 h-3 text-emerald-400 flex-none" />
                  ) : (
                    <Loader2 className="w-3 h-3 text-aria-accent animate-spin flex-none" />
                  )}
                  <span className="text-[11px] text-slate-300 truncate flex-1">{uq.name}</span>
                  <span className="text-[11px] text-slate-500 flex-none">{uq.progress}%</span>
                </div>
                <div className="h-0.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      uq.error ? "bg-red-500" : uq.done ? "bg-emerald-500" : "bg-aria-accent"
                    }`}
                    style={{ width: `${uq.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-3 flex items-center gap-2">
        <span className="text-[11px] text-slate-500">Filtrar:</span>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-[11px]"
        >
          <option value="">Todas las categorÃÂ­as</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="p-3 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-aria-accent mx-auto" /></div>
        ) : docs.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">Sin documentos. Arrastra archivos aqu\u00ed o usa los botones &quot;Archivos&quot; / &quot;Carpeta&quot;.</p>
        ) : (
          <div className="space-y-1">
            {docs.filter(d => !filterCat || (d.categoria || "Otro") === filterCat).map(d => (
              <div key={d.id} className="flex items-center gap-2 p-2 rounded bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]">
                <FileIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white truncate">{d.nombre}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 flex-shrink-0">{d.categoria || "Otro"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {new Date(d.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                    {d.size_bytes ? ` ÃÂ· ${fmtSize(d.size_bytes)}` : ""}
                    {d.uploaded_by ? ` ÃÂ· ${d.uploaded_by}` : ""}
                  </p>
                </div>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver"
                  className="p-1.5 text-aria-accent/70 hover:text-aria-accent hover:bg-aria-primary-hover/10 rounded"
                >
                  <Eye className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => { setReplaceTarget(d); replaceRef.current?.click(); }}
                  disabled={busy === "replace-" + d.id}
                  title="Reemplazar"
                  className="p-1.5 text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10 rounded disabled:opacity-50"
                >
                  {busy === "replace-" + d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => eliminar(d)}
                  disabled={busy === "delete-" + d.id}
                  title="Eliminar"
                  className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded disabled:opacity-50"
                >
                  {busy === "delete-" + d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * <EntityFolderDrawer/> Ã¢ÂÂ wrapper que abre EntityFolder dentro de un drawer modal.
 * ÃÂtil para integrarlo desde cualquier listado sin alterar la pÃÂ¡gina entera.
 */
export function EntityFolderDrawer(props: EntityFolderProps & { open: boolean; onClose: () => void }) {
  const { open, onClose, ...rest } = props;
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Expediente Ã¢ÂÂ {rest.entityName || rest.entityId}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <EntityFolder {...rest} />
        </div>
      </div>
    </div>
  );
}
