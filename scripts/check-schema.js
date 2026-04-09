const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function check() {
  // Get one product to see all columns
  const { data, error } = await sb.from("products").select("*").limit(1);
  if (data && data[0]) {
    console.log("=== COLUMNAS PRODUCTS ===");
    Object.keys(data[0]).forEach(k => console.log(`  ${k}: ${typeof data[0][k]} = ${JSON.stringify(data[0][k])}`));
  }
  if (error) console.log("Error:", error.message);

  // Get one product_suppliers to see link structure
  const { data: ps } = await sb.from("product_suppliers").select("*").limit(1);
  if (ps && ps[0]) {
    console.log("\n=== COLUMNAS PRODUCT_SUPPLIERS ===");
    Object.keys(ps[0]).forEach(k => console.log(`  ${k}: ${typeof ps[0][k]} = ${JSON.stringify(ps[0][k])}`));
  }

  // Get supplier list for dropdown (just id, name)
  const { data: supps, count } = await sb.from("suppliers").select("id, name", { count: "exact" }).order("name").limit(5);
  console.log("\n=== SUPPLIERS (primeros 5 de " + count + ") ===");
  supps?.forEach(s => console.log(`  ${s.id}: ${s.name}`));

  // Check SKU pattern
  const { data: skus } = await sb.from("products").select("sku").order("sku", { ascending: false }).limit(5);
  console.log("\n=== ÚLTIMOS SKUs ===");
  skus?.forEach(s => console.log(`  ${s.sku}`));
}
check().catch(console.error);
