const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function check() {
  // Ver si la VIEW "Productos" tiene las mismas columnas que "products"
  console.log("=== VIEW Productos vs products ===");
  const { data: v } = await sb.from("Productos").select("*").limit(1);
  const { data: t } = await sb.from("products").select("*").limit(1);
  if (v?.length) console.log("Productos VIEW cols:", Object.keys(v[0]).join(", "));
  if (t?.length) console.log("products TABLE cols:", Object.keys(t[0]).join(", "));

  // Ver si VIEW "Proveedores" existe
  const { data: pv, error: pe } = await sb.from("Proveedores").select("id, name").limit(1);
  console.log("\nProveedores VIEW:", pe?.message || "OK, " + pv?.length + " registros muestra");

  // Probar JOIN product_suppliers con suppliers (para columna proveedores)
  console.log("\n=== TEST JOIN product_suppliers -> suppliers ===");
  const { data: ps, error: pse } = await sb
    .from("product_suppliers")
    .select("product_id, supplier_id, suppliers(id, name)")
    .limit(3);
  console.log("Error:", pse?.message || "ninguno");
  if (ps?.length) ps.forEach(r => console.log(JSON.stringify(r)));

  // Contar categorías en products (tabla base) vs Productos (view)
  const { data: catBase } = await sb.from("products").select("category").not("category", "is", null);
  const { data: catView } = await sb.from("Productos").select("category").not("category", "is", null);
  const uniqueBase = [...new Set((catBase||[]).map(c => c.category))];
  const uniqueView = [...new Set((catView||[]).map(c => c.category))];
  console.log("\nCategorías en products (base):", uniqueBase.length);
  console.log("Categorías en Productos (view):", uniqueView.length);
  
  // Las que están en base pero NO en view
  const diff = uniqueBase.filter(c => !uniqueView.includes(c));
  if (diff.length) {
    console.log("EN BASE PERO NO EN VIEW:", diff);
  }
}
check().catch(console.error);
