import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAdminOrRh } from "@/lib/auth-api";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const log = logger("ADMIN-ROLES");

export async function GET(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "admin:roles", ...RATE_LIMITS.ADMIN });
    if (!rl.allowed) return rateLimitResponse(rl);

    const auth = await requireAdminOrRh(req);
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
  active?: unknown;
  name?: unknown;
  role?: unknown;
  permissions?: unknown;
  email?: unknown;
  phone?: unknown;
}

interface RoleUpdate {
  active?: boolean;
  name?: string;
  display_name?: string;
  role?: string;
  permissions?: Record<string, unknown>;
  email?: string;
  phone?: string;
}

export async function PATCH(req: NextRequest) {
  try {
    const rl = checkRateLimit(getClientIdentifier(req), { key: "admin:roles", ...RATE_LIMITS.ADMIN });
    if (!rl.allowed) return rateLimitResponse(rl);

    const auth = await requireAdminOrRh(req);
    if (!auth.ok) return auth.res;

    let body: RolePatchBody;
    try { body = await req.json().catch(() => ({})); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

    const { id, role, permissions, email: newEmail, phone, active, name } = body || {};
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
    // RH administra a todos excepto cuentas admin, y no puede otorgar rol admin
    if (auth.role === "rh") {
      if (role === "admin" || role === "Administrador") return NextResponse.json({ error: "Recursos Humanos no puede asignar el rol Administrador" }, { status: 403 });
      const { data: target } = await sb.from("Users").select("role").eq("id", id).maybeSingle();
      const tr = String((target as { role?: string } | null)?.role || "");
      if (tr === "admin" || tr === "Administrador") return NextResponse.json({ error: "Recursos Humanos no puede modificar una cuenta Administrador" }, { status: 403 });
    }
    const patch: RoleUpdate = {};
    if (typeof role === "string") patch.role = role;
    if (permissions !== undefined) patch.permissions = permissions as Record<string, unknown>;
    if (typeof newEmail === "string" && newEmail.trim()) patch.email = newEmail.trim();
    if (typeof phone === "string") patch.phone = phone.trim();
    if (typeof active === "boolean") patch.active = active; // baja / reactivacion (no borra historial)
    if (typeof name === "string" && name.trim()) { patch.name = name.trim(); patch.display_name = name.trim(); }
    if (auth.email && typeof active === "boolean" && active === false) {
      const { data: self } = await sb.from("Users").select("email").eq("id", id).maybeSingle();
      if (String((self as { email?: string } | null)?.email || "").toLowerCase() === auth.email.toLowerCase()) return NextResponse.json({ error: "No puedes darte de baja a ti mismo" }, { status: 400 });
    }

    const { error } = await sb.from("Users").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (patch.active === false) {
      // baja: cerrar todas sus sesiones abiertas
      try {
        const { data: who } = await sb.from("Users").select("email").eq("id", id).maybeSingle();
        const em = (who as { email?: string } | null)?.email;
        if (em) { const { revokeAllSessionsFor } = await import("@/lib/session"); await revokeAllSessionsFor(em, "baja_usuario"); }
      } catch { /* best effort */ }
    }

    // Log de auditoria best-effort
    try {
      await sb.from("audit_log").insert({ table_name: "users", op: "admin.roles.update", row_pk: String(id ?? ""), actor: auth.email, after: patch });
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

    const auth = await requireAdminOrRh(req);
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

    if (auth.role === "rh" && (role === "admin" || role === "Administrador")) return NextResponse.json({ error: "Recursos Humanos no puede crear usuarios Administrador" }, { status: 403 });
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
        await sb.from("audit_log").insert({ table_name: "users", op: "admin.roles.upsert.existing", row_pk: String(existing.data.id ?? ""), actor: auth.email, after: upd });
      } catch { /* ignore */ }
      return NextResponse.json({ ok: true, id: existing.data.id, mode: "updated" });
    }

    // Insert
    const insRow: Record<string, unknown> = { email: emailLower, active: true };
    if (typeof display_name === "string" && display_name.trim()) { insRow.display_name = display_name.trim(); insRow.name = display_name.trim(); }
    if (typeof role === "string") insRow.role = role;
    if (typeof phone === "string") insRow.phone = phone.trim();
    if (permissions !== undefined) insRow.permissions = permissions;
    else if (typeof role === "string") {
      // 10-Oct-2026: sin permisos explicitos, copia los de un usuario activo del mismo rol (plantilla).
      // Evita que un alta nueva quede con {} (que para roles de sistema equivale a acceso total).
      const { data: tpl } = await sb.from("Users").select("permissions").eq("role", role).is("usuario_prueba", null).eq("active", true).not("permissions", "is", null).limit(1).maybeSingle();
      const tp = (tpl as { permissions?: Record<string, unknown> } | null)?.permissions;
      if (tp && Object.keys(tp).length > 0) insRow.permissions = tp;
    }

    const { data, error } = await sb.from("Users").insert(insRow).select("id").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      await sb.from("audit_log").insert({ table_name: "users", op: "admin.roles.create", row_pk: String(data?.id ?? ""), actor: auth.email, after: insRow });
    } catch { /* ignore */ }

    return NextResponse.json({ ok: true, id: data?.id, mode: "created" });
  } catch (err: unknown) {
    log.error("POST /admin/roles falló", { error: err });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
