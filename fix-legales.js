const fs = require("fs");
let lg = fs.readFileSync("app/dashboard/talento/legales/page.tsx", "utf8");

// Reemplazar load() por window.location.reload() ya que load esta dentro de useEffect
lg = lg.replace(
  "setEditingId(null);\n    load();",
  "setEditingId(null);\n    window.location.reload();"
);

fs.writeFileSync("app/dashboard/talento/legales/page.tsx", lg);
console.log("legales fix applied");
