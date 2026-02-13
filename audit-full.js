const fs = require("fs");
const path = require("path");

const issues = [];
const warnings = [];
const stats = { pages: 0, buttons: 0, links: 0, supabase: 0, modals: 0 };

function scanDir(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && item !== "node_modules" && item !== ".next" && item !== ".git") {
      results.push(...scanDir(full));
    } else if (item === "page.tsx") {
      results.push(full);
    }
  }
  return results;
}

// 1. Get all pages
const pages = scanDir("app/dashboard");
const pageRoutes = pages.map(p => "/" + p.replace(/\\/g, "/").replace("app/", "").replace("/page.tsx", ""));
stats.pages = pages.length;

console.log("=== AUDIT ARIA27 - " + pages.length + " PAGINAS ===\n");

// 2. Check each page
for (const pagePath of pages) {
  const content = fs.readFileSync(pagePath, "utf8");
  const route = "/" + pagePath.replace(/\\/g, "/").replace("app/", "").replace("/page.tsx", "");
  const shortPath = pagePath.replace(/\\/g, "/").replace("app/dashboard/", "");
  
  // Check for href links
  const hrefMatches = content.match(/href=["'`]([^"'`]+)["'`]/g) || [];
  const hrefs = hrefMatches.map(h => h.match(/href=["'`]([^"'`]+)["'`]/)[1]);
  
  for (const href of hrefs) {
    stats.links++;
    if (href.startsWith("/dashboard/")) {
      const target = href.split("?")[0];
      if (!pageRoutes.includes(target) && !pageRoutes.some(r => r.startsWith(target + "/"))) {
        issues.push(`ENLACE ROTO: ${shortPath} → ${href} (pagina NO existe)`);
      }
    }
  }
  
  // Check for onClick handlers that reference undefined functions
  const onClickMatches = content.match(/onClick=\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || [];
  for (const oc of onClickMatches) {
    const fnName = oc.match(/onClick=\{([a-zA-Z_][a-zA-Z0-9_]*)\}/)[1];
    stats.buttons++;
    // Check if function is defined
    if (!content.includes(`const ${fnName}`) && !content.includes(`function ${fnName}`) && !content.includes(`async function ${fnName}`)) {
      // Check common patterns
      if (!["setSearch", "setFilter", "setTab", "setEditando", "setShowModal", "setModalOpen", "router.push", "router.back"].some(p => fnName.startsWith("set") || content.includes(`const ${fnName}`))) {
        issues.push(`BOTON SIN FUNCION: ${shortPath} → onClick={${fnName}} (no definido)`);
      }
    }
  }
  
  // Check for onClick with arrow functions that have empty bodies or console.log only
  const arrowClicks = content.match(/onClick=\{[^}]*=>\s*\{[^}]*\}\}/g) || [];
  for (const ac of arrowClicks) {
    if (ac.includes("console.log") && !ac.includes("await") && !ac.includes("fetch") && !ac.includes("supabase") && !ac.includes("set")) {
      warnings.push(`BOTON SOLO LOG: ${shortPath} → ${ac.substring(0, 60)}...`);
    }
  }
  
  // Check for alert("TODO") or placeholder content
  if (content.includes('alert("TODO')  || content.includes("alert('TODO")) {
    issues.push(`PLACEHOLDER: ${shortPath} → alert("TODO") encontrado`);
  }
  if (content.includes("Próximamente") || content.includes("Proximamente") || content.includes("Coming soon")) {
    warnings.push(`PLACEHOLDER TEXT: ${shortPath} → contiene "Próximamente/Coming soon"`);
  }
  
  // Check Supabase table references
  const fromMatches = content.match(/\.from\(["']([^"']+)["']\)/g) || [];
  for (const fm of fromMatches) {
    stats.supabase++;
    const table = fm.match(/\.from\(["']([^"']+)["']\)/)[1];
    // Known valid tables
    const validTables = ["users","employees","products","suppliers","cost_centers","requisitions","purchase_orders",
      "sequences","centros_trabajo","asistencias","configuracion_nomina","nominas","prestamos","prestamos_pagos",
      "incapacidades","incidencias","solicitudes_vacaciones","vacaciones_empleados","quotations","activos",
      "activos_asignaciones","activos_mantenimiento","Personal","Productos","Proveedores","bancos_empresa",
      "cuentas_bancarias","facturas","gastos_obra","contratos","licitaciones","presupuestos","expedientes_obra",
      "inventario_obra","siroc_registros","plantillas","alertas","recordatorios","configuracion_general"];
    if (!validTables.includes(table)) {
      warnings.push(`TABLA DESCONOCIDA: ${shortPath} → .from("${table}")`);
    }
  }
  
  // Check for modals
  if (content.includes("showModal") || content.includes("modalOpen") || content.includes("isOpen")) {
    stats.modals++;
    // Check if modal JSX exists
    if (!content.includes("fixed inset-0") && !content.includes("fixed top-0") && !content.includes("z-50") && !content.includes("modal")) {
      warnings.push(`MODAL SIN JSX: ${shortPath} → tiene estado modal pero no parece tener el JSX del modal`);
    }
  }
  
  // Check for empty/stub handlers
  const handlers = content.match(/const handle[A-Z]\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g) || [];
  for (const h of handlers) {
    const name = h.match(/const (handle\w+)/)[1];
    // Find the function body (rough check)
    const idx = content.indexOf(h);
    const bodyStart = content.indexOf("{", idx + h.indexOf("=>"));
    let braceCount = 1;
    let bodyEnd = bodyStart + 1;
    while (braceCount > 0 && bodyEnd < content.length) {
      if (content[bodyEnd] === "{") braceCount++;
      if (content[bodyEnd] === "}") braceCount--;
      bodyEnd++;
    }
    const body = content.substring(bodyStart, bodyEnd);
    if (body.length < 20 || (body.includes("console.log") && !body.includes("supabase") && !body.includes("fetch") && !body.includes("set") && body.length < 80)) {
      warnings.push(`HANDLER VACIO: ${shortPath} → ${name}() (solo ${body.length} chars)`);
    }
  }

  // Check for "use client" in client components
  if ((content.includes("useState") || content.includes("useEffect")) && !content.includes('"use client"') && !content.includes("'use client'")) {
    issues.push(`FALTA "use client": ${shortPath} → usa hooks pero no tiene "use client"`);
  }
}

// 3. Check sidebar links vs actual pages
const sidebarPath = "components/dashboard/Sidebar.tsx";
if (fs.existsSync(sidebarPath)) {
  const sidebar = fs.readFileSync(sidebarPath, "utf8");
  const sidebarHrefs = (sidebar.match(/href:\s*["']([^"']+)["']/g) || [])
    .map(h => h.match(/href:\s*["']([^"']+)["']/)[1]);
  
  console.log("--- SIDEBAR LINKS VS PAGINAS ---");
  for (const href of sidebarHrefs) {
    const exists = pageRoutes.includes(href.replace("/dashboard", "dashboard"));
    const status = exists ? "✅" : "❌";
    if (!exists) {
      issues.push(`SIDEBAR LINK ROTO: ${href} → pagina NO existe`);
    }
  }
}

// 4. Print results
console.log("\n========== ESTADISTICAS ==========");
console.log("Paginas: " + stats.pages);
console.log("Links internos: " + stats.links);
console.log("Botones onClick: " + stats.buttons);
console.log("Consultas Supabase: " + stats.supabase);
console.log("Paginas con modales: " + stats.modals);

if (issues.length > 0) {
  console.log("\n🔴 PROBLEMAS CRITICOS (" + issues.length + "):");
  issues.forEach(i => console.log("  " + i));
}

if (warnings.length > 0) {
  console.log("\n🟡 ADVERTENCIAS (" + warnings.length + "):");
  warnings.forEach(w => console.log("  " + w));
}

if (issues.length === 0 && warnings.length === 0) {
  console.log("\n✅ TODO LIMPIO - 0 problemas encontrados");
}

console.log("\n========== FIN AUDIT ==========");
