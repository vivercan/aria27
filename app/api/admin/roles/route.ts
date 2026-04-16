import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/auth-api";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("ADMIN-ROLES");

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "admin:roles", ...RATE_LIMITS.ADMIN });
    if (!rl.allowed) return rateLimitResponse(rl);

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("Users")
      .select("id,email,display_name,role,permissions")
      .order("email", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data || [] });
  } catch (err: unknown) {
    log.error("GET /admin/roles falló", { error: err });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

interface RolePatchBody {
  id?: unknown;
  role?: unknown;
  permissions?: unknown;
  email?: unknown;
  phone?: unknown;
}

interface RoleUpdate {
  role?: string;
  permissions?: Record<string, unknown>;
  email?: string;
  phone?: string;
}

export async function PATCH(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "admin:roles", ...RATE_LIMITS.ADMIN });
    if (!rl.allowed) return rateLimitResponse(rl);

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    let body: RolePatchBody;
    try { body = await req.json().catch(() => ({})); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

    const { id, role, permissions, email: newEmail, phone } = body || {};
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const ALLOWED_ROLES = ["admin", "Administrador", "rh", "compras", "almacen", "operador", "residente", "direccion", "user"];
    if (role && (typeof role !== "string" || !ALLOWED_ROLES.includes(role))) {
      return NextResponse.json({ error: `rol invalido: ${role}` }, { status: 400 });
    }
    if (permissions && (typeof permissions !== "object" || Array.isArray(permissions))) {
      return NextResponse.json({ error: "permissions debe ser objeto" }, { status: 400 });
    }
    if (newEmail && typeof newEmail !== "string") {
      return NextResponse.json({ error: "email debe ser string" }, { status: 400 });
    }
    if (phone && typeof phone !== "string") {
      return NextResponse.json({ error: "phone debe ser string" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const patch: RoleUpdate = {};
    if (typeof role === "string") patch.role = role;
    if (permissions !== undefined) patch.permissions = permissions as Record<string, unknown>;
    if (typeof newEmail === "string" && newEmail.trim()) patch.email = newEmail.trim();
    if (typeof phone === "string") patch.phone = phone.trim();

    const { error } = await sb.from("Users").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log de auditoria best-effort
    try {
      await sb.from("audit_log").insert({
        actor_email: auth.email,
        action: "admin.roles.update",
        target_id: id,
        payload: patch,
      });
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    log.error("PATCH /admin/roles falló", { error: err });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
