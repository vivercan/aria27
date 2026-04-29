import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-api";
import { logger } from "@/lib/logger";

const log = logger("STORAGE-EXPORT");
export const maxDuration = 300;

// GET /api/admin/storage-export?bucket=expedientes
// Lista TODOS los archivos del bucket especificado (recursivo) con
// URL pública (si bucket es public) o signed URL (si privado).
// Permite descargar TODO el contenido localmente.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const sb = getSupabaseAdmin();
  const bucketParam = req.nextUrl.searchParams.get("bucket") || "expedientes";

  // Verificar bucket existe y obtener info
  const { data: buckets } = await sb.storage.listBuckets();
  const bucket = buckets?.find(b => b.name === bucketParam);
  if (!bucket) return NextResponse.json({ error: `bucket ${bucketParam} no encontrado`, available: buckets?.map(b => b.name) }, { status: 404 });

  const isPublic = bucket.public;

  // Listar recursivo
  const files: { path: string; size: number; url: string; updated_at?: string }[] = [];
  const queue: string[] = [""];
  let safety = 0;
  while (queue.length > 0 && safety++ < 5000) {
    const cur = queue.shift()!;
    const { data: contents } = await sb.storage.from(bucketParam).list(cur, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    for (const item of contents || []) {
      const itemPath = cur ? `${cur}/${item.name}` : item.name;
      if (item.id && item.metadata?.size) {
        // Es archivo
        let url = "";
        if (isPublic) {
          const { data: pub } = sb.storage.from(bucketParam).getPublicUrl(itemPath);
          url = pub.publicUrl;
        } else {
          const { data: signed } = await sb.storage.from(bucketParam).createSignedUrl(itemPath, 3600);
          url = signed?.signedUrl || "";
        }
        if (url) files.push({ path: itemPath, size: item.metadata.size, url, updated_at: item.updated_at });
      } else if (!item.name.includes(".") || !item.id) {
        // Carpeta o item sin extension
        queue.push(itemPath);
      }
    }
  }

  log.info("Storage export listo", { bucket: bucketParam, files: files.length });

  return NextResponse.json({
    bucket: bucketParam,
    isPublic,
    totalFiles: files.length,
    totalSize: files.reduce((s, f) => s + f.size, 0),
    files
  });
}
