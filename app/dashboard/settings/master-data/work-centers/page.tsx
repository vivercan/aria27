"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Plus, Trash2, Edit, Save, X, Building2 } from "lucide-react";
import Link from "next/link";

interface CentroTrabajo {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  radio_metros: number;
  activo: boolean;
}

export default function WorkCentersPage() {
  const [centros, setCentros] = useState<CentroTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    direccion: "",
    latitud: "",
    longitud: "",
    radio_metros: "100"
  });

  useEffect(() => { fetchCentros(); }, []);

  async function fetchCentros() {
    const { data } = await supabase.from("centros_trabajo").select("*").order("codigo", { ascending: true });
    if (data) setCentros(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      codigo: form.codigo.toUpperCase(),
      nombre: form.nombre,
      direccion: form.direccion,
      latitud: parseFloat(form.latitud),
      longitud: parseFloat(form.longitud),
      radio_metros: parseInt(form.radio_metros),
      activo: true
    };
    if (editingId) {
      await supabase.from("centros_trabajo").update(payload).eq("id", editingId);
    } else {
      await supabase.from("centros_trabajo").insert(payload);
    }
    setForm({ codigo: "", nombre: "", direccion: "", latitud: "", longitud: "", radio_metros: "100" });
    setShowForm(false);
    setEditingId(null);
    fetchCentros();
  }

  function handleEdit(centro: CentroTrabajo) {
    setForm({
      codigo: centro.codigo,
      nombre: centro.nombre,
      direccion: centro.direccion || "",
      latitud: centro.latitud.toString(),
      longitud: centro.longitud.toString(),
      radio_metros: centro.radio_metros.toString()
    });
    setEditingId(centro.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (confirm("Eliminar este centro?")) {
      await supabase.from("centros_trabajo").delete().eq("id", id);
      fetchCentros();
    }
  }

  async function handleToggleActive(id: string, activo: boolean) {
    await supabase.from("centros_trabajo").update({ activo: !activo }).eq("id", id);
    fetchCentros();
  }

  const openForm = () => {
    setShowForm(true);
    setEditingId(null);
    setForm({ codigo: "", nombre: "", direccion: "", latitud: "", longitud: "", radio_metros: "100" });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const getMapUrl = (lat: number, lng: number) => {
    return "https://www.google.com/maps?q=" + lat + "," + lng;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard/settings/master-data" className="hover:text-white">Master Data</Link>
        <span>/</span>
        <span className="text-white">Centros de Trabajo</span>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-blue-400" />
            Centros de Trabajo
          </h1>
          <p className="text-slate-400 text-sm">{centros.length} obras registradas</p>
        </div>
        <button onClick={openForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm">
          <Plus size={16} /> Nuevo Centro
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-white mb-4">{editingId ? "Editar Centro" : "Nuevo Centro"}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Codigo *</label>
              <input type="text" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="OBRA-001" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="Nombre obra" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Direccion</label>
              <input type="text" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="Calle, numero..." />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Latitud *</label>
              <input type="text" value={form.latitud} onChange={(e) => setForm({ ...form, latitud: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="25.6866142" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Longitud *</label>
              <input type="text" value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="-100.3161126" required />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Radio (metros)</label>
              <input type="number" value={form.radio_metros} onChange={(e) => setForm({ ...form, radio_metros: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="100" />
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex gap-2 justify-end mt-2">
              <button type="button" onClick={closeForm} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
              <button type="submit" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg">
                <Save size={16} /> {editingId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-white/5 text-slate-100 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Codigo</th>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Ubicacion</th>
              <th className="px-6 py-4">Radio</th>
              <th className="px-6 py-4">Estatus</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center">Cargando...</td></tr>
            ) : centros.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No hay centros</td></tr>
            ) : centros.map((centro) => (
              <tr key={centro.id} className="hover:bg-white/5">
                <td className="px-6 py-4 text-blue-300 font-mono">{centro.codigo}</td>
                <td className="px-6 py-4 text-white">{centro.nombre}</td>
                <td className="px-6 py-4">
                  <Link href={getMapUrl(centro.latitud, centro.longitud)} target="_blank" className="flex items-center gap-1 text-emerald-400 hover:underline">
                    <MapPin size={14} />
                    {centro.latitud.toFixed(4)}, {centro.longitud.toFixed(4)}
                  </Link>
                </td>
                <td className="px-6 py-4">{centro.radio_metros}m</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleToggleActive(centro.id, centro.activo)} className={centro.activo ? "px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400" : "px-2 py-1 rounded text-xs bg-rose-500/20 text-rose-400"}>
                    {centro.activo ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleEdit(centro)} className="p-2 hover:bg-white/10 rounded-lg text-blue-400"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(centro.id)} className="p-2 hover:bg-white/10 rounded-lg text-rose-400"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}