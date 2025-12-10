"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, UserPlus, Trash2, Edit, Shield, X, Save, Phone, Building2, Clock, CreditCard } from "lucide-react";

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
  salary_monthly: number;
  salario_diario: number;
  email: string;
  status: string;
  whatsapp: string;
  hora_entrada: string;
  hora_salida: string;
  dias_laborales: string;
  centro_trabajo_id: string;
  banco: string;
  clabe: string;
  numero_cuenta: string;
  fecha_ingreso: string;
  nss: string;
  curp: string;
  rfc: string;
  tipo_nomina: string;
}

interface CentroTrabajo {
  id: string;
  codigo: string;
  nombre: string;
}

export default function HRPeoplePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [centros, setCentros] = useState<CentroTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  
  const [form, setForm] = useState({
    employee_number: "",
    full_name: "",
    position: "",
    department: "",
    salary_monthly: "",
    email: "",
    status: "ACTIVO",
    whatsapp: "",
    hora_entrada: "07:00",
    hora_salida: "17:00",
    dias_laborales: "L,M,X,J,V,S",
    centro_trabajo_id: "",
    banco: "",
    clabe: "",
    numero_cuenta: "",
    fecha_ingreso: "",
    nss: "",
    curp: "",
    rfc: "",
    tipo_nomina: "semanal"
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [empRes, centrosRes] = await Promise.all([
      supabase.from("employees").select("*").order("employee_number", { ascending: true }),
      supabase.from("centros_trabajo").select("id, codigo, nombre").eq("activo", true)
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (centrosRes.data) setCentros(centrosRes.data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const salarioMensual = parseFloat(form.salary_monthly) || 0;
    const payload = {
      employee_number: form.employee_number.toUpperCase(),
      full_name: form.full_name,
      position: form.position,
      department: form.department,
      salary_monthly: salarioMensual,
      salario_diario: Math.round((salarioMensual / 30) * 100) / 100,
      email: form.email,
      status: form.status,
      whatsapp: form.whatsapp.replace(/\D/g, ""),
      hora_entrada: form.hora_entrada,
      hora_salida: form.hora_salida,
      dias_laborales: form.dias_laborales,
      centro_trabajo_id: form.centro_trabajo_id || null,
      banco: form.banco,
      clabe: form.clabe,
      numero_cuenta: form.numero_cuenta,
      fecha_ingreso: form.fecha_ingreso || null,
      nss: form.nss,
      curp: form.curp.toUpperCase(),
      rfc: form.rfc.toUpperCase(),
      tipo_nomina: form.tipo_nomina
    };

    if (editingId) {
      await supabase.from("employees").update(payload).eq("id", editingId);
    } else {
      await supabase.from("employees").insert(payload);
    }

    resetForm();
    fetchData();
  }

  function resetForm() {
    setForm({
      employee_number: "", full_name: "", position: "", department: "",
      salary_monthly: "", email: "", status: "ACTIVO", whatsapp: "",
      hora_entrada: "07:00", hora_salida: "17:00", dias_laborales: "L,M,X,J,V,S",
      centro_trabajo_id: "", banco: "", clabe: "", numero_cuenta: "",
      fecha_ingreso: "", nss: "", curp: "", rfc: "", tipo_nomina: "semanal"
    });
    setShowForm(false);
    setEditingId(null);
    setActiveTab("general");
  }

  function handleEdit(emp: Employee) {
    setForm({
      employee_number: emp.employee_number || "",
      full_name: emp.full_name || "",
      position: emp.position || "",
      department: emp.department || "",
      salary_monthly: emp.salary_monthly?.toString() || "",
      email: emp.email || "",
      status: emp.status || "ACTIVO",
      whatsapp: emp.whatsapp || "",
      hora_entrada: emp.hora_entrada || "07:00",
      hora_salida: emp.hora_salida || "17:00",
      dias_laborales: emp.dias_laborales || "L,M,X,J,V,S",
      centro_trabajo_id: emp.centro_trabajo_id || "",
      banco: emp.banco || "",
      clabe: emp.clabe || "",
      numero_cuenta: emp.numero_cuenta || "",
      fecha_ingreso: emp.fecha_ingreso || "",
      nss: emp.nss || "",
      curp: emp.curp || "",
      rfc: emp.rfc || "",
      tipo_nomina: emp.tipo_nomina || "semanal"
    });
    setEditingId(emp.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (confirm("¿Eliminar este colaborador?")) {
      await supabase.from("employees").delete().eq("id", id);
      fetchData();
    }
  }

  const filtered = employees.filter(e =>
    e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.whatsapp?.includes(searchTerm)
  );

  const getCentroNombre = (id: string) => {
    const centro = centros.find(c => c.id === id);
    return centro ? centro.nombre : "-";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Catálogo de Colaboradores</h1>
          <p className="text-slate-400 text-sm">{employees.length} registros conectados a BD</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/talent-hub/users" className="inline-flex items-center gap-2 rounded-full bg-purple-500/80 px-4 py-2 text-sm font-medium hover:bg-purple-500">
            <Shield className="h-4 w-4" />Usuarios
          </Link>
          <button 
            onClick={() => { setShowForm(true); setEditingId(null); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            <UserPlus size={16} /> Nuevo
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? "Editar Colaborador" : "Nuevo Colaborador"}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-black/20 p-1 rounded-lg w-fit">
            {[
              { id: "general", label: "General", icon: UserPlus },
              { id: "horario", label: "Horario", icon: Clock },
              { id: "nomina", label: "Nómina", icon: CreditCard },
              { id: "documentos", label: "Documentos", icon: Shield }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                  activeTab === tab.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Tab: General */}
            {activeTab === "general" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">No. Empleado *</label>
                  <input
                    type="text"
                    value={form.employee_number}
                    onChange={(e) => setForm({ ...form, employee_number: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                    placeholder="EMP-001"
                    required
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                    placeholder="Juan Pérez García"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Puesto</label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                    placeholder="Residente"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                    placeholder="Construcción"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                    placeholder="correo@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">WhatsApp *</label>
                  <div className="flex">
                    <span className="bg-black/60 border border-white/10 border-r-0 rounded-l-lg px-3 py-2 text-slate-400">+52</span>
                    <input
                      type="tel"
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-r-lg px-3 py-2 text-white"
                      placeholder="8112345678"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Estatus</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="BAJA">Baja</option>
                    <option value="VACACIONES">Vacaciones</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Fecha Ingreso</label>
                  <input
                    type="date"
                    value={form.fecha_ingreso}
                    onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            )}

            {/* Tab: Horario */}
            {activeTab === "horario" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Centro de Trabajo</label>
                  <select
                    value={form.centro_trabajo_id}
                    onChange={(e) => setForm({ ...form, centro_trabajo_id: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">-- Seleccionar --</option>
                    {centros.map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Hora Entrada</label>
                  <input
                    type="time"
                    value={form.hora_entrada}
                    onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Hora Salida</label>
                  <input
                    type="time"
                    value={form.hora_salida}
                    onChange={(e) => setForm({ ...form, hora_salida: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-sm text-slate-400 mb-2">Días Laborales</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "L", label: "Lun" },
                      { key: "M", label: "Mar" },
                      { key: "X", label: "Mié" },
                      { key: "J", label: "Jue" },
                      { key: "V", label: "Vie" },
                      { key: "S", label: "Sáb" },
                      { key: "D", label: "Dom" }
                    ].map(dia => {
                      const isSelected = form.dias_laborales.includes(dia.key);
                      return (
                        <button
                          key={dia.key}
                          type="button"
                          onClick={() => {
                            const dias = form.dias_laborales.split(",").filter(d => d);
                            if (isSelected) {
                              setForm({ ...form, dias_laborales: dias.filter(d => d !== dia.key).join(",") });
                            } else {
                              setForm({ ...form, dias_laborales: [...dias, dia.key].join(",") });
                            }
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isSelected ? "bg-blue-600 text-white" : "bg-black/40 text-slate-400 hover:bg-black/60"
                          }`}
                        >
                          {dia.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Nómina */}
            {activeTab === "nomina" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Salario Mensual *</label>
                  <div className="flex">
                    <span className="bg-black/60 border border-white/10 border-r-0 rounded-l-lg px-3 py-2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={form.salary_monthly}
                      onChange={(e) => setForm({ ...form, salary_monthly: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-r-lg px-3 py-2 text-white"
                      placeholder="15000"
                    />
                  </div>
                  {form.salary_monthly && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Diario: ${(parseFloat(form.salary_monthly) / 30).toFixed(2)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tipo Nómina</label>
                  <select
                    value={form.tipo_nomina}
                    onChange={(e) => setForm({ ...form, tipo_nomina: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Banco</label>
                  <input
                    type="text"
                    value={form.banco}
                    onChange={(e) => setForm({ ...form, banco: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                    placeholder="BBVA"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">CLABE</label>
                  <input
                    type="text"
                    value={form.clabe}
                    onChange={(e) => setForm({ ...form, clabe: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                    placeholder="012345678901234567"
                    maxLength={18}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">No. Cuenta</label>
                  <input
                    type="text"
                    value={form.numero_cuenta}
                    onChange={(e) => setForm({ ...form, numero_cuenta: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                    placeholder="1234567890"
                  />
                </div>
              </div>
            )}

            {/* Tab: Documentos */}
            {activeTab === "documentos" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">CURP</label>
                  <input
                    type="text"
                    value={form.curp}
                    onChange={(e) => setForm({ ...form, curp: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono uppercase"
                    placeholder="XXXX000000XXXXXX00"
                    maxLength={18}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">RFC</label>
                  <input
                    type="text"
                    value={form.rfc}
                    onChange={(e) => setForm({ ...form, rfc: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono uppercase"
                    placeholder="XXXX000000XXX"
                    maxLength={13}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">NSS (IMSS)</label>
                  <input
                    type="text"
                    value={form.nss}
                    onChange={(e) => setForm({ ...form, nss: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                    placeholder="00000000000"
                    maxLength={11}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/10">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-400 hover:text-white">
                Cancelar
              </button>
              <button type="submit" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg">
                <Save size={16} /> {editingId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre, número o WhatsApp..."
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 text-white focus:border-blue-500 transition-all"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-slate-100 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-4">No.</th>
                <th className="px-4 py-4">Nombre</th>
                <th className="px-4 py-4">Puesto</th>
                <th className="px-4 py-4">WhatsApp</th>
                <th className="px-4 py-4">Centro</th>
                <th className="px-4 py-4">Salario</th>
                <th className="px-4 py-4">Estatus</th>
                <th className="px-4 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">No hay colaboradores</td></tr>
              ) : filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-blue-300 font-mono text-xs">{emp.employee_number}</td>
                  <td className="px-4 py-3 text-white">{emp.full_name}</td>
                  <td className="px-4 py-3">{emp.position || "-"}</td>
                  <td className="px-4 py-3">
                    {emp.whatsapp ? (
                      <a href={`https://wa.me/52${emp.whatsapp}`} target="_blank" className="flex items-center gap-1 text-emerald-400 hover:underline">
                        <Phone size={12} /> {emp.whatsapp}
                      </a>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs">{getCentroNombre(emp.centro_trabajo_id)}</td>
                  <td className="px-4 py-3 text-emerald-400">${emp.salary_monthly?.toLocaleString() || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      emp.status === "ACTIVO" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}>
                      {emp.status || "Activo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleEdit(emp)} className="p-2 hover:bg-white/10 rounded-lg text-blue-400">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(emp.id)} className="p-2 hover:bg-white/10 rounded-lg text-rose-400">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
