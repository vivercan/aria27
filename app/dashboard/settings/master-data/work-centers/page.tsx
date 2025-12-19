"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";

interface WorkCenter {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  created_at: string;
}

export default function WorkCentersPage() {
  const [centers, setCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", latitude: "", longitude: "", radius_meters: "1000" });
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { loadCenters(); }, []);

  async function loadCenters() {
    setLoading(true);
    const { data } = await supabase.from("work_centers").select("*").order("name");
    setCenters(data || []);
    setLoading(false);
  }

  function openNew() {
    setForm({ name: "", address: "", latitude: "", longitude: "", radius_meters: "1000" });
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(center: WorkCenter) {
    setForm({
      name: center.name,
      address: center.address || "",
      latitude: center.latitude.toString(),
      longitude: center.longitude.toString(),
      radius_meters: center.radius_meters.toString()
    });
    setEditingId(center.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.latitude || !form.longitude) {
      alert("Nombre y coordenadas son requeridos");
      return;
    }

    const data = {
      name: form.name,
      address: form.address,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      radius_meters: parseInt(form.radius_meters) || 1000
    };

    if (editingId) {
      await supabase.from("work_centers").update(data).eq("id", editingId);
    } else {
      await supabase.from("work_centers").insert(data);
    }

    setShowModal(false);
    loadCenters();
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    await supabase.from("work_centers").delete().eq("id", id);
    setConfirmDelete(null);
    setDeleting(false);
    loadCenters();
  }

  function parseCoordinates(text: string) {
    // Detectar formato "21.8818, -102.2916" de Google Maps
    const match = text.match(/([-]?\d+\.?\d*)\s*,\s*([-]?\d+\.?\d*)/);
    if (match) {
      setForm({ ...form, latitude: match[1], longitude: match[2] });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Centros de Trabajo</h1>
          <p className="text-slate-400 text-sm">Configura las ubicaciones y geocercas para asistencia</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all">
          + Agregar Centro
        </button>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-sm">
              <th className="p-4 text-left">Nombre</th>
              <th className="p-4 text-left">Dirección</th>
              <th className="p-4 text-left">Coordenadas</th>
              <th className="p-4 text-left">Radio (m)</th>
              <th className="p-4 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {centers.map((c) => (
              <tr key={c.id} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="p-4 text-white font-medium">{c.name}</td>
                <td className="p-4 text-slate-300">{c.address || "-"}</td>
                <td className="p-4 text-slate-300 font-mono text-sm">{c.latitude}, {c.longitude}</td>
                <td className="p-4 text-slate-300">{c.radius_meters}m</td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => openEdit(c)} className="p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-all" title="Editar">✏️</button>
                  <button onClick={() => setConfirmDelete(c.id)} className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all" title="Eliminar">🗑️</button>
                  <a href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`} target="_blank" className="p-2 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg transition-all" title="Ver en Maps">🗺️</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {centers.length === 0 && <div className="p-8 text-center text-slate-400">No hay centros de trabajo configurados</div>}
      </div>

      {/* Modal Agregar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">{editingId ? "Editar" : "Agregar"} Centro de Trabajo</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" placeholder="Oficina Central" />
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-1">Dirección</label>
                <input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" placeholder="Av. Principal #123, Col. Centro" />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1">Pegar coordenadas de Google Maps</label>
                <input type="text" onChange={(e) => parseCoordinates(e.target.value)} className="w-full px-4 py-2 bg-slate-700 border border-slate-500 rounded-lg text-white" placeholder="21.8818, -102.2916" />
                <p className="text-xs text-slate-500 mt-1">Clic derecho en Google Maps → Copiar coordenadas</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Latitud *</label>
                  <input type="text" value={form.latitude} onChange={(e) => setForm({...form, latitude: e.target.value})} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" placeholder="21.8818" />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Longitud *</label>
                  <input type="text" value={form.longitude} onChange={(e) => setForm({...form, longitude: e.target.value})} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" placeholder="-102.2916" />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1">Radio de geocerca (metros)</label>
                <input type="number" value={form.radius_meters} onChange={(e) => setForm({...form, radius_meters: e.target.value})} className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" placeholder="1000" />
                <p className="text-xs text-slate-500 mt-1">1000m = 1km de radio</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">¿Eliminar centro?</h2>
            <p className="text-slate-300 mb-6">Los empleados asignados quedarán sin centro de trabajo.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">{deleting ? "..." : "Eliminar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
