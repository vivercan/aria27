/**
 * /api/monitoring/synthetic - Synthetic Monitoring + Continuous Auditing
 *
 * Cada corrida (idealmente cada 2 min via Vercel cron) ejecuta 5 frentes:
 *
 *   1. HEALTH       - Reusa /api/health (env vars + db + storage + waba phone id).
 *   2. SMOKE_CRUD   - INSERT + DELETE en tabla _synthetic_smoke. Mide latencia.
 *   3. CONTRACT     - Verifica que /api/health responde shape esperado (status, summary, checks[]).
 *   4. PEN_TEST     - Intenta SELECT anon a tablas sensibles. Si retorna data REAL, es CRITICAL.
 *   5. ENV          - Re-chequeo de env vars criticas (incluye RESEND_API_KEY, WHATSAPP_*).
 *   6. RPC_HEALTH   - Invoca cada RPC SECURITY DEFINER con args seguros (UUID nulo o not_found).
 *                     Si un RPC referencia una columna inexistente, el bug se detecta aqui en 2 min
 *                     en lugar de vivir 2 meses oculto. Leccion del fix 15-Jun-2026 PL06.
 *
 * Persiste 1 fila por check en monitoring_log con run_id agrupando.
 * No bloquea la respuesta si Supabase esta lento; cada check tiene timeout corto.
 *
 * 24-Abr-2026 PR feat/synthetic-monitoring.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

const log = logger("MON-SYNTH");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://aria.jjcrm27.com";

interface Check {
  category: "HEALTH" | "SMOKE_CRUD" | "CONTRACT" | "PEN_TEST" | "ENV" | "RPC_HEALTH";
  check_name: string;
  status: "ok" | "warn" | "error";
  message: string;
  duration_ms: number;
  details?: Record<string, unknown>;
}

async function timed<T>(fn: () => Promise<T> | PromiseLike<T>): Promise<{ result: T | null; error: Error | null; ms: number }> {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { result, error: null, ms: Date.now() - t0 };
  } catch (error) {
    return { result: null, error: error as Error, ms: Date.now() - t0 };
  }
}

// ============================================================================
// 1. HEALTH (reusa endpoint existente)
// ============================================================================
async function runHealthCheck(): Promise<Check[]> {
  const out: Check[] = [];
  const t0 = Date.now();
  try {
    const res = await fetch(`${SITE_URL}/api/health`, {
      cache: "no-store",
      headers: { "User-Agent": "synthetic-monitor/1.0" },
    });
    const elapsed = Date.now() - t0;
    const data = await res.json().catch(() => ({}));
    out.push({
      category: "HEALTH",
      check_name: "health:overall",
      status: (data.status === "ok" ? "ok" : data.status === "warn" ? "warn" : "error"),
      message: `health endpoint -> ${data.status} (${data.summary?.error || 0} err, ${data.summary?.warn || 0} warn)`,
      duration_ms: elapsed,
      details: data.summary,
    });
    if (Array.isArray(data.checks)) {
      for (const c of data.checks) {
        if (c.status !== "ok") {
          out.push({
            category: "HEALTH",
            check_name: c.name,
            status: c.status,
            message: c.message,
            duration_ms: 0,
          });
        }
      }
    }
  } catch (e: unknown) {
    out.push({
      category: "HEALTH",
      check_name: "health:overall",
      status: "error",
      message: `health fetch fallo: ${(e as Error).message}`,
      duration_ms: Date.now() - t0,
    });
  }
  return out;
}

// ============================================================================
// 2. SMOKE CRUD (insert + delete en _synthetic_smoke)
// ============================================================================
async function runSmokeCrud(): Promise<Check[]> {
  const out: Check[] = [];
  const supa = getSupabaseAdmin();
  const marker = `synth-${randomUUID().slice(0, 8)}`;
  let id: string | null = null;

  // INSERT
  type SbResult = { data?: { id?: string; payload?: string } | null; error?: { message?: string } | null };
  const ins = await timed<SbResult>(() =>
    supa.from("_synthetic_smoke").insert({ payload: marker }).select("id").single() as unknown as Promise<SbResult>
  );
  const insErr = ins.error || ins.result?.error;
  if (insErr || !ins.result?.data?.id) {
    out.push({
      category: "SMOKE_CRUD",
      check_name: "smoke:insert",
      status: "error",
      message: `INSERT fallo: ${insErr?.message || "sin id"}`,
      duration_ms: ins.ms,
    });
    return out;
  }
  id = ins.result.data.id!;
  out.push({
    category: "SMOKE_CRUD",
    check_name: "smoke:insert",
    status: "ok",
    message: `INSERT _synthetic_smoke ok (${ins.ms}ms)`,
    duration_ms: ins.ms,
    details: { marker, id },
  });

  // SELECT
  const sel = await timed<SbResult>(() =>
    supa.from("_synthetic_smoke").select("id, payload").eq("id", id).single() as unknown as Promise<SbResult>
  );
  const selErr = sel.error || sel.result?.error;
  out.push({
    category: "SMOKE_CRUD",
    check_name: "smoke:select",
    status: selErr ? "error" : "ok",
    message: selErr ? `SELECT fallo: ${selErr.message}` : `SELECT ok payload=${sel.result?.data?.payload}`,
    duration_ms: sel.ms,
  });

  // DELETE
  const del = await timed<SbResult>(() =>
    supa.from("_synthetic_smoke").delete().eq("id", id) as unknown as Promise<SbResult>
  );
  const delErr = del.error || del.result?.error;
  out.push({
    category: "SMOKE_CRUD",
    check_name: "smoke:delete",
    status: delErr ? "error" : "ok",
    message: delErr ? `DELETE fallo: ${delErr.message}` : `DELETE ok (${del.ms}ms)`,
    duration_ms: del.ms,
  });

  return out;
}

// ============================================================================
// 3. CONTRACT TESTING (shape de respuestas API)
// ============================================================================
async function runContract(): Promise<Check[]> {
  const out: Check[] = [];
  const t0 = Date.now();
  try {
    const res = await fetch(`${SITE_URL}/api/health`, { cache: "no-store" });
    const data = await res.json();
    const ok =
      typeof data === "object" &&
      typeof data.status === "string" &&
      typeof data.timestamp === "string" &&
      typeof data.summary === "object" &&
      Array.isArray(data.checks);
    out.push({
      category: "CONTRACT",
      check_name: "contract:health_shape",
      status: ok ? "ok" : "error",
      message: ok ? "Shape /api/health correcto (status,timestamp,summary,checks[])" : "Shape /api/health incorrecto",
      duration_ms: Date.now() - t0,
      details: ok ? undefined : { received_keys: Object.keys(data || {}) },
    });
  } catch (e: unknown) {
    out.push({
      category: "CONTRACT",
      check_name: "contract:health_shape",
      status: "error",
      message: `Contract fetch fallo: ${(e as Error).message}`,
      duration_ms: Date.now() - t0,
    });
  }
  return out;
}

// ============================================================================
// 4. PEN TEST LIGHT (anon SELECT a tablas sensibles)
// ============================================================================
async function runPenTest(): Promise<Check[]> {
  const out: Check[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !anon) {
    out.push({
      category: "PEN_TEST",
      check_name: "pen:env_missing",
      status: "warn",
      message: "Anon key no disponible; pen test omitido",
      duration_ms: 0,
    });
    return out;
  }
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });

  // Tablas que NO deberian leerse anon en exposicion completa
  const sensitive = ["portales_credenciales", "Users", "wa_log", "email_log", "portales_accesos_log"];

  type PenResult = { data?: unknown[] | null; error?: { message?: string } | null };
  for (const table of sensitive) {
    const t = await timed<PenResult>(() =>
      anonClient.from(table).select("*").limit(5) as unknown as Promise<PenResult>
    );
    const err = t.error || t.result?.error;
    const data = t.result?.data;
    let status: "ok" | "warn" | "error" = "ok";
    let message = "";
    if (err) {
      status = "ok";
      message = `Anon BLOQUEADO en ${table} (${err.message?.slice(0, 60) || "permission denied"})`;
    } else if (Array.isArray(data) && data.length > 0) {
      // Tabla expuesta a anon con datos -> CRITICAL
      status = table === "portales_credenciales" ? "error" : "warn";
      message = `${status === "error" ? "[CRITICAL] " : ""}Anon LEYO ${data.length} rows de ${table}`;
    } else {
      message = `Anon retorno 0 rows de ${table} (RLS o tabla vacia)`;
    }
    out.push({
      category: "PEN_TEST",
      check_name: `pen:anon_select_${table}`,
      status,
      message,
      duration_ms: t.ms,
      details: data ? { rows_returned: Array.isArray(data) ? data.length : 0 } : undefined,
    });
  }
  return out;
}

// ============================================================================
// 5. ENV (re-chequeo de las criticas con detalle)
// ============================================================================
function runEnv(): Check[] {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "RESEND_API_KEY",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_ID",
    "ANTHROPIC_API_KEY",
    "CRON_SECRET",
  ];
  return required.map(key => {
    const has = !!process.env[key];
    return {
      category: "ENV" as const,
      check_name: `env:${key}`,
      status: has ? ("ok" as const) : ("error" as const),
      message: has ? `${key} presente` : `${key} AUSENTE`,
      duration_ms: 0,
    };
  });
}

// ============================================================================
// RPC_HEALTH — inmunizador del fix 15-Jun-2026 (delete_requisition_cascade roto 2 meses)
// Cada RPC SECURITY DEFINER se invoca con argumentos SEGUROS (UUID nulo o not_found).
// Si el RPC contiene referencia a columna inexistente, falla aqui con SQLSTATE.
// NO modifica datos: usa UUIDs nulos que producen rama not_found en cada RPC.
// ============================================================================
async function runRpcHealth(): Promise<Check[]> {
  const checks: Check[] = [];
  const supa = getSupabaseAdmin();
  const NULL_UUID = "00000000-0000-0000-0000-000000000000";

  // probes — { name, fn, args, expect: 'no_throw' | 'returns' }
  const probes: Array<{ name: string; rpc: string; args: Record<string, unknown> }> = [
    { name: "delete_requisition_cascade", rpc: "delete_requisition_cascade", args: { p_req_id: NULL_UUID, p_deleted_by: "rpc-health@aria27.local" } },
    { name: "aplicar_entrega_inventario", rpc: "aplicar_entrega_inventario", args: { p_obra_id: NULL_UUID, p_obra_nombre: "RPC_HEALTH_PROBE", p_materiales: [] } },
    { name: "get_user_zoho_creds", rpc: "get_user_zoho_creds", args: { p_email: "rpc-health@aria27.local", p_key: "probe" } },
    { name: "decrypt_portal_password", rpc: "decrypt_portal_password", args: { p_id: NULL_UUID, p_key: "probe" } },
    { name: "list_backup_tables", rpc: "list_backup_tables", args: {} },
    { name: "title_case_es", rpc: "title_case_es", args: { input: "rpc health probe" } },
  ];

  for (const probe of probes) {
    const { result, error, ms } = await timed(() => supa.rpc(probe.rpc, probe.args));
    // result puede ser { data, error } envuelto por supabase-js
    const supaErr = (result as { error?: { message?: string; code?: string } } | null)?.error;
    if (error || supaErr) {
      const msg = error?.message || supaErr?.message || "unknown";
      checks.push({
        category: "RPC_HEALTH",
        check_name: `rpc:${probe.name}`,
        status: "error",
        message: `RPC fallo: ${msg}`,
        duration_ms: ms,
        details: { rpc: probe.rpc, code: supaErr?.code },
      });
    } else {
      checks.push({
        category: "RPC_HEALTH",
        check_name: `rpc:${probe.name}`,
        status: "ok",
        message: `RPC ${probe.rpc} responde sin error`,
        duration_ms: ms,
      });
    }
  }

  return checks;
}

// ============================================================================
// HANDLER
// ============================================================================
export async function GET(req: NextRequest) {
  // Auth: cron header de Vercel o token bearer
  const cronSecret = process.env.CRON_SECRET || "";
  const isVercelCron =
    req.headers.get("x-vercel-cron") === "1" ||
    req.headers.get("user-agent")?.startsWith("vercel-cron") === true;
  const auth = req.headers.get("authorization") || "";
  if (!isVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const runId = randomUUID();
  const t0 = Date.now();

  // Ejecutar todos los frentes en paralelo
  const [health, smoke, contract, pen, rpcHealth] = await Promise.all([
    runHealthCheck(),
    runSmokeCrud(),
    runContract(),
    runPenTest(),
    runRpcHealth(),
  ]);
  const env = runEnv();

  const allChecks: Check[] = [...health, ...smoke, ...contract, ...pen, ...rpcHealth, ...env];
  const elapsed = Date.now() - t0;

  // Persistir en monitoring_log
  try {
    const supa = getSupabaseAdmin();
    const rows = allChecks.map(c => ({
      run_id: runId,
      category: c.category,
      check_name: c.check_name,
      status: c.status,
      message: c.message,
      duration_ms: c.duration_ms,
      details: c.details || null,
    }));
    await supa.from("monitoring_log").insert(rows);
  } catch (e: unknown) {
    log.error("No se pudo persistir monitoring_log", { err: (e as Error).message });
  }

  const counts = {
    total: allChecks.length,
    ok: allChecks.filter(c => c.status === "ok").length,
    warn: allChecks.filter(c => c.status === "warn").length,
    error: allChecks.filter(c => c.status === "error").length,
  };

  // Si hay errores, intentar alertar via WhatsApp con anti-flap (2 fallas consecutivas)
  let alerted = false;
  if (counts.error > 0) {
    try {
      const supa = getSupabaseAdmin();
      const { data: prev } = await supa
        .from("monitoring_log")
        .select("run_id, status")
        .neq("run_id", runId)
        .eq("status", "error")
        .order("created_at", { ascending: false })
        .limit(1);
      const tieneFallaPrevia = !!(prev && prev.length > 0);
      if (tieneFallaPrevia) {
        const { sendWhatsAppText } = await import("@/lib/whatsapp");
        const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || "5218112392266";
        const errs = allChecks.filter(c => c.status === "error").slice(0, 5);
        const body = `ARIA27 SYNTHETIC MONITOR\n\n${counts.error} errores (2 corridas consecutivas)\n\n${errs.map(e => `- [${e.category}] ${e.check_name}: ${e.message.slice(0, 80)}`).join("\n")}\n\nrun=${runId.slice(0, 8)}`;
        await sendWhatsAppText(adminPhone, body, { origen: "synthetic-monitor", enviadoPor: "cron" });
        alerted = true;
      }
    } catch (e: unknown) {
      log.error("No se pudo enviar alerta WA", { err: (e as Error).message });
    }
  }

  return NextResponse.json({
    run_id: runId,
    elapsed_ms: elapsed,
    counts,
    alerted,
    checks: allChecks,
  }, { status: counts.error > 0 ? 207 : 200 });
}
