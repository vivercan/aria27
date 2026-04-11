import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { watermarkWithDate } from "@/lib/image-watermark";

/**
 * POST /api/inventario/watermark
 * Recibe una imagen (multipart/form-data), le estampa watermark con fecha,
 * la sube a Supabase Storage y devuelve la URL pública.
 *
 * Body: FormData con campos:
 *   - file: archivo de imagen
 *   - bucket: nombre del bucket (default: "inventario")
 *   - path: ruta en el bucket (ej: "OFICINA/productos/12345_cemento.jpg")
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "inventario";
    const path = formData.get("path") as string;

    if (!file || !path) {
      return NextResponse.json(
        { error: "file y path son requeridos" },
        { status: 400 }
      );
    }

    // Leer archivo como buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Aplicar watermark con fecha/hora actual
    const watermarked = await watermarkWithDate(buffer);

    // Subir a Supabase Storage
    const supabase = getSupabaseAdmin();
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, watermarked, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (upErr) {
      return NextResponse.json(
        { error: upErr.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return NextResponse.json({
      url: urlData?.publicUrl || null,
      size: watermarked.length,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: (e as {message?: string})?.message || "error procesando imagen" },
      { status: 500 }
    );
  }
}
