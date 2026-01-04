const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://yhylkvpynzyorqortbkk.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo"
);

async function audit() {
  console.log("=== AUDITORÍA COMPLETA ===\n");

  // 1. EMPLEADOS
  console.log("1. EMPLEADOS:");
  const { data: emps, error: empErr } = await supabase
    .from("employees")
    .select("*")
    .order("employee_number");

  if (empErr) {
    console.log("   ERROR:", empErr.message);
  } else {
    console.log("   Total:", emps.length);
    console.log("   Columnas:", Object.keys(emps[0] || {}).join(", "));
    console.log("\n   DETALLE SALARIOS:");
    emps.forEach(e => {
      console.log(`   ${e.employee_number} | ${e.full_name?.substring(0,25).padEnd(25)} | semanal: ${String(e.salario_semanal || '-').padStart(6)} | diario: ${String(e.salario_diario || '-').padStart(6)} | tarjeta: ${String(e.minimo_tarjeta || '-').padStart(6)} | status: ${e.status}`);
    });
  }

  // 2. CENTROS
  console.log("\n\n2. CENTROS DE TRABAJO:");
  const { data: centros, error: centErr } = await supabase
    .from("centros_trabajo")
    .select("*");

  if (centErr) {
    console.log("   ERROR:", centErr.message);
  } else {
    console.log("   Total:", centros?.length || 0);
    centros?.forEach(c => {
      console.log(`   ${c.id} | ${c.codigo} | ${c.nombre}`);
    });
  }

  // 3. ASISTENCIAS
  console.log("\n\n3. ASISTENCIAS:");
  const { data: asist, count } = await supabase
    .from("asistencias")
    .select("*", { count: "exact" })
    .limit(5);

  console.log("   Total registros:", count);
  if (asist?.length > 0) {
    console.log("   Columnas:", Object.keys(asist[0]).join(", "));
    console.log("   Fechas encontradas:");
    const { data: fechas } = await supabase
      .from("asistencias")
      .select("fecha")
      .order("fecha", { ascending: false })
      .limit(20);
    const uniqueFechas = [...new Set(fechas?.map(f => f.fecha))];
    console.log("  ", uniqueFechas.join(", "));
  }
}

audit();
