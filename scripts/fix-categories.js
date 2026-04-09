const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

// Mapeo de categorías duplicadas -> categoría correcta (sin acentos, normalizada)
const fixes = {
  "Acero y productos metálicos": "Acero y productos metalicos",
  "Agregados y materiales": "Agregados y materiales de banco",
  "Concretos asfaltos": "Concretos asfaltos y estabilizantes",
  "Eléctrico": "Material electrico",
  "Electricidad": "Material electrico",
  "Ferretería": "Ferreteria y fijacion",
  "Papelería y oficina": "Papeleria y oficina",
  "Pintura": "Pintura y acabados",
  "Señalización": "Senalizacion y seguridad",
  "Prefabricados": "Materiales de construccion",
  "DIA": "Servicios y rentas",
  "VIAJE": "Servicios y rentas",
};

async function cleanup() {
  let totalFixed = 0;
  
  for (const [oldCat, newCat] of Object.entries(fixes)) {
    // Contar afectados
    const { count } = await sb.from("products").select("*", { count: "exact", head: true }).eq("category", oldCat);
    
    if (count > 0) {
      const { error } = await sb.from("products").update({ category: newCat }).eq("category", oldCat);
      if (error) {
        console.log("ERROR " + oldCat + ": " + error.message);
      } else {
        console.log("OK: " + oldCat + " -> " + newCat + " (" + count + " productos)");
        totalFixed += count;
      }
    } else {
      console.log("SKIP: " + oldCat + " (0 productos)");
    }
  }
  
  console.log("\nTotal productos reclasificados: " + totalFixed);
  
  // Verificar resultado final
  let allCats = [];
  let from = 0;
  while (true) {
    const { data } = await sb.from("products").select("category").range(from, from + 999);
    if (!data || data.length === 0) break;
    allCats = allCats.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  const unique = [...new Set(allCats.map(c => c.category).filter(Boolean))].sort();
  console.log("\n=== CATEGORÍAS FINALES: " + unique.length + " ===");
  unique.forEach(c => console.log("  - " + c));
}

cleanup().catch(console.error);
