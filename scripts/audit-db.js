const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function check() {
  console.log("--- centros_trabajo ---");
  const { data: ct, error: e1 } = await sb.from("centros_trabajo").select("*").limit(10);
  console.log("Error:", e1?.message || "ninguno");
  console.log("Registros:", ct?.length || 0);
  if (ct?.length) ct.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n--- cost_centers ---");
  const { data: cc, error: e2 } = await sb.from("cost_centers").select("*").limit(10);
  console.log("Error:", e2?.message || "ninguno");
  console.log("Registros:", cc?.length || 0);
  if (cc?.length) cc.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n--- Productos (VIEW) ---");
  const { data: pv, error: e3 } = await sb.from("Productos").select("id, name, unit, category").limit(3);
  console.log("Error:", e3?.message || "ninguno");
  console.log("Registros muestra:", pv?.length || 0);
  if (pv?.length) pv.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n--- products (tabla base) ---");
  const { data: pb, error: e4 } = await sb.from("products").select("id, name, unit, category").limit(3);
  console.log("Error:", e4?.message || "ninguno");
  console.log("Registros muestra:", pb?.length || 0);
  if (pb?.length) pb.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n--- Requisiciones (tabla) ---");
  const { data: rq, error: e5 } = await sb.from("Requisiciones").select("id, folio, status, cost_center_name").limit(5);
  console.log("Error:", e5?.message || "ninguno");
  console.log("Registros:", rq?.length || 0);
  if (rq?.length) rq.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n--- Users ---");
  const { data: us, error: e6 } = await sb.from("Users").select("email, role, active, phone, display_name").limit(10);
  console.log("Error:", e6?.message || "ninguno");
  console.log("Registros:", us?.length || 0);
  if (us?.length) us.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n--- sequences ---");
  const { data: sq, error: e7 } = await sb.from("sequences").select("*");
  console.log("Error:", e7?.message || "ninguno");
  if (sq?.length) sq.forEach(r => console.log(JSON.stringify(r)));

  console.log("\n--- employees (primeros 5) ---");
  const { data: em, error: e8 } = await sb.from("employees").select("employee_number, full_name, status, whatsapp, centro_trabajo_id").limit(5);
  console.log("Error:", e8?.message || "ninguno");
  console.log("Registros:", em?.length || 0);
  if (em?.length) em.forEach(r => console.log(JSON.stringify(r)));
}

check().catch(console.error);
