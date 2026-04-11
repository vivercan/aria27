import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateApiUser } from "@/lib/auth-api";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rate-limit";

const ADMIN_EMAILS = [(process.env.ADMIN_EMAIL || "juanviverosv@gmail.com")];

async function requireAdmin(req: NextRequest) {
  const email = (req.headers.get("x-user-email") || "").toLowerCase().trim();
  if (!email) return { ok: false as const, res: NextResponse.json({ error: "x-user-email requerido" }, { status: 401 }) };

  // Validar que el usuario existe en BD
  const user = await validateApiUser(email);
  if (!user) return { ok: false as const, res: NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 }) };

  // Verificar permisos de admin
  if (ADMIN_EMAILS.includes(email)) return { ok: true as const, email };
  if (user.role === "admin" || user.role === "Administrador") return { ok: true as const, email };

  return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function POST(req: NextRequest) {
  // RATE LIMIT: 5 requests per minute (STRICT tier for sensitive admin operations)
  const clientId = getClientIdentifier(req);
  const rl = checkRateLimit(clientId, { key: "admin:auditoria-revert", max: 5, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl);

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { audit_id } = await req.json();
  if (!audit_id) return NextResponse.json({ error: "audit_id requerido" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: row, error: e1 } = await sb.from("audit_log").select("*").eq("id", audit_id).maybeSingle();
  if (e1 || !row) return NextResponse.json({ error: e1?.message || "No encontrado" }, { status: 404 });

  if (row.op !== "UPDATE" || !row.before) {
    return NextResponse.json({ error: "Solo se puede revertir un UPDATE con snapshot before" }, { status: 400 });
  }

  const before = row.before as Record<string, any>;
  const rowId = row.row_pk;
  if (!rowId) return NextResponse.json({ error: "Sin row_pk" }, { status: 400 });

  // Reaplicar el estado anterior — el trigger captura el nuevo update automáticamente
  const { error: e2 } = await sb.from(row.table_name).update(before).eq("id", rowId);
  if (e2) return NextResponse.json({ error: `Error al revertir: ${e2.message}` }, { status: 500 });

  return NextResponse.json({ ok: true, reverted_table: row.table_name, row_id: rowId, by: auth.email });
}
