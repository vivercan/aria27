// 19-Jun-2026 — Endpoint admin para disparar snapshot manual sin CRON_SECRET.
// FIX 541.1: solo accesible para usuarios admin via cookie session opaca. Llama al snapshot principal
// con ?include=all internamente con CRON_SECRET de env.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-api";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const secret = process.env.BACKUP_TOKEN || process.env.CRON_SECRET || "";
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "BACKUP_TOKEN o CRON_SECRET no configurado en env" },
      { status: 500 }
    );
  }

  const baseUrl = req.nextUrl.origin;
  const includeAll = req.nextUrl.searchParams.get("include") === "all";
  const params = new URLSearchParams();
  if (includeAll) params.set("include", "all");

  const url = `${baseUrl}/api/backup/snapshot${params.toString() ? "?" + params.toString() : ""}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${secret}` },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: res.ok, includeAll, snapshot: data, triggered_by: auth.email });
}
