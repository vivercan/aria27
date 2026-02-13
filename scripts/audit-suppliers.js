const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function audit() {
  // 1. Estructura de suppliers
  console.log("=== SUPPLIERS (primeros 3) ===");
  const { data: s, error: e1 } = await sb.from("suppliers").select("*").limit(3);
  console.log("Error:", e1?.message || "ninguno");
  if (s?.length) s.forEach(r => console.log(JSON.stringify(r)));
  const { count: sc } = await sb.from("suppliers").select("*", { count: "exact", head: true });
  console.log("Total suppliers:", sc);

  // 2. Estructura de product_suppliers
  console.log("\n=== PRODUCT_SUPPLIERS (primeros 5) ===");
  const { data: ps, error: e2 } = await sb.from("product_suppliers").select("*").limit(5);
  console.log("Error:", e2?.message || "ninguno");
  if (ps?.length) ps.forEach(r => console.log(JSON.stringify(r)));
  const { count: psc } = await sb.from("product_suppliers").select("*", { count: "exact", head: true });
  console.log("Total product_suppliers:", psc);

  // 3. Categorías únicas de productos (para ver duplicados)
  console.log("\n=== CATEGORÍAS ÚNICAS ===");
  const { data: cats } = await sb.from("Productos").select("category").not("category", "is", null);
  if (cats) {
    const unique = [...new Set(cats.map(c => c.category))].sort();
    console.log("Total categorías:", unique.length);
    unique.forEach(c => console.log("  -", c));
  }

  // 4. Products con SKU duplicado
  console.log("\n=== VERIFICAR DUPLICADOS SKU ===");
  const { data: allProds } = await sb.from("products").select("sku, name").order("sku");
  if (allProds) {
    const skuMap = {};
    allProds.forEach(p => {
      if (p.sku) {
        if (!skuMap[p.sku]) skuMap[p.sku] = [];
        skuMap[p.sku].push(p.name);
      }
    });
    const dups = Object.entries(skuMap).filter(([k, v]) => v.length > 1);
    console.log("SKUs duplicados:", dups.length);
    dups.slice(0, 10).forEach(([sku, names]) => console.log("  ", sku, "->", names.join(" | ")));
  }

  // 5. Proveedores page file
  console.log("\n=== SUPPLIER COLUMNS (from first record) ===");
  const { data: s1 } = await sb.from("suppliers").select("*").limit(1);
  if (s1?.length) console.log("Columns:", Object.keys(s1[0]).join(", "));
}
audit().catch(console.error);
