import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { validateApiUser } from "@/lib/auth-api";

// Whitelist duro de admins. Unica fuente de verdad server-side para este panel.
const ADMIN_EMAILS = [(process.env.ADMIN_EMAIL || "juanviverosv@gmail.com")];

async function requireAdmin(req: NextRequest): Promise<{ ok: true; email: string } | { ok: false; res: NextResponse }> {
  const email = (req.headers.get("x-user-email") || "").toLowerCase().trim();
  if (!email) {
    return { ok: false, res: NextResponse.json({ error: "x-user-email header requerido" }, { status: 401 }) };
  }

  // Validar que el usuario existe en BD
  const user = await validateApiUser(email);
  if (!user) {
    return { ok: false, res: NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 }) };
  }

  // Verificar permisos de admin
  if (ADMIN_EMAILS.includes(email)) return { ok: true, email };

  // Segundo camino: rol admin confirmado en BD
  if (user.role === "admin" || user.role === "Administrador") return { ok: true, email };

  return { ok: false, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("Users")
    .select("id,email,display_name,role,permissions")
    .order("email", { ascending: true });
  if (error) return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });
  return NextResponse.json({ users: data || [] });
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
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  let body: RolePatchBody;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

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
  if (error) return NextResponse.json({ error: (error as {message?: string})?.message || "Unknown error" }, { status: 500 });

  // Log de auditoria best-effort (no rompe si la tabla no existe).
  try {
    await sb.from("audit_log").insert({
      actor_email: auth.email,
      action: "admin.roles.update",
      target_id: id,
      payload: patch,
    });
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true });
}
