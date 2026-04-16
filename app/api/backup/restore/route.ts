import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

const log = logger("BACKUP-RESTORE");

// ---------------------------------------------------------------------------
// POST /api/backup/restore
// Restaura un snapshot completo de la BD a partir de una fecha.
// ACCESO EXCLUSIVO: juanviverosv@gmail.com
// Body: { date: "2026-04-13", includeStorage?: boolean }
// ---------------------------------------------------------------------------

const ALLOWED_EMAILS = [
  "juanviverosv@gmail.com",          // JJ — administrador principal
  "recursos.humanos@gcuavante.com",   // Deya Montalvo — Recursos Humanos
];

async function resolveUserEmail(req: NextRequest): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // Opción 1: Bearer token Supabase
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (user?.email) return user.email;
  }

  // Opción 2: x-user-email validado contra tabla users
  const hdrEmail = req.headers.get("x-user-email");
  if (hdrEmail) {
    const { data: u } = await supabase
      .from("users")
      .select("email,active")
      .eq("email", hdrEmail)
      .maybeSingle();
    if (u && u.active !== false) return u.email;
  }

  return null;
}

export async function POST(req: NextRequest) {
  // ── Auth: solo JJ ──────────────────────────────────────────
  const userEmail = await resolveUserEmail(req);

  if (!userEmail) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!ALLOWED_EMAILS.includes(userEmail)) {
    log.warn("Intento de restauración por usuario no autorizado", { userEmail });
    return NextResponse.json(
      { error: "Acceso denegado — solo administradores autorizados pueden restaurar" },
      { status: 403 }
    );
  }

  // ── Parámetros ──────────────────────────────────────────
  let body: { date?: string; includeStorage?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { date, includeStorage = false } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "Parámetro 'date' requerido en formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // ── Verificar que el snapshot existe ─────────────────────────────────
  const { data: manifestBlob, error: manifestErr } = await supabase.storage
    .from("backups")
    .download(`${date}/manifest.json`);

  if (manifestErr || !manifestBlob) {
    return NextResponse.json(
      { error: `No existe snapshot para la fecha ${date}` },
      { status: 404 }
    );
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(await manifestBlob.text());
  } catch {
    log.error("Manifest JSON inválido o corrupto", { date });
    return NextResponse.json({ error: "El archivo manifest.json del backup está corrupto o es inválido" }, { status: 400 });
  }
  log.info("Restauración iniciada", { date, solicitadoPor: userEmail });

  // ── FASE 1: Restaurar tablas ──────────────────────────────────────────
  const tableResults: {
    tabla: string;
    status: "ok" | "skip" | "error";
    rows: number;
    message?: string;
  }[] = [];

  const { data: tableFiles, error: listErr } = await supabase.storage
    .from("backups")
    .list(`${date}/tables`, { limit: 1000 });

  if (listErr || !tableFiles?.length) {
    return NextResponse.json(
      { error: "No se encontraron archivos de tablas en el snapshot" },
      { status: 404 }
    );
  }

  // Agrupar archivos por tabla (para tablas chunked: tabla_part001, tabla_part002...)
  const tableMap = new Map<string, string[]>();
  for (const file of tableFiles) {
    const chunkMatch = file.name.match(/^(.+)_part\d+\.json$/);
    const tableName = chunkMatch
      ? chunkMatch[1]
      : file.name.replace(/\.json$/, "");
    if (!tableMap.has(tableName)) tableMap.set(tableName, []);
    tableMap.get(tableName)!.push(file.name);
  }

  for (const [tableName, fileNames] of tableMap) {
    try {
      // Descargar y combinar todos los chunks
      const allRows: Record<string, unknown>[] = [];
      for (const fileName of fileNames.sort()) {
        const { data: fileBlob, error: dlErr } = await supabase.storage
          .from("backups")
          .download(`${date}/tables/${fileName}`);

        if (dlErr || !fileBlob) {
          tableResults.push({
            tabla: tableName,
            status: "error",
            rows: 0,
            message: `No se pudo descargar ${fileName}: ${dlErr?.message || "sin datos"}`,
          });
          continue;
        }

        const rows = JSON.parse(await fileBlob.text()) as Record<string, unknown>[];
        allRows.push(...rows);
      }

      if (allRows.length === 0) {
        tableResults.push({ tabla: tableName, status: "skip", rows: 0 });
        continue;
      }

      // Upsert en lotes de 500 para no superar límites
      const BATCH = 500;
      let upsertError: string | undefined;

      for (let i = 0; i < allRows.length; i += BATCH) {
        const batch = allRows.slice(i, i + BATCH);
        const { error: upErr } = await supabase
          .from(tableName)
          .upsert(batch, { onConflict: "id", ignoreDuplicates: false });

        if (upErr) {
          upsertError = upErr.message;
          break;
        }
      }

      tableResults.push({
        tabla: tableName,
        status: upsertError ? "error" : "ok",
        rows: allRows.length,
        ...(upsertError ? { message: upsertError } : {}),
      });
    } catch (e: unknown) {
      tableResults.push({
        tabla: tableName,
        status: "error",
        rows: 0,
        message: (e as Error)?.message || "error desconocido",
      });
    }
  }

  // ── FASE 2: Restaurar archivos de Storage (opcional) ──────────────────────
  const storageResults: {
    bucket: string;
    status: "ok" | "skip" | "error";
    files: number;
    message?: string;
  }[] = [];

  if (includeStorage) {
    const { data: storageBuckets } = await supabase.storage
      .from("backups")
      .list(`${date}/storage`, { limit: 100 });

    for (const bucketFolder of storageBuckets || []) {
      const bucketName = bucketFolder.name;
      let restoredFiles = 0;
      const errors: string[] = [];

      const filePaths = await listAllFiles(
        supabase,
        "backups",
        `${date}/storage/${bucketName}`
      );

      for (const backupPath of filePaths) {
        try {
          const { data: fileData, error: dlErr } = await supabase.storage
            .from("backups")
            .download(backupPath);

          if (dlErr || !fileData) {
            errors.push(`${backupPath}: ${dlErr?.message || "sin datos"}`);
            continue;
          }

          // Ruta original: quitar el prefijo "{date}/storage/{bucket}/"
          const originalPath = backupPath.replace(
            `${date}/storage/${bucketName}/`,
            ""
          );

          const { error: upErr } = await supabase.storage
            .from(bucketName)
            .upload(originalPath, fileData, { upsert: true });

          if (upErr) errors.push(`${originalPath}: ${upErr.message}`);
          else restoredFiles++;
        } catch (fe: unknown) {
          errors.push(`${backupPath}: ${(fe as Error)?.message || "error"}`);
        }
      }

      storageResults.push({
        bucket: bucketName,
        status: errors.length === 0 ? "ok" : "error",
        files: restoredFiles,
        ...(errors.length > 0 ? { message: errors.slice(0, 5).join("; ") } : {}),
      });
    }
  }

  // ── Resultado final ────────────────────────────────────────────
  const summary = {
    date,
    solicitadoPor: userEmail,
    completadoEn: new Date().toISOString(),
    tables: {
      total: tableResults.length,
      ok: tableResults.filter((r) => r.status === "ok").length,
      skip: tableResults.filter((r) => r.status === "skip").length,
      error: tableResults.filter((r) => r.status === "error").length,
      totalRows: tableResults.reduce((s, r) => s + r.rows, 0),
      detalle: tableResults,
    },
    storage: includeStorage
      ? {
          total: storageResults.length,
          ok: storageResults.filter((r) => r.status === "ok").length,
          error: storageResults.filter((r) => r.status === "error").length,
          detalle: storageResults,
        }
      : { skipped: true },
    snapshotManifest: manifest,
  };

  log.info("Restauración completada", {
    date,
    tablas_ok: summary.tables.ok,
    tablas_err: summary.tables.error,
    rows: summary.tables.totalRows,
  });

  return NextResponse.json(summary);
}

// ── GET: listar fechas de backups disponibles ─────────────────────────────────
export async function GET(req: NextRequest) {
  const userEmail = await resolveUserEmail(req);

  if (!userEmail || !ALLOWED_EMAILS.includes(userEmail)) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: items, error } = await supabase.storage
    .from("backups")
    .list("", { limit: 100 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filtrar solo carpetas con formato YYYY-MM-DD
  const dates = (items || [])
    .filter((item) => !item.id && /^\d{4}-\d{2}-\d{2}$/.test(item.name))
    .map((item) => item.name)
    .sort()
    .reverse(); // más recientes primero

  return NextResponse.json({ dates });
}

// ---------------------------------------------------------------------------
// Helper: listar todos los archivos recursivamente
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
      files.push(fullPath);
    } else {
      const subFiles = await listAllFiles(supabase, bucket, fullPath);
      files.push(...subFiles);
    }
  }

  return files;
}
