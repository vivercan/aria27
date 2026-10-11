/** POST /api/revisiones/formatos — crear una lista de revisión propia (calidad o seguridad) · 11-Oct-2026 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const nombre = String(b.nombre || "").trim().slice(0, 120);
  const puntos = Array.isArray(b.puntos) ? (b.puntos as unknown[]).map(x => String(x || "").trim().slice(0, 200)).filter(Boolean).slice(0, 60) : [];
  if (!nombre) return NextResponse.json({ error: "Ponle nombre" }, { status: 400 });
  if (puntos.length < 2) return NextResponse.json({ error: "Escribe al menos 2 puntos a revisar" }, { status: 400 });
  const tipo = String(b.tipo || "") === "SEGURIDAD" ? "SEGURIDAD" : "CALIDAD";
  const { data, error } = await getSupabaseAdmin().from("revision_formatos").insert({ nombre, tipo, puntos, descripcion: b.descripcion ? String(b.descripcion).slice(0, 300) : null, creada_por: auth.email.toLowerCase() }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, formato: data });
}
