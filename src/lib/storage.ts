import { supabase } from "@/lib/supabase";
import { backupAndDelete } from "@/lib/backup-delete";
import { logger } from "@/lib/logger";

const log = logger("STORAGE");

/**
 * Storage helper centralizado para evitar archivos huérfanos.
 *
 * Garantías:
 *  - uploadAndInsert: si el INSERT en la tabla falla después de un upload exitoso,
 *    el blob se ELIMINA del bucket (rollback). Nunca queda archivo sin registro.
 *  - deleteRowAndBlob: borra la fila (con backup en deleted_records) y luego
 *    elimina el blob asociado. Nunca queda registro sin archivo. Best-effort en
 *    el blob: si la fila se borra y el blob no, queda log de huérfano.
 *  - buildPath: namespace estructurado por modulo/obra/carpeta para evitar
 *    colisiones y archivos sueltos en la raíz del bucket.
 *  - extractBlobPath: deriva el path real a partir de un publicUrl + bucket.
 */

export interface UploadAndInsertArgs<TPayload extends Record<string, unknown>> {
  bucket: string;
  path: string;
  file: File;
  table: string;
  payload: TPayload;
  /** Nombre del campo donde se persiste el publicUrl. Default: "url" */
  urlField?: string;
  /** upsert al subir. Default: false */
  upsert?: boolean;
}

export interface UploadAndInsertResult {
  publicUrl: string;
  path: string;
}

/**
 * Sube un archivo y luego inserta su registro. Si el insert falla, elimina
 * el blob (rollback). Si el upload falla, no inserta nada.
 *
 * Devuelve { publicUrl, path } cuando ambas operaciones tienen éxito.
 * Lanza Error con mensaje legible si cualquiera falla.
 */
export async function uploadAndInsert<TPayload extends Record<string, unknown>>(
  args: UploadAndInsertArgs<TPayload>
): Promise<UploadAndInsertResult> {
  const { bucket, path, file, table, payload, urlField = "url", upsert = false } = args;

  // 1. Upload
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert });

  if (uploadError) {
    log.error("upload fallido", { bucket, path, error: uploadError.message });
    throw new Error(`Error al subir archivo: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // 2. Insert
  const fullPayload = { ...payload, [urlField]: publicUrl } as Record<string, unknown>;
  const { error: insertError } = await supabase.from(table).insert(fullPayload);

  if (insertError) {
    // Rollback: eliminar el blob para no dejar huérfano
    log.error("insert fallido tras upload, intentando rollback", {
      bucket, path, table, error: insertError.message,
    });
    const { error: removeErr } = await supabase.storage.from(bucket).remove([path]);
    if (removeErr) {
      log.error("ROLLBACK FALLIDO - blob huérfano", {
        bucket, path, removeError: removeErr.message,
      });
      throw new Error(
        `Error al registrar archivo: ${insertError.message}. ATENCIÓN: el blob "${path}" quedó huérfano en el bucket "${bucket}" porque el rollback también falló (${removeErr.message}).`
      );
    }
    throw new Error(`Error al registrar archivo: ${insertError.message}`);
  }

  log.info("upload+insert OK", { bucket, path, table });
  return { publicUrl, path };
}

/**
 * Borra una fila (con backup en deleted_records) y elimina el blob asociado.
 * El blob se deriva del campo `blobUrlField` del registro (por defecto "url").
 *
 * Si la fila se borra pero el blob no, queda log de huérfano y se devuelve
 * { rowDeleted: true, blobDeleted: false } sin lanzar excepción para no
 * romper el flujo del usuario. El log permite reconciliar después.
 */
export async function deleteRowAndBlob(args: {
  table: string;
  id: string;
  userEmail: string;
  bucket: string;
  blobUrlField?: string;
  relatedData?: Record<string, unknown[]>;
}): Promise<{ rowDeleted: boolean; blobDeleted: boolean; orphanPath?: string }> {
  const { table, id, userEmail, bucket, blobUrlField = "url", relatedData } = args;

  // 1. Recuperar el registro ANTES de borrarlo para extraer el path
  const { data: record, error: fetchErr } = await supabase
    .from(table).select("*").eq("id", id).single();
  if (fetchErr || !record) {
    throw new Error(`No se encontró el registro en ${table}: ${id}`);
  }
  const blobUrl = (record as Record<string, unknown>)[blobUrlField] as string | null;
  const blobPath = blobUrl ? extractBlobPath(blobUrl, bucket) : null;

  // 2. Backup + delete fila (reusa la función ya validada)
  await backupAndDelete({ table, id, userEmail, relatedData });

  // 3. Eliminar blob (best-effort, no rompe si falla)
  if (!blobPath) {
    log.warn("registro sin blob asociado", { table, id, blobUrlField });
    return { rowDeleted: true, blobDeleted: false };
  }
  const { error: removeErr } = await supabase.storage.from(bucket).remove([blobPath]);
  if (removeErr) {
    log.error("HUÉRFANO - fila borrada pero blob persiste", {
      bucket, path: blobPath, table, id, error: removeErr.message,
    });
    return { rowDeleted: true, blobDeleted: false, orphanPath: blobPath };
  }
  log.info("delete fila+blob OK", { table, id, bucket, path: blobPath });
  return { rowDeleted: true, blobDeleted: true };
}

/**
 * Actualiza una fila reemplazando opcionalmente su blob asociado.
 * - Si hay newFile: sube el blob nuevo, hace UPDATE con la nueva URL.
 *   Si el UPDATE falla, elimina el blob nuevo (rollback).
 *   Si el UPDATE tiene éxito y había URL anterior, elimina el blob viejo (best-effort).
 * - Si no hay newFile: solo hace UPDATE con el payload tal cual.
 */
export async function uploadAndUpdate<TPayload extends Record<string, unknown>>(args: {
  bucket: string;
  table: string;
  id: string;
  newFile?: File | null;
  newPath?: string;
  payload: TPayload;
  oldUrl?: string | null;
  urlField?: string;
  upsert?: boolean;
}): Promise<{ publicUrl: string | null; path: string | null }> {
  const { bucket, table, id, newFile, newPath, payload, oldUrl, urlField = "url", upsert = false } = args;

  let finalUrl: string | null = (payload as Record<string, unknown>)[urlField] as string | null ?? oldUrl ?? null;
  let uploadedPath: string | null = null;

  if (newFile && newPath) {
    const { error: upErr } = await supabase.storage.from(bucket).upload(newPath, newFile, { upsert });
    if (upErr) {
      log.error("upload (update) fallido", { bucket, path: newPath, error: upErr.message });
      throw new Error(`Error al subir archivo: ${upErr.message}`);
    }
    uploadedPath = newPath;
    finalUrl = supabase.storage.from(bucket).getPublicUrl(newPath).data.publicUrl;
  }

  const fullPayload = { ...payload, [urlField]: finalUrl } as Record<string, unknown>;
  const { error: updErr } = await supabase.from(table).update(fullPayload).eq("id", id);
  if (updErr) {
    if (uploadedPath) {
      const { error: rmErr } = await supabase.storage.from(bucket).remove([uploadedPath]);
      if (rmErr) {
        log.error("ROLLBACK update fallido - blob huérfano", { bucket, path: uploadedPath, error: rmErr.message });
        throw new Error(`Error al actualizar: ${updErr.message}. ATENCIÓN blob huérfano "${uploadedPath}" (${rmErr.message}).`);
      }
    }
    throw new Error(`Error al actualizar: ${updErr.message}`);
  }

  // Borrar blob viejo (best-effort) si reemplazamos archivo
  if (uploadedPath && oldUrl) {
    const oldPath = extractBlobPath(oldUrl, bucket);
    if (oldPath && oldPath !== uploadedPath) {
      const { error: rmOldErr } = await supabase.storage.from(bucket).remove([oldPath]);
      if (rmOldErr) {
        log.error("blob viejo persiste tras update", { bucket, path: oldPath, error: rmOldErr.message });
      }
    }
  }

  log.info("update OK", { bucket, table, id, replacedBlob: !!uploadedPath });
  return { publicUrl: finalUrl, path: uploadedPath };
}

/**
 * Deriva el path interno del bucket a partir de un publicUrl.
 * Formato esperado: https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
export function extractBlobPath(publicUrl: string, bucket: string): string | null {
  if (!publicUrl) return null;
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

/**
 * Construye un path estructurado evitando colisiones y caracteres peligrosos.
 * Formato: <modulo>/<scope...>/<timestamp>_<safeName>.<ext>
 *
 * Ejemplo: buildPath({ module: "expedientes", scope: ["obra-123","carpeta-7"], file })
 *   => "expedientes/obra-123/carpeta-7/1712345678901_acta.pdf"
 */
export function buildPath(args: {
  module: string;
  scope?: (string | number | null | undefined)[];
  file: File;
}): string {
  const { module, scope = [], file } = args;
  const cleanScope = scope
    .filter((s) => s !== null && s !== undefined && String(s).length > 0)
    .map((s) => sanitize(String(s)));
  const safeName = sanitize(file.name);
  const ts = Date.now();
  const segments = [sanitize(module), ...cleanScope, `${ts}_${safeName}`];
  return segments.join("/");
}

function sanitize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * 21-Abr-2026: helper para subir comprobante de pago sin insert a tabla
 * (la URL se persiste directamente en purchase_orders / gastos_obra / caja_chica
 * via registrarPagoOC o UPDATE directo). Evita repetir el patron en 4 pantallas.
 *
 * Devuelve la URL publica del comprobante subido al bucket "expedientes"
 * bajo namespace "pagos/<scope...>/<timestamp>_<safeName>".
 *
 * Si upload falla lanza Error con mensaje legible. No hay rollback porque
 * no hay insert en tabla: si el update de la fila falla despues, el blob
 * queda huerfano y debe limpiarse manualmente (caso raro, no bloquea flujo).
 */
export async function uploadComprobantePago(
  file: File,
  scope: (string | number | null | undefined)[]
): Promise<string> {
  const path = buildPath({ module: "pagos", scope, file });
  const { error: uploadError } = await supabase.storage
    .from("expedientes")
    .upload(path, file, { upsert: false });
  if (uploadError) {
    log.error("upload comprobante fallido", { path, error: uploadError.message });
    throw new Error(`Error al subir comprobante: ${uploadError.message}`);
  }
  const { data: urlData } = supabase.storage.from("expedientes").getPublicUrl(path);
  log.info("comprobante subido", { path });
  return urlData.publicUrl;
}
