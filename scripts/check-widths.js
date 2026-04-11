const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function check() {
  // Longitud promedio de nombres de productos
  const { data } = await sb.from("products").select("name, category").limit(100);
  if (data) {
    const avgName = Math.round(data.reduce((s, p) => s + (p.name?.length || 0), 0) / data.length);
    const maxName = Math.max(...data.map(p => p.name?.length || 0));
    const avgCat = Math.round(data.reduce((s, p) => s + (p.category?.length || 0), 0) / data.length);
    console.log("Nombre promedio:", avgName, "chars, max:", maxName);
    console.log("Categoría promedio:", avgCat, "chars");
  }

  // Categorías duplicadas en suppliers
  console.log("\n=== CATEGORÍAS EN SUPPLIERS ===");
  const { data: supps } = await sb.from("suppliers").select("categories");
  if (supps) {
    const allCats = supps.map(s => {
      if (Array.isArray(s.categories)) return s.categories;
      if (typeof s.categories === "string") return [s.categories];
      return [];
    }).flat().filter(Boolean);
    const unique = [...new Set(allCats)].sort();
    console.log("Total únicas:", unique.length);
    unique.forEach(c => console.log("  -", c));
  }
}
check().catch(console.error);
