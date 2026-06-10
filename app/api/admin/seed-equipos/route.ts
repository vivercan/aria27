import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

interface EquipoSeed {
  alias: string;
  tipo_combustible: "DIESEL" | "MAGNA" | "PREMIUM";
  consumo_estandar_litros: number;
  numero_economico?: string;
  marca?: string;
  modelo?: string;
  obras_nombres: string[]; // nombres de centros_trabajo
}

// Inventario real basado en requisiciones historicas Avante
const EQUIPOS: EquipoSeed[] = [
  // PERIODISTAS
  { alias: "Retroexcavadora CASE", tipo_combustible: "DIESEL", consumo_estandar_litros: 80, marca: "CASE", obras_nombres: ["PERIODISTAS"] },
  { alias: "Retroexcavadora JCB",  tipo_combustible: "DIESEL", consumo_estandar_litros: 80, marca: "JCB",  obras_nombres: ["PERIODISTAS"] },
  { alias: "Camioneta Frontier",   tipo_combustible: "MAGNA",  consumo_estandar_litros: 50, marca: "Nissan", modelo: "Frontier", obras_nombres: ["PERIODISTAS"] },
  { alias: "Bailarinas / Compactador", tipo_combustible: "MAGNA", consumo_estandar_litros: 8, obras_nombres: ["PERIODISTAS"] },
  // OFICINA
  { alias: "Retroexcavadora CAT", tipo_combustible: "DIESEL", consumo_estandar_litros: 80, marca: "Caterpillar", modelo: "416", obras_nombres: ["OFICINA"] },
  { alias: "Camioneta VW Vento",   tipo_combustible: "MAGNA",  consumo_estandar_litros: 45, marca: "Volkswagen", modelo: "Vento", obras_nombres: ["OFICINA"] },
  { alias: "Camioneta Chevrolet LUV", tipo_combustible: "MAGNA", consumo_estandar_litros: 55, marca: "Chevrolet", modelo: "LUV", obras_nombres: ["OFICINA"] },
  { alias: "Camion de Volteo",     tipo_combustible: "DIESEL", consumo_estandar_litros: 100, obras_nombres: ["OFICINA"] },
];

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("k") !== "aria27-debug-2026") {
    return NextResponse.json({ error: "nope" }, { status: 403 });
  }
  const db = getSupabaseAdmin();

  const { data: obras } = await db
    .from("centros_trabajo")
    .select("id, nombre");
  const obraIdByName = new Map(
    (obras || []).map((o: { id: string; nombre: string }) => [o.nombre.toUpperCase(), o.id])
  );

  const resultados: { alias: string; status: string; error?: string; obras_asignadas?: number }[] = [];

  for (const eq of EQUIPOS) {
    try {
      // Insert equipo
      const { data: equipo, error } = await db
        .from("equipo_combustible")
        .insert({
          alias: eq.alias,
          tipo_combustible: eq.tipo_combustible,
          consumo_estandar_litros: eq.consumo_estandar_litros,
          numero_economico: eq.numero_economico || null,
          marca: eq.marca || null,
          modelo: eq.modelo || null,
        })
        .select("id")
        .single();
      if (error || !equipo) {
        resultados.push({ alias: eq.alias, status: "ERROR", error: error?.message });
        continue;
      }
      // Asignar obras
      let asignadas = 0;
      for (const obraNombre of eq.obras_nombres) {
        const obraId = obraIdByName.get(obraNombre.toUpperCase());
        if (obraId) {
          await db.from("equipo_combustible_obras").insert({
            equipo_id: (equipo as { id: string }).id,
            centro_trabajo_id: obraId,
          });
          asignadas++;
        }
      }
      resultados.push({ alias: eq.alias, status: "OK", obras_asignadas: asignadas });
    } catch (e: unknown) {
      resultados.push({ alias: eq.alias, status: "EXCEPTION", error: (e as Error).message });
    }
  }
  return NextResponse.json({ total: EQUIPOS.length, resultados });
}
