"use client";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Upload, Users, Edit2, Trash2, X, Save, Loader2, FileSpreadsheet, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface Obra {
  id: string;
  nombre: string;
  direccion: string;
  estado: string;
  presupuesto: number;
  fecha_inicio: string;
  fecha_fin: string;
  cliente: string;
  descripcion: string;
  created_at: string;
}

type Modo = "manual" | "grupo" | "excel";

interface ObraForm {
  nombre: string;
  direccion: string;
  estado: string;
  presupuesto: string | number;
  presupuesto_contratado: string | number;
  presupuesto_ampliaciones: string | number;
  fecha_inicio: string;
  fecha_fin: string;
  cliente: string;
  descripcion: string;
}

const STATUS_OPTIONS = [
  { value: "ACTIVA", label: "Activa", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "EN_PLANEACION", label: "En Planeación", color: "bg-aria-primary-light text-aria-accent" },
  { value: "PAUSADA", label: "Pausada", color: "bg-amber-500/20 text-amber-400" },
  { value: "TERMINADA", label: "Terminada", color: "bg-slate-500/20 text-slate-400" },
  { value: "CANCELADA", label: "Cancelada", color: "bg-red-500/20 text-red-400" },
];

const EMPTY: ObraForm = { nombre: "", direccion: "", estado: "ACTIVA", presupuesto: "", presupuesto_contratado: "", presupuesto_ampliaciones: "", fecha_inicio: "", fecha_fin: "", cliente: "", descripcion: "" };

export default function PipelinePage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [modo, setModo] = useState<Modo>("manual");
  const [form, setForm] = useState<ObraForm>({ ...EMPTY });
  const [editId, setEditId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [grupoTexto, setGrupoTexto] = useState("");
  const [excelData, setExcelData] = useState<Record<string, unknown>[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { cargar(); }, []);

  const validarManual = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.nombre?.trim()) {
      errors.nombre = "El nombre de la obra es obligatorio";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const cargar = async () => {
    const { data } = await supabase.from("centros_trabajo").select("*").order("nombre");
    if (data) setObras(data);
    setLoading(false);
  };

  const msg = (tipo: "success" | "error", texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3000);
  };

  const guardarManual = async () => {
    if (!validarManual()) { msg("error", "Por favor corrige los errores en el formulario"); return; }
    setGuardando(true);

    // Calcular presupuesto total = contratado + ampliaciones (si ambos presentes)
    const contratado = parseFloat(String(form.presupuesto_contratado)) || 0;
    const ampliaciones = parseFloat(String(form.presupuesto_ampliaciones)) || 0;
    let presupuesto: number | string = "";
    if (contratado > 0 || ampliaciones > 0) {
      presupuesto = contratado + ampliaciones;
    } else {
      presupuesto = form.presupuesto ? parseFloat(String(form.presupuesto)) : "";
    }

    const payload: Record<string, unknown> = {
      nombre: form.nombre,
      direccion: form.direccion || null,
      estado: form.estado,
      cliente: form.cliente || null,
      descripcion: form.descripcion || null,
      presupuesto: presupuesto || null,
      presupuesto_contratado: contratado > 0 ? contratado : null,
      presupuesto_ampliaciones: ampliaciones > 0 ? ampliaciones : null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null
    };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });

    if (editId) {
      const { error } = await supabase.from("centros_trabajo").update(payload).eq("id", editId);
      if (error) { msg("error", error?.message ?? "Error"); } else { msg("success", "Obra actualizada"); setShowForm(false); setEditId(null); cargar(); }
    } else {
      const { error } = await supabase.from("centros_trabajo").insert(payload);
      if (error) { msg("error", error?.message ?? "Error"); } else { msg("success", "Obra creada"); setShowForm(false); cargar(); }
    }
    setGuardando(false);
  };

  const guardarGrupo = async () => {
    const lineas = grupoTexto.split("\n").filter(l => l.trim());
    if (lineas.length === 0) return;
    setGuardando(true);
    let ok = 0;
    for (const linea of lineas) {
      const [name, location, client, budget] = linea.split("|").map(s => s.trim());
      if (!name) continue;
      const { error } = await supabase.from("centros_trabajo").insert({
        nombre: name, direccion: location || null, cliente: client || null,
        presupuesto: budget ? parseFloat(budget) : null, estado: "ACTIVA"
      });
      if (!error) ok++;
    }
    msg("success", `${ok} obras creadas de ${lineas.length}`);
    setGuardando(false);
    setShowForm(false);
    setGrupoTexto("");
    cargar();
  };

  const guardarExcel = async () => {
    if (excelData.length === 0) return;
    setGuardando(true);
    let ok = 0;
    for (const row of excelData) {
      const nombre = (row["NOMBRE"] || row["nombre"] || row["Obra"] || row["obra"] || null) as string | null;
      const direccion = (row["UBICACION"] || row["ubicacion"] || row["Ubicación"] || null) as string | null;
      const cliente = (row["CLIENTE"] || row["cliente"] || row["Cliente"] || null) as string | null;
      const descripcion = (row["DESCRIPCION"] || row["descripcion"] || null) as string | null;
      const presupuestoVal = row["PRESUPUESTO"] || row["presupuesto"] || row["Presupuesto"] || null;
      const presupuesto = presupuestoVal ? parseFloat(String(presupuestoVal)) : null;

      const payload: Record<string, unknown> = {
        nombre,
        direccion: direccion || null,
        cliente: cliente || null,
        presupuesto: presupuesto || null,
        estado: "ACTIVA",
        descripcion: descripcion || null,
      };
      if (!nombre) continue;
      const { error } = await supabase.from("centros_trabajo").insert(payload);
      if (!error) ok++;
    }
    msg("success", `${ok} obras importadas de ${excelData.length}`);
    setGuardando(false);
    setShowForm(false);
    setExcelData([]);
    cargar();
  };

  const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      setExcelData(data as Record<string, unknown>[]);
    };
    reader.readAsBinaryString(file);
  };

  const eliminar = async (id: string) => {
    setDeleteModal({open:true,id,name:""}); return; // Protected by DeleteModal
    const { error } = await supabase.from("centros_trabajo").delete().eq("id", id);
    if (error) { msg("error", error?.message ?? "Error"); } else { msg("success", "Obra eliminada"); cargar(); }
  };

  const editar = (o: Obra) => {
    setEditId(o.id);
    setForm({
      nombre: o.nombre || "",
      direccion: o.direccion || "",
      estado: o.estado || "ACTIVA",
      presupuesto: o.presupuesto || "",
      presupuesto_contratado: "",
      presupuesto_ampliaciones: "",
      fecha_inicio: o.fecha_inicio || "",
      fecha_fin: o.fecha_fin || "",
      cliente: o.cliente || "",
      descripcion: o.descripcion || ""
    });
    setModo("manual");
    setShowForm(true);
  };

  const getStatusStyle = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.color || "bg-slate-500/20 text-slate-400";
  const getStatusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;

  const Field = ({ label, field, type = "text", placeholder = "", options }: { label: string; field: keyof ObraForm; type?: string; placeholder?: string; options?: Array<{ value: string; label: string }> }) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {options ? (
        <select value={String(form[field]) || ""} onChange={e => setForm({ ...form, [field]: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={String(form[field]) || ""} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600" />
      )}
    </div>
  );
  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "centros_trabajo", id: deleteModal.id, userEmail });
    } catch (e: unknown) { console.error(e); }
    setDeleteModal({open:false,id:"",name:""});
    cargar();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/obras" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Pipeline de Obras</h1>
            <p className="text-xs text-slate-400">{obras.length} obras registradas</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); setModo("manual"); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary text-white text-sm hover:bg-aria-primary-hover">
          <Plus className="w-4 h-4" /> Nueva Obra
        </button>
      </div>

      {mensaje && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
            <tr className="border-b border-white/10">
              <th className="text-left p-3 text-slate-400 font-medium text-xs">Obra</th>
              <th className="text-left p-3 text-slate-400 font-medium text-xs">Ubicación</th>
              <th className="text-left p-3 text-slate-400 font-medium text-xs">Cliente</th>
              <th className="text-right p-3 text-slate-400 font-medium text-xs">Presupuesto</th>
              <th className="text-center p-3 text-slate-400 font-medium text-xs">Estado</th>
              <th className="text-center p-3 text-slate-400 font-medium text-xs">Acc</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-aria-accent" /></td></tr>
            ) : obras.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500 text-sm">Sin obras registradas</td></tr>
            ) : obras.map(o => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="p-3 text-white text-sm font-medium">{o.nombre}</td>
                <td className="p-3 text-slate-400 text-sm">{o.direccion || "—"}</td>
                <td className="p-3 text-slate-400 text-sm">{o.cliente || "—"}</td>
                <td className="p-3 text-right text-sm text-white">{o.presupuesto ? `$${Number(o.presupuesto).toLocaleString()}` : "—"}</td>
                <td className="p-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${getStatusStyle(o.estado)}`}>{getStatusLabel(o.estado)}</span></td>
                <td className="p-3 text-center flex items-center justify-center gap-1">
                  <button onClick={() => editar(o)} className="p-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30"><Edit2 className="w-3.5 h-3.5" /></button>
                  {canDelete && (<button onClick={() => eliminar(o.id)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><Trash2 className="w-3.5 h-3.5" /></button>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: 3 modos de captura */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#0f1729] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">{editId ? "Editar Obra" : "Agregar Obras"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {/* Selector de modo */}
            {!editId && (
              <div className="flex border-b border-white/10">
                {[
                  { key: "manual", label: "Manual", icon: Plus },
                  { key: "grupo", label: "Grupo", icon: Users },
                  { key: "excel", label: "Excel", icon: FileSpreadsheet },
                ].map(m => (
                  <button key={m.key} onClick={() => setModo(m.key as Modo)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${modo === m.key ? "text-aria-accent border-b-2 border-aria-accent" : "text-slate-400 hover:text-white"}`}>
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* MANUAL */}
              {modo === "manual" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nombre de la obra</label>
                    <input type="text" value={form.nombre || ""} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Pinar del Lago" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600" autoComplete="off" />
                    {formErrors.nombre && <p className="text-red-400 text-xs mt-1">{formErrors.nombre}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ubicación</label>
                    <input type="text" value={form.direccion || ""} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección o referencia" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600" autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cliente</label>
                    <input type="text" value={form.cliente || ""} onChange={e => setForm({ ...form, cliente: e.target.value })} placeholder="Nombre del cliente" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600" autoComplete="off" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Monto contratado</label>
                    <input type="number" min="0" value={form.presupuesto_contratado || ""} onChange={e => setForm({ ...form, presupuesto_contratado: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ampliaciones</label>
                    <input type="number" min="0" value={form.presupuesto_ampliaciones || ""} onChange={e => setForm({ ...form, presupuesto_ampliaciones: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600" />
                    {(parseFloat(String(form.presupuesto_contratado))||0) + (parseFloat(String(form.presupuesto_ampliaciones))||0) > 0 && (
                      <div className="text-[10px] text-emerald-400 mt-1">Total: ${((parseFloat(String(form.presupuesto_contratado))||0) + (parseFloat(String(form.presupuesto_ampliaciones))||0)).toLocaleString()}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Estado</label>
                    <select value={form.estado || "ACTIVA"} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none">
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha inicio</label>
                    <input type="date" value={form.fecha_inicio || ""} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha fin estimada</label>
                    <input type="date" value={form.fecha_fin || ""} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                    <input type="text" value={form.descripcion || ""} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Notas adicionales" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600" autoComplete="off" />
                  </div>
                </div>
              )}

              {/* GRUPO */}
              {modo === "grupo" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-aria-primary/10 border border-aria-primary/20">
                    <p className="text-aria-accent text-xs">Formato: <span className="font-mono">Nombre | Ubicación | Cliente | Presupuesto</span></p>
                    <p className="text-aria-accent/60 text-xs mt-1">Una obra por línea. Solo el nombre es obligatorio.</p>
                  </div>
                  <textarea value={grupoTexto} onChange={e => setGrupoTexto(e.target.value)} rows={8} placeholder={"Pinar del Lago | Ags Norte | Particular | 5000000\nMiravalle | Ags Sur | Gobierno | 8000000"} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono focus:border-aria-primary focus:outline-none placeholder-slate-600 resize-none" />
                  {grupoTexto && <p className="text-xs text-slate-400">{grupoTexto.split("\n").filter(l => l.trim()).length} obras detectadas</p>}
                </div>
              )}

              {/* EXCEL */}
              {modo === "excel" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-400 text-xs">Sube un archivo .xlsx con columnas: NOMBRE, UBICACION, CLIENTE, PRESUPUESTO, DESCRIPCION</p>
                    <p className="text-emerald-400/60 text-xs mt-1">Los nombres de columna pueden ser en mayúsculas o minúsculas.</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcel} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-aria-primary file:text-white file:text-sm hover:file:bg-aria-primary-hover file:cursor-pointer" />
                  {excelData.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-400 mb-2">{excelData.length} registros encontrados. Vista previa:</p>
                      <div className="max-h-48 overflow-y-auto rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-slate-900/95">
                            <tr>{Object.keys(excelData[0]).slice(0, 5).map(k => <th key={k} className="p-2 text-left text-slate-400">{k}</th>)}</tr>
                          </thead>
                          <tbody>
                            {excelData.slice(0, 5).map((row, i) => (
                              <tr key={i} className="border-t border-white/5">
                                {Object.values(row).slice(0, 5).map((v, j) => <td key={j} className="p-2 text-slate-300">{String(v).substring(0, 30)}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 text-sm">Cancelar</button>
              <button onClick={modo === "manual" ? guardarManual : modo === "grupo" ? guardarGrupo : guardarExcel} disabled={guardando} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary text-white hover:bg-aria-primary-hover text-sm disabled:opacity-50">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {modo === "manual" ? (editId ? "Actualizar" : "Crear Obra") : modo === "grupo" ? "Crear Todas" : `Importar ${excelData.length}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({open:false,id:"",name:""})}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Obra"
      />
    </div>
  );
}
