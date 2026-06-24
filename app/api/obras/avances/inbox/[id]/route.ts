/**
 * /api/obras/avances/inbox/[id]
 *
 * PATCH -> aprobar (mueve a bitacora_obra) o rechazar
 *   Body: { action: 'APPROVE' | 'REJECT', confirmed_obra_id?: string,
 *           reporte_fecha?: string (YYYY-MM-DD), realizadas?: string[],
 *           programadas?: string[] }
 *
 * 03-Jun-2026
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";

const log = logger("AVANCES-INBOX-ID");

interface PatchBody {
  action: "APPROVE" | "REJECT";
  confirmed_obra_id?: string;
  reporte_fecha?: string;
  realizadas?: string[];
  programadas?: string[];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const db = getSupabaseAdmin();
  try {
    const body = (await req.json().catch(() => ({}))) as PatchBody;

    const { data: row, error: e0 } = await db
      .from("obra_avances_inbox")
      .select("*")
      .eq("id", id)
      .single();
    if (e0 || !row) {
      return NextResponse.json({ error: "Inbox row no encontrado" }, { status: 404 });
    }
    if (row.status === "APPROVED" || row.status === "REJECTED") {
      return NextResponse.json(
        { error: `Ya esta ${row.status}`, current_status: row.status },
        { status: 409 }
      );
    }

    // FIX 541.1: identidad via cookie session
    const __auth = await requireUser(req);
    const aprobadoPor = (__auth.ok ? __auth.email : null) || "system";

    if (body.action === "REJECT") {
      const { error } = await db
        .from("obra_avances_inbox")
        .update({
          status: "REJECTED",
          approved_by: aprobadoPor,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    if (body.action !== "APPROVE") {
      return NextResponse.json({ error: "action invalida" }, { status: 400 });
    }

    const obraId = body.confirmed_obra_id || row.suggested_obra_id;
    if (!obraId) {
      return NextResponse.json({ error: "Falta confirmed_obra_id" }, { status: 400 });
    }

    const [{ data: obra }, { data: arq }] = await Promise.all([
      db.from("centros_trabajo").select("id, nombre, codigo").eq("id", obraId).maybeSingle(),
      row.arquitecto_id
        ? db.from("employees").select("id, full_name").eq("id", row.arquitecto_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const realizadas: string[] = body.realizadas || row.realizadas || [];
    const programadas: string[] = body.programadas || row.programadas || [];
    const fecha = body.reporte_fecha || row.reporte_fecha || new Date().toISOString().slice(0, 10);

    const actividadesTxt = [
      realizadas.length > 0 ? "REALIZADAS:\n" + realizadas.map((r: string) => `- ${r}`).join("\n") : "",
      programadas.length > 0 ? "\nPROGRAMADAS:\n" + programadas.map((r: string) => `- ${r}`).join("\n") : "",
    ].filter(Boolean).join("\n");

    const { data: bit, error: e1 } = await db
      .from("bitacora_obra")
      .insert({
        obra_id: obra?.id || null,
        obra_nombre: obra?.nombre || "",
        fecha,
        actividades: actividadesTxt || row.raw_message,
        observaciones: `Origen: reporte WhatsApp Arquitecto (${arq?.full_name || row.arquitecto_phone || "desconocido"})`,
        residente_nombre: arq?.full_name || null,
        fotos: row.fotos_storage_paths || [],
      })
      .select("id")
      .single();

    if (e1) throw e1;

    const { error: e2 } = await db
      .from("obra_avances_inbox")
      .update({
        status: "APPROVED",
        confirmed_obra_id: obraId,
        reporte_fecha: fecha,
        realizadas,
        programadas,
        approved_by: aprobadoPor,
        approved_at: new Date().toISOString(),
        obra_avance_id: bit.id,
      })
      .eq("id", id);

    if (e2) throw e2;

    log.info("AVANCE aprobado", { inbox_id: id, bitacora_id: bit.id, obra: obra?.nombre });

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      bitacora_id: bit.id,
      obra_nombre: obra?.nombre,
    });
  } catch (e: unknown) {
    log.error("PATCH error", { e });
    return NextResponse.json(
      { error: (e as { message?: string })?.message || "Error" },
      { status: 500 }
    );
  }
}
