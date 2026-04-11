import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const log = logger("BACKUP-SNAPSHOT");

// ---------------------------------------------------------------------------
// Backup completo diario — "cintas magnéticas" digitales.
// Respalda TODAS las tablas públicas + TODOS los archivos de Storage.
// Cada ejecución crea una carpeta con timestamp: backups/{fecha}/{...}
// Protegido por BACKUP_TOKEN o x-vercel-cron header.
// ---------------------------------------------------------------------------

const PAGE_SIZE = 1000; // Supabase PostgREST max por request
const CHUNK_MAX_BYTES = 20 * 1024 * 1024; // 20 MB max por archivo en Storage
const SKIP_BUCKETS = ["backups"]; // No respaldar el propio bucket de backups
const SKIP_TABLES = ["schema_migrations", "supabase_migrations"]; // Sistema

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.BACKUP_TOKEN || "";
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!isVercelCron && (!expected || auth !== `Bearer ${expected}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const dateFolder = now.toISOString().split("T")[0]; // 2026-04-09
  const ts = now.toISOString().replace(/[:.]/g, "-");

  // --- Asegurar bucket backups ---
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === "backups")) {
    await supabase.storage.createBucket("backups", { public: false });
    log.info("bucket backups creado");
  }

  // ===============================================================
  // FASE 1: Backup de TODAS las tablas
  // ===============================================================
  const tableResults: {
    tabla: string;
    rows: number;
    pages: number;
    size: number;
    error?: string;
  }[] = [];

  // Obtener lista dinámica de tablas vía RPC
  let tableNames: string[] = [];
  const { data: rpcTables, error: rpcErr } = await supabase.rpc(
    "list_backup_tables"
  );
  if (rpcErr || !rpcTables) {
    log.error("rpc list_backup_tables falló, usando fallback", {
      error: rpcErr?.message,
    });
    // Fallback: lista conocida (puede quedar desactualizada)
    tableNames = [
      "centros_trabajo",
      "employees",
      "suppliers",
      "products",
      "requisitions",
      "purchase_orders",
      "cobros_manuales",
      "cotizaciones_clientes",
      "presupuestos_partidas",
      "nomina_historico",
      "obra_avances",
      "bitacora_obra",
      "audit_log",
      "auth_attempts",
      "deleted_records",
      "users",
      "gastos",
      "solicitudes_vacaciones",
      "incapacidades",
      "prestamos",
      "nominas",
      "quotations",
      "entity_documents",
      "expedientes_carpetas",
      "expedientes_archivos",
      "clientes",
      "cotizaciones_items",
      "conciliacion_bancaria",
      "inventario_movimientos",
      "wa_log",
      "rate_limit_log",
    ];
  } else {
    tableNames = (rpcTables as { table_name: string }[])
      .map((r) => r.table_name)
      .filter((t) => !SKIP_TABLES.includes(t));
  }

  log.info("tablas a respaldar", { count: tableNames.length });

  for (const tabla of tableNames) {
    try {
      // Primera página para detectar si la tabla tiene datos
      const { data: firstPage, error, count } = await supabase
        .from(tabla)
        .select("*", { count: "exact", head: false })
        .range(0, PAGE_SIZE - 1);

      if (error) {
        tableResults.push({
          tabla,
          rows: 0,
          pages: 0,
          size: 0,
          error: (error as {message?: string})?.message || "Unknown error",
        });
        continue;
      }

      const totalRows = count || firstPage?.length || 0;
      const allData: any[] = [...(firstPage || [])];

      // Paginar si hay más de PAGE_SIZE filas
      if (totalRows > PAGE_SIZE) {
        const totalPages = Math.ceil(totalRows / PAGE_SIZE);
        for (let page = 1; page < totalPages; page++) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;
          const { data: pageData } = await supabase
            .from(tabla)
            .select("*")
            .range(from, to);
          if (pageData) allData.push(...pageData);
        }
      }

      // Subir en chunks si el JSON es muy grande (>20 MB)
      const json = JSON.stringify(allData);
      let uploadError: string | undefined;

      if (json.length <= CHUNK_MAX_BYTES) {
        // Tabla cabe en un solo archivo
        const path = `${dateFolder}/tables/${tabla}.json`;
        const { error: upErr } = await supabase.storage
          .from("backups")
          .upload(path, new Blob([json], { type: "application/json" }), {
            upsert: true,
          });
        if (upErr) uploadError = upErr.message;
      } else {
        // Partir en chunks de CHUNK_MAX_BYTES filas aprox
        const rowsPerChunk = Math.floor(
          (allData.length * CHUNK_MAX_BYTES) / json.length
        );
        const chunks = Math.ceil(allData.length / rowsPerChunk);
        const errors: string[] = [];
        for (let c = 0; c < chunks; c++) {
          const slice = allData.slice(c * rowsPerChunk, (c + 1) * rowsPerChunk);
          const chunkJson = JSON.stringify(slice);
          const path = `${dateFolder}/tables/${tabla}_part${String(c + 1).padStart(3, "0")}.json`;
          const { error: upErr } = await supabase.storage
            .from("backups")
            .upload(path, new Blob([chunkJson], { type: "application/json" }), {
              upsert: true,
            });
          if (upErr) errors.push(`part${c + 1}:${upErr.message}`);
        }
        if (errors.length > 0) uploadError = errors.join("; ");
        log.info("tabla chunked", { tabla, chunks, rowsPerChunk });
      }

      tableResults.push({
        tabla,
        rows: allData.length,
        pages: Math.ceil(totalRows / PAGE_SIZE),
        size: json.length,
        ...(uploadError ? { error: uploadError } : {}),
      });
    } catch (e: unknown) {
      tableResults.push({
        tabla,
        rows: 0,
        pages: 0,
        size: 0,
        error: (e as {message?: string})?.message || "error",
      });
    }
  }

  // ===============================================================
  // FASE 2: Backup de TODOS los archivos de Storage
  // ===============================================================
  const storageResults: {
    bucket: string;
    files: number;
    copied: number;
    errors: number;
    errorDetails?: string[];
  }[] = [];

  const allBuckets = buckets || [];
  const bucketsToBackup = allBuckets.filter(
    (b) => !SKIP_BUCKETS.includes(b.name)
  );

  for (const bucket of bucketsToBackup) {
    const bucketName = bucket.name;
    let filesCounted = 0;
    let filesCopied = 0;
    const errorDetails: string[] = [];

    try {
      // Listar todos los archivos del bucket (recursivo)
      const filePaths = await listAllFiles(supabase, bucketName, "");
      filesCounted = filePaths.length;

      for (const filePath of filePaths) {
        try {
          // Descargar el archivo original
          const { data: fileData, error: dlErr } = await supabase.storage
            .from(bucketName)
            .download(filePath);

          if (dlErr || !fileData) {
            errorDetails.push(`${filePath}: ${dlErr?.message || "no data"}`);
            continue;
          }

          // Subir copia al bucket de backups
          const backupPath = `${dateFolder}/storage/${bucketName}/${filePath}`;
          const { error: upErr } = await supabase.storage
            .from("backups")
            .upload(backupPath, fileData, { upsert: true });

          if (upErr) {
            errorDetails.push(`${filePath}: upload ${upErr.message}`);
          } else {
            filesCopied++;
          }
        } catch (fe: unknown) {
          errorDetails.push(`${filePath}: ${(fe as Error)?.message || "error"}`);
        }
      }
    } catch (e: unknown) {
      errorDetails.push(`listFiles: ${(e as Error)?.message || "error"}`);
    }

    storageResults.push({
      bucket: bucketName,
      files: filesCounted,
      copied: filesCopied,
      errors: errorDetails.length,
      ...(errorDetails.length > 0
        ? { errorDetails: errorDetails.slice(0, 10) }
        : {}),
    });
  }


  // ===============================================================
  // FASE 3: Limpieza de backups > 30 días
  // ===============================================================
  const RETENTION_DAYS = 30;
  const cutoffDate = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cutoffStr = cutoffDate.toISOString().split("T")[0]; // "2026-03-10"
  let deletedFolders: string[] = [];

  try {
    // Listar carpetas de primer nivel en el bucket backups (cada una es YYYY-MM-DD)
    const { data: topLevel } = await supabase.storage
      .from("backups")
      .list("", { limit: 1000 });

    if (topLevel) {
      const oldFolders = topLevel
        .filter((item) => !item.id && /^\d{4}-\d{2}-\d{2}$/.test(item.name) && item.name < cutoffStr);

      for (const folder of oldFolders) {
        try {
          // Listar todo el contenido recursivo de la carpeta vieja
          const oldFiles = await listAllFiles(supabase, "backups", folder.name);
          if (oldFiles.length > 0) {
            // Supabase Storage remove acepta hasta 1000 paths
            for (let i = 0; i < oldFiles.length; i += 1000) {
              const batch = oldFiles.slice(i, i + 1000).map((f) => `${folder.name}/${f}`);
              await supabase.storage.from("backups").remove(batch);
            }
          }
          deletedFolders.push(folder.name);
          log.info("backup viejo eliminado", { folder: folder.name, files: oldFiles.length });
        } catch (delErr: unknown) {
          log.error("error eliminando backup viejo", { folder: folder.name, error: (delErr as Error)?.message });
        }
      }
    }
  } catch (e: unknown) {
    log.error("error en limpieza de backups", { error: (e as Error)?.message });
  }

  // ===============================================================
  // MANIFEST FINAL
  // ===============================================================
  const manifest = {
    version: 2,
    timestamp: ts,
    dateFolder,
    tables: {
      total: tableResults.length,
      exitosas: tableResults.filter((r) => !r.error).length,
      fallidas: tableResults.filter((r) => r.error).length,
      total_rows: tableResults.reduce((s, r) => s + r.rows, 0),
      total_size_bytes: tableResults.reduce((s, r) => s + r.size, 0),
      detalle: tableResults,
    },
    storage: {
      buckets: storageResults.length,
      total_files: storageResults.reduce((s, r) => s + r.files, 0),
      total_copied: storageResults.reduce((s, r) => s + r.copied, 0),
      total_errors: storageResults.reduce((s, r) => s + r.errors, 0),
      detalle: storageResults,
    },
    cleanup: {
      retention_days: RETENTION_DAYS,
      cutoff_date: cutoffStr,
      deleted_folders: deletedFolders,
    },
  };

  await supabase.storage
    .from("backups")
    .upload(
      `${dateFolder}/manifest.json`,
      new Blob([JSON.stringify(manifest, null, 2)], {
        type: "application/json",
      }),
      { upsert: true }
    );

  log.info("snapshot v2 completado", {
    dateFolder,
    tablas_ok: manifest.tables.exitosas,
    tablas_err: manifest.tables.fallidas,
    rows: manifest.tables.total_rows,
    storage_files: manifest.storage.total_copied,
    cleanup_deleted: deletedFolders.length,
  });

  return NextResponse.json(manifest);
}

// ---------------------------------------------------------------------------
// Helper: listar TODOS los archivos de un bucket recursivamente
// ---------------------------------------------------------------------------
async function listAllFiles(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const files: string[] = [];
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix || undefined, { limit: 1000 });

  if (error || !data) return files;

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) {
      // Es un archivo (tiene id)
      files.push(fullPath);
    } else {
      // Es una carpeta, listar recursivamente
      const subFiles = await listAllFiles(supabase, bucket, fullPath);
      files.push(...subFiles);
    }
  }

  return files;
}
