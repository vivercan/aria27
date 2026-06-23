// 19-Jun-2026 — Snapshot semanal de tablas pesadas (audit_log 353 MB + monitoring_log 200 MB).
// El cron diario las skipea para no morir por timeout. Este corre 1 vez/semana
// (domingo 4 AM CST) y respalda SOLO las pesadas via redirección al snapshot principal con flag.

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("BACKUP-HEAVY");

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const HEAVY_TABLES = ["audit_log", "monitoring_log"];

export async function GET(req: NextRequest) {
  // Auth: misma logica que /api/backup/snapshot (Bearer o vercel-cron)
  const auth = req.headers.get("authorization") || "";
  const expected = process.env.BACKUP_TOKEN || process.env.CRON_SECRET || "";
  const isVercelCron =
    req.headers.get("x-vercel-cron") === "1" ||
    req.headers.get("user-agent")?.startsWith("vercel-cron") === true;
  if (!isVercelCron && (!expected || auth !== `Bearer ${expected}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  log.info("Snapshot heavy iniciado", { tables: HEAVY_TABLES });

  // Llamar al endpoint snapshot principal con include=all + skip de las NO heavy
  // para que solo procese las pesadas. Mejor: ejecutar inline el mismo flujo
  // pero filtrar solo HEAVY_TABLES.
  const baseUrl = req.nextUrl.origin;
  const params = new URLSearchParams({
    include: "all",
    only: HEAVY_TABLES.join(","),
  });
  // Llamada interna al snapshot principal (que ya filtra por ?only si presente)
  const res = await fetch(`${baseUrl}/api/backup/snapshot?${params.toString()}`, {
    headers: {
      "x-vercel-cron": req.headers.get("x-vercel-cron") || "",
      authorization: auth,
      "user-agent": req.headers.get("user-agent") || "snapshot-heavy",
    },
  });
  const data = await res.json().catch(() => ({}));
  log.info("Snapshot heavy completado", { status: res.status, summary: data });
  return NextResponse.json({ ok: res.ok, heavy: HEAVY_TABLES, snapshot: data });
}
