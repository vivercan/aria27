const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const { parse } = require("csv-parse/sync");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedProducts() {
  console.log("Leyendo CSV de artículos...");

  const csvPath = "BaseArticulosavanteservicios.csv";
  if (!fs.existsSync(csvPath)) {
    console.error("No se encontró el archivo " + csvPath + " en el directorio actual");
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, "utf8");

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log("Se leyeron " + records.length + " filas del CSV");

  console.log("Borrando catálogo anterior de products...");
  const { error: delError } = await supabase.from("products").delete().neq("id", 0);
  if (delError) {
    console.error("Error borrando datos de products:", delError);
    process.exit(1);
  }

  console.log("Insertando nuevo catálogo en products...");

  const chunkSize = 500;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize).map((row) => ({
      sku: row["SKU"],
      name: row["Nombre Producto"],
      category: row["Categoria"],
      description: row["Descripcion Corta"] || row["Descripcion Larga"],
      unit: row["Unidad Medida"],
    }));

    const { error } = await supabase.from("products").insert(chunk);
    if (error) {
      console.error("Error insertando chunk " + (i / chunkSize) + ":", error);
      process.exit(1);
    }
    console.log(
      "Chunk " + ((i / chunkSize) + 1) + " insertado (" + chunk.length + " registros)"
    );
  }

  console.log("Catálogo de products cargado correctamente.");
}

async function seedCostCenters() {
  console.log("Actualizando centros de costos (cost_centers)...");

  const costCenters = [
    { code: "OFMAT", name: "Oficina Matriz Aguascalientes" },
    { code: "OBRA-01", name: "Obra Carretera Federal Tramo 1" },
    { code: "OBRA-02", name: "Obra Carretera Federal Tramo 2" },
    { code: "YARDA-AGS", name: "Yarda y Taller Aguascalientes" },
    { code: "ADMIN-GRAL", name: "Gastos Administrativos Generales" },
  ];

  const { error: delError } = await supabase.from("cost_centers").delete().neq("id", 0);
  if (delError) {
    if (delError.code === "42P01") {
      console.warn("La tabla cost_centers no existe. Créala con columnas id, code, name.");
      return;
    }
    console.error("Error borrando cost_centers:", delError);
    process.exit(1);
  }

  const { error: insError } = await supabase.from("cost_centers").insert(costCenters);
  if (insError) {
    console.error("Error insertando cost_centers:", insError);
    process.exit(1);
  }

  console.log("Centros de costos actualizados correctamente.");
}

(async () => {
  try {
    await seedProducts();
    await seedCostCenters();
    console.log("Seed completado.");
  } catch (e) {
    console.error("Error general en seed:", e);
    process.exit(1);
  }
})();
