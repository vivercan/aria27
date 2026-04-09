import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const ADMIN_EMAILS = ["juanviverosv@gmail.com"];

async function requireAdmin(req: NextRequest) {
  const email = (req.headers.get("x-user-email") || "").toLowerCase().trim();
  if (!email) return { ok: false as const, res: NextResponse.json({ error: "x-user-email requerido" }, { status: 401 }) };
  if (ADMIN_EMAILS.includes(email)) return { ok: true as const, email };
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from("Users").select("role").eq("email", email).maybeSingle();
    const role = (data?.role || "").toString();
    if (role === "admin" || role === "Administrador") return { ok: true as const, email };
  } catch {}
  return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { deleted_id } = await req.json();
  if (!deleted_id) return NextResponse.json({ error: "deleted_id requerido" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: del, error: e1 } = await sb.from("deleted_records").select("*").eq("id", deleted_id).maybeSingle();
  if (e1 || !del) return NextResponse.json({ error: e1?.message || "No encontrado" }, { status: 404 });

  const payload = del.data as Record<string, any>;
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Snapshot invalido" }, { status: 400 });

  // Re-insert en la tabla origen
  const { error: e2 } = await sb.from(del.source_table).upsert(payload);
  if (e2) return NextResponse.json({ error: `Error al restaurar: ${e2.message}` }, { status: 500 });

  // Remover del log de borrados (ya restaurado) — se audita automáticamente por trigger
  await sb.from("deleted_records").delete().eq("id", deleted_id);

  return NextResponse.json({ ok: true, restored_to: del.source_table, row_id: del.source_id, by: auth.email });
}
