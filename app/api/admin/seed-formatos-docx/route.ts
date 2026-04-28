import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { ADMIN_EMAILS } from "@/lib/admin-emails";
import { logger } from "@/lib/logger";

const log = logger("SEED-FORMATOS-DOCX");

export async function POST(req: NextRequest) {
  const userEmail = (req.headers.get("x-user-email") || "").toLowerCase().trim();
  if (!ADMIN_EMAILS.includes(userEmail) && userEmail !== "recursos.humanos@gcuavante.com") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { nombre, b64, tipo_archivo = "docx" } = body as { nombre?: string; b64?: string; tipo_archivo?: string };
  if (!nombre || !b64) return NextResponse.json({ error: "nombre y b64 requeridos" }, { status: 400 });

  try {
    const buffer = Buffer.from(b64, "base64");
    const safeName = nombre.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `formatos/${Date.now()}_${safeName}.${tipo_archivo}`;
    const sb = getSupabaseAdmin();
    const { error: upErr } = await sb.storage.from("expedientes").upload(path, buffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });
    if (upErr) return NextResponse.json({ error: "Storage: " + upErr.message }, { status: 500 });
    const url = sb.storage.from("expedientes").getPublicUrl(path).data.publicUrl;

    const { error: updErr } = await sb
      .from("formatos_plantillas")
      .update({ url, tipo_archivo, updated_at: new Date().toISOString() })
      .eq("nombre", nombre);

    if (updErr) {
      log.warn("Storage OK pero update fallo", { nombre, err: updErr.message });
      return NextResponse.json({ url, warning: updErr.message });
    }
    log.info("Formato seed OK", { nombre, url });
    return NextResponse.json({ ok: true, nombre, url, size: buffer.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
