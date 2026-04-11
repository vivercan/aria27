const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function exportProducts() {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await sb
      .from("Productos")
      .select("id, sku, name, description, unit, category")
      .order("category")
      .order("name")
      .range(from, from + pageSize - 1);
    
    if (error) { console.error("Error:", error.message); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Total productos: ${all.length}`);

  // Generar CSV compatible con Excel (con BOM para acentos)
  const BOM = '\uFEFF';
  const header = "ID,SKU,NOMBRE,DESCRIPCION,UNIDAD,CATEGORIA";
  const rows = all.map(p => {
    const esc = (v) => `"${(v || '').toString().replace(/"/g, '""')}"`;
    return [p.id, esc(p.sku), esc(p.name), esc(p.description), esc(p.unit), esc(p.category)].join(",");
  });

  const csv = BOM + header + "\n" + rows.join("\n");
  require("fs").writeFileSync("catalogo_productos_aria27.csv", csv, "utf8");
  console.log("Archivo creado: catalogo_productos_aria27.csv");
  console.log("Abrelo con Excel (doble clic)");
}

exportProducts().catch(console.error);
