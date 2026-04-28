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

    const ALLOWED_ROLES = ["admin", "Administrador", "rh", "compras", "almacen", "operador", "residente", "direccion", "user", "usuario", "validador"];
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

interface UserCreateBody {
  email?: unknown;
  display_name?: unknown;
  role?: unknown;
  phone?: unknown;
  permissions?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "admin:roles", ...RATE_LIMITS.ADMIN });
    if (!rl.allowed) return rateLimitResponse(rl);

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    let body: UserCreateBody;
    try { body = await req.json().catch(() => ({})); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

    const { email, display_name, role, phone, permissions } = body || {};
    if (!email || typeof email !== "string") return NextResponse.json({ error: "email requerido" }, { status: 400 });

    const ALLOWED_ROLES = ["admin", "Administrador", "rh", "compras", "almacen", "operador", "residente", "direccion", "user", "usuario", "validador"];
    if (role && (typeof role !== "string" || !ALLOWED_ROLES.includes(role))) {
      return NextResponse.json({ error: `rol invalido: ${role}` }, { status: 400 });
    }
    if (permissions && (typeof permissions !== "object" || Array.isArray(permissions))) {
      return NextResponse.json({ error: "permissions debe ser objeto" }, { status: 400 });
    }
    if (display_name && typeof display_name !== "string") {
      return NextResponse.json({ error: "display_name debe ser string" }, { status: 400 });
    }
    if (phone && typeof phone !== "string") {
      return NextResponse.json({ error: "phone debe ser string" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const emailLower = email.trim().toLowerCase();

    // Check if exists
    const existing = await sb.from("Users").select("id").ilike("email", emailLower).maybeSingle();
    if (existing.data?.id) {
      // Update path (upsert behavior)
      const upd: Record<string, unknown> = {};
      if (typeof role === "string") upd.role = role;
      if (typeof display_name === "string") upd.display_name = display_name.trim();
      if (typeof phone === "string") upd.phone = phone.trim();
      if (permissions !== undefined) upd.permissions = permissions;
      if (Object.keys(upd).length > 0) {
        const { error: errUpd } = await sb.from("Users").update(upd).eq("id", existing.data.id);
        if (errUpd) return NextResponse.json({ error: errUpd.message }, { status: 500 });
      }
      try {
        await sb.from("audit_log").insert({
          actor_email: auth.email,
          action: "admin.roles.upsert.existing",
          target_id: existing.data.id,
          payload: upd,
        });
      } catch { /* ignore */ }
      return NextResponse.json({ ok: true, id: existing.data.id, mode: "updated" });
    }

    // Insert
    const insRow: Record<string, unknown> = { email: emailLower };
    if (typeof display_name === "string") insRow.display_name = display_name.trim();
    if (typeof role === "string") insRow.role = role;
    if (typeof phone === "string") insRow.phone = phone.trim();
    if (permissions !== undefined) insRow.permissions = permissions;

    const { data, error } = await sb.from("Users").insert(insRow).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await sb.from("audit_log").insert({
        actor_email: auth.email,
        action: "admin.roles.create",
        target_id: data?.id || null,
        payload: insRow,
      });
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true, id: data?.id, mode: "created" });
  } catch (err: unknown) {
    log.error("POST /admin/roles falló", { error: err });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

interface UserCreateBody {
  email?: unknown;
  display_name?: unknown;
  role?: unknown;
  phone?: unknown;
  permissions?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "admin:roles", ...RATE_LIMITS.ADMIN });
    if (!rl.allowed) return rateLimitResponse(rl);

    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    let body: UserCreateBody;
    try { body = await req.json().catch(() => ({})); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

    const { email, display_name, role, phone, permissions } = body || {};
    if (!email || typeof email !== "string") return NextResponse.json({ error: "email requerido" }, { status: 400 });

    const ALLOWED_ROLES = ["admin", "Administrador", "rh", "compras", "almacen", "operador", "residente", "direccion", "user", "usuario", "validador"];
    if (role && (typeof role !== "string" || !ALLOWED_ROLES.includes(role))) {
      return NextResponse.json({ error: `rol invalido: ${role}` }, { status: 400 });
    }
    if (permissions && (typeof permissions !== "object" || Array.isArray(permissions))) {
      return NextResponse.json({ error: "permissions debe ser objeto" }, { status: 400 });
    }
    if (display_name && typeof display_name !== "string") {
      return NextResponse.json({ error: "display_name debe ser string" }, { status: 400 });
    }
    if (phone && typeof phone !== "string") {
      return NextResponse.json({ error: "phone debe ser string" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const emailLower = email.trim().toLowerCase();

    // Check if exists
    const existing = await sb.from("Users").select("id").ilike("email", emailLower).maybeSingle();
    if (existing.data?.id) {
      // Update path (upsert behavior)
      const upd: Record<string, unknown> = {};
      if (typeof role === "string") upd.role = role;
      if (typeof display_name === "string") upd.display_name = display_name.trim();
      if (typeof phone === "string") upd.phone = phone.trim();
      if (permissions !== undefined) upd.permissions = permissions;
      if (Object.keys(upd).length > 0) {
        const { error: errUpd } = await sb.from("Users").update(upd).eq("id", existing.data.id);
        if (errUpd) return NextResponse.json({ error: errUpd.message }, { status: 500 });
      }
      try {
        await sb.from("audit_log").insert({
          actor_email: auth.email,
          action: "admin.roles.upsert.existing",
          target_id: existing.data.id,
          payload: upd,
        });
      } catch { /* ignore */ }
      return NextResponse.json({ ok: true, id: existing.data.id, mode: "updated" });
    }

    // Insert
    const insRow: Record<string, unknown> = { email: emailLower };
    if (typeof display_name === "string") insRow.display_name = display_name.trim();
    if (typeof role === "string") insRow.role = role;
    if (typeof phone === "string") insRow.phone = phone.trim();
    if (permissions !== undefined) insRow.permissions = permissions;

    const { data, error } = await sb.from("Users").insert(insRow).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await sb.from("audit_log").insert({
        actor_email: auth.email,
        action: "admin.roles.create",
        target_id: data?.id || null,
        payload: insRow,
      });
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true, id: data?.id, mode: "created" });
  } catch (err: unknown) {
    log.error("POST /admin/roles falló", { error: err });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
