// 19-Jun-2026 — FIX P0 RECURRENTE Jessica catalogo:
// El "Agregar manual" en Nueva Requisicion solo agregaba a la requi en memoria,
// nunca al catalogo permanente. Por eso cada nueva requi tenia que recapturar
// los mismos conceptos. Este endpoint los registra en `products` para que
// aparezcan en futuras busquedas.

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { name, unit, category } = await req.json();
    const cleanName = String(name || "").trim();
    if (!cleanName) {
      return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
    }
    const cleanUnit = String(unit || "PZA").trim().toUpperCase();
    const cleanCat = String(category || "OTROS").trim().toUpperCase();

    const supabase = getSupabaseAdmin();
    // Buscar duplicado case-insensitive (anti-dups)
    const { data: existing, error: searchErr } = await supabase
      .from("products")
      .select("id, name, unit, category")
      .ilike("name", cleanName)
      .limit(1)
      .maybeSingle();
    if (searchErr) {
      console.error("[productos/upsert-manual] search error:", searchErr);
    }
    if (existing) {
      // Ya existe -- devolverlo (no duplicar)
      return NextResponse.json({
        ok: true,
        product: existing,
        created: false,
        message: "Ya existia en catalogo",
      });
    }

    // INSERT nuevo
    const { data: inserted, error: insErr } = await supabase
      .from("products")
      .insert({
        name: cleanName,
        unit: cleanUnit,
        category: cleanCat,
        type: "MANUAL",
        created_at: new Date().toISOString(),
      })
      .select("id, name, unit, category")
      .single();
    if (insErr) {
      console.error("[productos/upsert-manual] insert error:", insErr);
      return NextResponse.json(
        { ok: false, error: insErr.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      ok: true,
      product: inserted,
      created: true,
      message: "Agregado al catalogo permanente",
    });
  } catch (e) {
    const msg = (e as { message?: string })?.message || "unknown";
    console.error("[productos/upsert-manual] exception:", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
