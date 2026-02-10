const fs = require("fs");

// ===== 1. PRODUCTOS: Agregar boton de nuevo producto =====
let prod = fs.readFileSync("app/dashboard/requisiciones/productos/page.tsx", "utf8");
if (!prod.includes("handleSaveProduct")) {
  // Agregar imports faltantes
  if (!prod.includes("Save,")) {
    prod = prod.replace("Plus, Filter", "Plus, Filter, Save, Edit2, Loader2");
  }
  // Agregar estados para modal
  prod = prod.replace(
    "const scrollRef",
    'const [showAddModal, setShowAddModal] = useState(false);\n  const [savingProd, setSavingProd] = useState(false);\n  const [prodForm, setProdForm] = useState({ sku: "", name: "", description: "", unidad: "PIEZA", category: "", precio_referencia: "" });\n  const scrollRef'
  );
  // Agregar funcion save
  const saveFn = `
  const handleSaveProduct = async () => {
    if (!prodForm.name || !prodForm.sku) return;
    setSavingProd(true);
    await supabase.from("products").insert({
      sku: prodForm.sku,
      name: prodForm.name,
      description: prodForm.description || null,
      unit: prodForm.unidad,
      category: prodForm.category || null,
      reference_price: prodForm.precio_referencia ? parseFloat(prodForm.precio_referencia) : null,
      active: true
    });
    setSavingProd(false);
    setShowAddModal(false);
    setProdForm({ sku: "", name: "", description: "", unidad: "PIEZA", category: "", precio_referencia: "" });
    loadProducts(true);
  };`;
  prod = prod.replace("  const sortedProducts", saveFn + "\n\n  const sortedProducts");
  fs.writeFileSync("app/dashboard/requisiciones/productos/page.tsx", prod);
  console.log("  1. productos: handleSaveProduct agregado");
} else {
  console.log("  1. productos: ya existe");
}

// ===== 2. PROSPECCION: Agregar nuevo proveedor =====
let prosp = fs.readFileSync("app/dashboard/requisiciones/prospeccion/page.tsx", "utf8");
if (!prosp.includes("handleSaveSupplier")) {
  if (!prosp.includes("Save,")) {
    prosp = prosp.replace("Filter } from", "Filter, Save, X, Loader2 } from");
  }
  prosp = prosp.replace(
    "const [filterCategory, setFilterCategory] = useState",
    'const [showAddModal, setShowAddModal] = useState(false);\n  const [savingSupp, setSavingSupp] = useState(false);\n  const [suppForm, setSuppForm] = useState({ name: "", contact_name: "", phone: "", email: "", address: "", category: "", rating: "3" });\n  const [filterCategory, setFilterCategory] = useState'
  );
  const suppFn = `
  const handleSaveSupplier = async () => {
    if (!suppForm.name) return;
    setSavingSupp(true);
    await supabase.from("suppliers").insert({
      name: suppForm.name,
      contact_name: suppForm.contact_name || null,
      phone: suppForm.phone || null,
      email: suppForm.email || null,
      address: suppForm.address || null,
      category: suppForm.category || null,
      rating: parseInt(suppForm.rating) || 3,
      active: true
    });
    setSavingSupp(false);
    setShowAddModal(false);
    setSuppForm({ name: "", contact_name: "", phone: "", email: "", address: "", category: "", rating: "3" });
    loadData();
  };`;
  prosp = prosp.replace("  const filtered", suppFn + "\n\n  const filtered");
  fs.writeFileSync("app/dashboard/requisiciones/prospeccion/page.tsx", prosp);
  console.log("  2. prospeccion: handleSaveSupplier agregado");
} else {
  console.log("  2. prospeccion: ya existe");
}

// ===== 3. COTIZACIONES: Ya tiene busqueda inteligente, agregar registro manual =====
let cot = fs.readFileSync("app/dashboard/requisiciones/cotizaciones/page.tsx", "utf8");
if (!cot.includes("handleSaveQuote")) {
  if (!cot.includes("Save,")) {
    cot = cot.replace("CheckCircle2 } from", "CheckCircle2, Save, X, DollarSign } from");
  }
  cot = cot.replace(
    "const [buscando, setBuscando] = useState",
    'const [showQuoteModal, setShowQuoteModal] = useState(false);\n  const [savingQuote, setSavingQuote] = useState(false);\n  const [quoteForm, setQuoteForm] = useState({ requisicion_id: "", supplier_name: "", total: "", notas: "", vigencia_dias: "15" });\n  const [buscando, setBuscando] = useState'
  );
  const quoteFn = `
  const handleSaveQuote = async () => {
    if (!quoteForm.requisicion_id || !quoteForm.supplier_name || !quoteForm.total) return;
    setSavingQuote(true);
    await supabase.from("cotizaciones").insert({
      requisicion_id: quoteForm.requisicion_id,
      supplier_name: quoteForm.supplier_name,
      total: parseFloat(quoteForm.total),
      notas: quoteForm.notas || null,
      vigencia_dias: parseInt(quoteForm.vigencia_dias) || 15,
      estado: "recibida",
      fecha: new Date().toISOString().split("T")[0]
    });
    setSavingQuote(false);
    setShowQuoteModal(false);
    setQuoteForm({ requisicion_id: "", supplier_name: "", total: "", notas: "", vigencia_dias: "15" });
    loadRequisiciones();
  };`;
  cot = cot.replace("  const getUrgencyColor", quoteFn + "\n\n  const getUrgencyColor");
  fs.writeFileSync("app/dashboard/requisiciones/cotizaciones/page.tsx", cot);
  console.log("  3. cotizaciones: handleSaveQuote agregado");
} else {
  console.log("  3. cotizaciones: ya existe");
}

console.log("\nLote 3 completado.");
