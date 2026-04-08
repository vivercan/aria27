import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const log = logger("BACKUP-SNAPSHOT");

// Snapshot ligero de tablas críticas → JSON en bucket 'backups' de Storage.
// Protegido por Bearer token (BACKUP_TOKEN). Dispara desde cron externo (Vercel Cron diario).
const TABLAS_CRITICAS = [
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
  "obra_bitacora",
];

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.BACKUP_TOKEN || "";
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!isVercelCron && (!expected || auth !== `Bearer ${expected}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const results: { tabla: string; rows: number; size: number; error?: string }[] = [];

  // Asegurar bucket backups
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find(b => b.name === "backups")) {
    await supabase.storage.createBucket("backups", { public: false });
    log.info("bucket backups creado");
  }

  for (const tabla of TABLAS_CRITICAS) {
    try {
      const { data, error } = await supabase.from(tabla).select("*");
      if (error) {
        results.push({ tabla, rows: 0, size: 0, error: error.message });
        continue;
      }
      const json = JSON.stringify(data || []);
      const path = `${ts}/${tabla}.json`;
      const { error: upErr } = await supabase.storage.from("backups").upload(path, new Blob([json], { type: "application/json" }), { upsert: true });
      if (upErr) {
        results.push({ tabla, rows: data?.length || 0, size: json.length, error: upErr.message });
      } else {
        results.push({ tabla, rows: data?.length || 0, size: json.length });
      }
    } catch (e: any) {
      results.push({ tabla, rows: 0, size: 0, error: e?.message || "error" });
    }
  }

  // Manifest
  const manifest = {
    timestamp: ts,
    total_tablas: results.length,
    exitosas: results.filter(r => !r.error).length,
    fallidas: results.filter(r => r.error).length,
    total_rows: results.reduce((s, r) => s + r.rows, 0),
    total_size: results.reduce((s, r) => s + r.size, 0),
    resultados: results,
  };
  await supabase.storage.from("backups").upload(`${ts}/manifest.json`, new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }), { upsert: true });

  log.info("snapshot completado", { ts, exitosas: manifest.exitosas, fallidas: manifest.fallidas, rows: manifest.total_rows });
  return NextResponse.json(manifest);
}
