import sharp from "sharp";

// ============================================================
// Bitmap Font 5×7 — renderiza texto como pixeles puros.
// Sin dependencia de fuentes del sistema. Funciona en cualquier Lambda.
// ============================================================
const CHAR_W = 5;
const CHAR_H = 7;
const CHARS: Record<string, number[]> = {
  "0": [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
  "1": [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  "2": [0x0E,0x11,0x01,0x06,0x08,0x10,0x1F],
  "3": [0x0E,0x11,0x01,0x06,0x01,0x11,0x0E],
  "4": [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
  "5": [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  "6": [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
  "7": [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  "8": [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
  "9": [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  "/": [0x01,0x02,0x02,0x04,0x08,0x08,0x10],
  ":": [0x00,0x04,0x04,0x00,0x04,0x04,0x00],
  " ": [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
  "A": [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],
  "a": [0x00,0x00,0x0E,0x01,0x0F,0x11,0x0F],
  "b": [0x10,0x10,0x1E,0x11,0x11,0x11,0x1E],
  "r": [0x00,0x00,0x16,0x19,0x10,0x10,0x10],
  "E": [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
  "e": [0x00,0x00,0x0E,0x11,0x1F,0x10,0x0E],
  "F": [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  "M": [0x11,0x1B,0x15,0x15,0x11,0x11,0x11],
  "J": [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
  "S": [0x0E,0x11,0x10,0x0E,0x01,0x11,0x0E],
  "O": [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
  "N": [0x11,0x19,0x15,0x13,0x11,0x11,0x11],
  "D": [0x1C,0x12,0x11,0x11,0x11,0x12,0x1C],
  "n": [0x00,0x00,0x16,0x19,0x11,0x11,0x11],
  "o": [0x00,0x00,0x0E,0x11,0x11,0x11,0x0E],
  "v": [0x00,0x00,0x11,0x11,0x11,0x0A,0x04],
  "g": [0x00,0x00,0x0F,0x11,0x0F,0x01,0x0E],
  "u": [0x00,0x00,0x11,0x11,0x11,0x13,0x0D],
  "l": [0x0C,0x04,0x04,0x04,0x04,0x04,0x0E],
  "i": [0x04,0x00,0x0C,0x04,0x04,0x04,0x0E],
  "c": [0x00,0x00,0x0E,0x11,0x10,0x11,0x0E],
  "t": [0x08,0x08,0x1C,0x08,0x08,0x09,0x06],
  "s": [0x00,0x00,0x0F,0x10,0x0E,0x01,0x1E],
  "p": [0x00,0x00,0x1E,0x11,0x1E,0x10,0x10],
  "h": [0x10,0x10,0x16,0x19,0x11,0x11,0x11],
  "j": [0x02,0x00,0x06,0x02,0x02,0x12,0x0C],
  "d": [0x01,0x01,0x0F,0x11,0x11,0x11,0x0F],
  "m": [0x00,0x00,0x1A,0x15,0x15,0x15,0x15],
  "y": [0x00,0x00,0x11,0x11,0x0F,0x01,0x0E],
  "k": [0x10,0x10,0x12,0x14,0x18,0x14,0x12],
  "w": [0x00,0x00,0x11,0x11,0x15,0x15,0x0A],
  "x": [0x00,0x00,0x11,0x0A,0x04,0x0A,0x11],
  "z": [0x00,0x00,0x1F,0x02,0x04,0x08,0x1F],
};

/**
 * Renderiza texto como imagen RGBA usando bitmap font 5×7.
 * Escala: cada pixel lógico se agranda 'scale' veces.
 */
function renderText(text: string, scale: number, r: number, g: number, b: number, a: number): { data: Buffer; width: number; height: number } {
  const gap = 1; // 1px gap entre caracteres
  const totalW = text.length * (CHAR_W + gap) - gap;
  const totalH = CHAR_H;
  const outW = totalW * scale;
  const outH = totalH * scale;
  const buf = Buffer.alloc(outW * outH * 4); // RGBA

  for (let ci = 0; ci < text.length; ci++) {
    const ch = text[ci];
    const bitmap = CHARS[ch] || CHARS[" "];
    const xOff = ci * (CHAR_W + gap);
    for (let row = 0; row < CHAR_H; row++) {
      const bits = bitmap[row];
      for (let col = 0; col < CHAR_W; col++) {
        if (bits & (1 << (CHAR_W - 1 - col))) {
          // Pixel activo — pintar bloque scale×scale
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = (xOff + col) * scale + sx;
              const py = row * scale + sy;
              const idx = (py * outW + px) * 4;
              buf[idx] = r;
              buf[idx + 1] = g;
              buf[idx + 2] = b;
              buf[idx + 3] = a;
            }
          }
        }
      }
    }
  }
  return { data: buf, width: outW, height: outH };
}

/**
 * Estampa un watermark con fecha/hora en el centro de la imagen.
 * Formato: "09/Abr/2026 18:15 hrs"
 * Texto blanco con sombra negra, renderizado pixel a pixel.
 */
export async function watermarkWithDate(
  imageBuffer: Buffer,
  date?: Date
): Promise<Buffer> {
  const now = date || new Date();

  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const mx = new Date(now.getTime() - 6 * 60 * 60 * 1000); // UTC-6
  const dd = String(mx.getUTCDate()).padStart(2, "0");
  const mmm = meses[mx.getUTCMonth()];
  const yyyy = mx.getUTCFullYear();
  const hh = String(mx.getUTCHours()).padStart(2, "0");
  const min = String(mx.getUTCMinutes()).padStart(2, "0");
  const texto = `${dd}/${mmm}/${yyyy} ${hh}:${min} hrs`;

  const metadata = await sharp(imageBuffer).metadata();
  const w = metadata.width || 800;
  const h = metadata.height || 600;

  // Escala: cada pixel del bitmap font se agranda para que el texto ocupe ~40% del ancho
  const textLogicalW = texto.length * (CHAR_W + 1) - 1;
  const targetW = Math.round(w * 0.4);
  const scale = Math.max(2, Math.round(targetW / textLogicalW));

  // Renderizar sombra negra
  const shadow = renderText(texto, scale, 0, 0, 0, 180);
  const shadowPng = await sharp(shadow.data, { raw: { width: shadow.width, height: shadow.height, channels: 4 } }).png().toBuffer();

  // Renderizar texto blanco
  const text = renderText(texto, scale, 255, 255, 255, 220);
  const textPng = await sharp(text.data, { raw: { width: text.width, height: text.height, channels: 4 } }).png().toBuffer();

  // Posición centrada
  const cx = Math.round((w - text.width) / 2);
  const cy = Math.round((h - text.height) / 2);

  const result = await sharp(imageBuffer)
    .composite([
      { input: shadowPng, top: cy + 2, left: cx + 2 },
      { input: textPng, top: cy, left: cx },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();

  return result;
}

/**
 * Descarga una imagen de WhatsApp Media API.
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
 * Pipeline: descarga WhatsApp → watermark → Supabase Storage.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processAndUploadPhoto(args: {
  mediaUrl: string;
  whatsappToken: string;
  supabase: any;
  bucket: string;
  storagePath: string;
  date?: Date;
}): Promise<string | null> {
  const { mediaUrl, whatsappToken, supabase, bucket, storagePath, date } = args;

  const media = await downloadWhatsAppMedia(mediaUrl, whatsappToken);
  if (!media) return null;

  const watermarked = await watermarkWithDate(media.buffer, date);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, watermarked, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    return null;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return urlData?.publicUrl || null;
}
