"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Employee {
  id: string;
  name: string;
  phone: string;
  work_center_id: string | null;
  active: boolean;
  created_at: string;
  work_centers?: { name: string };
}

interface WorkCenter {
  id: string;
  name: string;
}

export default function PersonalPage() {
  const [Personal, setPersonal] = useState<Employee[]>([]);
  const [centers, setCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", work_center_id: "", active: true });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [uploadData, setUploadData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [empRes, cenRes] = await Promise.all([
      supabase.from("Personal").select("*, work_centers(name)").order("name"),
      supabase.from("work_centers").select("id, name").order("name")
    ]);
    setPersonal(empRes.data || []);
    setCenters(cenRes.data || []);
    setLoading(false);
  }

  function openNew() {
    setForm({ name: "", phone: "", work_center_id: centers[0]?.id || "", active: true });
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(emp: Employee) {
    setForm({ name: emp.name, phone: emp.phone, work_center_id: emp.work_center_id || "", active: emp.active });
    setEditingId(emp.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.phone) { alert("Nombre y teléfono son requeridos"); return; }
    const phone = form.phone.replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) { alert("Teléfono debe tener 10 dígitos"); return; }

    const data = { name: form.name, phone, work_center_id: form.work_center_id || null, active: form.active };

    if (editingId) {
      await supabase.from("Personal").update(data).eq("id", editingId);
    } else {
      await supabase.from("Personal").insert(data);
    }
    setShowModal(false);
    loadData();
  }

  async function handleDelete(id: string) {
    await supabase.from("Personal").delete().eq("id", id);
    setConfirmDelete(null);
    loadData();
  }

  async function toggleActive(emp: Employee) {
    await supabase.from("Personal").update({ active: !emp.active }).eq("id", emp.id);
    loadData();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const headers = lines[0].toLowerCase();
      
      const data = lines.slice(1).map(line => {
        const cols = line.split(/[,;\t]/);
        return {
          name: cols[0]?.trim() || "",
          phone: (cols[1]?.trim() || "").replace(/\D/g, "").slice(-10),
          work_center_name: cols[2]?.trim() || ""
        };
      }).filter(r => r.name && r.phone.length === 10);

      setUploadData(data);
      setShowUploadModal(true);
    };
    reader.readAsText(file);
  }

  async function handleBulkUpload() {
    setUploading(true);
    let success = 0, errors = 0;

    for (const row of uploadData) {
      const center = centers.find(c => c.name.toLowerCase() === row.work_center_name.toLowerCase());
      const { error } = await supabase.from("Personal").upsert(
        { name: row.name, phone: row.phone, work_center_id: center?.id || null, active: true },
        { onConflict: "phone" }
      );
      if (error) errors++; else success++;
    }

    alert(`Importados: ${success}, Errores: ${errors}`);
    setShowUploadModal(false);
    setUploadData([]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadData();
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Empleados</h1>
          <p className="text-slate-400 text-sm">Gestiona empleados para asistencia por WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} accept=".csv,.txt" onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all">
            📤 Carga Masiva
          </button>
          <button onClick={openNew} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all">
            + Agregar Empleado
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-sm">
              <th className="p-4 text-left">Nombre</th>
              <th className="p-4 text-left">Teléfono</th>
              <th className="p-4 text-left">Centro de Trabajo</th>
              <th className="p-4 text-left">Estado</th>
              <th className="p-4 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Personal.map((e) => (
              <tr key={e.id} className={`border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors ${!e.active ? "opacity-50" : ""}`}>
                <td className="p-4 text-white font-medium">{e.name}</td>
                <td className="p-4 text-slate-300 font-mono">{e.phone}</td>
                <td className="p-4 text-slate-300">{e.work_centers?.name || <span className="text-red-400">Sin asignar</span>}</td>
                <td className="p-4">
                  <button onClick={() => toggleActive(e)} className={`px-3 py-1 rounded-full text-xs font-medium ${e.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {e.active ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => openEdit(e)} className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-all">✏️</button>
                  <button onClick={() => setConfirmDelete(e.id)} className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {Personal.length === 0 && <div className="p-8 text-center text-slate-400">No hay empleados registrados</div>}
      </div>

      {/* Modal Agregar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">{editingId ? "Editar" : "Agregar"} Empleado</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Teléfono (10 dígitos) *</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" placeholder="8112345678" maxLength={10} />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Centro de Trabajo</label>
                <select value={form.work_center_id} onChange={(e) => setForm({...form, work_center_id: e.target.value})} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white">
                  <option value="">Sin asignar</option>
                  {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Carga Masiva */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 border border-slate-700 max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold text-white mb-4">Vista Previa de Importación</h2>
            <p className="text-slate-400 mb-4">{uploadData.length} empleados a importar</p>
            <table className="w-full text-sm mb-4">
              <thead><tr className="text-slate-400"><th className="p-2 text-left">Nombre</th><th className="p-2 text-left">Teléfono</th><th className="p-2 text-left">Centro</th></tr></thead>
              <tbody>
                {uploadData.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-slate-700"><td className="p-2 text-white">{r.name}</td><td className="p-2 text-slate-300">{r.phone}</td><td className="p-2 text-slate-300">{r.work_center_name || "-"}</td></tr>
                ))}
                {uploadData.length > 10 && <tr><td colSpan={3} className="p-2 text-slate-500">... y {uploadData.length - 10} más</td></tr>}
              </tbody>
            </table>
            <div className="flex gap-3">
              <button onClick={() => { setShowUploadModal(false); setUploadData([]); }} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancelar</button>
              <button onClick={handleBulkUpload} disabled={uploading} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">{uploading ? "Importando..." : "Importar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">¿Eliminar empleado?</h2>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
