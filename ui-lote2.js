const fs = require("fs");

// ===== 1. POR-PAGAR: Agregar boton de pago en cada fila =====
let pp = fs.readFileSync("app/dashboard/finanzas/por-pagar/page.tsx", "utf8");
if (pp.includes("handlePago") && !pp.includes("Registrar Pago")) {
  // Agregar boton en las filas de la tabla - buscar donde se muestra el saldo
  // Insertar celda de accion despues de la celda de saldo
  pp = pp.replace(
    /(<td[^>]*>.*?\{c\.vencida \?.*?<\/td>)/s,
    (match) => {
      // Solo agregar si no tiene ya boton de pago
      if (match.includes("handlePago")) return match;
      return match + `
                  <td className="p-3 text-center">
                    {c.saldo > 0 && (
                      <button
                        onClick={() => handlePago(c.id, c.total, c.monto_pagado)}
                        disabled={pagando === c.id}
                        className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        {pagando === c.id ? "..." : "Pagar"}
                      </button>
                    )}
                  </td>`;
    }
  );
  fs.writeFileSync("app/dashboard/finanzas/por-pagar/page.tsx", pp);
  console.log("  1. por-pagar: boton Pagar agregado en filas");
} else if (!pp.includes("handlePago")) {
  console.log("  1. por-pagar: SKIP - no tiene handlePago");
} else {
  console.log("  1. por-pagar: ya tiene boton");
}

// ===== 2. CHECADAS: Agregar modal completo =====
let ch = fs.readFileSync("app/dashboard/talento/checadas/page.tsx", "utf8");
if (ch.includes("handleManual") && !ch.includes("showModal &&")) {
  // Inyectar modal antes del ultimo cierre del return
  const modal = `
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Registro Manual de Asistencia</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Empleado *</label>
                <select value={formManual.employee_id} onChange={e => setFormManual({...formManual, employee_id: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10">
                  <option value="">Seleccionar...</option>
                  {empleadosList.map(e => <option key={e.id} value={e.id}>{e.employee_number} - {e.full_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Fecha</label>
                  <input type="date" value={formManual.fecha} onChange={e => setFormManual({...formManual, fecha: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Entrada</label>
                  <input type="time" value={formManual.hora_entrada} onChange={e => setFormManual({...formManual, hora_entrada: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Salida</label>
                  <input type="time" value={formManual.hora_salida} onChange={e => setFormManual({...formManual, hora_salida: e.target.value})} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-white/10" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={handleManual} disabled={saving || !formManual.employee_id} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}`;
  // Insertar antes del ultimo </div> del return
  const lastDiv = ch.lastIndexOf("</div>\n  );");
  if (lastDiv > 0) {
    ch = ch.slice(0, lastDiv) + modal + "\n    </div>\n  );";
    // Fix: quitar el duplicado
    ch = ch.replace("</div>\n  );\n}", "</div>\n  );\n}");
  }
  fs.writeFileSync("app/dashboard/talento/checadas/page.tsx", ch);
  console.log("  2. checadas: modal completo agregado");
} else if (ch.includes("showModal &&")) {
  console.log("  2. checadas: ya tiene modal");
} else {
  console.log("  2. checadas: SKIP - no tiene handleManual");
}

// ===== 3. LEGALES: Agregar botones de edicion inline =====
let lg = fs.readFileSync("app/dashboard/talento/legales/page.tsx", "utf8");
if (lg.includes("handleSaveLegal") && !lg.includes("startEdit(e)")) {
  // Buscar donde se renderizan las filas y agregar boton de editar
  // Buscar patron de celda con status
  lg = lg.replace(
    /(getDocsStatus\(e\).*?<\/td>)/s,
    (match) => match + `
                  <td className="p-3 text-center">
                    {editingId === e.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={handleSaveLegal} disabled={saving} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30">
                          {saving ? "..." : "Guardar"}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-xs hover:bg-slate-500/30">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(e)} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>`
  );
  // Agregar columna Accion en thead
  if (!lg.includes("Acción</th>")) {
    lg = lg.replace(
      /Docs<\/th>\s*$/m,
      'Docs</th>\n                <th className="text-center p-3">Acción</th>'
    );
  }
  fs.writeFileSync("app/dashboard/talento/legales/page.tsx", lg);
  console.log("  3. legales: botones edit/save agregados");
} else if (lg.includes("startEdit(e)")) {
  console.log("  3. legales: ya tiene botones");
} else {
  console.log("  3. legales: SKIP - no tiene handleSaveLegal");
}

console.log("\nUI Lote 2 completado.");
