import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

// Whitelist duro de admins. Unica fuente de verdad server-side para este panel.
const ADMIN_EMAILS = ["juanviverosv@gmail.com"];

async function requireAdmin(req: NextRequest): Promise<{ ok: true; email: string } | { ok: false; res: NextResponse }> {
  const email = (req.headers.get("x-user-email") || "").toLowerCase().trim();
  if (!email) {
    return { ok: false, res: NextResponse.json({ error: "x-user-email header requerido" }, { status: 401 }) };
  }

  if (ADMIN_EMAILS.includes(email)) return { ok: true, email };

  // Segundo camino: rol admin confirmado en BD (no desde localStorage).
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from("Users").select("role").eq("email", email).maybeSingle();
    const role = (data?.role || "").toString();
    if (role === "admin" || role === "Administrador") return { ok: true, email };
  } catch {
    // fallthrough al 403
  }

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data || [] });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

  const { id, role, permissions } = body || {};
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const ALLOWED_ROLES = ["admin", "Administrador", "rh", "compras", "almacen", "operador", "residente", "direccion", "user"];
  if (role && !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: `rol invalido: ${role}` }, { status: 400 });
  }
  if (permissions && (typeof permissions !== "object" || Array.isArray(permissions))) {
    return NextResponse.json({ error: "permissions debe ser objeto" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const patch: any = {};
  if (typeof role === "string") patch.role = role;
  if (permissions !== undefined) patch.permissions = permissions;

  const { error } = await sb.from("Users").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
