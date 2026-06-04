/**
 * /api/obras/arquitectos/[id]
 *
 * DELETE -> quita rol Arquitecto al empleado y limpia asignaciones de obras.
 *           No elimina al empleado del catalogo (puede tener otros roles).
 *
 * 03-Jun-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("ARQUITECTOS-API-ID");

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const db = getSupabaseAdmin();
  try {
    await db.from("arquitecto_obras").delete().eq("employee_id", id);
    const { error: upErr } = await db
      .from("employees")
      .update({ position: null, whatsapp_phone: null })
      .eq("id", id);
    if (upErr) throw upErr;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    log.error("DELETE error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}
