const fs = require("fs");

// ===== 1. POR-PAGAR: Agregar handlePago =====
let pp = fs.readFileSync("app/dashboard/finanzas/por-pagar/page.tsx", "utf8");
if (!pp.includes("handlePago")) {
  // Agregar Loader2 al import
  pp = pp.replace(
    "Calendar } from",
    "Calendar, Loader2 } from"
  );
  // Agregar estado
  pp = pp.replace(
    'const [filter, setFilter] = useState("TODOS");',
    'const [filter, setFilter] = useState("TODOS");\n  const [pagando, setPagando] = useState<string | null>(null);'
  );
  // Agregar funcion antes de return
  const pagoFn = `
  const handlePago = async (id: string, total: number, pagado: number) => {
    const monto = prompt("Monto a registrar como pago:", String(total - pagado));
    if (!monto || isNaN(Number(monto))) return;
    setPagando(id);
    const nuevoPagado = pagado + Number(monto);
    await supabase.from("purchase_orders").update({ monto_pagado: nuevoPagado }).eq("id", id);
    setPagando(null);
    loadData();
  };`;
  pp = pp.replace("  return (", pagoFn + "\n\n  return (");
  fs.writeFileSync("app/dashboard/finanzas/por-pagar/page.tsx", pp);
  console.log("  1. por-pagar: handlePago agregado");
} else {
  console.log("  1. por-pagar: ya existe");
}

// ===== 2. CHECADAS: Agregar registro manual =====
let ch = fs.readFileSync("app/dashboard/talento/checadas/page.tsx", "utf8");
if (!ch.includes("handleManual")) {
  ch = ch.replace(
    "Filter } from",
    "Filter, Plus, Save, X, Loader2 } from"
  );
  ch = ch.replace(
    "const [filtro, setFiltro] = useState",
    'const [showModal, setShowModal] = useState(false);\n  const [saving, setSaving] = useState(false);\n  const [empleadosList, setEmpleadosList] = useState<any[]>([]);\n  const [formManual, setFormManual] = useState({ employee_id: "", fecha: new Date().toISOString().split("T")[0], hora_entrada: "08:00", hora_salida: "17:00" });\n  const [filtro, setFiltro] = useState'
  );
  ch = ch.replace(
    "cargarAsistencias();",
    'cargarAsistencias();\n    supabase.from("Personal").select("id, full_name, employee_number").eq("status", "ACTIVO").order("full_name").then(({ data }) => { if (data) setEmpleadosList(data); });'
  );
  const manualFn = `
  const handleManual = async () => {
    if (!formManual.employee_id) return;
    setSaving(true);
    await supabase.from("asistencias").insert({
      employee_id: formManual.employee_id,
      fecha: formManual.fecha,
      hora_entrada: formManual.hora_entrada,
      hora_salida: formManual.hora_salida,
      tipo_registro: "MANUAL",
      dentro_geocerca_entrada: true
    });
    setSaving(false);
    setShowModal(false);
    setFormManual({ employee_id: "", fecha: new Date().toISOString().split("T")[0], hora_entrada: "08:00", hora_salida: "17:00" });
    cargarAsistencias();
  };`;
  ch = ch.replace("  return (", manualFn + "\n\n  return (");
  fs.writeFileSync("app/dashboard/talento/checadas/page.tsx", ch);
  console.log("  2. checadas: handleManual agregado");
} else {
  console.log("  2. checadas: ya existe");
}

// ===== 3. LEGALES: Agregar edicion =====
let lg = fs.readFileSync("app/dashboard/talento/legales/page.tsx", "utf8");
if (!lg.includes("handleSaveLegal")) {
  lg = lg.replace(
    "Download, User } from",
    "Download, User, Edit2, Save, X, Loader2 } from"
  );
  lg = lg.replace(
    'const [search, setSearch] = useState("");',
    'const [search, setSearch] = useState("");\n  const [editingId, setEditingId] = useState<string | null>(null);\n  const [editForm, setEditForm] = useState({ rfc: "", curp: "", nss: "", tipo_contrato: "" });\n  const [saving, setSaving] = useState(false);'
  );
  const legalFn = `
  const startEdit = (e: any) => {
    setEditingId(e.id);
    setEditForm({ rfc: e.rfc || "", curp: e.curp || "", nss: e.nss || "", tipo_contrato: e.tipo_contrato || "" });
  };
  const handleSaveLegal = async () => {
    if (!editingId) return;
    setSaving(true);
    await supabase.from("Personal").update({
      rfc: editForm.rfc || null,
      curp: editForm.curp || null,
      nss: editForm.nss || null,
      tipo_contrato: editForm.tipo_contrato || null
    }).eq("id", editingId);
    setSaving(false);
    setEditingId(null);
    load();
  };`;
  lg = lg.replace("  return (", legalFn + "\n\n  return (");
  fs.writeFileSync("app/dashboard/talento/legales/page.tsx", lg);
  console.log("  3. legales: handleSaveLegal agregado");
} else {
  console.log("  3. legales: ya existe");
}

console.log("\nLote 2 completado.");
