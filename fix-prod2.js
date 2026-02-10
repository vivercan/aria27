const fs = require("fs");
let p = fs.readFileSync("app/dashboard/requisiciones/productos/page.tsx", "utf8");
// Reemplazar toda la linea 7 que tiene el duplicado
p = p.replace(/Plus, Filter, Save, Edit2, Loader2/g, "Plus, Filter, Save, Edit2");
fs.writeFileSync("app/dashboard/requisiciones/productos/page.tsx", p);
console.log("fix applied - regex");
