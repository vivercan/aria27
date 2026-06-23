// 23-Jun-2026 — Combustibles 2.0
// Webhook Meta WA inbound para combustibles.
// GET = handshake (echo hub.challenge)
// POST = procesa mensaje del operador
//
// Mensajes esperados:
//   Texto "COMB DIESEL 1200 PERIODISTAS RETROEXCAVADORA"
//   + Foto (caption opcional con datos) — la foto es del horometro
//   Texto "FACTURA COMB-2026-0001" + foto factura
//   Texto "AUTORIZAR CONS-2026-0001" (de Fernando)
//   Texto "RECHAZAR CONS-2026-0001 motivo"
//   Quick reply button payload "AUTORIZAR_CONS-..."

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import {
  sendCombSolicitudRecibida,
  sendCombTransferirCompras,
} from "@/lib/wa-comb-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "aria27_verify";

// GET handshake
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge || "ok", { status: 200 });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

interface WAMessage {
  from: string;
  id?: string;
  type: "text" | "image" | "document" | "button" | "interactive";
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  button?: { payload?: string; text?: string };
  interactive?: { button_reply?: { id?: string; title?: string } };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      entry?: Array<{ changes?: Array<{ value?: { messages?: WAMessage[]; metadata?: { phone_number_id?: string } } }> }>;
    };
    const messages: WAMessage[] = body.entry?.[0]?.changes?.[0]?.value?.messages || [];
    const db = getSupabaseAdmin();

    for (const m of messages) {
      const from = (m.from || "").replace(/\D/g, "");
      // Buscar empleado por WA
      const { data: emp } = await db
        .from("employees")
        .select("id, full_name, status")
        .or(`whatsapp.eq.${from.slice(-10)},whatsapp_phone.eq.${from.slice(-10)}`)
        .eq("status", "ACTIVO")
        .limit(1)
        .maybeSingle();

      const empId = emp?.id as string | undefined;
      const empName = (emp?.full_name as string) || from;

      // 1) Quick reply Autorizar / Rechazar (Fernando)
      if (m.type === "interactive" && m.interactive?.button_reply) {
        const title = m.interactive.button_reply.title || "";
        const id = m.interactive.button_reply.id || "";
        const isAutorizar = title.toUpperCase().includes("AUTORIZAR") || id.toUpperCase().includes("AUTORIZAR");
        const isRechazar = title.toUpperCase().includes("RECHAZAR") || id.toUpperCase().includes("RECHAZAR");
        // Buscar el último consolidado ENVIADO_DIRECTOR
        const { data: cons } = await db
          .from("combustible_consolidados")
          .select("id, folio, monto_estimado")
          .eq("status", "ENVIADO_DIRECTOR")
          .order("enviado_director_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cons) {
          if (isAutorizar) {
            await db
              .from("combustible_consolidados")
              .update({ status: "AUTORIZADO", autorizado_at: new Date().toISOString(), autorizado_por: from })
              .eq("id", cons.id);
            await db
              .from("combustible_solicitudes")
              .update({ status: "AUTORIZADA", autorizada_at: new Date().toISOString(), autorizada_por: from })
              .eq("consolidado_id", cons.id);
            // Mandar a Fernando recordatorio de transferir
            await sendCombTransferirCompras(from, cons.folio, Number(cons.monto_estimado || 0).toLocaleString("es-MX"));
          } else if (isRechazar) {
            await db
              .from("combustible_consolidados")
              .update({ status: "RECHAZADO", rechazo_motivo: "rechazado_wa" })
              .eq("id", cons.id);
            await db
              .from("combustible_solicitudes")
              .update({ status: "RECHAZADA", rechazo_motivo: "rechazado_wa" })
              .eq("consolidado_id", cons.id);
          }
        }
        continue;
      }

      // 2) Texto plano
      if (m.type === "text" && m.text?.body) {
        const txt = m.text.body.trim().toUpperCase();
        // "AUTORIZAR CONS-2026-0001" o "RECHAZAR CONS-..."
        const consMatch = txt.match(/CONS-\d{4}-\d{4}/);
        if (consMatch && (txt.startsWith("AUTORIZAR") || txt.startsWith("RECHAZAR"))) {
          const folio = consMatch[0];
          const isAut = txt.startsWith("AUTORIZAR");
          const newStatus = isAut ? "AUTORIZADO" : "RECHAZADO";
          await db
            .from("combustible_consolidados")
            .update({
              status: newStatus,
              autorizado_at: isAut ? new Date().toISOString() : null,
              autorizado_por: isAut ? from : null,
              rechazo_motivo: isAut ? null : "rechazado_wa",
            })
            .eq("folio", folio);
          const { data: cons } = await db.from("combustible_consolidados").select("id, monto_estimado").eq("folio", folio).maybeSingle();
          if (cons) {
            await db
              .from("combustible_solicitudes")
              .update({ status: isAut ? "AUTORIZADA" : "RECHAZADA" })
              .eq("consolidado_id", cons.id);
            if (isAut) await sendCombTransferirCompras(from, folio, Number(cons.monto_estimado || 0).toLocaleString("es-MX"));
          }
          continue;
        }

        // "COMB DIESEL 1200 PERIODISTAS RETROEXCAVADORA"
        const partes = txt.split(/\s+/);
        if (partes[0] === "COMB" && partes.length >= 4 && empId) {
          const tipo = partes[1] || "DIESEL";
          const litros = parseFloat(partes[2]) || 0;
          const obra = partes[3] || "";
          const veh = partes.slice(4).join(" ") || "Sin especificar";
          if (litros > 0) {
            // Buscar obra
            const { data: ct } = await db
              .from("centros_trabajo")
              .select("id, nombre")
              .ilike("nombre", `%${obra}%`)
              .limit(1)
              .maybeSingle();
            // Generar folio
            const { data: seqData } = await db.rpc("increment_sequence", { seq_id: "comb_solicitud" });
            const seqNum = (seqData as number) || 1;
            const folio = `COMB-${new Date().getFullYear()}-${String(seqNum).padStart(4, "0")}`;
            const { data: solic } = await db
              .from("combustible_solicitudes")
              .insert({
                folio,
                solicitante_id: empId,
                solicitante_wa: from,
                solicitante_nombre: empName,
                tipo_combustible: tipo,
                litros,
                vehiculo_libre: veh,
                obra_id: ct?.id || null,
                obra_nombre: (ct?.nombre as string) || obra,
                horometro_foto_url: "PENDIENTE_FOTO",
                status: "SOLICITADA",
              })
              .select("folio")
              .single();
            if (solic) {
              await sendCombSolicitudRecibida(from, folio, tipo, String(litros), veh, (ct?.nombre as string) || obra);
            }
          }
        }
        continue;
      }

      // 3) Imagen sin texto especifico — asumir foto odometro de ultima solicitud SOLICITADA
      if (m.type === "image" && m.image?.id && empId) {
        // Buscar ultima solicitud del operador en SOLICITADA con foto PENDIENTE
        const { data: last } = await db
          .from("combustible_solicitudes")
          .select("id, folio")
          .eq("solicitante_id", empId)
          .eq("horometro_foto_url", "PENDIENTE_FOTO")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (last) {
          // Descargar media de Meta y subir a storage
          // Por ahora marcar como recibida con el media id como placeholder
          await db
            .from("combustible_solicitudes")
            .update({ horometro_foto_url: `wa_media://${m.image.id}` })
            .eq("id", last.id);
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
