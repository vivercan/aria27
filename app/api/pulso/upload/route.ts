import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIdentifier, rateLimitResponse } from "@/lib/rate-limit";
const log = logger("PULSO-UPLOAD");

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];

function sanitize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function POST(req: NextRequest) {
  // RATE LIMIT: 60 requests per minute (STANDARD tier)
  const clientId = getClientIdentifier(req);
  const rl = checkRateLimit(clientId, { key: "pulso:upload", max: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return rateLimitResponse(rl);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const senderEmail = formData.get("sender_email") as string | null;
    const conversacionId = formData.get("conversacion_id") as string | null;

    if (!file || !senderEmail || !conversacionId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Verificar usuario
    const { data: user } = await supabase
      .from("Users")
      .select("email")
      .eq("email", senderEmail)
      .single();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Validar tamaño
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo muy grande (máx 10 MB)" }, { status: 400 });
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Tipo no permitido: ${file.type}` }, { status: 400 });
    }

    // Subir a Storage
    const safeName = sanitize(file.name);
    const ts = Date.now();
    const path = `pulso/${conversacionId}/${ts}_${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      log.error("Upload fallido", { path, error: uploadError.message });
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);

    log.info("Archivo subido OK", { path, size: file.size, sender: senderEmail });

    return NextResponse.json({
      archivo_url: urlData.publicUrl,
      archivo_nombre: file.name,
      path,
    });
  } catch (error: unknown) {
    log.error("Error upload pulso:", error);
    return NextResponse.json({ error: (error as Error)?.message || "Error interno" }, { status: 500 });
  }
}
