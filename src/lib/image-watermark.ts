import sharp from "sharp";
import path from "path";

// Ruta a la fuente bundled — funciona en Vercel Lambda donde no hay fonts del sistema
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");

/**
 * Estampa un watermark con fecha/hora en el centro de la imagen.
 * Formato: "09/Abr/2026 18:15 hrs"
 * Texto blanco con sombra negra para visibilidad en cualquier fondo.
 */
export async function watermarkWithDate(
  imageBuffer: Buffer,
  date?: Date
): Promise<Buffer> {
  const now = date || new Date();

  // Formato: DD/Mmm/YYYY HH:MM hrs (zona México CST = UTC-6)
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const mx = new Date(now.getTime() - 6 * 60 * 60 * 1000); // UTC-6
  const dd = String(mx.getUTCDate()).padStart(2, "0");
  const mmm = meses[mx.getUTCMonth()];
  const yyyy = mx.getUTCFullYear();
  const hh = String(mx.getUTCHours()).padStart(2, "0");
  const min = String(mx.getUTCMinutes()).padStart(2, "0");
  const texto = `${dd}/${mmm}/${yyyy} ${hh}:${min} hrs`;

  // Obtener dimensiones de la imagen
  const metadata = await sharp(imageBuffer).metadata();
  const w = metadata.width || 800;
  const h = metadata.height || 600;

  // Tamaño de fuente proporcional (mínimo 20px, máximo 60px)
  const fontSize = Math.max(20, Math.min(60, Math.round(w * 0.04)));

  // Crear texto blanco como imagen con fuente bundled (Roboto-Bold.ttf)
  const textImage = await sharp({
    text: {
      text: `<span foreground="white">${texto}</span>`,
      fontfile: FONT_PATH,
      font: "Roboto",
      rgba: true,
      dpi: Math.round(fontSize * 5),
    },
  })
    .png()
    .toBuffer();

  // Redimensionar texto para que quepa ~60% del ancho de la imagen
  const textMeta = await sharp(textImage).metadata();
  const targetW = Math.round(w * 0.6);
  const scale = targetW / (textMeta.width || targetW);
  const resizedText = await sharp(textImage)
    .resize({ width: targetW })
    .png()
    .toBuffer();
  const resizedMeta = await sharp(resizedText).metadata();
  const tw = resizedMeta.width || targetW;
  const th = resizedMeta.height || 30;

  // Crear sombra negra con misma fuente
  const shadowImage = await sharp({
    text: {
      text: `<span foreground="black">${texto}</span>`,
      fontfile: FONT_PATH,
      font: "Roboto",
      rgba: true,
      dpi: Math.round(fontSize * 5),
    },
  })
    .resize({ width: targetW })
    .png()
    .toBuffer();

  // Posición centrada
  const cx = Math.round((w - tw) / 2);
  const cy = Math.round((h - th) / 2);

  const result = await sharp(imageBuffer)
    .composite([
      // Sombra (desplazada 2px)
      { input: shadowImage, top: cy + 2, left: cx + 2 },
      // Texto blanco encima
      { input: resizedText, top: cy, left: cx },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();

  return result;
}

/**
 * Descarga una imagen de WhatsApp Media API y la devuelve como Buffer.
 * Las URLs de WhatsApp (lookaside.fbsbx.com) requieren Bearer token y expiran rápido.
 */
export async function downloadWhatsAppMedia(
  mediaUrl: string,
  whatsappToken: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${whatsappToken}` },
    });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const mimeType = response.headers.get("content-type") || "image/jpeg";
    return { buffer: Buffer.from(arrayBuffer), mimeType };
  } catch {
    return null;
  }
}

/**
 * Pipeline completo: descarga de WhatsApp → watermark → sube a Supabase Storage.
 * Retorna la URL pública permanente, o null si falla.
 */
export async function processAndUploadPhoto(args: {
  mediaUrl: string;
  whatsappToken: string;
  supabase: any;
  bucket: string;
  storagePath: string;
  date?: Date;
}): Promise<string | null> {
  const { mediaUrl, whatsappToken, supabase, bucket, storagePath, date } = args;

  // 1. Descargar de WhatsApp
  const media = await downloadWhatsAppMedia(mediaUrl, whatsappToken);
  if (!media) return null;

  // 2. Watermark con fecha
  const watermarked = await watermarkWithDate(media.buffer, date);

  // 3. Subir a Supabase Storage
  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, watermarked, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("[watermark] upload error:", error.message);
    return null;
  }

  // 4. Obtener URL pública permanente
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return urlData?.publicUrl || null;
}

/**
 * Watermark para archivos subidos desde web (File → Buffer → watermark → Buffer).
 */
export async function watermarkFileUpload(
  file: ArrayBuffer,
  date?: Date
): Promise<Buffer> {
  return watermarkWithDate(Buffer.from(file), date);
}
