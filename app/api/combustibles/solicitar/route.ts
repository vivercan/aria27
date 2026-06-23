// 23-Jun-2026 — Combustibles 2.0 F3
// POST /api/combustibles/solicitar
// Crea una solicitud de combustible. Llamable desde UI (con x-user-email) o
// desde webhook WA (con secret interno).
//
// Body:
//   {
//     solicitante_id?: uuid,   // si NO viene, se resuelve por solicitante_wa
//     solicitante_wa?: string, // teléfono WA del operador
//     tipo_combustible: "GASOLINA"|"DIESEL"|"PREMIUM"|"MAGNA"|"GAS LP",
//     litros: number,
//     equipo_id?: bigint,
//     vehiculo_libre?: string,
//     obra_id?: uuid,
//     horometro_lectura?: number,
//     horometro_foto_url: string
//   }

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

interface Body {
  solicitante_id?: string;
  solicitante_wa?: string;
  tipo_combustible: string;
  litros: number;
  equipo_id?: number | null;
  vehiculo_libre?: string;
  obra_id?: string;
  horometro_lectura?: number;
  horometro_foto_url: string;
  origen?: "UI" | "WA";
}

const VALID_TIPOS = new Set(["GASOLINA", "DIESEL", "PREMIUM", "MAGNA", "GAS LP"]);

export async function POST(req: NextRequest) {
  // Auth: requireUser para UI; webhook interno usa secret separado
  const wawebhookSecret = req.headers.get("x-wa-webhook-secret");
  const isInternalWa = wawebhookSecret && wawebhookSecret === (process.env.WA_WEBHOOK_INTERNAL_SECRET || "");
  if (!isInternalWa) {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.res;
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido" }, { status: 400 });
  }

  // Validaciones
  if (!body.tipo_combustible || !VALID_TIPOS.has(body.tipo_combustible.toUpperCase())) {
    return NextResponse.json({ ok: false, error: "tipo_combustible invalido" }, { status: 400 });
  }
  if (!body.litros || body.litros <= 0) {
    return NextResponse.json({ ok: false, error: "litros debe ser > 0" }, { status: 400 });
  }
  if (!body.horometro_foto_url) {
    return NextResponse.json({ ok: false, error: "horometro_foto_url requerida" }, { status: 400 });
  }
  if (!body.equipo_id && !body.vehiculo_libre) {
    return NextResponse.json(
      { ok: false, error: "equipo_id o vehiculo_libre requerido" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  // Resolver solicitante (desde id o desde wa)
  let solicitante_id: string | null = body.solicitante_id || null;
  let solicitante_nombre: string | null = null;
  if (!solicitante_id && body.solicitante_wa) {
    const wa = body.solicitante_wa.replace(/\D/g, "").slice(-10);
    const { data: emp } = await db
      .from("employees")
      .select("id, full_name")
      .or(`whatsapp.eq.${wa},whatsapp_phone.eq.${wa}`)
      .eq("status", "ACTIVO")
      .limit(1)
      .maybeSingle();
    if (emp) {
      solicitante_id = emp.id as string;
      solicitante_nombre = emp.full_name as string;
    }
  } else if (solicitante_id) {
    const { data: emp } = await db
      .from("employees")
      .select("full_name")
      .eq("id", solicitante_id)
      .maybeSingle();
    solicitante_nombre = (emp?.full_name as string) || null;
  }

  // Resolver obra
  let obra_nombre: string | null = null;
  if (body.obra_id) {
    const { data: ct } = await db
      .from("centros_trabajo")
      .select("nombre")
      .eq("id", body.obra_id)
      .maybeSingle();
    obra_nombre = (ct?.nombre as string) || null;
  }

  // Generar folio COMB-YYYY-NNNN
  const { data: seqData } = await db.rpc("increment_sequence", { seq_id: "comb_solicitud" });
  const seqNum = (seqData as number) || 1;
  const year = new Date().getFullYear();
  const folio = `COMB-${year}-${String(seqNum).padStart(4, "0")}`;

  // INSERT
  const { data: solic, error } = await db
    .from("combustible_solicitudes")
    .insert({
      folio,
      solicitante_id,
      solicitante_wa: body.solicitante_wa || "",
      solicitante_nombre,
      tipo_combustible: body.tipo_combustible.toUpperCase(),
      litros: body.litros,
      equipo_id: body.equipo_id || null,
      vehiculo_libre: body.vehiculo_libre || null,
      obra_id: body.obra_id || null,
      obra_nombre,
      horometro_lectura: body.horometro_lectura || null,
      horometro_foto_url: body.horometro_foto_url,
      status: "SOLICITADA",
    })
    .select("id, folio, status, litros, tipo_combustible, obra_nombre, solicitante_nombre")
    .single();

  if (error) {
    console.error("[combustibles/solicitar] insert error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Si es vehículo libre (no del catálogo), encolar normalización
  if (body.vehiculo_libre && !body.equipo_id) {
    await db
      .from("vehiculo_normalizacion_pendiente")
      .insert({
        texto_libre: body.vehiculo_libre,
        primera_solicitud_id: solic.id,
        status: "PENDIENTE",
      })
      .then(({ error: e }) => {
        if (e) console.error("[combustibles/solicitar] normalizacion insert:", e);
      });
  }

  return NextResponse.json({ ok: true, solicitud: solic });
}
