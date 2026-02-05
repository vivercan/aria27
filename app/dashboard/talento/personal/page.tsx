"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Search, Edit2, Trash2, Phone, Mail, Building2, User, Save, X } from "lucide-react";
import Link from "next/link";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
  status: string;
  whatsapp: string | null;
  email: string | null;
  centro_trabajo_id: string | null;
  salario_diario: number | null;
  fecha_ingreso: string | null;
}

export default function PersonalPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [form, setForm] = useState({ full_name: "", position: "", department: "", whatsapp: "", email: "", salario_diario: "" });

  useEffect(() => { cargarEmpleados(); }, []);

  const cargarEmpleados = async () => {
    const { data } = await supabase.from("employees").select("*").order("employee_number");
    if (data) setEmpleados(data);
    setLoading(false);
  };

  const filtrados = empleados.filter(e => 
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_number?.toLowerCase().includes(search.toLowerCase()) ||
    e.position?.toLowerCase().includes(search.toLowerCase())
  );

  const abrirModal = (emp?: Empleado) => {
    if (emp) {
      setEditando(emp);
      setForm({ 
        full_name: emp.full_name || "", 
        position: emp.position || "", 
        department: emp.department || "",
        whatsapp: emp.whatsapp || "",
        email: emp.email || "",
        salario_diario: emp.salario_diario?.toString() || ""
      });
    } else {
      setEditando(null);
      setForm({ full_name: "", position: "", department: "", whatsapp: "", email: "", salario_diario: "" });
    }
    setShowModal(true);
  };

  const guardar = async () => {
    if (!form.full_name.trim()) return alert("Nombre requerido");
    
    const datos = {
      full_name: form.full_name.trim(),
      position: form.position.trim(),
      department: form.department.trim(),
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      salario_diario: form.salario_diario ? parseFloat(form.salario_diario) : null
    };

    if (editando) {
      await supabase.from("employees").update(datos).eq("id", editando.id);
    } else {
      const nextNum = empleados.length + 1;
      await supabase.from("employees").insert({ ...datos, employee_number: `EMP-${String(nextNum).padStart(3, "0")}`, status: "ACTIVO" });
    }
    setShowModal(false);
    cargarEmpleados();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este empleado?")) return;
    await supabase.from("employees").delete().eq("id", id);
    cargarEmpleados();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none p-6 border-b border-white/10">
        <Link href="/dashboard/talento" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Talento
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Personal</h1>
            <p className="text-slate-400">{empleados.length} empleados registrados</p>
          </div>
          <button onClick={() => abrirModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <Plus className="w-4 h-4" /> Nuevo Empleado
          </button>
        </div>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre, código o puesto..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : (
          <div className="grid gap-4">
            {filtrados.map(emp => (
              <div key={emp.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-slate-400">{emp.employee_number}</span>
                        <h3 className="font-semibold text-white">{emp.full_name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${emp.status === "ACTIVO" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {emp.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{emp.position} • {emp.department}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        {emp.whatsapp && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.whatsapp}</span>}
                        {emp.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>}
                        {emp.salario_diario && <span>${emp.salario_diario.toFixed(2)}/día</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => abrirModal(emp)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => eliminar(emp.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{editando ? "Editar" : "Nuevo"} Empleado</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400">Nombre completo *</label>
                <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Puesto</label>
                  <input type="text" value={form.position} onChange={e => setForm({...form, position: e.target.value})}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Departamento</label>
                  <input type="text" value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">WhatsApp</label>
                  <input type="text" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" placeholder="10 dígitos" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Salario diario</label>
                  <input type="number" value={form.salario_diario} onChange={e => setForm({...form, salario_diario: e.target.value})}
                    className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full mt-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white" />
              </div>
              <button onClick={guardar} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
