const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function fix() {
  // Contar requisiciones existentes
  const { count } = await sb.from("Requisiciones").select("*", { count: "exact", head: true });
  console.log("Requisiciones existentes:", count);
  
  // Actualizar secuencia al valor correcto
  const nextVal = count || 5;
  const { error } = await sb.from("sequences").update({ current_value: nextVal }).eq("id", "requisitions");
  if (error) {
    console.log("ERROR actualizando secuencia:", error.message);
  } else {
    console.log("Secuencia actualizada a:", nextVal);
    console.log("Proximo folio sera: REQ-" + String(nextVal + 1).padStart(4, "0") + "-2026");
  }
}
fix().catch(console.error);
