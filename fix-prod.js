const fs = require("fs");
let p = fs.readFileSync("app/dashboard/requisiciones/productos/page.tsx", "utf8");
// Quitar la linea duplicada
p = p.replace("  Plus, Filter, Save, Edit2, Loader2\n", "  Plus, Filter, Save, Edit2\n");
fs.writeFileSync("app/dashboard/requisiciones/productos/page.tsx", p);
console.log("fix applied");
