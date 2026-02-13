const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function check() {
  // Leer TODAS las categorías paginando
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
  console.log("TOTAL registros leídos:", allCats.length);
  console.log("CATEGORÍAS REALES:", unique.length);
  unique.forEach(c => console.log("  -", c));
}
check().catch(console.error);
