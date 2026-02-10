const fs = require("fs");
let ch = fs.readFileSync("app/dashboard/talento/checadas/page.tsx", "utf8");

// Mover los useState nuevos ANTES del useEffect
// Primero quitar de donde estan mal
ch = ch.replace(
  'const [showModal, setShowModal] = useState(false);\n  const [saving, setSaving] = useState(false);\n  const [empleadosList, setEmpleadosList] = useState<any[]>([]);\n  const [formManual, setFormManual] = useState({ employee_id: "", fecha: new Date().toISOString().split("T")[0], hora_entrada: "08:00", hora_salida: "17:00" });\n  const [filtro, setFiltro] = useState',
  'const [filtro, setFiltro] = useState'
);

// Ahora insertarlos justo despues de los otros useState, antes del useEffect
ch = ch.replace(
  'useEffect(() => { cargarAsistencias();',
  'const [showModal, setShowModal] = useState(false);\n  const [saving, setSaving] = useState(false);\n  const [empleadosList, setEmpleadosList] = useState<any[]>([]);\n  const [formManual, setFormManual] = useState({ employee_id: "", fecha: new Date().toISOString().split("T")[0], hora_entrada: "08:00", hora_salida: "17:00" });\n\n  useEffect(() => { cargarAsistencias();'
);

fs.writeFileSync("app/dashboard/talento/checadas/page.tsx", ch);
console.log("checadas fix applied");
