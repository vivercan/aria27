"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, Loader2, Download } from "lucide-react";

type Entity = "suppliers" | "products" | "employees" | "obras";

interface EntityDef {
  label: string;
  table: string;
  required: string[];
  optional: string[];
  sample: string;
  mapRow: (row: Record<string, string>) => any;
}

const DEFS: Record<Entity, EntityDef> = {
  suppliers: {
    label: "Proveedores",
    table: "suppliers",
    required: ["name"],
    optional: ["razon_social", "rfc", "contact_name", "phone", "email", "whatsapp", "address", "categories", "credit_days", "payment_method", "zona_cobertura", "bank_name", "bank_clabe"],
    sample: "name,razon_social,rfc,contact_name,phone,email,whatsapp,address,categories,credit_days\nSAACSA,SAACSA SA DE CV,SAA123456XY0,Juan Perez,4491234567,ventas@saacsa.com,4491234567,Av. Principal 123,ACEROS,30",
    mapRow: (r) => ({
      name: r.name?.trim(),
      razon_social: r.razon_social?.trim() || null,
      rfc: r.rfc?.trim().toUpperCase() || null,
      contact_name: r.contact_name?.trim() || null,
      phone: r.phone?.trim() || null,
      email: r.email?.trim() || null,
      whatsapp: r.whatsapp?.trim() || null,
      address: r.address?.trim() || null,
      categories: r.categories?.trim() || null,
      credit_days: r.credit_days ? parseInt(r.credit_days) || 0 : 0,
      payment_method: r.payment_method?.trim() || null,
      zona_cobertura: r.zona_cobertura?.trim() || null,
      bank_name: r.bank_name?.trim() || null,
      bank_clabe: r.bank_clabe?.trim() || null,
      active: true,
    }),
  },
  products: {
    label: "Productos",
    table: "products",
    required: ["sku", "name"],
    optional: ["description", "unit", "category"],
    sample: "sku,name,description,unit,category\nACE-001,Varilla 3/8,Varilla corrugada 3/8 12m,PIEZA,ACEROS\nCEM-001,Cemento Tolteca,Saco 50kg,SACO,CEMENTOS",
    mapRow: (r) => ({
      sku: r.sku?.trim().toUpperCase(),
      name: r.name?.trim(),
      description: r.description?.trim() || null,
      unit: r.unit?.trim() || "PIEZA",
      category: r.category?.trim() || null,
    }),
  },
  employees: {
    label: "Empleados",
    table: "employees",
    required: ["full_name"],
    optional: ["puesto", "curp", "rfc", "nss", "telefono", "fecha_ingreso", "sueldo_diario", "obra_asignada"],
    sample: "full_name,puesto,curp,rfc,nss,telefono,fecha_ingreso,sueldo_diario,obra_asignada\nJuan Perez Lopez,ALBAÑIL,PELJ800101HASPRN01,PELJ800101XYZ,12345678901,4491234567,2026-01-15,450,MIRAVALLE",
    mapRow: (r) => ({
      full_name: r.full_name?.trim(),
      puesto: r.puesto?.trim() || null,
      curp: r.curp?.trim().toUpperCase() || null,
      rfc: r.rfc?.trim().toUpperCase() || null,
      nss: r.nss?.trim() || null,
      telefono: r.telefono?.trim() || null,
      fecha_ingreso: r.fecha_ingreso?.trim() || null,
      sueldo_diario: r.sueldo_diario ? parseFloat(r.sueldo_diario) || 0 : 0,
      obra_asignada: r.obra_asignada?.trim() || null,
      activo: true,
    }),
  },
  obras: {
    label: "Obras",
    table: "centros_trabajo",
    required: ["nombre"],
    optional: ["estado", "direccion", "cliente", "presupuesto", "fecha_inicio", "fecha_fin", "descripcion"],
    sample: "nombre,estado,direccion,cliente,presupuesto,fecha_inicio,fecha_fin,descripcion\nMIRAVALLE,ACTIVA,Av Miravalle 123,Constructora XYZ,5000000,2026-01-01,2026-12-31,Obra residencial",
    mapRow: (r) => ({
      nombre: r.nombre?.trim(),
      estado: r.estado?.trim() || "ACTIVA",
      direccion: r.direccion?.trim() || null,
      cliente: r.cliente?.trim() || null,
      presupuesto: r.presupuesto ? parseFloat(r.presupuesto) || 0 : 0,
      fecha_inicio: r.fecha_inicio?.trim() || null,
      fecha_fin: r.fecha_fin?.trim() || null,
      descripcion: r.descripcion?.trim() || null,
    }),
  },
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    // simple CSV (no embedded commas support) — enough for onboarding
    const cols: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cols.push(cur); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").trim(); });
    return obj;
  });
}

export default function ImportCSV() {
  const [entity, setEntity] = useState<Entity>("suppliers");
  const [csvText, setCsvText] = useState("");
  const [dryRun, setDryRun] = useState<null | { valid: any[]; invalid: { row: number; err: string }[] }>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<null | { ok: number; fail: number; errors: string[] }>(null);

  const def = DEFS[entity];

  function resetAll() {
    setDryRun(null);
    setResult(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(t => { setCsvText(t); resetAll(); });
  }

  function runDryRun() {
    setResult(null);
    const rows = parseCSV(csvText);
    const valid: any[] = [];
    const invalid: { row: number; err: string }[] = [];
    rows.forEach((r, i) => {
      const missing = def.required.filter(k => !r[k] || !r[k].trim());
      if (missing.length > 0) {
        invalid.push({ row: i + 2, err: `Faltan columnas: ${missing.join(", ")}` });
        return;
      }
      try {
        valid.push(def.mapRow(r));
      } catch (e: unknown) {
        invalid.push({ row: i + 2, err: e?.message || "Error al parsear" });
      }
    });
    setDryRun({ valid, invalid });
  }

  async function runImport() {
    if (!dryRun) return;
    setImporting(true);
    setResult(null);
    let ok = 0, fail = 0;
    const errors: string[] = [];
    const chunks: any[][] = [];
    for (let i = 0; i < dryRun.valid.length; i += 50) chunks.push(dryRun.valid.slice(i, i + 50));
    for (const chunk of chunks) {
      const { error } = await supabase.from(def.table).insert(chunk);
      if (error) {
        fail += chunk.length;
        errors.push(error.message);
      } else {
        ok += chunk.length;
      }
    }
    setResult({ ok, fail, errors: errors.slice(0, 5) });
    setImporting(false);
  }

  function downloadSample() {
    const blob = new Blob([def.sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantilla_${entity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden p-6">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <Link href="/dashboard" className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Importar CSV</h1>
          <p className="text-sm text-slate-400">Carga masiva con validación (dry-run) antes de insertar</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(DEFS) as Entity[]).map(k => (
            <button key={k} onClick={() => { setEntity(k); setCsvText(""); resetAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${entity === k ? "bg-aria-primary text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>
              {DEFS[k].label}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-white font-semibold">{def.label} → <code className="text-xs text-aria-accent">{def.table}</code></h3>
              <p className="text-xs text-slate-400">Requeridas: <b>{def.required.join(", ")}</b> · Opcionales: {def.optional.join(", ")}</p>
            </div>
            <button onClick={downloadSample} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white">
              <Download className="w-4 h-4" /> Plantilla CSV
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary hover:bg-aria-primary-hover cursor-pointer text-white text-sm">
              <Upload className="w-4 h-4" /> Cargar CSV
              <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
            </label>
            {csvText && <span className="text-xs text-slate-400">{csvText.split("\n").length - 1} líneas cargadas</span>}
          </div>

          {csvText && (
            <textarea value={csvText} onChange={e => { setCsvText(e.target.value); resetAll(); }}
              className="w-full h-40 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-mono resize-none" />
          )}

          <div className="flex gap-2">
            <button onClick={runDryRun} disabled={!csvText} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-slate-700 text-white text-sm font-medium">
              1. Validar (dry-run)
            </button>
            <button onClick={runImport} disabled={!dryRun || dryRun.valid.length === 0 || importing} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white text-sm font-medium">
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              2. Importar {dryRun ? `${dryRun.valid.length} registros` : ""}
            </button>
          </div>
        </div>

        {dryRun && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
              <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-5 h-5 text-emerald-400" /><h3 className="text-white font-semibold">{dryRun.valid.length} válidos</h3></div>
              <div className="max-h-60 overflow-y-auto text-xs text-slate-300 space-y-1">
                {dryRun.valid.slice(0, 20).map((v, i) => (
                  <div key={i} className="p-2 rounded bg-black/20 font-mono">{JSON.stringify(v).slice(0, 120)}...</div>
                ))}
                {dryRun.valid.length > 20 && <div className="text-slate-500">... +{dryRun.valid.length - 20} más</div>}
              </div>
            </div>

            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-red-400" /><h3 className="text-white font-semibold">{dryRun.invalid.length} con error</h3></div>
              <div className="max-h-60 overflow-y-auto text-xs text-slate-300 space-y-1">
                {dryRun.invalid.map((e, i) => (
                  <div key={i} className="p-2 rounded bg-black/20">Línea {e.row}: <span className="text-red-300">{e.err}</span></div>
                ))}
                {dryRun.invalid.length === 0 && <div className="text-slate-500">Sin errores</div>}
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className={`rounded-xl p-4 border ${result.fail === 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
            <h3 className="text-white font-semibold mb-2">Resultado import</h3>
            <div className="text-sm text-slate-200">✅ {result.ok} insertados · ❌ {result.fail} fallidos</div>
            {result.errors.length > 0 && (
              <div className="mt-2 text-xs text-red-300 space-y-1">
                {result.errors.map((e, i) => <div key={i}>· {e}</div>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
