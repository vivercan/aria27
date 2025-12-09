const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", url || "(vacía)");
if (!url || !key) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  try {
    console.log("=== Test cost_centers ===");
    let { data, error } = await supabase
      .from("cost_centers")
      .select("id, code, name")
      .limit(5);

    console.log("error cost_centers:", error || null);
    console.log("data cost_centers:", data || []);

    console.log("=== Test products ===");
    ({ data, error } = await supabase
      .from("products")
      .select("id, name, unit, category, description")
      .limit(5));

    console.log("error products:", error || null);
    console.log("data products:", data || []);
  } catch (e) {
    console.error("❌ Fallo general hablando con Supabase:", e);
  }
}

run();
