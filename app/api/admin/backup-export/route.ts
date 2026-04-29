import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-api";
import { logger } from "@/lib/logger";

const log = logger("BACKUP-EXPORT");

export const maxDuration = 300;

// GET /api/admin/backup-export?date=YYYY-MM-DD
// Devuelve lista completa de archivos del backup (paths + signed URLs 1h validez)
// Para descargar localmente. Solo admin emails.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const sb = getSupabaseAdmin();
  const dateParam = req.nextUrl.searchParams.get("date");

  // Si no se pasa fecha, buscar la mas reciente
  let folder = dateParam || "";
  if (!folder) {
    const { data: roots } = await sb.storage.from("backups").list("", { limit: 100, sortBy: { column: "name", order: "desc" } });
    const folders = (roots || []).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.name)).map(r => r.name).sort().reverse();
    if (folders.length === 0) return NextResponse.json({ error: "No hay backups" }, { status: 404 });
    folder = folders[0];
  }

  // Listar tables/
  const tablesPath = `${folder}/tables`;
  const { data: tableFiles, error: tErr } = await sb.storage.from("backups").list(tablesPath, { limit: 200, sortBy: { column: "name", order: "asc" } });
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  // Listar storage/ recursivo (un nivel)
  const storagePath = `${folder}/storage`;
  const { data: storageBuckets } = await sb.storage.from("backups").list(storagePath, { limit: 100 });

  // Generar signed URLs (1h)
  const tables: { path: string; size: number; signedUrl: string }[] = [];
  for (const f of tableFiles || []) {
    const fullPath = `${tablesPath}/${f.name}`;
    const { data: signed } = await sb.storage.from("backups").createSignedUrl(fullPath, 3600);
    if (signed?.signedUrl) tables.push({ path: fullPath, size: f.metadata?.size || 0, signedUrl: signed.signedUrl });
  }

  // Para storage, listar recursivo cada bucket
  const storageItems: { path: string; size: number; signedUrl: string }[] = [];
  for (const b of storageBuckets || []) {
    const bPath = `${storagePath}/${b.name}`;
    const queue: string[] = [bPath];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const { data: contents } = await sb.storage.from("backups").list(cur, { limit: 1000 });
      for (const item of contents || []) {
        const itemPath = `${cur}/${item.name}`;
        if (item.metadata?.size) {
          const { data: signed } = await sb.storage.from("backups").createSignedUrl(itemPath, 3600);
          if (signed?.signedUrl) storageItems.push({ path: itemPath, size: item.metadata.size, signedUrl: signed.signedUrl });
        } else if (!item.name.includes(".")) {
          queue.push(itemPath);
        }
      }
    }
  }

  log.info("Backup export listo", { folder, tables: tables.length, storage: storageItems.length });

  return NextResponse.json({
    folder,
    tables,
    storage: storageItems,
    totalFiles: tables.length + storageItems.length,
    totalSize: tables.reduce((s, t) => s + t.size, 0) + storageItems.reduce((s, t) => s + t.size, 0)
  });
}
