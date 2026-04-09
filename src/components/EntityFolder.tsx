"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadAndInsert, buildPath, deleteRowAndBlob, extractBlobPath } from "@/lib/storage";
import { FolderOpen, Upload, Loader2, File as FileIcon, Eye, Trash2, RefreshCw, X } from "lucide-react";

/**
 * <EntityFolder/>
 *
 * Componente reusable para administrar el expediente documental de cualquier entidad
 * (empleado, proveedor, activo, vehículo, obra, empresa, cliente, plantilla).
 *
 * Persiste en la tabla `entity_documents` (ver SQL en
 * D:\aria27\ARIA27v2\sql\entity_documents.sql) y guarda los blobs en el bucket
 * 'expedientes' bajo la convención `entity_documents/{entity_type}/{entity_id}/...`.
 *
 * Operaciones soportadas:
 *  - Listar archivos del expediente
 *  - Subir archivo nuevo (upload + insert atómico vía storage helper)
 *  - Reemplazar (sube uno nuevo y borra el viejo)
 *  - Eliminar (con respaldo en deleted_records y borrado del blob)
 */

export interface EntityFolderProps {
  entityType: "empleado" | "proveedor" | "activo" | "vehiculo" | "obra" | "empresa" | "cliente" | "plantilla";
  entityId: string;
  entityName?: string;
  /** email del usuario actual, para auditar uploads y eliminaciones */
  userEmail?: string;
  /** acepta filetypes opcional. Default: pdf, imagen, doc, xlsx */
  accept?: string;
  /** title visible. Default: "Expediente documental" */
  title?: string;
  /** className opcional para el contenedor raíz */
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

const BUCKET = "expedientes";
const TABLE = "entity_documents";

export const ENTITY_DOC_CATEGORIES_FALLBACK = [
  "INE",
  "Comprobante domicilio",
  "Contrato",
  "Opinión 32D",
  "Constancia fiscal",
  "Factura",
  "Póliza",
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
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<DocRow | null>(null);
  const [pendingCat, setPendingCat] = useState<EntityDocCategory>("Otro");
  const [filterCat, setFilterCat] = useState<string>("");
  const [categorias, setCategorias] = useState<string[]>([...ENTITY_DOC_CATEGORIES_FALLBACK]);

  useEffect(() => {
    supabase
      .from("expedientes_categorias")
      .select("nombre")
      .eq("activa", true)
      .order("orden", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setCategorias(data.map((r: any) => r.nombre));
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
      // Si la tabla no existe todavía, mostrar mensaje claro
      if (error.message?.includes("relation") || (error as any).code === "42P01") {
        flash("err", "Falta crear tabla entity_documents. Ver sql/entity_documents.sql");
        setDocs([]);
        setLoading(false);
        return;
      }
      flash("err", error.message);
    }
    setDocs((data as DocRow[]) || []);
    setLoading(false);
  };

  const subir = async (file: File) => {
    setBusy("upload");
    const path = buildPath({
      module: "entity_documents",
      scope: [entityType, entityId],
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
          nombre: file.name,
          tipo: file.type || file.name.split(".").pop() || null,
          size_bytes: file.size,
          uploaded_by: userEmail,
          categoria: pendingCat,
        },
        urlField: "url",
      });
      flash("ok", `"${file.name}" subido`);
      cargar();
    } catch (e: any) {
      flash("err", e?.message || "Error al subir");
    }
    setBusy(null);
  };

  const eliminar = async (d: DocRow) => {
    if (!confirm(`¿Eliminar "${d.nombre}" del expediente? Esta acción registra respaldo en deleted_records.`)) return;
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
    } catch (e: any) {
      flash("err", e?.message || "Error al eliminar");
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
    } catch (e: any) {
      flash("err", e?.message || "Error al reemplazar");
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
    <div className={`rounded-xl bg-white/[0.03] border border-white/[0.06] ${className}`}>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={async e => {
          const f = e.target.files?.[0];
          if (f) await subir(f);
          if (fileRef.current) fileRef.current.value = "";
        }}
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
              {entityType}{entityName ? ` · ${entityName}` : ""} · {docs.length} archivo{docs.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={pendingCat}
            onChange={e => setPendingCat(e.target.value as EntityDocCategory)}
            title="Categoría del próximo archivo a subir"
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
            className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy === "upload" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Subir documento
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mx-4 mt-3 px-3 py-2 rounded text-xs ${msg.tipo === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {msg.texto}
        </div>
      )}

      <div className="px-4 pt-3 flex items-center gap-2">
        <span className="text-[11px] text-slate-500">Filtrar:</span>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-[11px]"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="p-3 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" /></div>
        ) : docs.length === 0 ? (
          <p className="text-center text-xs text-slate-500 py-6">Sin documentos. Sube el primero con "Subir documento".</p>
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
                    {d.size_bytes ? ` · ${fmtSize(d.size_bytes)}` : ""}
                    {d.uploaded_by ? ` · ${d.uploaded_by}` : ""}
                  </p>
                </div>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver"
                  className="p-1.5 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 rounded"
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
 * <EntityFolderDrawer/> — wrapper que abre EntityFolder dentro de un drawer modal.
 * Útil para integrarlo desde cualquier listado sin alterar la página entera.
 */
export function EntityFolderDrawer(props: EntityFolderProps & { open: boolean; onClose: () => void }) {
  const { open, onClose, ...rest } = props;
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Expediente — {rest.entityName || rest.entityId}</h2>
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
