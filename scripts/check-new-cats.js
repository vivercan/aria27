const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function check() {
  // Buscar los productos nuevos en tabla base
  console.log("=== NUEVOS EN products (tabla base) ===");
  const { data: base, count: bc } = await sb.from("products").select("id, sku, name, category", { count: "exact" }).eq("category", "Salud e higiene");
  console.log("Salud e higiene en BASE:", bc);
  if (base?.length) console.log("Ejemplo:", JSON.stringify(base[0]));

  // Buscar en VIEW
  const { data: view, count: vc } = await sb.from("Productos").select("id, sku, name, category", { count: "exact" }).eq("category", "Salud e higiene");
  console.log("Salud e higiene en VIEW:", vc);

  // Total en base vs view
  const { count: totalBase } = await sb.from("products").select("*", { count: "exact", head: true });
  const { count: totalView } = await sb.from("Productos").select("*", { count: "exact", head: true });
  console.log("\nTotal products (base):", totalBase);
  console.log("Total Productos (view):", totalView);

  // Todas las categorías en BASE
  console.log("\n=== TODAS las categorías en BASE ===");
  const { data: allCats } = await sb.from("products").select("category");
  const unique = [...new Set((allCats||[]).map(c => c.category).filter(Boolean))].sort();
  console.log("Total:", unique.length);
  unique.forEach(c => console.log("  -", c));
}
check().catch(console.error);
